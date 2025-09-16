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
import { MainLayout } from '@/components/MainLayout'
import { InputHTMLAttributes } from 'react'

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
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
)

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
      toast.error(
        'Klarte ikke å oppdatere passord. Du må kanskje logge inn på nytt.'
      )
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
    <MainLayout>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Brukerprofil</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <Image
                  src={
                    newProfilePic
                      ? URL.createObjectURL(newProfilePic)
                      : user.photoURL || '/default-profile.png'
                  }
                  alt="Profilbilde"
                  width={128}
                  height={128}
                  className="rounded-full object-cover border-4 border-white shadow-md"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 transition-transform transform hover:scale-110 shadow-lg"
                  aria-label="Endre profilbilde"
                  disabled={loading}
                >
                  <span className="material-icons">edit</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files && handleProfilePicChange(e.target.files[0])
                  }
                  disabled={loading}
                />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">
                {user.displayName || 'Anonym Bruker'}
              </h2>
              <p className="text-gray-500">{user.email}</p>
              {isUploading && (
                <p className="text-sm text-blue-600 mt-2">
                  Laster opp bilde...
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-6 text-gray-700">
                Kontoinnstillinger
              </h3>

              <form
                onSubmit={handleUsernameChange}
                className="space-y-6 border-b pb-8 mb-8"
              >
                <InputField
                  id="username"
                  label="Nytt brukernavn"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition shadow-md hover:shadow-lg"
                  disabled={loading || !newUsername}
                >
                  {isUpdating ? 'Lagrer...' : 'Lagre brukernavn'}
                </button>
              </form>

              <form onSubmit={handlePasswordChange} className="space-y-6">
                <InputField
                  id="password"
                  label="Nytt passord"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
                <InputField
                  id="confirmPassword"
                  label="Bekreft nytt passord"
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition shadow-md hover:shadow-lg"
                  disabled={loading || !newPassword}
                >
                  {isUpdating ? 'Lagrer...' : 'Lagre passord'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
