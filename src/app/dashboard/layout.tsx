"use client"

import { Sidebar } from "@/components/Sidebar"
import { PageLayout } from "@/components/layout/PageLayout"
import { PageTransition } from "@/components/layout/PageTransition"
import { SwipeBack } from "@/components/ui/swipe-back"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PageLayout variant="gradient">
      <Sidebar />
      <SwipeBack>
        <main className="md:pl-64 pb-20 md:pb-0 min-h-screen transition-all duration-300 ease-in-out relative z-10">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </SwipeBack>
    </PageLayout>
  )
}
