'use client'

import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  updateUserProfile,
  updateUserPassword,
  uploadProfilePicture,
} from '@/lib/auth'

export default function ProfilePage() {
  const { user } = useAuth()
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [newProfilePic, setNewProfilePic] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newUsername) return
    setLoading(true)
    try {
      await updateUserProfile(newUsername, user.photoURL || undefined)
      toast.success('Username updated successfully!')
      setNewUsername('')
    } catch {
      toast.error('Failed to update username.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== newPasswordConfirm) {
      toast.error('Passwords do not match.')
      return
    }
    if (!newPassword) {
      toast.error('Password cannot be empty.')
      return
    }
    setLoading(true)
    try {
      await updateUserPassword(newPassword)
      toast.success('Password updated successfully!')
      setNewPassword('')
      setNewPasswordConfirm('')
    } catch {
      toast.error('Failed to update password. You may need to sign in again.')
    } finally {
      setLoading(false)
    }
  }

  const handleProfilePicChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProfilePic) {
      toast.error('Please select a file.')
      return
    }
    if (!user) return
    setLoading(true)
    try {
      const downloadURL = await uploadProfilePicture(newProfilePic, user.uid)
      await updateUserProfile(user.displayName || '', downloadURL)
      toast.success('Profile picture updated successfully!')
      setNewProfilePic(null)
    } catch {
      toast.error('Failed to update profile picture.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading user profile...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">User Profile</h1>
      <div className="mb-8 flex flex-col items-center">
        <Image
          src={user.photoURL || '/default-profile.png'}
          alt="Profile"
          width={128}
          height={128}
          className="rounded-full mb-4 object-cover"
        />
        <h2 className="text-xl text-center">{user.displayName || user.email}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Change Username */}
        <div className="card p-4 border rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Change Username</h3>
          <form onSubmit={handleUsernameChange}>
            <input
              type="text"
              placeholder="New username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="input input-bordered w-full mb-2 p-2 border rounded"
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600" disabled={loading}>
              {loading ? 'Saving...' : 'Save Username'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="card p-4 border rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Change Password</h3>
          <form onSubmit={handlePasswordChange}>
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input input-bordered w-full mb-2 p-2 border rounded"
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              className="input input-bordered w-full mb-2 p-2 border rounded"
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600" disabled={loading}>
              {loading ? 'Saving...' : 'Save Password'}
            </button>
          </form>
        </div>

        {/* Change Profile Picture */}
        <div className="card p-4 border rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Change Profile Picture</h3>
          <form onSubmit={handleProfilePicChange}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setNewProfilePic(e.target.files ? e.target.files[0] : null)}
              className="input input-bordered w-full mb-2 p-2 border rounded"
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600" disabled={loading}>
              {loading ? 'Uploading...' : 'Upload Picture'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
