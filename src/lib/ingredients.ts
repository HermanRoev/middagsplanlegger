import { collection, getDocs, doc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { COLLECTIONS } from './constants'

export interface MasterIngredient {
  id: string // The name of the ingredient
}

export const getAllIngredients = async (): Promise<MasterIngredient[]> => {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.INGREDIENTS))
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
  }))
}

export const addIngredientToMasterList = async (name: string) => {
  const ingredientName = name.trim().toLowerCase()
  if (!ingredientName) return

  const docRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientName)
  return await setDoc(docRef, {})
}
