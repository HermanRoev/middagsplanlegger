import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { Toaster } from "react-hot-toast"
import { Geist, Geist_Mono } from "next/font/google"
import type { Viewport } from "next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export const metadata = {
  title: "Middagsplanlegger",
  description: "Smartere måltidsplanlegging for hele familien",
  themeColor: "#e0f2fe",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default" as const,
    title: "Middagsplan",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="no">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-gray-50/50 antialiased selection:bg-indigo-100 selection:text-indigo-900`}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              className: 'glass',
              duration: 3000,
              success: { duration: 3000 },
              error: { duration: 4000 },
              loading: { duration: 10000 },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
