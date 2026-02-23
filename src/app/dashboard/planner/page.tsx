"use client"

import { useState, useEffect } from "react"
import { format, startOfWeek, addDays, isSameDay, startOfDay, isPast } from "date-fns"
import { nb } from "date-fns/locale"
import { motion } from "framer-motion"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore"
import { PlannedMeal, Meal, CupboardItem } from "@/types"
import { scoreMeals } from "@/lib/recommendations"
import { generateMenuSuggestions, MinimalRecipeData } from "@/lib/gemini"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { incrementUserStat } from "@/lib/stats"
import { ChevronLeft, ChevronRight, Plus, CalendarIcon, RefreshCw, Sparkles, Loader2 } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { PageContainer } from "@/components/layout/PageLayout"
import { PageHeader, EmptyStateBlock } from "@/components/ui/action-blocks"
import { PlannerMealCard } from "@/components/ui/cards"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import toast from "react-hot-toast"

export default function PlannerPage() {
  const router = useRouter()
  const { user, householdId } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([])

  // Leftovers State
  const [leftoverTargetDate, setLeftoverTargetDate] = useState<string>("")
  const [isLeftoverDialogOpen, setIsLeftoverDialogOpen] = useState(false)

  // Smart Fill State
  const [allMeals, setAllMeals] = useState<Meal[]>([])
  const [cupboardItems, setCupboardItems] = useState<CupboardItem[]>([])
  const [isAutofilling, setIsAutofilling] = useState(false)

  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday start
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i))

  useEffect(() => {
    if (!user || !householdId) return
    const startStr = format(startDate, 'yyyy-MM-dd')
    const endStr = format(addDays(startDate, 6), 'yyyy-MM-dd')

    const q = query(
      collection(db, "plannedMeals"),
      where("date", ">=", startStr),
      where("date", "<=", endStr),
      where("householdId", "==", householdId)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlannedMeal))
      setPlannedMeals(meals)
    })

    const qMeals = query(collection(db, "meals"), where("householdId", "==", householdId))
    const unsubMeals = onSnapshot(qMeals, (snapshot) => {
      setAllMeals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meal)))
    })

    const qCupboard = query(collection(db, "cupboard"), where("householdId", "==", householdId))
    const unsubCupboard = onSnapshot(qCupboard, (snapshot) => {
      setCupboardItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CupboardItem)))
    })

    return () => {
      unsubscribe()
      unsubMeals()
      unsubCupboard()
    }
  }, [startDate, user, householdId])

  const handleMealClick = (meal: PlannedMeal) => {
    router.push(`/dashboard/recipes/${meal.mealId}?plannedId=${meal.id}`)
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCurrentDate(date)
    }
  }

  const handlePlanLeftovers = async () => {
    if (!leftoverTargetDate || !user) return

    try {
      await addDoc(collection(db, "plannedMeals"), {
        date: leftoverTargetDate,
        mealId: "leftover-placeholder",
        mealName: "Leftovers",
        imageUrl: null,
        plannedServings: 4,
        isShopped: true,
        isCooked: false,
        ingredients: [],
        notes: "Eat up previous meals!",
        createdAt: new Date().toISOString(),
        userId: user.uid,
        householdId: householdId
      })
      await incrementUserStat(user.uid, 'mealsPlanned', 1)
      toast.success("Planned leftovers!")
      setIsLeftoverDialogOpen(false)
    } catch (e) {
      console.error(e)
      toast.error("Failed to plan leftovers")
    }
  }

  const openLeftoverDialog = (targetDate: string) => {
    setLeftoverTargetDate(targetDate)
    setIsLeftoverDialogOpen(true)
  }

  const handleRemoveMeal = async (plannedMealId: string) => {
    try {
      await deleteDoc(doc(db, "plannedMeals", plannedMealId))
      toast.success("Fjernet fra planen")
    } catch (e) {
      console.error(e)
      toast.error("Kunne ikke fjerne måltidet")
    }
  }

  const handleAutofillWeek = async () => {
    // 1. Find empty days
    const plannedDates = new Set(plannedMeals.map(m => m.date))
    const emptyDates = weekDays
      .map(d => format(d, 'yyyy-MM-dd'))
      .filter(d => !plannedDates.has(d) && !isPast(addDays(new Date(d), 1)))

    if (emptyDates.length === 0) {
      toast.error("Hele uken er allerede planlagt!")
      return
    }

    if (allMeals.length === 0) {
      toast.error("Du har ingen lagrede oppskrifter å velge fra.")
      return
    }

    setIsAutofilling(true)
    const toastId = toast.loading("Consulting with Gemini AI...")

    try {
      // 2. Score meals locally
      const scoredMeals = scoreMeals(allMeals, cupboardItems)

      // 3. Prepare top 20 candidates
      const topCandidates: MinimalRecipeData[] = scoredMeals.slice(0, 20).map(s => ({
        id: s.meal.id,
        name: s.meal.name,
        tags: s.meal.tags || [],
        difficulty: s.meal.difficulty,
        prepTime: s.meal.prepTime || undefined,
        matchPercentage: s.matchPercentage,
        daysSinceCooked: s.meal.lastCooked ? Math.floor((new Date().getTime() - new Date(s.meal.lastCooked).getTime()) / (1000 * 3600 * 24)) : "Aldri"
      }))

      // 4. Generate AI suggestions mapping specifically to empty dates
      const datesToFill = emptyDates.slice(0, 5) // Cap at 5 consecutive empty days to avoid enormous latency
      const suggestions = await generateMenuSuggestions(topCandidates, datesToFill)

      // 5. Save loop
      let savedCount = 0;
      for (const suggestion of suggestions) {
        const originalMeal = allMeals.find(m => m.id === suggestion.recipeId);

        if (originalMeal && suggestion.date && user) {
          await addDoc(collection(db, "plannedMeals"), {
            date: suggestion.date,
            mealId: originalMeal.id,
            mealName: originalMeal.name,
            imageUrl: originalMeal.imageUrl || null,
            plannedServings: originalMeal.servings || 4,
            isShopped: false,
            isCooked: false,
            ingredients: originalMeal.ingredients || [],
            notes: `✨ Smart Valg: ${suggestion.reason}`,
            createdAt: new Date().toISOString(),
            userId: user.uid,
            householdId: householdId
          })
          savedCount++;
        }
      }

      if (savedCount > 0 && user) {
        await incrementUserStat(user.uid, 'mealsPlanned', savedCount)
        toast.success(`Planla ${savedCount} smarte måltider!`, { id: toastId })
      } else {
        toast.error("Ingen måltider ble planlagt.", { id: toastId })
      }

    } catch (error) {
      console.error(error)
      toast.error("Kunne ikke generere forslag.", { id: toastId })
    } finally {
      setIsAutofilling(false)
    }
  }

  return (
    <PageContainer className="space-y-8 print:space-y-4">
      <PageHeader
        title="Ukeplan"
        description="Organiser måltidene for uken som kommer."
        className="print:hidden"
      >
        <div className="flex items-center bg-white p-1 rounded-full border shadow-sm gap-2">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" shape="pill" className="hover:bg-gray-100" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <div className="flex items-center gap-2 px-4 cursor-pointer hover:bg-gray-50 rounded-md transition-colors h-9">
                  <CalendarIcon className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold text-gray-900 min-w-[140px] text-center select-none text-sm">
                    {format(startDate, "MMM d")} - {format(addDays(startDate, 6), "MMM d")}
                  </span>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" shape="pill" className="hover:bg-gray-100" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </Button>
          </div>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          <Button variant="ghost" size="sm" shape="pill" onClick={() => setCurrentDate(new Date())}>
            I dag
          </Button>

          <Button
            variant="premium"
            size="sm"
            onClick={handleAutofillWeek}
            disabled={isAutofilling}
            className="ml-2 rounded-full shadow-lg"
          >
            {isAutofilling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Autofyll Uken
          </Button>
        </div>
      </PageHeader>

      {/* Print Only Header */}
      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Meny: {format(startDate, "MMMM do")} - {format(addDays(startDate, 6), "MMMM do")}</h1>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 print:grid-cols-1 print:gap-2">
        {weekDays.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const mealsForDay = plannedMeals.filter(m => m.date === dateKey)
          const isToday = isSameDay(day, startOfDay(new Date()))
          const isExpired = isPast(day) && !isToday
          const meal = mealsForDay[0]

          return (
            <motion.div
              key={dateKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`h-full ${isExpired ? 'opacity-50 grayscale-[0.5] pointer-events-none' : ''}`}
            >
              <Card className={`h-full flex flex-col transition-all shadow-lg border-white/50 overflow-hidden print:shadow-none print:border print:border-gray-200 print:break-inside-avoid ${isToday ? 'shadow-xl shadow-indigo-300/50 ring-1 ring-indigo-200/60' : 'hover:shadow-xl'}`}>
                <div className={`px-4 py-3 flex justify-between items-center border-b ${isToday ? 'border-indigo-200/50 bg-indigo-100/50' : 'border-white/30 bg-white/20'} print:bg-white print:text-left print:flex print:items-center print:gap-4 print:p-2 print:border-b-0`}>
                  <div className="text-left">
                    <div className={`text-sm font-black uppercase tracking-wider ${isToday ? 'text-indigo-600' : 'text-gray-900'} print:text-gray-900 print:mb-0 print:w-24`}>
                      {format(day, 'EEEE', { locale: nb })}
                    </div>
                    <div className="text-xs text-gray-500 font-semibold">
                      {format(day, 'd. MMMM', { locale: nb })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isToday && (
                      <div className="bg-indigo-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm shadow-indigo-200">
                        I dag
                      </div>
                    )}
                    {isExpired && (
                      <div className="bg-gray-200/80 text-gray-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                        Utgått
                      </div>
                    )}
                    <div className={`text-3xl font-black ${isToday ? 'text-indigo-600' : 'text-gray-900'} print:hidden md:hidden lg:block xl:hidden`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                </div>

                <CardContent className="p-4 flex-1 flex flex-col min-h-[220px] print:min-h-0 print:p-2">
                  {meal ? (
                    <PlannerMealCard
                      meal={{
                        id: meal.id,
                        mealId: meal.mealId,
                        name: meal.mealName,
                        imageUrl: meal.imageUrl,
                        notes: meal.notes,
                        prepTime: meal.prepTime,
                        servings: meal.plannedServings
                      }}
                      isToday={isToday}
                      isExpired={isExpired}
                      planDateKey={dateKey}
                      onClick={() => handleMealClick(meal)}
                      onReplace={() => router.push(`/dashboard/recipes?planDate=${dateKey}&replaceId=${meal.id}`)}
                      onRemove={() => handleRemoveMeal(meal.id)}
                    />
                  ) : (
                    <div className="w-full h-full min-h-[180px] flex flex-col gap-2 print:hidden">
                      <Button asChild variant="ghost" className="flex-1 rounded-2xl border-2 border-dashed border-gray-300/70 text-gray-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 flex flex-col gap-4 transition-all duration-300 py-8 h-full">
                        <Link href={`/dashboard/recipes?planDate=${dateKey}`}>
                          <div className="w-12 h-12 rounded-full bg-white/60 flex items-center justify-center transition-colors">
                            <Plus className="w-6 h-6" />
                          </div>
                          <span className="font-bold text-base">Legg til middag</span>
                        </Link>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl font-semibold text-gray-500 border-white/60 bg-white/30 hover:bg-white/60 hover:text-gray-800 hover:border-white/80 backdrop-blur-sm transition-all"
                        onClick={() => openLeftoverDialog(dateKey)}
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Planlegg rester
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Dialog open={isLeftoverDialogOpen} onOpenChange={setIsLeftoverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Planlegg Rester</DialogTitle>
            <DialogDescription>
              Legg til en påminnelse om å spise rester den {leftoverTargetDate}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsLeftoverDialogOpen(false)}>Avbryt</Button>
            <Button onClick={handlePlanLeftovers} className="bg-amber-500 hover:bg-amber-600 text-white">
              Legg til rester
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
