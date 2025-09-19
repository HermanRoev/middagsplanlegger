'use client'

import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/lib/constants'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
  writeBatch,
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
import { Meal, PlannedMeal, CupboardItem, Ingredient } from '@/types'
import { Skeleton } from './ui/Skeleton'
import { MealDetailView } from './MealDetailView'
import { getCupboardItems, updateCupboardItem } from '@/lib/cupboard'
import { normalizeIngredient } from '@/lib/utils'
import toast from 'react-hot-toast'

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
      collection(db, COLLECTIONS.MEAL_PLANS),
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
        isCooked: data.isCooked || false,
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
      await deleteDoc(doc(db, COLLECTIONS.MEAL_PLANS, planId))
      setIsModalOpen(false)
      fetchPlannedMeals()
    } catch (error) {
      console.error('Error removing meal from plan: ', error)
    }
  }

  const handleMarkAsCooked = async (plan: PlannedMeal) => {
    if (!plan || !plan.scaledIngredients) return
    const toastId = toast.loading('Marking meal as cooked...')

    try {
      const cupboardItems = await getCupboardItems()
      const cupboardMap = new Map(
        cupboardItems.map((item) => [item.ingredientName, item])
      )
      const batch = writeBatch(db)

      for (const ingredient of plan.scaledIngredients) {
        const normalizedIngredient = normalizeIngredient(ingredient)
        const cupboardItem = cupboardMap.get(
          normalizedIngredient.name.toLowerCase()
        )

        if (cupboardItem) {
          const normalizedCupboardItem = normalizeIngredient({
            name: cupboardItem.ingredientName,
            amount: cupboardItem.amount,
            unit: cupboardItem.unit,
          })

          if (
            normalizedCupboardItem.key.endsWith(normalizedIngredient.key.split('_')[1])
          ) {
            const newAmount =
              normalizedCupboardItem.amount - normalizedIngredient.amount
            const itemRef = doc(db, COLLECTIONS.CUPBOARD, cupboardItem.id)
            batch.update(itemRef, { amount: Math.max(0, newAmount) })
          }
        }
      }

      const planRef = doc(db, COLLECTIONS.MEAL_PLANS, plan.id)
      batch.update(planRef, { isCooked: true })

      await batch.commit()
      toast.success('Meal marked as cooked! Matlager updated.', {
        id: toastId,
      })
      setIsModalOpen(false)
      fetchPlannedMeals()
    } catch (error) {
      console.error('Error marking meal as cooked:', error)
      toast.error('Could not mark meal as cooked.', { id: toastId })
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
                  className={`border border-gray-200 rounded-xl p-2 flex flex-col cursor-pointer bg-white shadow-sm hover:shadow-lg hover:bg-blue-50 transition-all duration-200 relative w-full h-52 ${isCurrentDay ? 'ring-2 ring-blue-500' : ''} ${plannedMeal?.isCooked ? 'opacity-50' : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  {plannedMeal?.isShopped && !plannedMeal.isCooked && (
                    <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs shadow">
                      ✓
                    </div>
                  )}
                  {plannedMeal?.isCooked && (
                    <div className="absolute top-1 right-1 bg-gray-400 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs shadow">
                      ✓
                    </div>
                  )}
                  <span
                    className={`font-bold mb-1 ${isCurrentDay ? 'bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' : 'text-gray-800'}`}
                  >
                    {format(day, 'd')}
                  </span>
                  {plannedMeal ? (
                    <div className="mt-2 flex-grow flex flex-col items-center text-center w-full">
                      {plannedMeal.imageUrl && (
                        <Image
                          src={plannedMeal.imageUrl}
                          alt={plannedMeal.mealName}
                          width={160}
                          height={100}
                          unoptimized={true}
                          className="w-full h-24 object-contain mb-1 max-w-full"
                        />
                      )}
                      <p className="text-sm font-medium text-gray-700 truncate w-full">
                        {plannedMeal.mealName}
                      </p>
                      <div className="flex-grow" />
                      <div className="flex justify-center items-center text-xs text-gray-500 mt-1 w-full px-1">
                        <div className="flex items-center gap-2">
                          {(plannedMeal.prepTime ?? 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="material-icons text-sm">
                                schedule
                              </span>
                              {plannedMeal.prepTime} min
                            </span>
                          )}
                          {(plannedMeal.costEstimate ?? 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="material-icons text-sm">
                                payments
                              </span>
                              {plannedMeal.costEstimate} kr
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-grow"></div>
                  )}
                </div>
              )
            })}
      </div>

      <div className="md:hidden space-y-2">
        {daysInMonth.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const plannedMeal = plannedMeals.get(dateKey)
          const isCurrentDay = isToday(day)
          return (
            <div
              key={dateKey}
              className={`p-4 rounded-lg flex items-center gap-4 ${isCurrentDay ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-gray-50'} ${plannedMeal?.isCooked ? 'opacity-50' : ''}`}
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
                        className="w-16 h-16 object-contain"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-gray-800">
                        {plannedMeal.mealName}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        {(plannedMeal.prepTime ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="material-icons text-base">
                              schedule
                            </span>
                            {plannedMeal.prepTime} min
                          </span>
                        )}
                        {(plannedMeal.costEstimate ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="material-icons text-base">
                              payments
                            </span>
                            {plannedMeal.costEstimate} kr
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Ingen middag planlagt</p>
                )}
              </div>
              {plannedMeal?.isShopped && !plannedMeal.isCooked && (
                <div className="bg-green-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-sm shadow">
                  ✓
                </div>
              )}
              {plannedMeal?.isCooked && (
                <div className="bg-gray-400 text-white rounded-full h-6 w-6 flex items-center justify-center text-sm shadow">
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
              ? `Velg middag for ${format(selectedDate, 'eeee d. MMMM', {
                  locale: nb,
                })}`
              : modalView === 'viewMeal'
              ? activePlannedMeal?.mealName || 'Se planlagt middag'
              : selectedMeal?.name || 'Legg til i plan'
          }
        >
          {modalView === 'library' && (
            <MealLibrary onSelectMeal={handleSelectMealFromLibrary} />
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
              isInsideModal={true}
            />
          )}
          {modalView === 'viewMeal' && activePlannedMeal && (
            <MealDetailView
              meal={{
                id: activePlannedMeal.mealId,
                name: activePlannedMeal.mealName,
                imageUrl: activePlannedMeal.imageUrl ?? null,
                servings: activePlannedMeal.servings ?? null,
                prepTime: activePlannedMeal.prepTime ?? null,
                costEstimate: activePlannedMeal.costEstimate ?? null,
                ingredients: activePlannedMeal.scaledIngredients ?? [],
                instructions: activePlannedMeal.instructions ?? [],
              }}
              servings={activePlannedMeal.plannedServings}
              isPlannedMeal={true}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-gray-600">
                    Planlagt for {activePlannedMeal.plannedServings} porsjoner
                  </p>
                  {activePlannedMeal.plannedBy && (
                    <p className="text-sm text-gray-500 mt-1">
                      Lagt til av: {activePlannedMeal.plannedBy.name}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {!activePlannedMeal.isCooked && (
                    <button
                      onClick={() => handleMarkAsCooked(activePlannedMeal)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <span className="material-icons text-base align-middle">
                        done
                      </span>
                      Marker som spist
                    </button>
                  )}
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
                      activePlannedMeal &&
                      handleRemoveMeal(activePlannedMeal.id)
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
            </MealDetailView>
          )}
        </Modal>
      )}
    </div>
  )
}
