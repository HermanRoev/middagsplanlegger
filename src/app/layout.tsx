import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { Toaster } from "react-hot-toast"
import { Geist, Geist_Mono } from "next/font/google"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata = {
  title: "Middagsplanlegger",
  description: "Premium Meal Planning for Families",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-gray-50/50 antialiased selection:bg-indigo-100 selection:text-indigo-900`}>
        <AuthProvider>
          {children}
          <Toaster position="bottom-right" toastOptions={{ className: 'glass' }} />
        </AuthProvider>
      </body>
    </html>
  )
}
