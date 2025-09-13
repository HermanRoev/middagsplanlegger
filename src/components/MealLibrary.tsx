// Fil: src/components/MealLibrary.tsx
'use client'

import { useState, useEffect } from 'react'
import { useMeals } from '@/hooks/useMeals'
import { Meal } from '@/types'
import { Skeleton } from './ui/Skeleton'
import { MealCard } from './MealCard'

interface MealLibraryProps {
  onSelectMeal: (meal: Meal) => void
}

export function MealLibrary({ onSelectMeal }: MealLibraryProps) {
  const { meals: allMeals, isLoading } = useMeals()
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const results = allMeals.filter((meal) =>
      meal.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredMeals(results)
  }, [searchTerm, allMeals])

  return (
    <div className="bg-white p-8 rounded-xl shadow-xl w-full">
      <div className="mb-6">
        <div role="search">
          <label htmlFor="meal-search" className="sr-only">
            Søk etter middag
          </label>
          <input
            id="meal-search"
            type="search"
            placeholder="Søk etter middag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[360px] px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            aria-label="Søk etter middag"
          />
        </div>
      </div>
      {isLoading ? (
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-xl overflow-hidden group flex flex-col justify-between transition-all duration-200 bg-white shadow-sm w-[220px] h-[180px]"
            >
              <div className="mt-2 flex-grow flex flex-col items-center text-center w-full h-full justify-center px-4">
                <Skeleton className="w-full h-24 rounded-md mb-1" />
                <Skeleton className="h-6 w-3/4 mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {filteredMeals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onClick={() => onSelectMeal(meal)}
            />
          ))}
        </div>
      )}
      {filteredMeals.length === 0 && !isLoading && (
        <p className="text-center text-gray-500">
          Ingen middager funnet som passer søket.
        </p>
      )}
    </div>
  )
}
