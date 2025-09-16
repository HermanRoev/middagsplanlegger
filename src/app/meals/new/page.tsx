// Fil: src/app/meals/new/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { db, storage } from '@/lib/firebase'
import { collection, addDoc, doc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { MainLayout } from '@/components/MainLayout'
import { MealForm } from '@/components/MealForm'
import { Meal } from '@/types'
import toast from 'react-hot-toast'
import { useState, useEffect } from 'react'

export default function NewMealPage() {
  const router = useRouter()
  const [initialData, setInitialData] = useState<Omit<Meal, 'id'> | undefined>(
    undefined
  )

  useEffect(() => {
    const importedRecipeJson = sessionStorage.getItem('importedRecipe')
    if (importedRecipeJson) {
      try {
        const recipe = JSON.parse(importedRecipeJson)
        setInitialData(recipe)
        sessionStorage.removeItem('importedRecipe')
      } catch (error) {
        console.error(
          'Could not parse imported recipe from sessionStorage',
          error
        )
      }
    }
  }, [])

  const handleCreateMeal = async (
    mealData: Omit<Meal, 'id'>,
    imageFile: File | null
  ) => {
    const toastId = toast.loading('Lagrer ny middag...')
    try {
      let imageUrl = ''
      if (imageFile) {
        const storageRef = ref(storage, `meals/${Date.now()}_${imageFile.name}`)
        await uploadBytes(storageRef, imageFile)
        imageUrl = await getDownloadURL(storageRef)
      }

      await addDoc(collection(db, 'meals'), {
        ...mealData,
        imageUrl,
      })

      // Add new ingredients to the master list
      for (const ingredient of mealData.ingredients) {
        await setDoc(doc(db, 'ingredients', ingredient.name), {})
      }

      toast.success(`Middagen '${mealData.name}' er lagret!`, { id: toastId })
      router.push('/') // Redirect user back to the calendar
    } catch (error) {
      console.error('Error creating meal:', error)
      toast.error('Kunne ikke lagre middagen.', { id: toastId })
    }
  }

  return (
    <MainLayout>
      <div className="bg-white p-8 rounded-xl shadow-xl w-full">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">
          {initialData ? 'Importert Oppskrift' : 'Legg til ny middag'}
        </h2>
        <MealForm
          onSave={handleCreateMeal}
          isEditing={false}
          initialData={initialData}
        />
      </div>
    </MainLayout>
  )
}
