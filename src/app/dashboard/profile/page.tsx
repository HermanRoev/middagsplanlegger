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
    <div className="max-w-5xl mx-auto space-y-10 pb-12">
      <div className="space-y-2">
        <h1 className="text-5xl font-black tracking-tight text-gray-900 leading-none">Min profil</h1>
        <p className="text-gray-500 text-xl font-medium">Administrer dine personlige innstillinger og sikkerhet.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Sidebar / Profile Card */}
        <div className="md:col-span-1 space-y-6">
            <Card className="border-0 shadow-xl shadow-gray-100/50 overflow-hidden text-center bg-white rounded-[32px]">
                <CardContent className="pt-12 pb-10">
                    <div className="relative inline-block mb-6 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className={`w-40 h-40 rounded-[48px] border-4 shadow-2xl overflow-hidden bg-gray-100 mx-auto transition-all duration-500 ${isDirty && imageFile ? 'border-indigo-400 ring-8 ring-indigo-50' : 'border-white'}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={displayImage}
                                alt="Profile"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                        </div>
                        <div className="absolute inset-0 rounded-[48px] flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <Camera className="w-10 h-10 text-white" />
                        </div>
                        <div className="absolute bottom-1 right-1 bg-indigo-600 rounded-2xl p-3 text-white shadow-xl border-4 border-white group-hover:bg-indigo-700 transition-all group-hover:scale-110">
                            <Camera className="w-5 h-5" />
                        </div>
                    </div>
                    <input
                        type="file"
                        hidden
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileChange}
                    />

                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-gray-900">{displayName || 'Bruker'}</h2>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-sm font-bold text-gray-500">{user?.email}</span>
                        </div>
                    </div>

                    {isDirty && (
                        <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">
                             <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-black uppercase tracking-widest border border-amber-100">
                                 <AlertCircle className="w-3.5 h-3.5" /> Ulagrede endringer
                             </span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* Forms */}
        <div className="md:col-span-2 space-y-8">
            <Card className="border border-gray-100 shadow-sm bg-white rounded-2xl overflow-hidden">
                <CardHeader className="pt-6 px-6">
                    <CardTitle className="text-xl font-bold">Personlig informasjon</CardTitle>
                    <CardDescription className="text-sm">Oppdater hvordan andre ser deg i appen.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6 pt-2">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Visningsnavn</Label>
                        <div className="relative group">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                            <Input
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Ditt navn"
                                className="pl-10 h-11 rounded-lg bg-gray-50/50 border-gray-200 text-base focus:bg-white transition-all shadow-inner"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center bg-gray-50/30 px-6 py-4 border-t border-gray-50">
                    <span className="text-xs font-semibold text-gray-400">
                        {isDirty ? "Husk å lagre endringene dine." : "Profilen er oppdatert."}
                    </span>
                    <Button onClick={handleUpdateProfile} disabled={loading || !isDirty} variant="premium" className="h-10 px-6 rounded-lg font-bold shadow-sm">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isDirty ? 'Lagre endringer' : 'Oppdatert'}
                    </Button>
                </CardFooter>
            </Card>

            <Card className="border border-gray-100 shadow-sm bg-white rounded-2xl overflow-hidden">
                <CardHeader className="pt-6 px-6">
                    <CardTitle className="text-xl font-bold">Sikkerhet</CardTitle>
                    <CardDescription className="text-sm">Sørg for at kontoen din forblir trygg.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6 pt-2">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Nytt passord</Label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                            <Input
                                type="password"
                                className="pl-10 h-11 rounded-lg bg-gray-50/50 border-gray-200 text-base focus:bg-white transition-all shadow-inner"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Minst 6 tegn"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end bg-gray-50/30 px-6 py-4 border-t border-gray-50">
                    <Button variant="outline" onClick={handleUpdatePassword} disabled={loading || !newPassword} className="h-10 px-6 rounded-lg font-bold border-gray-200 bg-white shadow-sm hover:bg-gray-50 transition-all">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Oppdater passord
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  )
}
