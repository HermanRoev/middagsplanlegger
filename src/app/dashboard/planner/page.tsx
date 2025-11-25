"use client"

import { useState, useEffect } from "react"
import { format, startOfWeek, addDays, isSameDay } from "date-fns"
import { nb } from "date-fns/locale"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { PlannedMeal } from "@/types"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Plus, CalendarIcon, Users, Clock, RefreshCw } from "lucide-react"

export default function PlannerPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([])

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
    // Navigate to the recipe view with the planned meal context
    router.push(`/dashboard/recipes/${meal.mealId}?plannedId=${meal.id}`)
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
          const meal = mealsForDay[0] // "One meal per day" logic: we only take the first one

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
                        className="relative flex-1 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group flex flex-col"
                      >
                         <div onClick={() => handleMealClick(meal)} className="flex-1">
                           <h3 className="font-bold text-gray-900 leading-tight mb-2 group-hover:text-indigo-700 transition-colors">
                             {meal.mealName}
                           </h3>
                           {meal.notes && (
                             <div className="text-xs text-gray-500 italic line-clamp-2 mb-3 bg-white p-1.5 rounded border border-gray-100">
                               &quot;{meal.notes}&quot;
                             </div>
                           )}
                         </div>

                         {/* Replace Button - Only shows on hover */}
                         <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/dashboard/recipes?planDate=${dateKey}&replaceId=${meal.id}`}>
                               <div className="p-1.5 bg-white rounded-full shadow-sm border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-400" title="Replace Meal">
                                  <RefreshCw className="w-3.5 h-3.5" />
                               </div>
                            </Link>
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
    </div>
  )
}
