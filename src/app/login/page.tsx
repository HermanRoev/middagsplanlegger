'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

import { InputHTMLAttributes } from 'react';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    id: string;
    label: string;
  }

  const InputField = ({ id, label, ...props }: InputFieldProps) => (
    <div className="relative">
      <input
        id={id}
        className="block px-2.5 pb-2.5 pt-4 w-full text-sm text-gray-900 bg-transparent rounded-lg border-1 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
        placeholder=" "
        {...props}
      />
      <label
        htmlFor={id}
        className="absolute text-sm text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1"
      >
        {label}
      </label>
    </div>
  );

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
