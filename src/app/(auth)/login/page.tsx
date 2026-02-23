"use client"

import { useState } from "react"
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { motion } from "framer-motion"
import { PageLayout } from "@/components/layout/PageLayout"
import { Chrome } from "lucide-react"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)

      // Check if user has a document in Firestore
      const userDoc = await getDoc(doc(db, "users", result.user.uid))

      if (userDoc.exists()) {
        toast.success("Velkommen tilbake!")
        router.push("/dashboard")
      } else {
        // New user or hasn't entered invite code yet
        toast("Velkommen! Vennligst skriv inn din familiekode.", { icon: "👋" })
        router.push("/register")
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to login with Google"
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
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Logg inn</CardTitle>
            <CardDescription className="text-center">
              Logg inn eller registrer deg med Google for å fortsette
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Button
              onClick={handleGoogleLogin}
              variant="premium"
              className="w-full max-w-sm flex items-center justify-center gap-3 py-6 text-lg"
              disabled={loading}
            >
              <Chrome className="w-5 h-5" />
              {loading ? "Logger inn..." : "Logg inn med Google"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </PageLayout>
  )
}
