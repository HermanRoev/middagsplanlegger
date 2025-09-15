import { auth, storage } from './firebase'
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword as firebaseUpdatePassword,
  type User,
} from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export type AuthUser = User | null

export const signIn = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  } catch (error) {
    console.error('Auth error:', error)
    throw error
  }
}

export const signOut = async () => {
  try {
    await firebaseSignOut(auth)
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

export const getCurrentUser = (): Promise<AuthUser> => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe()
        resolve(user)
      },
      reject
    )
  })
}

export const subscribeToAuthChanges = (
  callback: (user: AuthUser) => void
): (() => void) => {
  return onAuthStateChanged(auth, callback)
}

export const uploadProfilePicture = async (
  file: File,
  userId: string
): Promise<string> => {
  try {
    const storageRef = ref(storage, `profile-pictures/${userId}`)
    await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(storageRef)
    return downloadURL
  } catch (error) {
    console.error('Error uploading profile picture:', error)
    throw error
  }
}

export const updateUserProfile = async (
  displayName: string,
  photoURL?: string
) => {
  const user = auth.currentUser
  if (!user) throw new Error('User not found')

  try {
    await updateProfile(user, {
      displayName,
      ...(photoURL && { photoURL }),
    })
  } catch (error) {
    console.error('Error updating user profile:', error)
    throw error
  }
}

export const updateUserPassword = async (newPassword: string) => {
  const user = auth.currentUser
  if (!user) throw new Error('User not found')

  try {
    await firebaseUpdatePassword(user, newPassword)
  } catch (error) {
    console.error('Error updating password:', error)
    throw error
  }
}
