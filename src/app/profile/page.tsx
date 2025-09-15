'use client'

import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import {
  updateUserProfile,
  updateUserPassword,
  uploadProfilePicture,
} from '@/lib/auth'

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [newProfilePic, setNewProfilePic] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newUsername) return
    setIsUpdating(true)
    try {
      await updateUserProfile(newUsername, user.photoURL || undefined)
      toast.success('Brukernavn oppdatert!')
      setNewUsername('')
    } catch {
      toast.error('Klarte ikke å oppdatere brukernavn.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== newPasswordConfirm) {
      toast.error('Passordene er ikke like.')
      return
    }
    if (!newPassword) {
      toast.error('Passord kan ikke være tomt.')
      return
    }
    setIsUpdating(true)
    try {
      await updateUserPassword(newPassword)
      toast.success('Passord oppdatert!')
      setNewPassword('')
      setNewPasswordConfirm('')
    } catch {
      toast.error('Klarte ikke å oppdatere passord. Du må kanskje logge inn på nytt.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleProfilePicChange = async (file: File) => {
    if (!file) {
      toast.error('Vennligst velg en fil.')
      return
    }
    if (!user) return
    setIsUploading(true)
    setNewProfilePic(file)
    try {
      const downloadURL = await uploadProfilePicture(file, user.uid)
      await updateUserProfile(user.displayName || '', downloadURL)
      toast.success('Profilbilde oppdatert!')
      setNewProfilePic(null)
    } catch {
      toast.error('Klarte ikke å oppdatere profilbilde.')
    } finally {
      setIsUploading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Laster brukerprofil...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Vennligst logg inn for å se profilen din.</p>
      </div>
    )
  }

  const loading = isUpdating || isUploading

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Brukerprofil</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Picture and Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <Image
                src={newProfilePic ? URL.createObjectURL(newProfilePic) : user.photoURL || '/default-profile.png'}
                alt="Profilbilde"
                width={128}
                height={128}
                className="rounded-full object-cover border-4 border-white shadow-md"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 transition-transform transform hover:scale-110"
                aria-label="Endre profilbilde"
                disabled={loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                  <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                </svg>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && handleProfilePicChange(e.target.files[0])}
                disabled={loading}
              />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">{user.displayName || 'Anonym Bruker'}</h2>
            <p className="text-gray-500">{user.email}</p>
            {isUploading && <p className="text-sm text-blue-600 mt-2">Laster opp bilde...</p>}
          </div>
        </div>

        {/* Right Column: Settings Forms */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Kontoinnstillinger</h3>

            {/* Change Username */}
            <form onSubmit={handleUsernameChange} className="space-y-4 border-b pb-6 mb-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-600">Endre brukernavn</label>
                <input
                  id="username"
                  type="text"
                  placeholder="Nytt brukernavn"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled={loading}
                />
              </div>
              <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition" disabled={loading || !newUsername}>
                {isUpdating ? 'Lagrer...' : 'Lagre brukernavn'}
              </button>
            </form>

            {/* Change Password */}
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label htmlFor="password"  className="block text-sm font-medium text-gray-600">Endre passord</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Nytt passord"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled={loading}
                />
              </div>
               <div>
                <label htmlFor="confirmPassword"  className="block text-sm font-medium text-gray-600">Bekreft nytt passord</label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Bekreft nytt passord"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled={loading}
                />
              </div>
              <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition" disabled={loading || !newPassword}>
                {isUpdating ? 'Lagrer...' : 'Lagre passord'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
