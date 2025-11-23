"use client"

import { Sidebar } from "@/components/Sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <Sidebar />
      <main className="md:pl-64 pb-20 md:pb-0 min-h-screen transition-all duration-300 ease-in-out">
        <div className="container mx-auto p-6 md:p-8 lg:p-12 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  )
}
