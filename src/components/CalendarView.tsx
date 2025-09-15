// Fil: src/components/CalendarView.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/firebase'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
} from 'firebase/firestore'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  getDay,
  isToday,
} from 'date-fns'
import { nb } from 'date-fns/locale'
import Image from 'next/image'
import { Modal } from './Modal'
import { MealLibrary } from './MealLibrary'
import { AddMealToPlanView } from './AddMealToPlanView'
import { Meal, PlannedMeal, Ingredient } from '@/types'
import { Skeleton } from './ui/Skeleton'

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [plannedMeals, setPlannedMeals] = useState<Map<string, PlannedMeal>>(
    new Map()
  )
  const [isLoading, setIsLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [modalView, setModalView] = useState<
    'library' | 'addToPlan' | 'viewMeal'
  >('library')
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [activePlannedMeal, setActivePlannedMeal] =
    useState<PlannedMeal | null>(null)

  const fetchPlannedMeals = useCallback(async () => {
    setIsLoading(true)
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    const q = query(
      collection(db, 'mealPlans'),
      where('date', '>=', format(start, 'yyyy-MM-dd')),
      where('date', '<=', format(end, 'yyyy-MM-dd'))
    )
    const querySnapshot = await getDocs(q)
    const mealsMap = new Map<string, PlannedMeal>()
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      const meal: PlannedMeal = {
        id: doc.id,
        date: data.date,
        mealId: data.mealId,
        mealName: data.mealName,
        imageUrl: data.imageUrl,
        isShopped: data.isShopped || false,
        servings: data.servings,
        scaledIngredients: data.scaledIngredients || [],
        instructions: data.instructions,
        plannedServings: data.plannedServings,
        prepTime: data.prepTime,
        costEstimate: data.costEstimate,
        plannedBy: data.plannedBy,
      }
      mealsMap.set(data.date, meal)
    })
    setPlannedMeals(mealsMap)
    setIsLoading(false)
  }, [currentDate])

  useEffect(() => {
    fetchPlannedMeals()
  }, [fetchPlannedMeals])

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  })
  const startingDayIndex = (getDay(startOfMonth(currentDate)) + 6) % 7

  const handleDayClick = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd')
    const plannedMeal = plannedMeals.get(dateKey)

    setSelectedDate(day)
    if (plannedMeal) {
      setActivePlannedMeal(plannedMeal)
      setModalView('viewMeal')
    } else {
      setActivePlannedMeal(null)
      setModalView('library')
    }
    setIsModalOpen(true)
  }

  const handleSelectMealFromLibrary = (meal: Meal) => {
    setSelectedMeal(meal)
    setModalView('addToPlan')
  }

  const handlePlanSaved = () => {
    setIsModalOpen(false)
    fetchPlannedMeals()
  }

  const handleRemoveMeal = async (planId: string) => {
    if (!planId) return
    try {
      await deleteDoc(doc(db, 'mealPlans', planId))
      setIsModalOpen(false)
      fetchPlannedMeals()
    } catch (error) {
      console.error('Error removing meal from plan: ', error)
      // Optionally: show an error message to the user
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col w-full">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 capitalize order-1 md:order-2">
          {format(currentDate, 'MMMM yyyy', { locale: nb })}
        </h2>
        <div className="w-full md:w-auto flex justify-between order-2 md:order-1">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="flex items-center gap-1 px-4 py-2 bg-blue-100 rounded-lg hover:bg-blue-200 text-blue-800 font-semibold transition-colors shadow-sm"
          >
            <span className="material-icons text-base align-middle">
              arrow_back
            </span>
            Forrige
          </button>
        </div>
        <div className="w-full md:w-auto flex justify-between order-3 md:order-3">
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="flex items-center gap-1 px-4 py-2 bg-blue-100 rounded-lg hover:bg-blue-200 text-blue-800 font-semibold transition-colors shadow-sm"
          >
            Neste
            <span className="material-icons text-base align-middle">
              arrow_forward
            </span>
          </button>
        </div>
      </div>

      {/* Grid view for larger screens */}
      <div className="hidden md:grid grid-cols-7 gap-2 text-center font-semibold text-gray-600 pb-2 mb-2">
        {['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="hidden md:grid grid-cols-7 gap-2 flex-grow">
        {Array.from({ length: startingDayIndex }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className="border border-gray-200 rounded-xl bg-gray-50 shadow-sm"
          ></div>
        ))}
        {isLoading
          ? Array.from({ length: daysInMonth.length }).map((_, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-xl p-2 flex flex-col bg-white shadow-sm hover:shadow-lg transition-all duration-200 relative w-full h-[180px]"
              >
                <Skeleton className="w-8 h-8 rounded-full mb-1 mx-auto" />
                <div className="mt-2 flex-grow flex flex-col items-center text-center w-full h-full justify-center">
                  <Skeleton className="w-full h-24 rounded-md mb-1" />
                  <Skeleton className="w-3/4 h-4 rounded" />
                </div>
              </div>
            ))
          : daysInMonth.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const plannedMeal = plannedMeals.get(dateKey)
              const isCurrentDay = isToday(day)
              return (
                <div
                  key={dateKey}
                  className={`border border-gray-200 rounded-xl p-2 flex flex-col cursor-pointer bg-white shadow-sm hover:shadow-lg hover:bg-blue-50 transition-all duration-200 relative w-full h-[180px] ${isCurrentDay ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  {plannedMeal?.isShopped && (
                    <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs shadow">
                      ✓
                    </div>
                  )}
                  <span
                    className={`font-bold mb-1 ${isCurrentDay ? 'bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' : 'text-gray-800'}`}
                  >
                    {format(day, 'd')}
                  </span>
                  {plannedMeal ? (
                    <div className="mt-2 flex-grow flex flex-col items-center text-center w-full h-full justify-center">
                      {plannedMeal.imageUrl && (
                        <Image
                          src={plannedMeal.imageUrl}
                          alt={plannedMeal.mealName}
                          width={160}
                          height={100}
                          unoptimized={true}
                          className="w-full h-24 object-cover rounded-md mb-1 max-w-full"
                        />
                      )}
                      <p className="text-sm font-medium text-gray-700 truncate w-full">
                        {plannedMeal.mealName}
                      </p>
                    </div>
                  ) : (
                    <div className="flex-grow"></div>
                  )}
                </div>
              )
            })}
      </div>

      {/* List view for smaller screens */}
      <div className="md:hidden space-y-2">
        {daysInMonth.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const plannedMeal = plannedMeals.get(dateKey)
          const isCurrentDay = isToday(day)
          return (
            <div
              key={dateKey}
              className={`p-4 rounded-lg flex items-center gap-4 ${isCurrentDay ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-gray-50'}`}
              onClick={() => handleDayClick(day)}
            >
              <div
                className={`flex flex-col items-center justify-center w-12 ${isCurrentDay ? 'text-blue-600' : 'text-gray-700'}`}
              >
                <span className="font-bold text-lg">{format(day, 'd')}</span>
                <span className="text-xs uppercase">
                  {format(day, 'E', { locale: nb })}
                </span>
              </div>
              <div className="flex-grow">
                {plannedMeal ? (
                  <div className="flex items-center gap-4">
                    {plannedMeal.imageUrl && (
                      <Image
                        src={plannedMeal.imageUrl}
                        alt={plannedMeal.mealName}
                        width={64}
                        height={64}
                        unoptimized={true}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-gray-800">
                        {plannedMeal.mealName}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Ingen middag planlagt</p>
                )}
              </div>
              {plannedMeal?.isShopped && (
                <div className="bg-green-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-sm shadow">
                  ✓
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedDate && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={
            modalView === 'library'
              ? `Velg middag for ${format(selectedDate, 'eeee d. MMMM', { locale: nb })}`
              : modalView === 'viewMeal'
                ? activePlannedMeal?.mealName || 'Se planlagt middag'
                : selectedMeal?.name || 'Legg til i plan'
          }
        >
          {modalView === 'library' && (
            <div className="overflow-y-auto max-h-[420px] flex flex-wrap gap-4 justify-center">
              <MealLibrary onSelectMeal={handleSelectMealFromLibrary} />
            </div>
          )}
          {modalView === 'addToPlan' && selectedMeal && (
            <AddMealToPlanView
              meal={selectedMeal}
              selectedDate={selectedDate}
              onBack={() =>
                setModalView(activePlannedMeal ? 'viewMeal' : 'library')
              }
              onPlanSaved={handlePlanSaved}
              existingPlanId={activePlannedMeal?.id}
            />
          )}
          {modalView === 'viewMeal' && activePlannedMeal && (
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/3 flex-shrink-0">
                {activePlannedMeal.imageUrl ? (
                  <Image
                    src={activePlannedMeal.imageUrl}
                    alt={activePlannedMeal.mealName}
                    width={400}
                    height={180}
                    unoptimized={true}
                    className="w-full h-44 object-cover rounded-lg shadow-md mb-2"
                  />
                ) : (
                  <div className="w-full h-44 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                    Bilde mangler
                  </div>
                )}
              </div>
              <div className="md:w-2/3">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      {activePlannedMeal.mealName}
                    </h3>
                    <p className="text-gray-600">
                      Planlagt for {activePlannedMeal.plannedServings} porsjoner
                    </p>
                    {activePlannedMeal.plannedBy && (
                      <p className="text-sm text-gray-500 mt-1">
                        Lagt til av: {activePlannedMeal.plannedBy.name}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                      {(activePlannedMeal.prepTime ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="material-icons text-base">
                            schedule
                          </span>
                          {activePlannedMeal.prepTime} min
                        </span>
                      )}
                      {(activePlannedMeal.costEstimate ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="material-icons text-base">
                            payments
                          </span>
                          {activePlannedMeal.costEstimate} kr
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setModalView('library')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <span className="material-icons text-base align-middle">
                        swap_horiz
                      </span>
                      Bytt middag
                    </button>
                    <button
                      onClick={() =>
                        activePlannedMeal && handleRemoveMeal(activePlannedMeal.id)
                      }
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                    >
                      <span className="material-icons text-base align-middle">
                        delete
                      </span>
                      Fjern
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-lg font-semibold mb-2 text-gray-800">
                      Ingredienser
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {activePlannedMeal.scaledIngredients?.map(
                        (ing: Ingredient, idx: number) => (
                          <li key={idx}>
                            {ing.amount !== undefined && ing.unit ? (
                              <span className="font-medium">
                                {ing.amount} {ing.unit}
                              </span>
                            ) : null}{' '}
                            {ing.name}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2 text-gray-800">
                      Instruksjoner
                    </h4>
                    <div className="text-gray-700 whitespace-pre-wrap">
                      {activePlannedMeal.instructions ||
                        'Instruksjoner mangler.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
