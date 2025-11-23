"use client"

import { useState, useEffect } from "react"
import { format, startOfWeek, addDays, isSameDay } from "date-fns"
import { nb } from "date-fns/locale"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, deleteDoc, doc } from "firebase/firestore"
import { PlannedMeal } from "@/types"
import Link from "next/link"

export default function PlannerPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([])
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday start
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i))

  useEffect(() => {
    const startStr = format(startDate, 'yyyy-MM-dd')
    const endStr = format(addDays(startDate, 6), 'yyyy-MM-dd')

    // Simple query for now, ideally range query but string dates are tricky for range if not careful.
    // Let's fetch all planned meals and filter client side or improve query later. 
    // Actually string comparison works for ISO dates.
    
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
      await deleteDoc(doc(db, "plannedMeals", id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Meal Planner</h1>
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium px-4 min-w-[140px] text-center">
            {format(startDate, "MMM d")} - {format(addDays(startDate, 6), "MMM d")}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        {weekDays.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const mealsForDay = plannedMeals.filter(m => m.date === dateKey)
          const isToday = isSameDay(day, new Date())

          return (
            <motion.div
              key={dateKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="h-full"
            >
              <Card className={`h-full min-h-[200px] flex flex-col ${isToday ? 'ring-2 ring-indigo-500 shadow-lg' : ''}`}>
                <CardHeader className="p-4 pb-2 border-b bg-gray-50/50 rounded-t-xl">
                  <div className="text-center">
                    <div className="text-xs font-medium uppercase text-gray-500">
                      {format(day, 'EEE', { locale: nb })}
                    </div>
                    <div className={`text-lg font-bold ${isToday ? 'text-indigo-600' : 'text-gray-900'}`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 flex-1 flex flex-col gap-2">
                  {mealsForDay.length > 0 ? (
                    mealsForDay.map(meal => (
                      <div key={meal.id} className="group relative bg-white border rounded-lg p-2 shadow-sm hover:shadow-md transition-all">
                        <div className="font-medium text-sm line-clamp-2">{meal.mealName}</div>
                        <div className="text-xs text-gray-500 mt-1">{meal.plannedServings} pers</div>
                        <button 
                          onClick={() => handleDelete(meal.id)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-red-500 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="flex-1 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Link href={`/dashboard/recipes?planDate=${dateKey}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
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
