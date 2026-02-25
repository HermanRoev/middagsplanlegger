"use client"

import { useState, useEffect } from "react"
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import toast from "react-hot-toast"
import { motion } from "framer-motion"
import { PageLayout } from "@/components/layout/PageLayout"
import { Chrome, ArrowRight } from "lucide-react"
import Link from "next/link"

function isMobile(): boolean {
  if (typeof window === "undefined") return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  // Handle redirect result when returning from Google on mobile
  useEffect(() => {
    getRedirectResult(auth).catch(() => {
      // Redirect result errors are non-critical — onAuthStateChanged handles the rest
    })
  }, [])

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()

      if (isMobile()) {
        // Mobile: use redirect to stay in the same tab
        await signInWithRedirect(auth, provider)
        // Page navigates away — no code runs after this
      } else {
        // Desktop: use popup for a smoother experience
        await signInWithPopup(auth, provider)
        // AuthContext's onAuthStateChanged will detect the login, fetch the profile,
        // and redirect to /dashboard (existing user) or /register (new user).
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Kunne ikke logge inn med Google"
      toast.error(message)
      setLoading(false)
    }
    // Don't setLoading(false) on success — the redirect will unmount this page.
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
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Middagsplan
          </h1>
          <p className="text-sm text-gray-500 font-medium">Velkommen tilbake</p>
        </div>

        <Card className="w-full shadow-xl border-white/60 bg-white/80 backdrop-blur-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Logg inn</CardTitle>
            <CardDescription>
              Logg inn med Google-kontoen din for å fortsette
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pt-2 pb-6">
            <Button
              onClick={handleGoogleLogin}
              variant="premium"
              className="w-full flex items-center justify-center gap-3 py-6 text-lg"
              disabled={loading}
            >
              <Chrome className="w-5 h-5" />
              {loading ? "Logger inn..." : "Logg inn med Google"}
            </Button>

            <div className="text-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 font-medium transition-colors"
              >
                Har du en invitasjonskode? <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </PageLayout>
  )
}
