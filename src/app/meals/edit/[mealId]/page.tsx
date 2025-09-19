// Fil: src/app/meals/edit/[mealId]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db, storage } from '@/lib/firebase'
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { MainLayout } from '@/components/MainLayout'
import { MealForm } from '@/components/MealForm'
import { Meal } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function EditMealPage({ params }: any) {
  const router = useRouter()
  // We still get type safety for mealId by destructuring it here.
  const { mealId } = params as { mealId: string }
  const [initialData, setInitialData] = useState<Meal | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!mealId) return

    const fetchMealData = async () => {
      const docRef = doc(db, 'meals', mealId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        setInitialData({ id: docSnap.id, ...docSnap.data() } as Meal)
      } else {
        console.error('No such meal found!')
        router.push('/meals/browse')
      }
      setIsLoading(false)
    }

    fetchMealData()
  }, [mealId, router])

  const handleUpdateMeal = async (
    mealData: Omit<Meal, 'id'>,
    imageFile: File | null
  ) => {
    let imageUrl = mealData.imageUrl
    if (imageFile) {
      const storageRef = ref(storage, `meals/${Date.now()}_${imageFile.name}`)
      await uploadBytes(storageRef, imageFile)
      imageUrl = await getDownloadURL(storageRef)
    }

    const mealRef = doc(db, 'meals', mealId)
    await updateDoc(mealRef, {
      ...mealData,
      imageUrl,
    })

    for (const ingredient of mealData.ingredients) {
      await setDoc(doc(db, 'ingredients', ingredient.name), {})
    }

    alert(`Meal '${mealData.name}' has been updated!`)
    router.push('/meals/browse')
  }

  if (isLoading) {
    return (
      <MainLayout>
        <p className="text-center">Loading meal data...</p>
      </MainLayout>
    )
  }

  if (!initialData) {
    return (
      <MainLayout>
        <p className="text-center">Could not load the meal.</p>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="bg-white p-8 rounded-xl shadow-xl w-full">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">
          Rediger middag
        </h2>
        <div className="max-w-2xl mx-auto">
          <MealForm
            onSave={handleUpdateMeal}
            initialData={initialData}
            isEditing={true}
          />
        </div>
      </div>
    </MainLayout>
  )
}
