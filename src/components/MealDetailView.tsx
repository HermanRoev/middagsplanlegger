'use client'

import Image from 'next/image'
import { Meal, Ingredient } from '@/types'

interface MealDetailViewProps {
  meal: Meal | null
  children?: React.ReactNode
  servings?: number
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
}: MealDetailViewProps) {
  if (!meal) return null

  const baseServings = meal.servings || 1
  const plannedServings = servings || 0
  const scaleFactor =
    baseServings > 0 && plannedServings > 0 ? plannedServings / baseServings : 1

  const scaledIngredients = (meal.ingredients || []).map((ingredient) => ({
    ...ingredient,
    amount: (ingredient.amount || 0) * scaleFactor,
  }))

  return (
    <div className="flex flex-col">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/3 flex-shrink-0">
          {meal.imageUrl ? (
            <Image
              src={meal.imageUrl}
              alt={meal.name}
              width={400}
              height={300}
              unoptimized
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
          {children}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
        <div>
          <h4 className="text-lg font-semibold mb-2 text-gray-800">
            Ingredienser (for {servings || 0} porsjoner)
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
          <div className="text-gray-700 prose prose-sm max-w-none">
            {Array.isArray(meal.instructions) &&
            meal.instructions.length > 0 ? (
              <div className="space-y-2">
                {meal.instructions.map((step, index) => (
                  <div key={index}>
                    <span className="font-bold">Steg {index + 1}:</span> {step}
                  </div>
                ))}
              </div>
            ) : (
              'Instruksjoner mangler.'
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
