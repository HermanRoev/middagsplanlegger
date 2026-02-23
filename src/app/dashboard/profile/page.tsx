"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { updateProfile } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { uploadImage } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import toast from "react-hot-toast"
import { Camera, Loader2, Mail, User, AlertCircle, ShoppingCart, Utensils, CalendarDays, ChefHat, LogOut, Trash2 } from "lucide-react"
import { doc, updateDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { PageContainer } from "@/components/layout/PageLayout"
import { PageHeader } from "@/components/ui/action-blocks"
import { StatCard } from "@/components/ui/cards"

interface UserStats {
    mealsPlanned?: number
    mealsCooked?: number
    itemsShopped?: number
    recipesCreated?: number
}

export default function ProfilePage() {
    const router = useRouter()
    const { user, appPhotoUrl, refreshAppPhotoUrl } = useAuth()
    const [displayName, setDisplayName] = useState(user?.displayName || "")
    const [loading, setLoading] = useState(false)
    const [removingImage, setRemovingImage] = useState(false)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isDirty, setIsDirty] = useState(false)
    const [stats, setStats] = useState<UserStats | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || "")

            // Fetch user stats
            const unsub = onSnapshot(doc(db, "userStats", user.uid), (doc) => {
                if (doc.exists()) {
                    setStats(doc.data() as UserStats)
                }
            })
            return () => unsub()
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

    // Priority chain: preview (new selection) > app-uploaded > Google > UI Avatars
    const googlePhotoUrl = user?.photoURL || null
    const displayImage = previewUrl
        || appPhotoUrl
        || googlePhotoUrl
        || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'User')}&background=6366f1&color=fff&size=256`

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
            let newAppPhotoUrl = appPhotoUrl
            if (imageFile) {
                const toastId = toast.loading("Laster opp nytt profilbilde...")
                try {
                    newAppPhotoUrl = await uploadImage(imageFile, `users/${auth.currentUser.uid}/avatar_${Date.now()}`)
                    toast.dismiss(toastId)
                } catch (e) {
                    toast.error("Kunne ikke laste opp bilde", { id: toastId })
                    throw e
                }
            }

            await updateProfile(auth.currentUser, {
                displayName,
            })

            // Sync to Firestore users collection so family page picks it up
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                displayName,
                ...(imageFile ? { photoUrl: newAppPhotoUrl } : {}),
            })

            await refreshAppPhotoUrl()
            setImageFile(null)
            setPreviewUrl(null)
            setIsDirty(false)

            toast.success("Profil oppdatert!")
        } catch (error: unknown) {
            console.error(error)
            const message = error instanceof Error ? error.message : "Ukjent feil"
            toast.error("Kunne ikke oppdatere profil: " + message)
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveImage = async () => {
        if (!auth.currentUser || !appPhotoUrl) return
        setRemovingImage(true)
        try {
            // Clear the app-uploaded photo from Firestore (reverts to Google or UI Avatars)
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                photoUrl: null,
            })
            await refreshAppPhotoUrl()
            toast.success("Profilbilde fjernet. Tilbake til Google-bilde.")
        } catch (error) {
            console.error(error)
            toast.error("Kunne ikke fjerne profilbilde")
        } finally {
            setRemovingImage(false)
        }
    }

    const handleSignOut = async () => {
        try {
            await signOut(auth)
            router.push('/login')
        } catch (error) {
            toast.error("Kunne ikke logge ut")
        }
    }

    return (
        <PageContainer className="space-y-10 pb-12">
            <PageHeader
                title="Min profil"
                description="Administrer dine personlige innstillinger og sikkerhet."
            />

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Left column: Profile Card + Activity Stats stacked */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="shadow-xl overflow-hidden text-center rounded-[32px] border-white/50">
                        <CardContent className="pt-12 pb-10">
                            <div className="flex flex-col items-center gap-3 mb-6">
                                <div className="relative inline-block group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
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
                                {/* Show remove button only when an app-uploaded photo exists */}
                                {appPhotoUrl && !imageFile && (
                                    <button
                                        onClick={handleRemoveImage}
                                        disabled={removingImage}
                                        className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                                    >
                                        {removingImage
                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            : <Trash2 className="w-3.5 h-3.5" />
                                        }
                                        Fjern profilbilde
                                    </button>
                                )}
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

                    {/* Activity stats sit below the profile card in the same column */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-black text-gray-900 ml-2">Aktivitet</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <StatCard label="Planlagt" value={stats?.mealsPlanned || 0} icon={CalendarDays} colorClass="text-amber-600" bgClass="bg-amber-100" />
                            <StatCard label="Handlet" value={stats?.itemsShopped || 0} icon={ShoppingCart} colorClass="text-emerald-600" bgClass="bg-emerald-100" />
                            <StatCard label="Laget" value={stats?.mealsCooked || 0} icon={Utensils} colorClass="text-indigo-600" bgClass="bg-indigo-100" />
                            <StatCard label="Oppskrifter" value={stats?.recipesCreated || 0} icon={ChefHat} colorClass="text-purple-600" bgClass="bg-purple-100" />
                        </div>
                    </div>
                </div>

                {/* Right column: Forms spanning 2 cols */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="shadow-lg border-white/50 overflow-hidden">
                        <CardHeader className="pt-6 px-6">
                            <CardTitle className="text-xl font-bold">Personlig informasjon</CardTitle>
                            <CardDescription className="text-sm">Oppdater hvordan andre ser deg i appen.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6 pt-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Visningsnavn</Label>
                                <div className="relative group">
                                    <User className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-indigo-500 transition-colors z-10 pointer-events-none" />
                                    <Input
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="Ditt navn"
                                        className="pl-10 h-11 transition-all shadow-inner"
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between items-center bg-white/20 px-6 py-4 border-t border-white/30 backdrop-blur-md">
                            <span className="text-xs font-semibold text-gray-500">
                                {isDirty ? "Husk å lagre endringene." : "Profilen er oppdatert."}
                            </span>
                            <Button onClick={handleUpdateProfile} disabled={loading || !isDirty} variant="premium" className="h-10 px-6 rounded-[24px] font-bold shadow-sm">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isDirty ? 'Lagre endringer' : 'Oppdatert'}
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card className="shadow-lg border-red-200/50 bg-red-50/30 overflow-hidden">
                        <CardHeader className="pt-6 px-6">
                            <CardTitle className="text-xl font-bold text-red-900">Faresone</CardTitle>
                            <CardDescription className="text-sm text-red-700/80">Logg ut av applikasjonen.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            <Button variant="destructive" className="font-bold rounded-[24px] px-8" onClick={handleSignOut}>
                                <LogOut className="w-5 h-5 mr-2" /> Logg ut
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageContainer>
    )
}
