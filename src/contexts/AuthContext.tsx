'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  signIn as authSignIn,
  signOut as authSignOut,
  subscribeToAuthChanges,
  type AuthUser,
} from '@/lib/auth'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  logOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      setUser(user)
      setLoading(false)

      // Don't redirect if we're already on the correct page
      if (user && pathname === '/login') {
        router.replace('/')
      } else if (!user && pathname !== '/login') {
        router.replace('/login')
      }
    })

    return () => unsubscribe()
  }, [router, pathname])

  const signIn = async (email: string, password: string) => {
    try {
      await authSignIn(email, password)
      toast.success('Vellykket login.')
      router.push('/')
    } catch (error) {
      toast.error('Innlogging feilet. Sjekk dine påloggingsdetaljer.')
      throw error
    }
  }

  const logOut = async () => {
    try {
      await authSignOut()
      toast.success('Utlogging vellykket.')
      router.push('/login')
    } catch (error) {
      toast.error('Utlogging feilet. Vennligst prøv igjen.')
      console.error('Logout error:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
