'use client'

import { useState, useMemo } from 'react'
import { useMeals } from '@/hooks/useMeals'
import { useFavorites } from '@/hooks/useFavorites'
import { useDebounce } from '@/hooks/useDebounce'
import { Meal } from '@/types'
import { Skeleton } from './ui/Skeleton'
import { MealCard } from './MealCard'

interface MealLibraryProps {
  onSelectMeal: (meal: Meal) => void
}

type SortOption = 'name' | 'favorites'

export function MealLibrary({ onSelectMeal }: MealLibraryProps) {
  const { meals: allMeals, isLoading: isLoadingMeals } = useMeals()
  const {
    isLoading: isLoadingFavorites,
    isFavorite,
    addFavorite,
    removeFavorite,
  } = useFavorites()

  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOption>('name')
  const debouncedSearch = useDebounce(searchTerm, 300)

  const sortedAndFilteredMeals = useMemo(() => {
    const filtered = allMeals.filter((meal) =>
      meal.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    )

    if (sortOrder === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortOrder === 'favorites') {
      filtered.sort((a, b) => {
        const aIsFavorite = isFavorite(a.id)
        const bIsFavorite = isFavorite(b.id)
        if (aIsFavorite && !bIsFavorite) return -1
        if (!aIsFavorite && bIsFavorite) return 1
        return a.name.localeCompare(b.name)
      })
    }

    return filtered
  }, [debouncedSearch, allMeals, sortOrder, isFavorite])

  const isLoading = isLoadingMeals || isLoadingFavorites

  const renderMealCards = (meals: Meal[]) => {
    if (meals.length === 0 && !isLoading) {
      return (
        <p className="text-center text-gray-500 col-span-full">
          Ingen middager funnet som passer søket.
        </p>
      )
    }

    return meals.map((meal) => (
      <MealCard
        key={meal.id}
        meal={meal}
        onClick={() => onSelectMeal(meal)}
        isFavorite={isFavorite(meal.id)}
        onToggleFavorite={() =>
          isFavorite(meal.id) ? removeFavorite(meal.id) : addFavorite(meal.id)
        }
      />
    ))
  }

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-grow w-full sm:w-auto">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            search
          </span>
          <input
            type="text"
            placeholder="Søk etter middag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md pl-10 pr-4 py-2 border border-gray-300 rounded-full bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>
        <div className="relative">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOption)}
            className="appearance-none w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded-full focus:outline-none focus:bg-white focus:border-blue-500"
          >
            <option value="name">Sorter etter Navn</option>
            <option value="favorites">Sorter etter Favoritter</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <span className="material-icons text-base">expand_more</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-wrap justify-center gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-xl overflow-hidden group flex flex-col justify-between transition-all duration-200 bg-white shadow-sm w-[220px] h-[220px]"
            >
              <div className="flex-grow flex flex-col items-center text-center w-full h-full justify-center px-4 pt-8">
                <Skeleton className="w-full h-24 rounded-md mb-2" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </div>
              <div className="p-3 bg-gray-50 border-t w-full">
                <Skeleton className="h-3 w-1/2 mx-auto" />
                <Skeleton className="h-3 w-3/4 mx-auto mt-1" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-4">
          {renderMealCards(sortedAndFilteredMeals)}
        </div>
      )}
    </div>
  )
}
