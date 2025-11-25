"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { updateProfile, updatePassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { uploadImage } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import toast from "react-hot-toast"
import { Camera, Loader2, Mail, Lock, User, AlertCircle } from "lucide-react"

export default function ProfilePage() {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName || "")
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "")
  const [newPassword, setNewPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
     if (user) {
         setDisplayName(user.displayName || "")
         setPhotoURL(user.photoURL || "")
     }
  }, [user])

  // Track if changes are made
  useEffect(() => {
      if (user) {
          const nameChanged = displayName !== (user.displayName || "")
          const imageChanged = !!imageFile
          setIsDirty(nameChanged || imageChanged)
      }
  }, [displayName, imageFile, user])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0]
        setImageFile(file)
        setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleUpdateProfile = async () => {
    if (!auth.currentUser) return
    setLoading(true)
    try {
      let url = photoURL
      if (imageFile) {
         const toastId = toast.loading("Uploading new avatar...")
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
      setPreviewUrl(null)
      setIsDirty(false)

      toast.success("Profile updated successfully!")
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

  // Determine which image to show: Preview > Current Photo > Placeholder
  const displayImage = previewUrl || photoURL || `https://ui-avatars.com/api/?name=${displayName || 'User'}&background=random`

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Account Settings</h1>
        <p className="text-gray-500">Manage your profile and security preferences.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Sidebar / Profile Card */}
        <div className="md:col-span-1 space-y-6">
            <Card className="border-0 shadow-md overflow-hidden text-center bg-white">
                <CardContent className="pt-8 pb-8">
                    <div className="relative inline-block mb-4 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className={`w-32 h-32 rounded-full border-4 shadow-lg overflow-hidden bg-gray-100 mx-auto transition-all ${isDirty && imageFile ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-white'}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={displayImage}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <Camera className="w-8 h-8 text-white" />
                        </div>
                        <div className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-2 text-white shadow-md border-2 border-white group-hover:bg-indigo-700 transition-colors">
                            <Camera className="w-4 h-4" />
                        </div>
                    </div>
                    <input
                        type="file"
                        hidden
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileChange}
                    />

                    <div className="space-y-1">
                        <h2 className="text-xl font-bold text-gray-900">{displayName || 'User'}</h2>
                        <p className="text-sm text-gray-500 flex items-center justify-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" />
                            {user?.email}
                        </p>
                    </div>

                    {isDirty && (
                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                             <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                                 <AlertCircle className="w-3 h-3" /> Unsaved Changes
                             </span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* Forms */}
        <div className="md:col-span-2 space-y-6">
            <Card className="border-0 shadow-md bg-white">
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update how others see you on the platform.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Display Name</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Your Name"
                                className="pl-9 bg-gray-50/50 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between bg-gray-50/50 p-4 border-t border-gray-100">
                    <span className="text-xs text-gray-500 italic">
                        {isDirty ? "Remember to save your changes." : "Profile is up to date."}
                    </span>
                    <Button onClick={handleUpdateProfile} disabled={loading || !isDirty} variant="premium">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isDirty ? 'Save Changes' : 'Saved'}
                    </Button>
                </CardFooter>
            </Card>

            <Card className="border-0 shadow-md bg-white">
                <CardHeader>
                    <CardTitle>Security</CardTitle>
                    <CardDescription>Ensure your account remains safe.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>New Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                type="password"
                                className="pl-9 bg-gray-50/50 focus:bg-white transition-colors"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end bg-gray-50/50 p-4 border-t border-gray-100">
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
