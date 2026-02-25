import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from './firebase'
import { COLLECTIONS } from './constants'

export interface MasterIngredient {
  id: string // lowercase doc ID
  displayName: string // proper-cased display name
}

export const getAllIngredients = async (): Promise<MasterIngredient[]> => {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.INGREDIENTS))
  return querySnapshot.docs.map((d) => ({
    id: d.id,
    displayName: d.data().displayName || d.id,
  }))
}

export const addIngredientToMasterList = async (name: string) => {
  const displayName = name.trim()
  if (!displayName) return

  const docId = displayName.toLowerCase()
  const docRef = doc(db, COLLECTIONS.INGREDIENTS, docId)

  // Only update displayName if the doc doesn't exist yet, or if the existing one is lowercase-only
  const existing = await getDoc(docRef)
  if (!existing.exists()) {
    return await setDoc(docRef, { displayName })
  } else {
    // Update displayName if the new one has better casing (not all-lowercase)
    const currentDisplay = existing.data().displayName
    if (!currentDisplay || currentDisplay === docId) {
      return await setDoc(docRef, { displayName }, { merge: true })
    }
  }
}
