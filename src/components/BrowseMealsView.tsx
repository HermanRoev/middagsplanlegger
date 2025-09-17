'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { db } from '@/lib/firebase'
import { doc, deleteDoc } from 'firebase/firestore'
import { useMeals } from '@/hooks/useMeals'
import { useFavorites } from '@/hooks/useFavorites'
import { useDebounce } from '@/hooks/useDebounce'
import { Meal } from '@/types'
import { Skeleton } from './ui/Skeleton'
import { Modal } from './Modal'
import toast from 'react-hot-toast'
import { MealCard } from './MealCard'
import { MealDetailView } from './MealDetailView'
import InputField from './ui/InputField'

type SortOption = 'name' | 'favorites'

export function BrowseMealsView() {
  const [activeMeal, setActiveMeal] = useState<Meal | null>(null)
  const handleCloseDetail = () => setActiveMeal(null)
  const { meals: allMeals, isLoading, refetch } = useMeals()
  const { addFavorite, removeFavorite, isFavorite } = useFavorites()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOption>('name')
  const debouncedSearch = useDebounce(searchTerm, 100)

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

  const handleDeleteMeal = async (mealId: string, mealName: string) => {
    if (
      window.confirm(
        `Er du sikker på at du vil slette '${mealName}'? Denne handlingen kan ikke angres.`
      )
    ) {
      const toastId = toast.loading(`Sletter '${mealName}'...`)
      try {
        await deleteDoc(doc(db, 'meals', mealId))
        await refetch()
        toast.success(`'${mealName}' ble slettet.`, { id: toastId })
      } catch (error) {
        console.error('Feil ved sletting av middag:', error)
        toast.error('En feil oppstod under sletting.', { id: toastId })
      }
    }
  }

  return (
    <div className="bg-gray-50 p-4 sm:p-6 lg:p-8 min-h-full">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Middagsbibliotek</h1>
        <p className="text-gray-600 mt-1">
          Søk og finn inspirasjon til din neste middag.
        </p>
      </header>

      <div className="mb-8 flex items-center gap-4">
        <div className="flex-grow max-w-md">
          <InputField
            id="meal-search"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md h-64">
              <Skeleton className="h-40 w-full" />
              <div className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {sortedAndFilteredMeals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onClick={() => setActiveMeal(meal)}
              isFavorite={isFavorite(meal.id)}
              onToggleFavorite={() =>
                isFavorite(meal.id)
                  ? removeFavorite(meal.id)
                  : addFavorite(meal.id)
              }
            />
          ))}
        </div>
      )}
      {activeMeal && (
        <Modal
          isOpen={!!activeMeal}
          onClose={handleCloseDetail}
          title={activeMeal.name}
        >
          <MealDetailView
            meal={activeMeal}
            servings={activeMeal.servings ?? undefined}
          >
            <div className="flex gap-4 mt-6">
              <Link
                  href={`/meals/edit/${activeMeal.id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
                >
                  <span className="material-icons text-base align-middle">
                    edit
                  </span>
                  Rediger
                </Link>
                <button
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
                  onClick={() => {
                    handleDeleteMeal(activeMeal.id, activeMeal.name)
                    handleCloseDetail()
                  }}
                >
                  <span className="material-icons text-base align-middle">
                    delete
                  </span>
                  Slett
                </button>
              </div>
            </MealDetailView>
        </Modal>
      )}
      {sortedAndFilteredMeals.length === 0 && !isLoading && (
        <div className="text-center text-gray-500 mt-12">
          <p className="text-lg">Ingen middager funnet</p>
          <p>Prøv et annet søkeord.</p>
        </div>
      )}
    </div>
  )
}
