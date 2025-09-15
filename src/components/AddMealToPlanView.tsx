'use client'

import { useState, useEffect } from 'react'
import { db, storage } from '@/lib/firebase'
import { collection, addDoc, doc, deleteDoc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { format } from 'date-fns'
import { Ingredient, Meal } from '@/types'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { MealForm } from './MealForm'
import { Modal } from './Modal'

interface AddMealToPlanViewProps {
  meal: Meal
  selectedDate: Date
  onBack: () => void
  onPlanSaved: () => void
  existingPlanId?: string
}

const formatAmount = (amount: number | null) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return ''
  }
  if (amount === 0) return '0'
  return Number.isInteger(amount) ? amount.toString() : parseFloat(amount.toFixed(1)).toString()
}

export function AddMealToPlanView({
  meal,
  selectedDate,
  onBack,
  onPlanSaved,
  existingPlanId,
}: AddMealToPlanViewProps) {
  const { user } = useAuth()
  const [servingsToPlan, setServingsToPlan] = useState<number | null>(
    meal.servings || 1
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  // Use a different state for the meal being displayed/planned, which can be updated by the edit form
  const [currentMeal, setCurrentMeal] = useState<Meal>(meal)
  const [scaledIngredients, setScaledIngredients] = useState<Ingredient[]>(
    meal.ingredients || []
  )

  useEffect(() => {
    const baseServings = currentMeal.servings || 1
    const baseIngredients = currentMeal.ingredients || []
    const plannedServings = servingsToPlan || 0

    if (baseServings <= 0 || plannedServings <= 0) {
      setScaledIngredients(baseIngredients)
      return
    }

    const scaleFactor = plannedServings / baseServings
    const newScaledIngredients = baseIngredients.map((ingredient) => ({
      ...ingredient,
      amount: (ingredient.amount || 0) * scaleFactor,
    }))
    setScaledIngredients(newScaledIngredients)
  }, [servingsToPlan, currentMeal])

  const handleSavePlan = async () => {
    if (!servingsToPlan || servingsToPlan <= 0) {
      toast.error('Vennligst oppgi et gyldig antall porsjoner.')
      return
    }
    setIsLoading(true)
    const toastId = toast.loading('Lagrer plan...')

    try {
      if (existingPlanId) {
        await deleteDoc(doc(db, 'mealPlans', existingPlanId))
      }

      await addDoc(collection(db, 'mealPlans'), {
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
      "Vil du lagre dette som en helt ny middag i biblioteket?\n\n" +
      "Trykk 'OK' for å lagre som en ny middag.\n" +
      "Trykk 'Avbryt' for å bare bruke endringene for denne dagen."
    );

    if (saveAsNew) {
      const toastId = toast.loading('Lagrer som ny middag...');
      try {
        let imageUrl = editedMealData.imageUrl || '';
        if (imageFile) {
          const storageRef = ref(storage, `meals/${Date.now()}_${imageFile.name}`);
          await uploadBytes(storageRef, imageFile);
          imageUrl = await getDownloadURL(storageRef);
        }

        const newMealDoc = await addDoc(collection(db, 'meals'), {
          ...editedMealData,
          imageUrl,
          createdBy: user ? { id: user.uid, name: user.displayName || 'Ukjent bruker' } : undefined,
        });

        for (const ingredient of editedMealData.ingredients) {
          await setDoc(doc(db, 'ingredients', ingredient.name), {});
        }

        setCurrentMeal({ ...editedMealData, id: newMealDoc.id, imageUrl });
        toast.success(`Ny middag '${editedMealData.name}' lagret!`, { id: toastId });

      } catch (error) {
        console.error('Error creating new meal:', error);
        toast.error('Kunne ikke lagre ny middag.', { id: toastId });
        return; // Stop if saving as new fails
      }
    } else {
       // Just use the edits for this day
       setCurrentMeal({ ...currentMeal, ...editedMealData });
       toast.success('Endringene brukes for denne dagen.');
    }

    setIsEditModalOpen(false);
  };


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
          {currentMeal.imageUrl ? (
            <Image
              src={currentMeal.imageUrl}
              alt={currentMeal.name}
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
          <h3 className="text-2xl font-bold text-gray-800 mb-2">{currentMeal.name}</h3>
          <div className="flex gap-4 text-gray-600 mb-4">
            <p className="flex items-center gap-1">
              Originaloppskrift for {currentMeal.servings || '?'} porsjoner
            </p>
            {(currentMeal.prepTime ?? 0) > 0 && (
              <p className="flex items-center gap-1">
                <span className="material-icons text-base">schedule</span>
                {currentMeal.prepTime} min
              </p>
            )}
            {(currentMeal.costEstimate ?? 0) > 0 && (
              <p className="flex items-center gap-1">
                <span className="material-icons text-base">payments</span>
                {currentMeal.costEstimate} kr
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
            Ingredienser (for {servingsToPlan || 0} porsjoner)
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
            {currentMeal.instructions || 'Instruksjoner mangler.'}
          </div>
        </div>
      </div>
      <div className="flex justify-end mt-6 gap-4">
        <button
          onClick={() => setIsEditModalOpen(true)}
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

      {isEditModalOpen && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Rediger: ${currentMeal.name}`}
        >
          <div className="p-4 max-h-[80vh] overflow-y-auto">
            <MealForm
              initialData={currentMeal}
              onSave={handleSaveEditedMeal}
              isEditing={true}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
