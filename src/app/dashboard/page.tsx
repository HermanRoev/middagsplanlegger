"use client"

import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Plus, Calendar as CalendarIcon } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { format } from "date-fns"

export default function DashboardPage() {
  const { user } = useAuth()
  const today = format(new Date(), "EEEE, MMMM do")

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Welcome back, <span className="text-indigo-600">{user?.email?.split('@')[0]}</span>
        </h1>
        <p className="text-gray-500 mt-2 text-lg">{today}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Today's Meal Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="h-full glass border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-600" />
                Tonight&apos;s Dinner
              </CardTitle>
              <CardDescription>You haven&apos;t planned anything for today yet.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-indigo-200 rounded-xl bg-white/50">
                <p className="text-gray-500 mb-4">No meal planned</p>
                <Link href="/dashboard/planner">
                  <Button variant="premium">Plan Meal</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/dashboard/recipes/new" className="block">
                <Button variant="outline" className="w-full justify-between group h-12">
                  Add New Recipe
                  <Plus className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                </Button>
              </Link>
              <Link href="/dashboard/shop" className="block">
                <Button variant="outline" className="w-full justify-between group h-12">
                  View Shopping List
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
