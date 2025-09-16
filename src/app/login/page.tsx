'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

import InputField from '@/components/ui/InputField'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, signUp, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.replace('/')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isSigningUp) {
        await signUp(email, password, displayName)
      } else {
        await signIn(email, password)
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error(
        isSigningUp
          ? 'Feil ved oppretting av konto'
          : 'Feil e-post eller passord'
      )
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-2xl">
        <div className="text-center">
          <span className="material-icons text-5xl text-blue-600">
            restaurant_menu
          </span>
          <h2 className="mt-4 text-3xl font-bold text-gray-900">
            Middagsplanlegger
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isSigningUp
              ? 'Opprett en konto for å fortsette'
              : 'Logg inn for å fortsette'}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {isSigningUp && (
            <InputField
              id="displayName"
              label="Brukernavn"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
          <InputField
            id="email"
            label="E-post"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <InputField
            id="password"
            label="Passord"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 transition-shadow hover:shadow-lg"
          >
            {isLoading
              ? isSigningUp
                ? 'Oppretter konto...'
                : 'Logger inn...'
              : isSigningUp
                ? 'Opprett konto'
                : 'Logg inn'}
          </button>
        </form>
        <div className="text-center">
          <button
            onClick={() => setIsSigningUp(!isSigningUp)}
            className="font-medium text-sm text-blue-600 hover:text-blue-500"
          >
            {isSigningUp
              ? 'Har du allerede en konto? Logg inn'
              : 'Har du ikke en konto? Opprett en ny'}
          </button>
        </div>
      </div>
    </div>
  )
}
