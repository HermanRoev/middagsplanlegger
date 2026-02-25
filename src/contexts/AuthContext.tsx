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
  refreshProfile: () => Promise<void>
}

const AUTH_CACHE_KEY = "auth_profile_cache"

interface AuthCache {
  userRole: "admin" | "user" | null
  hasProfile: boolean
  householdId: string | null
  appPhotoUrl: string | null
}

function readCache(): AuthCache | null {
  try {
    const raw = sessionStorage.getItem(AUTH_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthCache
  } catch {
    return null
  }
}

function writeCache(data: AuthCache) {
  try {
    sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(data))
  } catch {
    // sessionStorage unavailable (e.g. private browsing edge cases)
  }
}

function clearCache() {
  try {
    sessionStorage.removeItem(AUTH_CACHE_KEY)
  } catch {
    // ignore
  }
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
  refreshProfile: async () => { },
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const cached = typeof window !== "undefined" ? readCache() : null

  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<"admin" | "user" | null>(cached?.userRole ?? null)
  const [hasProfile, setHasProfile] = useState(cached?.hasProfile ?? false)
  const [householdId, setHouseholdId] = useState<string | null>(cached?.householdId ?? null)
  const [appPhotoUrl, setAppPhotoUrl] = useState<string | null>(cached?.appPhotoUrl ?? null)
  // Always start loading until onAuthStateChanged fires at least once.
  // The cache pre-populates profile data but does NOT skip the auth check.
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
        const newUrl = userDoc.data().photoUrl || null
        setAppPhotoUrl(newUrl)
        const prev = readCache()
        if (prev) writeCache({ ...prev, appPhotoUrl: newUrl })
      }
    } catch (error) {
      console.error("Error refreshing appPhotoUrl:", error)
    }
  }

  const refreshProfile = async () => {
    const u = currentUserRef.current
    if (!u) return
    try {
      const idTokenResult = await u.getIdTokenResult()
      const isAdmin = !!idTokenResult.claims.admin
      const userDoc = await getDoc(doc(db, "users", u.uid))
      if (userDoc.exists()) {
        const role: "admin" | "user" = isAdmin ? "admin" : "user"
        const hid = userDoc.data().householdId || null
        const photo = userDoc.data().photoUrl || null
        setUserRole(role)
        setHasProfile(true)
        setHouseholdId(hid)
        setAppPhotoUrl(photo)
        writeCache({ userRole: role, hasProfile: true, householdId: hid, appPhotoUrl: photo })
      } else {
        setUserRole(null)
        setHasProfile(false)
        setHouseholdId(null)
        setAppPhotoUrl(null)
        clearCache()
      }
    } catch (error) {
      console.error("Error refreshing profile:", error)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        currentUserRef.current = firebaseUser

        try {
          const idTokenResult = await firebaseUser.getIdTokenResult()
          const isAdmin = !!idTokenResult.claims.admin

          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
          if (userDoc.exists()) {
            const role: "admin" | "user" = isAdmin ? "admin" : "user"
            const hid = userDoc.data().householdId || null
            const photo = userDoc.data().photoUrl || null

            // Backfill googlePhotoUrl for existing accounts
            if (!userDoc.data().googlePhotoUrl && firebaseUser.photoURL) {
              updateDoc(doc(db, "users", firebaseUser.uid), {
                googlePhotoUrl: firebaseUser.photoURL,
              }).catch(() => { })
            }
            // Backfill displayName if missing
            if (!userDoc.data().displayName && firebaseUser.displayName) {
              updateDoc(doc(db, "users", firebaseUser.uid), {
                displayName: firebaseUser.displayName,
              }).catch(() => { })
            }

            // All state updates happen together before setLoading
            setUserRole(role)
            setHasProfile(true)
            setHouseholdId(hid)
            setAppPhotoUrl(photo)
            setUser(firebaseUser)
            writeCache({ userRole: role, hasProfile: true, householdId: hid, appPhotoUrl: photo })
          } else {
            setUserRole(null)
            setHasProfile(false)
            setHouseholdId(null)
            setAppPhotoUrl(null)
            setUser(firebaseUser)
            clearCache()
          }
        } catch (error) {
          console.error("Error fetching user profile:", error)
          setUserRole(null)
          setHasProfile(false)
          setHouseholdId(null)
          setAppPhotoUrl(null)
          setUser(firebaseUser)
          clearCache()
        }
      } else {
        currentUserRef.current = null
        setUser(null)
        setUserRole(null)
        setHasProfile(false)
        setHouseholdId(null)
        setAppPhotoUrl(null)
        clearCache()
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (loading) return

    const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/register")
    const isPublicPage = pathname === "/"

    let target: string | null = null

    if (!user && !isAuthPage && !isPublicPage) {
      target = "/"
    } else if (user && !hasProfile && pathname !== "/register") {
      target = "/register"
    } else if (user && hasProfile && (isAuthPage || isPublicPage)) {
      target = "/dashboard"
    }

    // Only redirect if we're not already on the target path (prevents loops)
    if (target && pathname !== target) {
      router.replace(target)
    }
  }, [user, hasProfile, loading, pathname, router])

  const logout = async () => {
    clearCache()
    await signOut(auth)
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-100">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, userRole, hasProfile, householdId, appPhotoUrl, loading, logout, refreshAppPhotoUrl, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
