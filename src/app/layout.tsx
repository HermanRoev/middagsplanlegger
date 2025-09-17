// src/app/layout.tsx
import './globals.css'
import { ToastProvider } from '@/components/ui/ToastProvider'
import ClientAuthProvider from '@/components/ClientAuthProvider'

export const metadata = {
  title: 'Middagsplanlegger',
  description: 'Familiens middagsplanlegger',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="no">
      <body>
        <ClientAuthProvider>
          <ToastProvider />
          {children}
        </ClientAuthProvider>
      </body>
    </html>
  )
}
