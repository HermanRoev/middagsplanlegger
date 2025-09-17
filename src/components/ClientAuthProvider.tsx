'use client'

import dynamic from 'next/dynamic'
import React from 'react'

const AuthProvider = dynamic(
  () =>
    import('@/contexts/AuthContext.client').then((mod) => mod.AuthProvider),
  { ssr: false }
)

export default function ClientAuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthProvider>{children}</AuthProvider>
}
