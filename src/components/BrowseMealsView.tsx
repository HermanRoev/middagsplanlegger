// Fil: src/components/BrowseMealsView.tsx
'use client'

import { useState, useEffect } from 'react'
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

export function BrowseMealsView() {
  const [activeMeal, setActiveMeal] = useState<Meal | null>(null)
  const handleCloseDetail = () => setActiveMeal(null)
  const { meals: allMeals, isLoading, refetch } = useMeals()
  const { addFavorite, removeFavorite, isFavorite } = useFavorites()
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 100)

  useEffect(() => {
    const results = allMeals.filter((meal) =>
      meal.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    )
    setFilteredMeals(results)
  }, [debouncedSearch, allMeals])

  const handleDeleteMeal = async (mealId: string, mealName: string) => {
    if (
      window.confirm(
        `Er du sikker på at du vil slette '${mealName}'? Denne handlingen kan ikke angres.`
      )
    ) {
      const toastId = toast.loading(`Sletter '${mealName}'...`)
      try {
        await deleteDoc(doc(db, 'meals', mealId))
        await refetch() // Re-fetch meals to update the list
        toast.success(`'${mealName}' ble slettet.`, { id: toastId })
      } catch (error) {
        console.error('Feil ved sletting av middag:', error)
        toast.error('En feil oppstod under sletting.', { id: toastId })
      }
    }
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-xl w-full">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">
        Middagsbibliotek
      </h2>

      <input
        type="text"
        placeholder="Søk etter middag..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full max-w-lg px-4 py-2 border border-gray-300 rounded-lg mb-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm"
            >
              <Skeleton className="h-40 w-full" />
              <div className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
              </div>
              <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
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
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3 flex-shrink-0">
              {activeMeal.imageUrl ? (
                <Image
                  src={activeMeal.imageUrl}
                  alt={activeMeal.name}
                  width={400}
                  height={180}
                  className="w-full h-44 object-contain rounded-lg shadow-md mb-2"
                />
              ) : (
                <div className="w-full h-44 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                  Bilde mangler
                </div>
              )}
            </div>
            <div className="md:w-2/3">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                {activeMeal.name}
              </h3>
              <div className="flex gap-4 text-gray-600 mb-4">
                <p>
                  Originaloppskrift for {activeMeal.servings || '?'} porsjoner
                </p>
                {(activeMeal.prepTime ?? 0) > 0 && (
                  <p className="flex items-center gap-1">
                    <span className="material-icons text-base">schedule</span>
                    {activeMeal.prepTime} min
                  </p>
                )}
                {(activeMeal.costEstimate ?? 0) > 0 && (
                  <p className="flex items-center gap-1">
                    <span className="material-icons text-base">payments</span>
                    {activeMeal.costEstimate} kr
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
                <div>
                  <h4 className="text-lg font-semibold mb-2 text-gray-800">
                    Ingredienser
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {activeMeal.ingredients?.map((ing, idx) => (
                      <li key={idx}>
                        {ing.amount !== undefined && ing.unit ? (
                          <span className="font-medium">
                            {ing.amount} {ing.unit}
                          </span>
                        ) : null}{' '}
                        {typeof ing === 'string' ? ing : ing.name}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-2 text-gray-800">
                    Instruksjoner
                  </h4>
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {activeMeal.instructions || 'Instruksjoner mangler.'}
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-4">
                <Link
                  href={`/meals/edit/${activeMeal.id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <span className="material-icons text-base align-middle">
                    edit
                  </span>
                  Rediger
                </Link>
                <button
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
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
            </div>
          </div>
        </Modal>
      )}
      {filteredMeals.length === 0 && !isLoading && (
        <p className="text-center text-gray-500 mt-8">
          Ingen middager funnet som passer søket.
        </p>
      )}
    </div>
  )
}
