"use client"

import { useAuth } from "@/contexts/AuthContext"
import { PageContainer } from "@/components/layout/PageLayout"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/action-blocks"
import { StatCard, HeroMealCard, ListItemCard, SidebarListCard, MealCardContext } from "@/components/ui/cards"
import {
    ArrowRight,
    Plus,
    Calendar as CalendarIcon,
    ChefHat,
    ShoppingCart,
    Clock,
    Users,
    Star,
    TrendingUp,
    Sparkles
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { format, addDays, startOfWeek, endOfWeek } from "date-fns"
import { nb } from "date-fns/locale"
import { useEffect, useState } from "react"
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { PlannedMeal, Meal, CupboardItem } from "@/types"
import { scoreMeals, RecipeScoreResult } from "@/lib/recommendations"
import Image from "next/image"

export default function DashboardPage() {
    const { user, householdId } = useAuth()
    const todayDate = new Date()
    const todayKey = todayDate.toISOString().split('T')[0]

    // Ensure we don't fetch if householdId is missing
    if (!householdId) {
        console.warn("No householdId found. Data fetching suspended.");
    }

    const [todayMeals, setTodayMeals] = useState<PlannedMeal[]>([])
    const [upcomingMeals, setUpcomingMeals] = useState<PlannedMeal[]>([])
    const [recipesCount, setRecipesCount] = useState(0)
    const [plannedThisWeek, setPlannedThisWeek] = useState(0)
    const [shoppingCount, setShoppingCount] = useState(0)

    // Recommendations State
    const [allMeals, setAllMeals] = useState<Meal[]>([])
    const [cupboardItems, setCupboardItems] = useState<CupboardItem[]>([])
    const [dailyRecommendation, setDailyRecommendation] = useState<RecipeScoreResult | null>(null)

    useEffect(() => {
        if (!user || !householdId) return

        // 1. Fetch Today's Meals
        const qToday = query(
            collection(db, "plannedMeals"),
            where("householdId", "==", householdId),
            where("date", "==", todayKey)
        )
        const unsubToday = onSnapshot(qToday, (snapshot) => {
            setTodayMeals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlannedMeal)))
        })

        // 2. Fetch Upcoming Meals (Next 7 days)
        const weekEnd = format(addDays(todayDate, 7), 'yyyy-MM-dd')
        const qUpcoming = query(
            collection(db, "plannedMeals"),
            where("householdId", "==", householdId),
            where("date", ">", todayKey),
            where("date", "<=", weekEnd),
            orderBy("date", "asc")
        )
        const unsubUpcoming = onSnapshot(qUpcoming, (snapshot) => {
            setUpcomingMeals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlannedMeal)))
        })

        // 3. Fetch All Recipes
        const qRecipes = query(collection(db, "meals"), where("householdId", "==", householdId))
        const unsubRecipes = onSnapshot(qRecipes, (snapshot) => {
            setRecipesCount(snapshot.size)
            setAllMeals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meal)))
        })

        // 3.5 Fetch Cupboard
        const qCupboard = query(collection(db, "cupboard"), where("householdId", "==", householdId))
        const unsubCupboard = onSnapshot(qCupboard, (snapshot) => {
            setCupboardItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CupboardItem)))
        })

        // 4. Fetch Stats: Planned this week
        const weekStart = format(startOfWeek(todayDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        const weekEndKey = format(endOfWeek(todayDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        const qWeek = query(
            collection(db, "plannedMeals"),
            where("householdId", "==", householdId),
            where("date", ">=", weekStart),
            where("date", "<=", weekEndKey)
        )
        const unsubWeek = onSnapshot(qWeek, (snapshot) => {
            setPlannedThisWeek(snapshot.size)
        })

        // 5. Shopping List Count
        const qShop = query(collection(db, "shoppingList"), where("householdId", "==", householdId))
        const unsubShop = onSnapshot(qShop, (snapshot) => {
            const manualCount = snapshot.docs.filter(d => !d.data().checked).length
            // Simplified shop count (manual only for now to avoid complex aggregation here)
            setShoppingCount(manualCount)
        })

        return () => {
            unsubToday()
            unsubUpcoming()
            unsubRecipes()
            unsubCupboard()
            unsubWeek()
            unsubShop()
        }
    }, [user, householdId, todayKey])

    // Compute Daily Recommendation
    useEffect(() => {
        if (allMeals.length > 0) {
            const scored = scoreMeals(allMeals, cupboardItems)
            if (scored.length > 0) {
                // Ensure the daily recommendation isn't something already planned today or tomorrow
                const upcomingIds = upcomingMeals.map(m => m.mealId);
                const todayIds = todayMeals.map(m => m.mealId);
                const plannedIds = new Set([...upcomingIds, ...todayIds]);

                const best = scored.find(s => !plannedIds.has(s.meal.id));
                setDailyRecommendation(best || scored[0]);
            }
        }
    }, [allMeals, cupboardItems, todayMeals, upcomingMeals])

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

    const heroMealData: MealCardContext | undefined = todayMeals.length > 0 ? {
        id: todayMeals[0].id,
        mealId: todayMeals[0].mealId,
        name: todayMeals[0].mealName,
        imageUrl: todayMeals[0].imageUrl,
        prepTime: todayMeals[0].prepTime,
        servings: todayMeals[0].plannedServings,
        notes: todayMeals[0].notes,
        isToday: true,
    } : undefined;

    return (
        <PageContainer className="space-y-10 pb-12">
            {/* Welcome Header */}
            <PageHeader
                title={format(todayDate, "EEEE d. MMMM", { locale: nb }).replace(/^\w/, c => c.toUpperCase())}
                description={`Hei, ${user?.displayName?.split(' ')[0] || 'Kokk'}!`}
            >
                <Button asChild variant="glass" className="rounded-2xl h-12 px-6">
                    <Link href="/dashboard/planner">Se ukeplan</Link>
                </Button>
                <Button asChild variant="premium" className="rounded-2xl h-12 px-6 shadow-lg shadow-indigo-100" iconLeft={<Plus className="w-5 h-5" />}>
                    <Link href="/dashboard/recipes/new">Ny oppskrift</Link>
                </Button>
            </PageHeader>

            {/* Stats Quick Grid */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
                {[
                    { label: "Planlagt denne uken", value: plannedThisWeek, icon: CalendarIcon, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Varer i handlelisten", value: shoppingCount, icon: ShoppingCart, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Oppskrifter", value: recipesCount, icon: ChefHat, color: "text-purple-600", bg: "bg-purple-50" },
                    { label: "Tilberedte måltider", value: allMeals.filter(m => m.lastCooked).length, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
                ].map((stat, i) => (
                    <motion.div key={i} variants={itemVariants}>
                        <StatCard
                            label={stat.label}
                            value={stat.value}
                            icon={stat.icon}
                            colorClass={stat.color}
                            bgClass={stat.bg}
                        />
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
                    <HeroMealCard
                        meal={heroMealData}
                        emptyState={
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="w-20 h-20 bg-indigo-50 border border-indigo-100/80 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                    <CalendarIcon className="w-10 h-10 text-indigo-300" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ingen planlagte måltider</h3>
                                <p className="text-gray-500 mb-8">Hva har du lyst på til middag i kveld?</p>
                                <Button asChild variant="premium" size="lg" className="rounded-2xl h-14 px-8">
                                    <Link href="/dashboard/planner">Åpne planlegger</Link>
                                </Button>
                            </div>
                        }
                    />
                </motion.div>

                {/* Sidebar: Upcoming & Shopping */}
                <div className="space-y-8">
                    {/* Upcoming Meals */}
                    <SidebarListCard
                        title="Neste dager"
                        icon={Clock}
                        footerAction="Se hele uken"
                        footerHref="/dashboard/planner"
                    >
                        {upcomingMeals.length > 0 ? (
                            upcomingMeals.slice(0, 3).map((meal) => (
                                <ListItemCard
                                    key={meal.id}
                                    href={`/dashboard/recipes/view?id=${meal.mealId}&plannedId=${meal.id}`}
                                    title={meal.mealName}
                                    subtitleLabel={format(new Date(meal.date), "EEEE", { locale: nb })}
                                    imageUrl={meal.imageUrl}
                                />
                            ))
                        ) : (
                            <p className="text-sm text-gray-400 italic text-center py-4">Ingen flere måltider planlagt.</p>
                        )}
                    </SidebarListCard>

                    {/* Daily Recommendation Widget */}
                    {dailyRecommendation && (
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
                                <Sparkles className="w-24 h-24" />
                            </div>
                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-indigo-200" />
                                    <h3 className="font-bold text-lg text-indigo-50">Dagens Anbefaling</h3>
                                </div>
                                <div>
                                    <h4 className="text-2xl font-bold leading-tight mb-1">{dailyRecommendation.meal.name}</h4>
                                    <div className="flex items-center gap-2 text-indigo-100 text-sm">
                                        <span className="bg-black/20 px-2 py-1 rounded-md">{dailyRecommendation.matchPercentage}% skap-match</span>
                                        {dailyRecommendation.meal.prepTime && <span>• {dailyRecommendation.meal.prepTime} min</span>}
                                    </div>
                                </div>
                                <p className="text-indigo-100 text-sm leading-relaxed opacity-90">
                                    {dailyRecommendation.timeDecayScore > 80
                                        ? "Det er lenge siden dere hadde denne!"
                                        : "Du har mye av ingrediensene som trengs i skapet allerede."}
                                </p>
                                <Button asChild variant="secondary" className="w-full bg-white text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl h-11 border-0 shadow-md">
                                    <Link href={`/dashboard/recipes/view?id=${dailyRecommendation.meal.id}`}>
                                        Se oppskrift <ArrowRight className="w-4 h-4 ml-2" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PageContainer>
    )
}
