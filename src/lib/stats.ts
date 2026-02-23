import { doc, setDoc, increment, getDoc } from 'firebase/firestore'
import { db } from './firebase'

export type StatType = 'mealsPlanned' | 'mealsCooked' | 'itemsShopped' | 'recipesCreated'

export const incrementUserStat = async (userId: string, statType: StatType, count: number = 1) => {
    if (!userId) return

    const statsRef = doc(db, 'userStats', userId)

    try {
        // We use setDoc with merge to ensure the document exists before we try to increment it.
        // If it doesn't exist, this creates it with the incremented value.
        await setDoc(statsRef, {
            [statType]: increment(count),
            lastActive: new Date().toISOString()
        }, { merge: true })
    } catch (error) {
        console.error(`Failed to increment stat ${statType} for user ${userId}:`, error)
    }
}
