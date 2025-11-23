"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { updateProfile, updatePassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import toast from "react-hot-toast"
import { User, Lock } from "lucide-react"

export default function ProfilePage() {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName || "")
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "")
  const [newPassword, setNewPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleUpdateProfile = async () => {
    if (!auth.currentUser) return
    setLoading(true)
    try {
      await updateProfile(auth.currentUser, {
        displayName,
        photoURL
      })
      toast.success("Profile updated!")
    } catch (error: unknown) {
      console.error(error)
      const message = error instanceof Error ? error.message : "Unknown error"
      toast.error("Failed to update profile: " + message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!auth.currentUser || !newPassword) return
    setLoading(true)
    try {
      await updatePassword(auth.currentUser, newPassword)
      toast.success("Password updated!")
      setNewPassword("")
    } catch (error: unknown) {
      console.error(error)
      const message = error instanceof Error ? error.message : "Unknown error"
      toast.error("Failed to update password: " + message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            General Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled />
            <p className="text-xs text-gray-500">Email cannot be changed.</p>
          </div>

          <div className="grid gap-2">
            <Label>Display Name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name"
            />
          </div>

          <div className="grid gap-2">
            <Label>Profile Picture URL</Label>
            <Input
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <Button onClick={handleUpdateProfile} disabled={loading}>
            Save Profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters"
            />
          </div>

          <Button onClick={handleUpdatePassword} disabled={loading || !newPassword}>
            Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
