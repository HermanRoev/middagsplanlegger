"use client"

import { useState, useEffect } from "react"
import { format, startOfWeek, addDays, isSameDay } from "date-fns"
import { nb } from "date-fns/locale"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, Plus, Trash2, X, ArrowRightLeft, Clock, Users, CalendarIcon, ChefHat } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, deleteDoc, updateDoc, doc } from "firebase/firestore"
import { PlannedMeal, Ingredient } from "@/types"
import Link from "next/link"
import toast from "react-hot-toast"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"

export default function PlannerPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([])
  const [selectedMeal, setSelectedMeal] = useState<PlannedMeal | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Edit State
  const [editNotes, setEditNotes] = useState("")
  const [editServings, setEditServings] = useState(4)
  const [editIngredients, setEditIngredients] = useState<Ingredient[]>([])

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

  const handleDelete = async (id: string) => {
    if (confirm("Remove this meal from plan?")) {
      try {
        await deleteDoc(doc(db, "plannedMeals", id))
        toast.success("Meal removed")
        setIsDialogOpen(false)
      } catch (error) {
        console.error(error)
        toast.error("Failed to remove meal")
      }
    }
  }

  const handleReplace = (meal: PlannedMeal) => {
     setIsDialogOpen(false)
     router.push(`/dashboard/recipes?planDate=${meal.date}&replaceId=${meal.id}`)
  }

  const handleEditClick = (meal: PlannedMeal) => {
    setSelectedMeal(meal)
    setEditNotes(meal.notes || "")
    setEditServings(meal.plannedServings || 4)
    setEditIngredients(meal.ingredients || [])
    setIsDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedMeal) return
    try {
      await updateDoc(doc(db, "plannedMeals", selectedMeal.id), {
        notes: editNotes,
        plannedServings: editServings,
        ingredients: editIngredients,
        updatedAt: new Date().toISOString(),
        lastUpdatedBy: user ? {
          id: user.uid,
          name: user.displayName || user.email || 'Unknown'
        } : undefined
      })
      toast.success("Meal updated")
      setIsDialogOpen(false)
    } catch (error) {
      console.error(error)
      toast.error("Failed to update meal")
    }
  }

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
    const newIngredients = [...editIngredients]
    newIngredients[index] = { ...newIngredients[index], [field]: value } as Ingredient
    setEditIngredients(newIngredients)
  }

  const handleRemoveIngredient = (index: number) => {
      setEditIngredients(editIngredients.filter((_, i) => i !== index))
  }

  const handleAddIngredient = () => {
      setEditIngredients([...editIngredients, { name: '', amount: 0, unit: 'stk' }])
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Weekly Plan</h1>
           <p className="text-gray-500 mt-1">Organize your meals for the week ahead.</p>
        </div>

        <div className="flex items-center bg-white p-1 rounded-full border shadow-sm">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </Button>
          <div className="flex items-center gap-2 px-6">
             <CalendarIcon className="w-4 h-4 text-indigo-600" />
             <span className="font-semibold text-gray-900 min-w-[140px] text-center">
               {format(startDate, "MMM d")} - {format(addDays(startDate, 6), "MMM d")}
             </span>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        {weekDays.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const mealsForDay = plannedMeals.filter(m => m.date === dateKey)
          const isToday = isSameDay(day, new Date())
          const meal = mealsForDay[0]

          return (
            <motion.div
              key={dateKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="h-full"
            >
              <Card className={`h-full flex flex-col border-0 transition-all ${isToday ? 'ring-2 ring-indigo-500 shadow-xl' : 'shadow-sm hover:shadow-md'} bg-white overflow-hidden`}>
                <div className={`p-4 text-center border-b ${isToday ? 'bg-indigo-50' : 'bg-gray-50/50'}`}>
                  <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isToday ? 'text-indigo-600' : 'text-gray-500'}`}>
                    {format(day, 'EEE', { locale: nb })}
                  </div>
                  <div className={`text-2xl font-black ${isToday ? 'text-indigo-700' : 'text-gray-900'}`}>
                    {format(day, 'd')}
                  </div>
                </div>

                <CardContent className="p-3 flex-1 flex flex-col min-h-[180px]">
                  {meal ? (
                     <div
                        onClick={() => handleEditClick(meal)}
                        className="flex-1 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group flex flex-col"
                      >
                         <div className="flex-1">
                           <h3 className="font-bold text-gray-900 leading-tight mb-2 group-hover:text-indigo-700 transition-colors">
                             {meal.mealName}
                           </h3>
                           {meal.notes && (
                             <div className="text-xs text-gray-500 italic line-clamp-2 mb-3 bg-white p-1.5 rounded border border-gray-100">
                               "{meal.notes}"
                             </div>
                           )}
                         </div>

                         <div className="pt-3 mt-auto border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500">
                            <span className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-full">
                                <Users className="w-3 h-3" /> {meal.plannedServings}
                            </span>
                            {meal.prepTime && (
                                <span className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" /> {meal.prepTime}m
                                </span>
                            )}
                         </div>
                      </div>
                  ) : (
                    <Button asChild variant="ghost" className="w-full h-full min-h-[140px] rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 flex flex-col gap-3 transition-all duration-300 group">
                      <Link href={`/dashboard/recipes?planDate=${dateKey}`}>
                        <div className="w-10 h-10 rounded-full bg-gray-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                           <Plus className="w-5 h-5 group-hover:text-indigo-600" />
                        </div>
                        <span className="font-medium group-hover:translate-y-0.5 transition-transform">Add Meal</span>
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white border-0 shadow-2xl gap-0 block">
            {/* Header Image */}
            <div className="relative h-64 w-full bg-gray-200">
                {selectedMeal?.imageUrl ? (
                    <img
                        src={selectedMeal.imageUrl}
                        alt={selectedMeal.mealName}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                        <ChefHat className="w-20 h-20 text-white/50" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 pt-12 text-white">
                    <h2 className="text-3xl font-bold leading-tight">{selectedMeal?.mealName}</h2>
                    <div className="flex items-center gap-4 mt-2 text-white/80 text-sm font-medium">
                        <span className="flex items-center gap-1"><Users className="w-4 h-4"/> {selectedMeal?.plannedServings} servings</span>
                    </div>
                </div>
                <button
                    onClick={() => setIsDialogOpen(false)}
                    className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Body */}
            <div className="p-6 grid gap-8 md:grid-cols-2">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-gray-500 font-medium">Notes</Label>
                        <Textarea
                            placeholder="Add specific notes for this meal..."
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="min-h-[120px] bg-gray-50 border-gray-200 focus:bg-white transition-colors resize-none"
                        />
                    </div>
                     <div className="space-y-2">
                        <Label className="text-gray-500 font-medium">Servings</Label>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={() => setEditServings(Math.max(1, editServings - 1))}>-</Button>
                            <span className="text-xl font-bold w-12 text-center">{editServings}</span>
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={() => setEditServings(editServings + 1)}>+</Button>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <Label className="text-gray-900 font-semibold flex items-center gap-2">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                            Ingredients
                        </Label>
                        <Button variant="ghost" size="sm" onClick={handleAddIngredient} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-8">
                            <Plus className="w-4 h-4 mr-1" /> Add
                        </Button>
                    </div>

                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        {editIngredients.map((ing, i) => (
                            <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={i} className="flex gap-2 items-center group">
                                <Input
                                    className="flex-1 h-9 bg-gray-50 border-transparent focus:bg-white focus:border-indigo-200 transition-colors"
                                    value={ing.name}
                                    placeholder="Ingredient"
                                    onChange={(e) => handleIngredientChange(i, 'name', e.target.value)}
                                />
                                 <div className="flex gap-1 w-32">
                                    <Input
                                        type="number"
                                        className="w-16 h-9 bg-gray-50 border-transparent focus:bg-white focus:border-indigo-200 text-center px-1"
                                        value={ing.amount || ''}
                                        placeholder="0"
                                        onChange={(e) => handleIngredientChange(i, 'amount', Number(e.target.value))}
                                    />
                                    <select
                                        className="w-16 h-9 rounded-md bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-200 text-xs px-1"
                                        value={ing.unit}
                                        onChange={(e) => handleIngredientChange(i, 'unit', e.target.value)}
                                    >
                                        {['g', 'kg', 'l', 'dl', 'stk', 'ts', 'ss'].map(u => (
                                        <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                 </div>
                                <button className="text-gray-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100" onClick={() => handleRemoveIngredient(i)}>
                                    <X className="w-4 h-4" />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t flex items-center justify-between">
                 <div className="flex gap-2">
                    <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => selectedMeal && handleDelete(selectedMeal.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                    </Button>
                    <Button variant="outline" onClick={() => selectedMeal && handleReplace(selectedMeal)}>
                        <ArrowRightLeft className="w-4 h-4 mr-2" />
                        Replace
                    </Button>
                 </div>
                 <Button onClick={handleSaveEdit} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all px-8">
                    Save Changes
                 </Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
