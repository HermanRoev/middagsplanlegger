"use client"

import { useState, useEffect } from "react"
import { format, startOfWeek, addDays, isSameDay, startOfDay, isPast } from "date-fns"
import { nb } from "date-fns/locale"
import { motion } from "framer-motion"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, addDoc } from "firebase/firestore"
import { PlannedMeal } from "@/types"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Plus, CalendarIcon, Users, Clock, RefreshCw, Copy, Printer, ChefHat } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
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
  const [currentDate, setCurrentDate] = useState(new Date())
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([])

  // Leftovers State
  const [leftoverTargetDate, setLeftoverTargetDate] = useState<string>("")
  const [isLeftoverDialogOpen, setIsLeftoverDialogOpen] = useState(false)

  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday start
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i))

  useEffect(() => {
    const startStr = format(startDate, 'yyyy-MM-dd')
    const endStr = format(addDays(startDate, 6), 'yyyy-MM-dd')
    
    const q = query(
      collection(db, "plannedMeals"), 
      where("date", ">=", startStr),
      where("date", "<=", endStr)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlannedMeal))
      setPlannedMeals(meals)
    })

    return () => unsubscribe()
  }, [startDate])

  const handleMealClick = (meal: PlannedMeal) => {
    router.push(`/dashboard/recipes/${meal.mealId}?plannedId=${meal.id}`)
  }

  const handleDateSelect = (date: Date | undefined) => {
      if (date) {
          setCurrentDate(date)
      }
  }

  const handlePlanLeftovers = async () => {
      if (!leftoverTargetDate) return

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
              createdAt: new Date().toISOString()
          })
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

  const handlePrint = () => {
      window.print()
  }

  return (
    <div className="space-y-8 print:space-y-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        <div>
           <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Weekly Plan</h1>
           <p className="text-gray-500 mt-1">Organize your meals for the week ahead.</p>
        </div>

        <div className="flex items-center bg-white p-1 rounded-full border shadow-sm gap-2">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
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

            <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
                <ChevronRight className="w-5 h-5 text-gray-600" />
            </Button>
          </div>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setCurrentDate(new Date())}>
              Today
          </Button>

          <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100 text-gray-500" onClick={handlePrint} title="Print Menu">
              <Printer className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Print Only Header */}
      <div className="hidden print:block mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Menu: {format(startDate, "MMMM do")} - {format(addDays(startDate, 6), "MMMM do")}</h1>
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
              <Card className={`h-full flex flex-col border-0 transition-all ${isToday ? 'ring-2 ring-indigo-500 shadow-xl' : 'shadow-sm hover:shadow-md'} bg-white overflow-hidden print:shadow-none print:border print:border-gray-200 print:break-inside-avoid`}>
                <div className={`p-4 flex justify-between items-center border-b ${isToday ? 'bg-indigo-50' : 'bg-gray-50/50'} print:bg-white print:text-left print:flex print:items-center print:gap-4 print:p-2 print:border-b-0`}>
                  <div className="text-left">
                    <div className={`text-sm font-bold uppercase tracking-wider ${isToday ? 'text-indigo-600' : 'text-gray-500'} print:text-gray-900 print:mb-0 print:w-24`}>
                        {format(day, 'EEEE', { locale: nb })}
                    </div>
                    <div className="text-xs text-gray-400 font-medium">
                        {format(day, 'd. MMMM', { locale: nb })}
                    </div>
                  </div>
                  {isToday && (
                      <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                        I dag
                      </div>
                  )}
                  {isExpired && (
                      <div className="bg-gray-200 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                        Utgått
                      </div>
                  )}
                  <div className={`text-2xl font-black ${isToday ? 'text-indigo-700' : 'text-gray-900'} print:hidden md:hidden lg:block xl:hidden`}>
                    {format(day, 'd')}
                  </div>
                </div>

                <CardContent className="p-4 flex-1 flex flex-col min-h-[220px] print:min-h-0 print:p-2">
                  {meal ? (
                     <div
                        className="relative flex-1 bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-100 p-0 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group flex flex-col print:shadow-none print:border-0 print:p-0 print:bg-none"
                      >
                         <div onClick={() => handleMealClick(meal)} className="flex-1 flex flex-col">
                           {/* Meal Image */}
                           <div className="relative w-full h-32 rounded-t-2xl overflow-hidden mb-4 bg-gray-100">
                             {meal.imageUrl ? (
                               <Image 
                                 src={meal.imageUrl} 
                                 alt={meal.mealName}
                                 fill
                                 className="object-cover transition-transform duration-500 group-hover:scale-105"
                                 unoptimized
                               />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center bg-indigo-50/50">
                                 {meal.mealId === 'leftover-placeholder' ? (
                                   <Copy className="w-10 h-10 text-amber-200" />
                                 ) : (
                                   <ChefHat className="w-10 h-10 text-indigo-100" />
                                 )}
                               </div>
                             )}
                             <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                           </div>

                           <div className="px-5 pb-2">
                             <div className="flex justify-between items-start mb-2 pr-6">
                               <h3 className="font-bold text-gray-900 text-xl leading-tight group-hover:text-indigo-700 transition-colors print:text-lg">
                                 {meal.mealName}
                               </h3>
                             </div>
                             
                             {meal.notes && (
                               <div className="text-sm text-gray-600 italic line-clamp-2 mb-4 bg-white p-3 rounded-xl border border-gray-100 print:border-0 print:p-0 print:text-gray-600">
                                 &quot;{meal.notes}&quot;
                               </div>
                             )}
                           </div>
                         </div>

                         {/* Replace Button */}
                         <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity print:hidden z-10">
                            <Link href={`/dashboard/recipes?planDate=${dateKey}&replaceId=${meal.id}`}>
                               <div className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md border border-gray-100 text-gray-400 hover:text-indigo-600 hover:border-indigo-400" title="Replace Meal">
                                  <RefreshCw className="w-4 h-4" />
                               </div>
                            </Link>
                         </div>

                         <div className="px-5 pb-5 mt-auto flex items-center gap-4 text-xs font-bold text-gray-500 print:hidden">
                            <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full">
                                <Users className="w-3.5 h-3.5 text-indigo-500" /> {meal.plannedServings} porsjoner
                            </span>
                            {meal.prepTime && (
                                <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full">
                                    <Clock className="w-3.5 h-3.5 text-indigo-500" /> {meal.prepTime} min
                                </span>
                            )}
                         </div>
                      </div>
                  ) : (
                    <div className="w-full h-full min-h-[180px] flex flex-col gap-3 print:hidden">
                        <Button asChild variant="ghost" className="flex-1 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 flex flex-col gap-4 transition-all duration-300 group py-8">
                        <Link href={`/dashboard/recipes?planDate=${dateKey}`}>
                            <div className="w-12 h-12 rounded-full bg-gray-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                            <Plus className="w-6 h-6 group-hover:text-indigo-600" />
                            </div>
                            <span className="font-bold text-lg group-hover:translate-y-0.5 transition-transform">Legg til middag</span>
                        </Link>
                        </Button>

                        <Button
                          variant="outline"
                          size="lg"
                          className="text-amber-600 border-amber-200 hover:bg-amber-50 rounded-xl font-bold"
                          onClick={() => openLeftoverDialog(dateKey)}
                        >
                          <Copy className="w-4 h-4 mr-2" /> Planlegg rester
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
                  <DialogTitle>Plan Leftovers</DialogTitle>
                  <DialogDescription>
                      Add a placeholder for eating leftovers on {leftoverTargetDate}.
                  </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsLeftoverDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handlePlanLeftovers} className="bg-amber-500 hover:bg-amber-600 text-white">
                      Add Leftovers
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  )
}
