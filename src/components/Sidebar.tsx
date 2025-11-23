"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Calendar, ChefHat, ShoppingCart, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
// import { motion } from "framer-motion"

import { Package } from "lucide-react"

const navItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/dashboard/planner", icon: Calendar, label: "Plan" },
  { href: "/dashboard/recipes", icon: ChefHat, label: "Recipes" },
  { href: "/dashboard/shop", icon: ShoppingCart, label: "Shop" },
  { href: "/dashboard/cupboard", icon: Package, label: "Cupboard" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-white/80 backdrop-blur-xl fixed left-0 top-0 z-40">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Middagsplan
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive 
                    ? "bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-700 font-medium shadow-sm" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}>
                  <item.icon className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600")} />
                  {item.label}
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start gap-3 text-gray-600 hover:text-red-600 hover:bg-red-50" onClick={logout}>
            <LogOut className="w-5 h-5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t z-50 pb-safe">
        <div className="flex justify-around items-center p-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} className="p-2">
                <div className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                  isActive ? "text-indigo-600" : "text-gray-400"
                )}>
                  <item.icon className={cn("w-6 h-6", isActive && "fill-current/20")} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
              </Link>
            )
          })}
          <button onClick={logout} className="p-4 text-gray-400">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </nav>
    </>
  )
}
