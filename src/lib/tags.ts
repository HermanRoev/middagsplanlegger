import { collection, getDocs, doc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { COLLECTIONS } from './constants'

export interface MasterTag {
    id: string // The tag name
}

export const getAllTags = async (): Promise<MasterTag[]> => {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.TAGS))
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
    }))
}

export const addTag = async (name: string) => {
    const tagName = name.trim()
    if (!tagName) return

    const docRef = doc(db, COLLECTIONS.TAGS, tagName)
    return await setDoc(docRef, {})
}
