'use client'

import { useState } from 'react'
import { db, storage } from '@/lib/firebase'
import { collection, addDoc, doc, deleteDoc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { format } from 'date-fns'
import { COLLECTIONS } from '@/lib/constants'
import { Meal } from '@/types'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { MealForm } from './MealForm'
import { Modal } from './Modal'
import { MealDetailView } from './MealDetailView'

interface AddMealToPlanViewProps {
  meal: Meal
  selectedDate: Date
  onBack: () => void
  onPlanSaved: () => void
  existingPlanId?: string
  isInsideModal?: boolean
}

export function AddMealToPlanView({
  meal,
  selectedDate,
  onBack,
  onPlanSaved,
  existingPlanId,
  isInsideModal,
}: AddMealToPlanViewProps) {
  const { user } = useAuth()
  const [servingsToPlan, setServingsToPlan] = useState<number | null>(
    meal.servings || 1
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  // Use a different state for the meal being displayed/planned, which can be updated by the edit form
  const [currentMeal, setCurrentMeal] = useState<Meal>(meal)

  const handleSavePlan = async () => {
    if (!servingsToPlan || servingsToPlan <= 0) {
      toast.error('Vennligst oppgi et gyldig antall porsjoner.')
      return
    }
    setIsLoading(true)
    const toastId = toast.loading('Lagrer plan...')

    try {
      if (existingPlanId) {
        await deleteDoc(doc(db, COLLECTIONS.MEAL_PLANS, existingPlanId))
      }

      const baseServings = currentMeal.servings || 1
      const plannedServings = servingsToPlan || 1
      const scaledIngredients = (currentMeal.ingredients || []).map(
        (ingredient) => {
          const amountPerServing = (ingredient.amount || 0) / baseServings
          const scaledAmount = amountPerServing * plannedServings
          return {
            ...ingredient,
            amount: scaledAmount,
          }
        }
      )

      await addDoc(collection(db, COLLECTIONS.MEAL_PLANS), {
        date: format(selectedDate, 'yyyy-MM-dd'),
        mealId: currentMeal.id,
        mealName: currentMeal.name,
        imageUrl: currentMeal.imageUrl || null,
        plannedServings: servingsToPlan,
        scaledIngredients: scaledIngredients,
        instructions: currentMeal.instructions,
        isShopped: false,
        prepTime: currentMeal.prepTime || null,
        costEstimate: currentMeal.costEstimate || null,
        plannedBy: user
          ? { id: user.uid, name: user.displayName || 'Ukjent bruker' }
          : undefined,
        originalMealId: meal.id, // Keep track of the original meal
        servings: currentMeal.servings || 1, // Save the base servings
      })

      toast.success(
        existingPlanId
          ? `Middagen er byttet til '${currentMeal.name}'!`
          : `'${currentMeal.name}' er lagt til i kalenderen!`,
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

  const handleSaveEditedMeal = async (
    editedMealData: Omit<Meal, 'id'>,
    imageFile: File | null
  ) => {
    const saveAsNew = window.confirm(
      'Vil du lagre dette som en helt ny middag i biblioteket?\n\n' +
        "Trykk 'OK' for å lagre som en ny middag.\n" +
        "Trykk 'Avbryt' for å bare bruke endringene for denne dagen."
    )

    if (saveAsNew) {
      const toastId = toast.loading('Lagrer som ny middag...')
      try {
        let imageUrl = editedMealData.imageUrl || ''
        if (imageFile) {
          const storageRef = ref(
            storage,
            `meals/${Date.now()}_${imageFile.name}`
          )
          await uploadBytes(storageRef, imageFile)
          imageUrl = await getDownloadURL(storageRef)
        }

        const newMealDoc = await addDoc(collection(db, COLLECTIONS.MEALS), {
          ...editedMealData,
          imageUrl,
          createdBy: user
            ? { id: user.uid, name: user.displayName || 'Ukjent bruker' }
            : undefined,
        })

        for (const ingredient of editedMealData.ingredients) {
          await setDoc(doc(db, COLLECTIONS.INGREDIENTS, ingredient.name), {})
        }

        setCurrentMeal({ ...editedMealData, id: newMealDoc.id, imageUrl })
        toast.success(`Ny middag '${editedMealData.name}' lagret!`, {
          id: toastId,
        })
      } catch (error) {
        console.error('Error creating new meal:', error)
        toast.error('Kunne ikke lagre ny middag.', { id: toastId })
        return // Stop if saving as new fails
      }
    } else {
      // Just use the edits for this day
      setCurrentMeal({ ...currentMeal, ...editedMealData })
      toast.success('Endringene brukes for denne dagen.')
    }

    setIsEditModalOpen(false)
    setIsEditing(false)
  }

  if (isInsideModal && isEditing) {
    return (
      <MealForm
        initialData={currentMeal}
        onSave={handleSaveEditedMeal}
        isEditing={true}
      />
    )
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
      <MealDetailView meal={currentMeal} servings={servingsToPlan || 0}>
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
            onChange={(e) => setServingsToPlan(Number(e.target.value) || null)}
            className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            min="1"
            placeholder="f.eks. 4"
          />
        </div>
      </MealDetailView>
      <div className="flex justify-end mt-6 gap-4">
        <button
          onClick={() =>
            isInsideModal ? setIsEditing(true) : setIsEditModalOpen(true)
          }
          disabled={isLoading}
          className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:bg-gray-400 flex items-center gap-2"
        >
          <span className="material-icons text-base">edit</span>
          Rediger kun for i dag
        </button>
        <button
          onClick={handleSavePlan}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
        >
          <span className="material-icons text-base">calendar_today</span>
          {isLoading ? 'Lagrer...' : 'Lagre i kalender'}
        </button>
      </div>

      {!isInsideModal && isEditModalOpen && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Rediger: ${currentMeal.name}`}
        >
          <MealForm
            initialData={currentMeal}
            onSave={handleSaveEditedMeal}
            isEditing={true}
          />
        </Modal>
      )}
    </div>
  )
}
