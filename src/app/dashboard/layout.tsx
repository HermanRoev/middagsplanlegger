"use client"

import { Sidebar } from "@/components/Sidebar"
import { PageLayout } from "@/components/layout/PageLayout"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PageLayout variant="gradient">
      <Sidebar />
      <main className="md:pl-64 pb-20 md:pb-0 min-h-screen transition-all duration-300 ease-in-out relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
      </main>
    </PageLayout>
  )
}
