'use client'

import { useState, useEffect, useMemo } from 'react'
import { useMeals } from '@/hooks/useMeals'
import { useFavorites } from '@/hooks/useFavorites'
import { Meal } from '@/types'
import { Skeleton } from './ui/Skeleton'
import { MealCard } from './MealCard'

interface MealLibraryProps {
  onSelectMeal: (meal: Meal) => void
}

export function MealLibrary({ onSelectMeal }: MealLibraryProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all')
  const {
    meals: allMeals,
    isLoading: isLoadingMeals,
    error: mealsError,
  } = useMeals()
  const {
    favoriteMeals,
    isLoading: isLoadingFavorites,
    error: favoritesError,
    isFavorite,
    addFavorite,
    removeFavorite,
  } = useFavorites()

  const [searchTerm, setSearchTerm] = useState('')

  const mealsToDisplay = useMemo(() => {
    const sourceMeals = activeTab === 'all' ? allMeals : favoriteMeals
    if (!searchTerm) {
      return sourceMeals
    }
    return sourceMeals.filter((meal) =>
      meal.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [activeTab, allMeals, favoriteMeals, searchTerm])

  const isLoading = isLoadingMeals || isLoadingFavorites

  const renderMealCards = (meals: Meal[]) => {
    if (meals.length === 0) {
      return (
        <p className="text-center text-gray-500 col-span-full">
          {activeTab === 'favorites'
            ? 'Du har ingen favorittmiddager enda. Trykk på stjernen på en middag for å legge den til.'
            : 'Ingen middager funnet som passer søket.'}
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

  const TabButton = ({ tabName, title }: { tabName: 'all' | 'favorites', title: string }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
        activeTab === tabName
          ? 'bg-blue-600 text-white shadow-md'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      {title}
    </button>
  )

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center bg-gray-100 p-1 rounded-lg">
           <TabButton tabName="all" title="Alle Middager" />
           <TabButton tabName="favorites" title="Favoritter" />
        </div>
        <div role="search">
          <label htmlFor="meal-search" className="sr-only">
            Søk i {activeTab === 'all' ? 'alle middager' : 'favoritter'}
          </label>
          <input
            id="meal-search"
            type="search"
            placeholder="Søk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
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
          {renderMealCards(mealsToDisplay)}
        </div>
      )}
    </div>
  )
}
