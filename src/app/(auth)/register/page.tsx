"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { collection, query, where, getDocs, doc, updateDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import { motion } from "framer-motion"
import { PageLayout } from "@/components/layout/PageLayout"
import { LogOut } from "lucide-react"
import Image from "next/image"

function OtpInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const LENGTH = 6

  const handleChange = (index: number, char: string) => {
    // Allow only alphanumeric
    const sanitized = char.replace(/[^a-zA-Z0-9]/g, "").slice(0, 1).toUpperCase()
    const next = [...value]
    next[index] = sanitized
    onChange(next)
    if (sanitized && index < LENGTH - 1) {
      refs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (value[index]) {
        // Clear current
        const next = [...value]
        next[index] = ""
        onChange(next)
      } else if (index > 0) {
        // Move to previous
        refs.current[index - 1]?.focus()
        const next = [...value]
        next[index - 1] = ""
        onChange(next)
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < LENGTH - 1) {
      refs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData("text")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, LENGTH)
    if (!pasted) return
    const next = Array(LENGTH).fill("")
    pasted.split("").forEach((ch, i) => { next[i] = ch })
    onChange(next)
    // Focus last filled box or last box
    const focusIndex = Math.min(pasted.length, LENGTH - 1)
    refs.current[focusIndex]?.focus()
  }

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {Array.from({ length: LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="text"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={value[i]}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={[
            "w-11 h-14 sm:w-13 sm:h-16",
            "text-center text-2xl font-black font-mono tracking-widest uppercase",
            "rounded-xl border-2 bg-white/70 backdrop-blur-sm",
            "transition-all duration-150 outline-none",
            "border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100",
            value[i] ? "border-indigo-400 bg-indigo-50/80 text-indigo-700" : "text-gray-800",
          ].join(" ")}
        />
      ))}
    </div>
  )
}

function RegisterForm() {
  const [chars, setChars] = useState<string[]>(Array(6).fill(""))
  const [loading, setLoading] = useState(false)
  const { user, logout, refreshProfile } = useAuth()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get("code")
    if (code) {
      const cleaned = code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6)
      const next = Array(6).fill("")
      cleaned.split("").forEach((ch, i) => { next[i] = ch })
      setChars(next)
    }
    // Auth guard is handled by AuthContext — no need to check auth.currentUser here.
  }, [searchParams])

  const inviteCode = chars.join("")
  const isComplete = inviteCode.length === 6

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error("Du må logge inn først.")
      return
    }
    if (!isComplete) {
      toast.error("Skriv inn alle 6 tegn i koden.")
      return
    }
    setLoading(true)

    try {
      // 1. Check Invite Code
      const invitesRef = collection(db, "invites")
      const q = query(invitesRef, where("code", "==", inviteCode), where("used", "==", false))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        throw new Error("Ugyldig eller allerede brukt invitasjonskode.")
      }

      const inviteDoc = querySnapshot.docs[0]

      // 2. Mark invite as used and link to user
      await updateDoc(doc(db, "invites", inviteDoc.id), {
        used: true,
        usedBy: user.uid,
        usedAt: new Date().toISOString(),
      })

      // 3. Create user profile
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        displayName: user.displayName || "",
        googlePhotoUrl: user.photoURL || null,
        photoUrl: null,
        createdAt: new Date().toISOString(),
        householdId: "family-middagsplanlegger",
      })

      toast.success("Konto opprettet og knyttet til familien!")

      // 4. Refresh profile in AuthContext — updates hasProfile to true,
      // which triggers the redirect effect to navigate to /dashboard.
      await refreshProfile()
    } catch (error: unknown) {
      console.error(error)
      const message = error instanceof Error ? error.message : "Failed to verify invite."
      toast.error(message)
      setLoading(false)
    }
    // Don't setLoading(false) on success — refreshProfile() triggers a redirect.
  }

  return (
    <PageLayout variant="gradient" align="center" className="p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-md flex flex-col items-center gap-6"
      >
        {/* App logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Middagsplan
          </h1>
        </div>

        <Card className="w-full shadow-xl border-white/60 bg-white/80 backdrop-blur-md relative">
          {/* Logout button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 text-gray-400 hover:text-red-500 hover:bg-red-50 z-10"
            onClick={logout}
            title="Logg ut"
          >
            <LogOut className="w-4 h-4" />
          </Button>

          <CardHeader className="pb-2 text-center space-y-1">
            <CardTitle className="text-2xl font-bold">Bli med i familien</CardTitle>
            <CardDescription className="text-sm">
              Skriv inn invitasjonskoden du har fått av administratoren.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-2">
            {/* Who is registering */}
            {user && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || "Bruker"}
                    width={36}
                    height={36}
                    className="rounded-full ring-2 ring-white"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                    {(user.displayName || user.email || "?")[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{user.displayName || "Ukjent navn"}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs text-center text-gray-400 font-medium uppercase tracking-widest">
                  Invitasjonskode
                </p>
                <OtpInput value={chars} onChange={setChars} />
              </div>

              <Button
                type="submit"
                className="w-full"
                variant="premium"
                disabled={loading || !isComplete}
              >
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-sky-100">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
