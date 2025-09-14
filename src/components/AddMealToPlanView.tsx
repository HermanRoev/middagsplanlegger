// Fil: src/components/AddMealToPlanView.tsx
'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { collection, addDoc, doc, deleteDoc } from 'firebase/firestore'
import { format } from 'date-fns'
import { Ingredient, Meal } from '@/types'
import toast from 'react-hot-toast'
import Image from 'next/image'

interface AddMealToPlanViewProps {
  meal: Meal
  selectedDate: Date
  onBack: () => void
  onPlanSaved: () => void
  existingPlanId?: string
}

const formatAmount = (amount: number) => {
  if (amount == null || isNaN(amount)) {
    return ''
  }
  if (amount === 0) return 0
  return Number.isInteger(amount) ? amount : parseFloat(amount.toFixed(1))
}

export function AddMealToPlanView({
  meal,
  selectedDate,
  onBack,
  onPlanSaved,
  existingPlanId,
}: AddMealToPlanViewProps) {
  const [servingsToPlan, setServingsToPlan] = useState<number | null>(
    meal.servings || 1
  )
  const [isLoading, setIsLoading] = useState(false)
  const [scaledIngredients, setScaledIngredients] = useState<Ingredient[]>(
    meal.ingredients || []
  )

  useEffect(() => {
    const baseServings = meal.servings || 1
    const baseIngredients = meal.ingredients || []
    const currentServings = servingsToPlan || 0

    if (baseServings <= 0 || currentServings <= 0) {
      setScaledIngredients(baseIngredients)
      return
    }

    const scaleFactor = currentServings / baseServings
    const newScaledIngredients = baseIngredients.map((ingredient) => ({
      ...ingredient,
      amount: (ingredient.amount || 0) * scaleFactor,
    }))
    setScaledIngredients(newScaledIngredients)
  }, [servingsToPlan, meal.ingredients, meal.servings])

  const handleSavePlan = async () => {
    if (!servingsToPlan || servingsToPlan <= 0) {
      toast.error('Vennligst oppgi et gyldig antall porsjoner.')
      return
    }
    setIsLoading(true)
    const toastId = toast.loading('Lagrer plan...')

    try {
      // If there's an existing plan, delete it first
      if (existingPlanId) {
        await deleteDoc(doc(db, 'mealPlans', existingPlanId))
      }

      // Add the new meal plan
      await addDoc(collection(db, 'mealPlans'), {
        date: format(selectedDate, 'yyyy-MM-dd'),
        mealId: meal.id,
        mealName: meal.name,
        imageUrl: meal.imageUrl || null,
        plannedServings: servingsToPlan,
        scaledIngredients: scaledIngredients,
        instructions: meal.instructions,
        isShopped: false,
        prepTime: meal.prepTime || null,
        costEstimate: meal.costEstimate || null,
      })

      toast.success(
        existingPlanId
          ? `Middagen er byttet til '${meal.name}'!`
          : `'${meal.name}' er lagt til i kalenderen!`,
        { id: toastId }
      )
      onPlanSaved()
    } catch (error) {
      console.error('Feil ved lagring av plan:', error)
      toast.error('En feil oppstod. Prøv igjen.', { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          <span className="material-icons text-base">arrow_back</span>
          Tilbake til biblioteket
        </button>
      </div>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/3 flex-shrink-0">
          {meal.imageUrl ? (
            <Image
              src={meal.imageUrl}
              alt={meal.name}
              width={400}
              height={300}
              unoptimized={true}
              className="w-full h-60 object-contain rounded-lg shadow-md"
            />
          ) : (
            <div className="w-full h-60 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
              Bilde mangler
            </div>
          )}
        </div>
        <div className="md:w-2/3">
          <h3 className="text-2xl font-bold text-gray-800 mb-2">{meal.name}</h3>
          <div className="flex gap-4 text-gray-600 mb-4">
            <p className="flex items-center gap-1">
              Originaloppskrift for {meal.servings || '?'} porsjoner
            </p>
            {(meal.prepTime ?? 0) > 0 && (
              <p className="flex items-center gap-1">
                <span className="material-icons text-base">schedule</span>
                {meal.prepTime} min
              </p>
            )}
            {(meal.costEstimate ?? 0) > 0 && (
              <p className="flex items-center gap-1">
                <span className="material-icons text-base">payments</span>
                {meal.costEstimate} kr
              </p>
            )}
          </div>
          <div className="mb-6">
            <label
              htmlFor="servings"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Hvor mange porsjoner skal du lage?
            </label>
            <input
              type="number"
              id="servings"
              value={servingsToPlan ?? ''}
              onChange={(e) =>
                setServingsToPlan(Number(e.target.value) || null)
              }
              className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              min="1"
              placeholder="f.eks. 4"
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
        <div>
          <h4 className="text-lg font-semibold mb-2 text-gray-800">
            Ingredienser (for {servingsToPlan} porsjoner)
          </h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            {scaledIngredients?.map((ing, index) => (
              <li key={index}>
                <span className="font-medium">
                  {formatAmount(ing.amount)} {ing.unit}
                </span>{' '}
                {ing.name}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-2 text-gray-800">
            Instruksjoner
          </h4>
          <div className="text-gray-700 whitespace-pre-wrap">
            {meal.instructions || 'Instruksjoner mangler.'}
          </div>
        </div>
      </div>
      <div className="flex justify-end mt-6">
        <button
          onClick={handleSavePlan}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
        >
          <span className="material-icons text-base">calendar_today</span>
          {isLoading ? 'Lagrer...' : 'Lagre i kalender'}
        </button>
      </div>
    </div>
  )
}
