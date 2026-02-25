"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, Inbox, Users, User, Shield, LogOut, ChevronRight, PlusCircle, Library } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/PageLayout"
import { PageHeader } from "@/components/ui/action-blocks"

const menuItems = [
  { href: "/dashboard/cupboard", icon: Package, label: "Skap", description: "Se og oppdater matlageret ditt" },
  { href: "/dashboard/inbox", icon: Inbox, label: "Innboks", description: "Matønsker fra familien" },
  { href: "/dashboard/family", icon: Users, label: "Familie", description: "Se familiemedlemmer og statistikk" },
  { href: "/dashboard/recipes/new", icon: PlusCircle, label: "Ny Oppskrift", description: "Importer eller lag en oppskrift" },
  { href: "/dashboard/manage", icon: Library, label: "Bibliotek", description: "Administrer tags og ingredienser" },
]

const accountItems = [
  { href: "/dashboard/profile", icon: User, label: "Profil", description: "Rediger profilen din" },
]

export default function MorePage() {
  const pathname = usePathname()
  const { logout, userRole } = useAuth()

  const allMenuItems = [
    ...menuItems,
    ...(userRole === "admin" ? [{ href: "/dashboard/admin", icon: Shield, label: "Admin", description: "Administrer invitasjonskoder" }] : []),
  ]

  return (
    <PageContainer className="space-y-8 pb-24">
      <PageHeader
        title="Mer"
        description="Flere funksjoner og innstillinger."
      />

      <div className="max-w-xl mx-auto w-full space-y-6">
        <Card className="shadow-lg border-white/50 overflow-hidden">
          <CardContent className="p-0">
            {allMenuItems.map((item, i) => {
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-4 px-5 py-4 transition-colors",
                    i !== allMenuItems.length - 1 && "border-b border-gray-100/80",
                    isActive ? "bg-indigo-50/50" : "hover:bg-gray-50/50"
                  )}>
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                      isActive ? "bg-indigo-100" : "bg-gray-100"
                    )}>
                      <item.icon className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-gray-500")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </div>
                </Link>
              )
            })}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-white/50 overflow-hidden">
          <CardContent className="p-0">
            {accountItems.map((item, i) => {
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-4 px-5 py-4 transition-colors",
                    i !== accountItems.length - 1 && "border-b border-gray-100/80",
                    isActive ? "bg-indigo-50/50" : "hover:bg-gray-50/50"
                  )}>
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                      isActive ? "bg-indigo-100" : "bg-gray-100"
                    )}>
                      <item.icon className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-gray-500")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </div>
                </Link>
              )
            })}
            <button
              onClick={logout}
              className="flex items-center gap-4 px-5 py-4 w-full transition-colors hover:bg-red-50/50 border-t border-gray-100/80"
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-red-50">
                <LogOut className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="font-semibold text-red-600">Logg ut</div>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
