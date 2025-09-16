'use client'

import Image from 'next/image'
import { Meal, Ingredient } from '@/types'

interface MealDetailViewProps {
  meal: Meal | null
  children?: React.ReactNode
  servings?: number
  isPlannedMeal?: boolean
}

const formatAmount = (amount: number | null) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return ''
  }
  if (amount === 0) return '0'
  return Number.isInteger(amount)
    ? amount.toString()
    : parseFloat(amount.toFixed(1)).toString()
}

export function MealDetailView({
  meal,
  children,
  servings,
  isPlannedMeal = false,
}: MealDetailViewProps) {
  if (!meal) return null

  const ingredientsToDisplay = (() => {
    if (isPlannedMeal) {
      return meal.ingredients || []
    }
    const baseServings = meal.servings || 1
    const plannedServings = servings || baseServings
    if (baseServings === plannedServings) {
      return meal.ingredients || []
    }
    const scaleFactor =
      baseServings > 0 && plannedServings > 0
        ? plannedServings / baseServings
        : 1
    return (meal.ingredients || []).map((ingredient) => ({
      ...ingredient,
      amount: (ingredient.amount || 0) * scaleFactor,
    }))
  })()

  return (
    <div>
      {meal.imageUrl ? (
        <Image
          src={meal.imageUrl}
          alt={meal.name}
          width={600}
          height={300}
          unoptimized
          className="w-full h-64 object-contain"
        />
      ) : (
        <div className="w-full h-64 bg-gray-200 flex items-center justify-center text-gray-400">
          <span className="material-icons text-4xl">photo_camera</span>
        </div>
      )}
      <div className="p-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">{meal.name}</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-gray-600 mb-6">
          <span className="flex items-center gap-2">
            <span className="material-icons text-lg">restaurant_menu</span>
            Originaloppskrift for {meal.servings || '?'} porsjoner
          </span>
          {(meal.prepTime ?? 0) > 0 && (
            <span className="flex items-center gap-2">
              <span className="material-icons text-lg">schedule</span>
              {meal.prepTime} min
            </span>
          )}
          {(meal.costEstimate ?? 0) > 0 && (
            <span className="flex items-center gap-2">
              <span className="material-icons text-lg">payments</span>
              {meal.costEstimate} kr
            </span>
          )}
        </div>
        {children}
        <div className="mt-8">
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
              Ingredienser (for {servings || meal.servings || 0} porsjoner)
            </h3>
            <ul className="space-y-2 text-gray-700">
              {ingredientsToDisplay?.map((ing, index) => (
                <li key={index} className="flex items-center gap-3">
                  <span className="material-icons text-blue-500">
                    arrow_right
                  </span>
                  <span>
                    <span className="font-bold">
                      {formatAmount(ing.amount)} {ing.unit}
                    </span>{' '}
                    {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
              Instruksjoner
            </h3>
            <div className="space-y-4 text-gray-700">
              {Array.isArray(meal.instructions) &&
              meal.instructions.length > 0 ? (
                meal.instructions.map((step, index) => (
                  <div key={index} className="flex gap-4">
                    <span className="flex-shrink-0 font-bold text-blue-600">
                      Steg {index + 1}:
                    </span>
                    <p>{step}</p>
                  </div>
                ))
              ) : (
                <p>Instruksjoner mangler.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
