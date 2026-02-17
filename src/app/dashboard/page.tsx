"use client"

import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  ArrowRight, 
  Plus, 
  Calendar as CalendarIcon, 
  ChefHat, 
  ShoppingCart, 
  Clock, 
  Users, 
  Star,
  TrendingUp
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { format, addDays, startOfWeek, endOfWeek } from "date-fns"
import { nb } from "date-fns/locale"
import { useEffect, useState } from "react"
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { PlannedMeal, Meal } from "@/types"
import Image from "next/image"

export default function DashboardPage() {
  const { user } = useAuth()
  const todayDate = new Date()
  const todayKey = todayDate.toISOString().split('T')[0]
  
  const [todayMeals, setTodayMeals] = useState<PlannedMeal[]>([])
  const [upcomingMeals, setUpcomingMeals] = useState<PlannedMeal[]>([])
  const [recipesCount, setRecipesCount] = useState(0)
  const [plannedThisWeek, setPlannedThisWeek] = useState(0)
  const [shoppingCount, setShoppingCount] = useState(0)
  const [recentRecipes, setRecentRecipes] = useState<Meal[]>([])

  useEffect(() => {
    if (!user) return

    // 1. Fetch Today's Meals
    const qToday = query(collection(db, "plannedMeals"), where("date", "==", todayKey))
    const unsubToday = onSnapshot(qToday, (snapshot) => {
      setTodayMeals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlannedMeal)))
    })

    // 2. Fetch Upcoming Meals (Next 7 days)
    const weekEnd = format(addDays(todayDate, 7), 'yyyy-MM-dd')
    const qUpcoming = query(
        collection(db, "plannedMeals"), 
        where("date", ">", todayKey),
        where("date", "<=", weekEnd),
        orderBy("date", "asc")
    )
    const unsubUpcoming = onSnapshot(qUpcoming, (snapshot) => {
      setUpcomingMeals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlannedMeal)))
    })

    // 3. Fetch Stats: Recipes Count
    const qRecipes = query(collection(db, "meals"))
    const unsubRecipes = onSnapshot(qRecipes, (snapshot) => {
      setRecipesCount(snapshot.size)
      // Also get 3 most recent recipes
      const sorted = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Meal))
        .sort((a, b) => (b.lastCooked || '').localeCompare(a.lastCooked || ''))
        .slice(0, 3)
      setRecentRecipes(sorted)
    })

    // 4. Fetch Stats: Planned this week
    const weekStart = format(startOfWeek(todayDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEndKey = format(endOfWeek(todayDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const qWeek = query(
        collection(db, "plannedMeals"),
        where("date", ">=", weekStart),
        where("date", "<=", weekEndKey)
    )
    const unsubWeek = onSnapshot(qWeek, (snapshot) => {
        setPlannedThisWeek(snapshot.size)
    })

    // 5. Shopping List Count
    const unsubShop = onSnapshot(collection(db, "shoppingList"), (snapshot) => {
        const manualCount = snapshot.docs.filter(d => !d.data().checked).length
        // Simplified shop count (manual only for now to avoid complex aggregation here)
        setShoppingCount(manualCount)
    })

    return () => {
      unsubToday()
      unsubUpcoming()
      unsubRecipes()
      unsubWeek()
      unsubShop()
    }
  }, [user, todayKey])

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-12">
      {/* Welcome Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <h1 className="text-5xl font-black tracking-tight text-gray-900 leading-none">
            Hei, <span className="text-indigo-600">{user?.displayName?.split(' ')[0] || 'Kokk'}!</span>
            </h1>
            <p className="text-gray-500 mt-4 text-xl font-medium">
                Det er {format(todayDate, "EEEE d. MMMM", { locale: nb })}. 
                {todayMeals.length > 0 ? ` Du har ${todayMeals.length} planlagte måltider i dag.` : " Ingen planer for i kveld ennå."}
            </p>
        </div>
        <div className="flex gap-3">
            <Button asChild variant="outline" className="rounded-2xl h-12 px-6 border-gray-200 hover:bg-gray-50">
                <Link href="/dashboard/planner">Se ukeplan</Link>
            </Button>
            <Button asChild variant="premium" className="rounded-2xl h-12 px-6 shadow-lg shadow-indigo-100">
                <Link href="/dashboard/recipes/new">
                    <Plus className="w-5 h-5 mr-2" /> Ny oppskrift
                </Link>
            </Button>
        </div>
      </header>

      {/* Stats Quick Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
            { label: "Planlagt uken", value: plannedThisWeek, icon: CalendarIcon, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Handleliste", value: shoppingCount, icon: ShoppingCart, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Oppskrifter", value: recipesCount, icon: ChefHat, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Kokte måltider", value: recentRecipes.length, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((stat, i) => (
            <motion.div key={i} variants={itemVariants} className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <div className={`${stat.bg} p-3 rounded-2xl mb-3`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="text-3xl font-black text-gray-900">{stat.value}</div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{stat.label}</div>
            </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Featured: Tonight's Dinner */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2"
        >
          <Card className="h-full border-0 shadow-2xl shadow-indigo-100/50 rounded-[32px] overflow-hidden bg-white">
            <div className="md:flex h-full">
                <div className="md:w-1/2 relative min-h-[300px] bg-gray-100">
                    {todayMeals[0]?.imageUrl ? (
                        <Image 
                            src={todayMeals[0].imageUrl} 
                            alt={todayMeals[0].mealName} 
                            fill 
                            className="object-cover"
                            unoptimized
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-50/50">
                            <ChefHat className="w-20 h-20 text-indigo-100" />
                        </div>
                    )}
                    <div className="absolute top-6 left-6">
                        <div className="bg-indigo-600 text-white px-4 py-2 rounded-2xl font-bold text-sm shadow-lg">
                            Dagens middag
                        </div>
                    </div>
                </div>
                <div className="md:w-1/2 p-10 flex flex-col justify-between bg-gradient-to-br from-white to-indigo-50/20">
                    {todayMeals.length > 0 ? (
                        <>
                            <div>
                                <h3 className="text-4xl font-black text-gray-900 leading-tight mb-4">
                                    {todayMeals[0].mealName}
                                </h3>
                                <div className="flex gap-6 mb-8 text-gray-500 font-bold text-sm uppercase tracking-wide">
                                    <span className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-indigo-500" /> {todayMeals[0].prepTime || 30} min
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Users className="w-5 h-5 text-indigo-500" /> {todayMeals[0].plannedServings} porsjoner
                                    </span>
                                </div>
                                {todayMeals[0].notes && (
                                    <div className="bg-white/80 p-4 rounded-2xl border border-indigo-100 italic text-gray-600 mb-6">
                                        &quot;{todayMeals[0].notes}&quot;
                                    </div>
                                )}
                            </div>
                            <Button asChild size="lg" className="w-full h-16 rounded-[20px] text-xl font-bold shadow-xl shadow-indigo-200">
                                <Link href={`/dashboard/recipes/${todayMeals[0].mealId}?plannedId=${todayMeals[0].id}`}>
                                    Start koking
                                    <ArrowRight className="ml-2 w-6 h-6" />
                                </Link>
                            </Button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <CalendarIcon className="w-10 h-10 text-gray-200" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Ingen planlagte måltider</h3>
                            <p className="text-gray-500 mb-8">Hva har du lyst på til middag i kveld?</p>
                            <Button asChild variant="outline" size="lg" className="rounded-2xl h-14 px-8 border-2 border-dashed border-gray-200 hover:border-indigo-300 transition-all">
                                <Link href="/dashboard/planner">Åpne planlegger</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
          </Card>
        </motion.div>

        {/* Sidebar: Upcoming & Shopping */}
        <div className="space-y-8">
            {/* Upcoming Meals */}
            <Card className="border-0 shadow-lg rounded-[28px] bg-white overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        Neste dager
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                    <div className="space-y-4">
                        {upcomingMeals.length > 0 ? (
                            upcomingMeals.slice(0, 3).map((meal) => (
                                <Link key={meal.id} href={`/dashboard/recipes/${meal.mealId}?plannedId=${meal.id}`}>
                                    <div className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                                        <div className="w-14 h-14 rounded-xl overflow-hidden relative bg-gray-100 flex-shrink-0">
                                            {meal.imageUrl ? (
                                                <Image src={meal.imageUrl} alt={meal.mealName} fill className="object-cover" unoptimized />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                                                    <ChefHat className="w-6 h-6 text-indigo-200" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                                {format(new Date(meal.date), "EEEE", { locale: nb })}
                                            </div>
                                            <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{meal.mealName}</div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <p className="text-sm text-gray-400 italic text-center py-4">Ingen flere måltider planlagt.</p>
                        )}
                        <Button asChild variant="ghost" className="w-full rounded-xl text-indigo-600 font-bold hover:bg-indigo-50">
                            <Link href="/dashboard/planner">Se hele uken</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Recently Viewed / Recommended */}
            <Card className="border-0 shadow-lg rounded-[28px] bg-white overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500" />
                        Siste brukte
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                    <div className="space-y-4">
                        {recentRecipes.map((recipe) => (
                            <Link key={recipe.id} href={`/dashboard/recipes/${recipe.id}`}>
                                <div className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden relative bg-gray-100 flex-shrink-0">
                                        {recipe.imageUrl ? (
                                            <Image src={recipe.imageUrl} alt={recipe.name} fill className="object-cover" unoptimized />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                                                <ChefHat className="w-5 h-5 text-indigo-200" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{recipe.name}</div>
                                        <div className="flex items-center gap-1 text-xs text-amber-600 font-bold">
                                            <Star className="w-3 h-3 fill-amber-600" /> {recipe.rating?.toFixed(1) || "Ny"}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}
