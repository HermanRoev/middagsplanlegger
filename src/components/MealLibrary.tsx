'use client'

import { useState, useMemo } from 'react'
import { useMeals } from '@/hooks/useMeals'
import { useFavorites } from '@/hooks/useFavorites'
import { useDebounce } from '@/hooks/useDebounce'
import { Meal } from '@/types'
import { MealCard } from './MealCard'
import { MealCardSkeleton } from './MealCardSkeleton'
import InputField from './ui/InputField'

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
        <div className="flex-grow w-full sm:w-auto sm:max-w-md">
          <InputField
            id="meal-library-search"
            label="Søk etter middag..."
            icon="search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
          {Array.from({ length: 8 }).map((_, i) => (
            <MealCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
          {renderMealCards(sortedAndFilteredMeals)}
        </div>
      )}
    </div>
  )
}
