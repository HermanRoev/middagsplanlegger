// src/hooks/useFavorites.ts
import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/firebase'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Meal } from '@/types'
import toast from 'react-hot-toast'

export function useFavorites() {
  const { user } = useAuth()
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [favoriteMeals, setFavoriteMeals] = useState<Meal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFavoriteIds = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }
    try {
      const favDocRef = doc(db, 'favorites', user.uid)
      const favDocSnap = await getDoc(favDocRef)
      if (favDocSnap.exists()) {
        setFavoriteIds(favDocSnap.data().mealIds || [])
      } else {
        setFavoriteIds([])
      }
    } catch (err) {
      console.error('Error fetching favorite IDs:', err)
      setError('Kunne ikke hente favoritt-IDer.')
      toast.error('Kunne ikke hente favoritt-IDer.')
    }
  }, [user])

  const fetchFavoriteMeals = useCallback(async () => {
    if (favoriteIds.length === 0) {
      setFavoriteMeals([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const mealsRef = collection(db, 'meals')
      const q = query(mealsRef, where('__name__', 'in', favoriteIds))
      const querySnapshot = await getDocs(q)
      const mealsData = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Meal
      )
      setFavoriteMeals(mealsData)
    } catch (err) {
      console.error('Error fetching favorite meals:', err)
      setError('Kunne ikke hente favorittmåltider.')
      toast.error('Kunne ikke hente favorittmåltider.')
    } finally {
      setIsLoading(false)
    }
  }, [favoriteIds])

  useEffect(() => {
    fetchFavoriteIds()
  }, [user, fetchFavoriteIds])

  useEffect(() => {
    fetchFavoriteMeals()
  }, [favoriteIds, fetchFavoriteMeals])

  const addFavorite = async (mealId: string) => {
    if (!user) {
      toast.error('Du må være logget inn for å legge til favoritter.')
      return
    }
    try {
      const favDocRef = doc(db, 'favorites', user.uid)
      const favDocSnap = await getDoc(favDocRef)
      if (favDocSnap.exists()) {
        await updateDoc(favDocRef, {
          mealIds: arrayUnion(mealId),
        })
      } else {
        await setDoc(favDocRef, { mealIds: [mealId] })
      }
      setFavoriteIds((prev) => [...prev, mealId])
      toast.success('Måltid lagt til i favoritter!')
    } catch (err) {
      console.error('Error adding favorite:', err)
      toast.error('Kunne ikke legge til favoritt.')
    }
  }

  const removeFavorite = async (mealId: string) => {
    if (!user) {
      toast.error('Du må være logget inn for å fjerne favoritter.')
      return
    }
    try {
      const favDocRef = doc(db, 'favorites', user.uid)
      await updateDoc(favDocRef, {
        mealIds: arrayRemove(mealId),
      })
      setFavoriteIds((prev) => prev.filter((id) => id !== mealId))
      toast.success('Måltid fjernet fra favoritter.')
    } catch (err) {
      console.error('Error removing favorite:', err)
      toast.error('Kunne ikke fjerne favoritt.')
    }
  }

  const isFavorite = (mealId: string) => favoriteIds.includes(mealId)

  return {
    favoriteMeals,
    isLoading,
    error,
    addFavorite,
    removeFavorite,
    isFavorite,
    refetchFavorites: fetchFavoriteIds,
  }
}
