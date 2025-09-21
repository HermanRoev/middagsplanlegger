import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import { COLLECTIONS } from './constants'
import { CupboardItem } from '@/types'
import { getCurrentUser } from './auth'

export const getCupboardItems = async (): Promise<CupboardItem[]> => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const q = query(
    collection(db, COLLECTIONS.CUPBOARD),
    where('userId', '==', user.uid)
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as CupboardItem
  )
}

export const addCupboardItem = async (
  item: Omit<CupboardItem, 'id' | 'userId'>
) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  // Ensure ingredientName is lowercase for consistency
  const itemToAdd = {
    ...item,
    ingredientName: item.ingredientName.toLowerCase(),
    userId: user.uid,
  }

  return await addDoc(collection(db, COLLECTIONS.CUPBOARD), itemToAdd)
}

export const updateCupboardItem = async (
  id: string,
  updates: Partial<Omit<CupboardItem, 'id' | 'userId'>>
) => {
  const itemRef = doc(db, COLLECTIONS.CUPBOARD, id)
  return await updateDoc(itemRef, updates)
}

export const deleteCupboardItem = async (id: string) => {
  const itemRef = doc(db, COLLECTIONS.CUPBOARD, id)
  return await deleteDoc(itemRef)
}
