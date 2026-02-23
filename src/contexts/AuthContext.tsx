"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { User, onAuthStateChanged, signOut } from "firebase/auth"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useRouter, usePathname } from "next/navigation"

interface AuthContextType {
  user: User | null
  userRole: "admin" | "user" | null
  hasProfile: boolean
  householdId: string | null
  appPhotoUrl: string | null
  loading: boolean
  logout: () => Promise<void>
  refreshAppPhotoUrl: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  hasProfile: false,
  householdId: null,
  appPhotoUrl: null,
  loading: true,
  logout: async () => { },
  refreshAppPhotoUrl: async () => { },
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<"admin" | "user" | null>(null)
  const [hasProfile, setHasProfile] = useState(false)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [appPhotoUrl, setAppPhotoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const currentUserRef = React.useRef<User | null>(null)

  const refreshAppPhotoUrl = async () => {
    const u = currentUserRef.current
    if (!u) return
    try {
      const userDoc = await getDoc(doc(db, "users", u.uid))
      if (userDoc.exists()) {
        setAppPhotoUrl(userDoc.data().photoUrl || null)
      }
    } catch (error) {
      console.error("Error refreshing appPhotoUrl:", error)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        currentUserRef.current = firebaseUser
        // Fetch user document to check for profile and role
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult()
          const isAdmin = !!idTokenResult.claims.admin

          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
          if (userDoc.exists()) {
            setUserRole(isAdmin ? "admin" : "user")
            setHasProfile(true)
            setHouseholdId(userDoc.data().householdId || null)
            setAppPhotoUrl(userDoc.data().photoUrl || null)

            // Backfill googlePhotoUrl for existing accounts that predate this field
            if (!userDoc.data().googlePhotoUrl && firebaseUser.photoURL) {
              updateDoc(doc(db, "users", firebaseUser.uid), {
                googlePhotoUrl: firebaseUser.photoURL,
              }).catch(() => {})
            }
            // Also backfill displayName if missing
            if (!userDoc.data().displayName && firebaseUser.displayName) {
              updateDoc(doc(db, "users", firebaseUser.uid), {
                displayName: firebaseUser.displayName,
              }).catch(() => {})
            }
          } else {
            setUserRole(null)
            setHasProfile(false)
            setHouseholdId(null)
            setAppPhotoUrl(null)
          }
        } catch (error) {
          console.error("Error fetching user profile:", error)
          setUserRole(null)
          setHasProfile(false)
          setHouseholdId(null)
          setAppPhotoUrl(null)
        }
        setUser(firebaseUser)
      } else {
        currentUserRef.current = null
        setUser(null)
        setUserRole(null)
        setHasProfile(false)
        setHouseholdId(null)
        setAppPhotoUrl(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!loading) {
      const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/register")
      const isPublicPage = pathname === "/"

      if (!user && !isAuthPage && !isPublicPage) {
        // Not logged in and not on a public/auth page
        router.push("/")
      } else if (user && !hasProfile && pathname !== "/register") {
        // Logged in but no profile (needs invite code) -> force to gatekeeper
        router.push("/register")
      } else if (user && hasProfile && (isAuthPage || isPublicPage)) {
        // Logged in and has profile -> redirect away from auth/public pages to dashboard
        router.push("/dashboard")
      }
    }
  }, [user, hasProfile, loading, pathname, router])

  const logout = async () => {
    await signOut(auth)
    router.push("/")
  }

  return (
    <AuthContext.Provider value={{ user, userRole, hasProfile, householdId, appPhotoUrl, loading, logout, refreshAppPhotoUrl }}>
      {children}
    </AuthContext.Provider>
  )
}
