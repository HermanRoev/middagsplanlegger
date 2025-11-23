"use client"

import { useState, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { updateProfile, updatePassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { uploadImage } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import toast from "react-hot-toast"
import { User, Lock, Camera, Loader2, Mail } from "lucide-react"

export default function ProfilePage() {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName || "")
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "")
  const [newPassword, setNewPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setImageFile(e.target.files[0])
    }
  }

  const handleUpdateProfile = async () => {
    if (!auth.currentUser) return
    setLoading(true)
    try {
      let url = photoURL
      if (imageFile) {
         const toastId = toast.loading("Uploading image...")
         try {
            url = await uploadImage(imageFile, `users/${auth.currentUser.uid}/avatar_${Date.now()}`)
            toast.dismiss(toastId)
         } catch (e) {
            toast.error("Failed to upload image", { id: toastId })
            throw e
         }
      }

      await updateProfile(auth.currentUser, {
        displayName,
        photoURL: url
      })

      setPhotoURL(url)
      setImageFile(null)

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
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account settings and preferences.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Sidebar / Profile Card */}
        <div className="md:col-span-1 space-y-6">
            <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-black/5">
                <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                <CardContent className="pt-0 relative px-6 pb-6">
                    <div className="flex justify-center -mt-12 mb-4">
                        <div
                            className="relative group cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-white">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={imageFile ? URL.createObjectURL(imageFile) : (photoURL || "https://ui-avatars.com/api/?name=" + (displayName || "User") + "&background=random")}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <input
                            type="file"
                            hidden
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    <div className="text-center space-y-1">
                        <h2 className="text-xl font-bold text-gray-900">{displayName || 'User'}</h2>
                        <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user?.email}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Forms */}
        <div className="md:col-span-2 space-y-6">
            <Card className="border-0 shadow-md">
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your display name and profile picture.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Display Name</Label>
                        <Input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Your Name"
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end bg-gray-50/50 p-4 rounded-b-xl">
                    <Button onClick={handleUpdateProfile} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>

            <Card className="border-0 shadow-md">
                <CardHeader>
                    <CardTitle>Security</CardTitle>
                    <CardDescription>Update your password to keep your account secure.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label>New Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                type="password"
                                className="pl-9"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end bg-gray-50/50 p-4 rounded-b-xl">
                    <Button variant="outline" onClick={handleUpdatePassword} disabled={loading || !newPassword}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Password
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  )
}
