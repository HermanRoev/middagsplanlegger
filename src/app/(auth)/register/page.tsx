"use client"

import { useState, useEffect, Suspense } from "react"
import { collection, query, where, getDocs, doc, updateDoc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useRouter, useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import { motion } from "framer-motion"
import { PageLayout } from "@/components/layout/PageLayout"
import { LogOut } from "lucide-react"

function RegisterForm() {
  const [inviteCode, setInviteCode] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) setInviteCode(code)

    // Redirect if they somehow got here without being logged in via Google
    if (!auth.currentUser) {
      router.push('/login')
    }
  }, [searchParams, router])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth.currentUser) {
      toast.error("Du må logge inn først.")
      return router.push('/login')
    }
    setLoading(true)

    try {
      const user = auth.currentUser

      // 1. Check Invite Code
      const invitesRef = collection(db, "invites")
      const q = query(invitesRef, where("code", "==", inviteCode.trim().toUpperCase()), where("used", "==", false))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        throw new Error("Ugyldig eller allerede brukt invitasjonskode.")
      }

      const inviteDoc = querySnapshot.docs[0]

      // 2. Mark invite as used and link to user
      await updateDoc(doc(db, "invites", inviteDoc.id), {
        used: true,
        usedBy: user.uid,
        usedAt: new Date().toISOString()
      })

      // 3. Create user profile
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        displayName: user.displayName || "",
        googlePhotoUrl: user.photoURL || null,
        photoUrl: null,
        createdAt: new Date().toISOString(),
        householdId: "family-middagsplanlegger"
      })

      toast.success("Konto opprettet og knyttet til familien!")
      router.push("/dashboard")
    } catch (error: unknown) {
      console.error(error)
      const message = error instanceof Error ? error.message : "Failed to verify invite.";
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageLayout variant="gray" align="center" className="p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-gray-400 hover:text-red-500 hover:bg-red-50"
            onClick={() => {
              auth.signOut()
              router.push('/login')
            }}
          >
            <LogOut className="w-4 h-4" />
          </Button>

          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Bli med i familien</CardTitle>
            <CardDescription className="text-center">
              Skriv inn invitasjonskoden du har fått av administratoren.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="X X X X X X"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  className="text-center text-4xl py-8 tracking-[0.5em] font-mono uppercase bg-white/50 backdrop-blur-sm shadow-inner"
                />
              </div>
              <Button type="submit" className="w-full" variant="premium" disabled={loading}>
                {loading ? "Sjekker kode..." : "Bli med"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </PageLayout>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Laster...</div>}>
      <RegisterForm />
    </Suspense>
  )
}
