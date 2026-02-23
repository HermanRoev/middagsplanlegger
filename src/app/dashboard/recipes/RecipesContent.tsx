"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Meal, CupboardItem } from "@/types"
import { firestoreMealSchema } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Clock, Users, ChefHat } from "lucide-react"
import { PageContainer } from "@/components/layout/PageLayout"
import { PageHeader, EmptyStateBlock, FilterBar } from "@/components/ui/action-blocks"
import { RecipeCard } from "@/components/ui/RecipeCard"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { incrementUserStat } from "@/lib/stats"
import { useDebounce } from "@/hooks/useDebounce"
import Image from "next/image"
import { RecipeCardSkeleton } from "@/components/skeletons/RecipeCardSkeleton"
import { format } from "date-fns"
import { nb } from "date-fns/locale"

export default function RecipesContent() {
    const { user, householdId } = useAuth()
    const [recipes, setRecipes] = useState<Meal[]>([])
    const [cupboardItems, setCupboardItems] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const debouncedSearchTerm = useDebounce(searchTerm, 300)
    const [activeFilter, setActiveFilter] = useState<string | null>(null)
    const searchParams = useSearchParams()
    const planDate = searchParams.get("planDate")
    const replaceId = searchParams.get("replaceId")
    const router = useRouter()

    useEffect(() => {
        if (!householdId) return
        const q = query(collection(db, "meals"), where("householdId", "==", householdId), orderBy("name"))
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const mealsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const validatedMeals = mealsData.map(mealData => {
                const result = firestoreMealSchema.safeParse(mealData);
                if (!result.success) {
                    console.warn('Invalid recipe data from Firestore:', result.error.flatten(), 'Data:', mealData);
                    return null;
                }
                return result.data as Meal;
            }).filter((meal): meal is Meal => meal !== null);

            setRecipes(validatedMeals);
            setLoading(false)
        })
        return () => unsubscribe()
    }, [])

    useEffect(() => {
        if (!user || !householdId) return
        const q = query(collection(db, "cupboard"), where("householdId", "==", householdId))
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const names = new Set<string>()
            snapshot.docs.forEach(doc => {
                const data = doc.data() as CupboardItem
                if (data.ingredientName) {
                    names.add(data.ingredientName.toLowerCase())
                }
            })
            setCupboardItems(names)
        })
        return () => unsubscribe()
    }, [user])

    const checkCanCook = (recipe: Meal): boolean => {
        if (!recipe.ingredients || recipe.ingredients.length === 0) return false
        // Simple check: if we have > 50% of ingredients
        let matchCount = 0
        recipe.ingredients.forEach(ing => {
            if (cupboardItems.has(ing.name.toLowerCase())) {
                matchCount++
            }
        })
        return matchCount >= (recipe.ingredients.length / 2)
    }

    const getPantryCoverage = (recipe: Meal): number => {
        if (!recipe.ingredients || recipe.ingredients.length === 0) return 0
        let matchCount = 0
        recipe.ingredients.forEach(ing => {
            if (cupboardItems.has(ing.name.toLowerCase())) {
                matchCount++
            }
        })
        return Math.round((matchCount / recipe.ingredients.length) * 100)
    }

    const filters = [
        { id: 'quick', label: 'Rask (< 30 min)' },
        { id: 'few-ingredients', label: 'Enkel (< 6 ingr.)' },
        { id: 'family', label: 'Familie (4+ porsj.)' },
        { id: 'pantry', label: 'Bruk Matbod' },
    ]

    const filterChecks: Record<string, (m: Meal) => boolean> = {
        quick: (m) => (m.prepTime || 0) <= 30,
        'few-ingredients': (m) => (m.ingredients?.length || 0) < 6,
        family: (m) => (m.servings || 0) >= 4,
        pantry: (m) => checkCanCook(m),
    }

    const filteredRecipes = recipes.filter(recipe => {
        const matchesSearch = recipe && recipe.name && recipe.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        const matchesFilter = activeFilter ? filterChecks[activeFilter]?.(recipe) : true
        return matchesSearch && matchesFilter
    })

    const handlePlanMeal = async (meal: Meal) => {
        if (!planDate) return

        try {
            const mealData = {
                date: planDate,
                mealId: meal.id,
                mealName: meal.name,
                imageUrl: meal.imageUrl,
                plannedServings: meal.servings || 4,
                isShopped: false,
                isCooked: false,
                ingredients: meal.ingredients, // Copy ingredients for shopping list scaling
                plannedBy: user ? {
                    id: user.uid,
                    name: user.displayName || user.email || 'Unknown'
                } : undefined,
                userId: user?.uid,
                householdId: householdId
            }

            if (replaceId) {
                await updateDoc(doc(db, "plannedMeals", replaceId), {
                    ...mealData,
                    notes: "", // Clear notes when replacing
                    updatedAt: new Date().toISOString()
                })
                toast.success(`Replaced with ${meal.name}`)
            } else {
                await addDoc(collection(db, "plannedMeals"), {
                    ...mealData,
                    createdAt: new Date().toISOString()
                })
                if (user) {
                    await incrementUserStat(user.uid, 'mealsPlanned', 1)
                }
                toast.success(`Planned ${meal.name} for ${planDate}`)
            }

            router.push("/dashboard/planner")
        } catch (error) {
            console.error(error)
            toast.error("Failed to plan meal")
        }
    }

    const featuredRecipe = recipes.find(r => r.imageUrl && r.imageUrl.trim() !== "")

    return (
        <PageContainer className="space-y-10 pb-12">
            {/* Header & Stats */}
            <PageHeader
                title="Oppskrifter"
                description={
                    <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5 bg-indigo-50/50 backdrop-blur-md px-3 py-1 rounded-full border border-indigo-100/50">
                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-[0.2em]">{recipes.length} totalt</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-emerald-50/50 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-100/50">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em]">
                                {recipes.filter(r => checkCanCook(r)).length} kan lages nå
                            </span>
                        </div>
                    </div>
                }
            >
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-80 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 group-focus-within:text-indigo-500 transition-colors z-10 pointer-events-none" />
                        <Input
                            placeholder="Søk i dine oppskrifter..."
                            className="pl-12 h-14"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button asChild variant="premium" className="h-14 rounded-[24px] px-8 shadow-lg shadow-indigo-100 w-full sm:w-auto">
                        <Link href="/dashboard/recipes/new">
                            <Plus className="w-5 h-5 mr-2" /> Ny oppskrift
                        </Link>
                    </Button>
                </div>
            </PageHeader>

            {/* Featured / Random Suggestion (Only shown when not searching) */}
            {!searchTerm && !activeFilter && featuredRecipe && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hidden lg:block cursor-pointer"
                    onClick={() => planDate ? handlePlanMeal(featuredRecipe) : router.push(`/dashboard/recipes/${featuredRecipe.id}`)}
                >
                    <div className="relative h-64 rounded-[40px] overflow-hidden group shadow-2xl shadow-indigo-100/20">
                        {featuredRecipe.imageUrl && featuredRecipe.imageUrl.trim() !== "" && (
                            <Image
                                src={featuredRecipe.imageUrl}
                                alt="Featured"
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                unoptimized
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex justify-between items-center px-12">
                            <div className="flex flex-col justify-center max-w-xl">
                                <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit mb-4">
                                    Dagens anbefaling
                                </div>
                                <h2 className="text-4xl font-black text-white mb-2">Hva med {featuredRecipe.name} til middag?</h2>
                                <div className="flex items-center gap-6 text-white/80 font-bold text-sm uppercase mb-4">
                                    <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {featuredRecipe.prepTime || 30} min</span>
                                    <span className="flex items-center gap-2"><Users className="w-4 h-4" /> {featuredRecipe.servings || 4} porsjoner</span>
                                </div>
                            </div>
                            {planDate && (
                                <Button className="rounded-xl font-bold px-8 shadow-lg shadow-black/20" variant="premium">
                                    Velg oppskrift
                                </Button>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Main Grid Section */}
            <div className="space-y-8">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <FilterBar
                        filters={filters}
                        activeFilter={activeFilter}
                        onFilterChange={setActiveFilter}
                    />
                </div>

                {planDate && (
                    <div className="bg-indigo-600 rounded-[24px] p-6 shadow-xl shadow-indigo-200 flex items-center justify-between animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-2xl">
                                <Plus className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-white/80 font-bold text-xs uppercase tracking-widest mb-1">Planlegger</p>
                                <h3 className="text-xl font-bold text-white leading-none">Velg en oppskrift for {format(new Date(planDate), "EEEE d. MMMM", { locale: nb })}</h3>
                            </div>
                        </div>
                        <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white rounded-xl h-12 px-6">
                            <Link href="/dashboard/planner">Avbryt</Link>
                        </Button>
                    </div>
                )}

                <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {loading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                            <RecipeCardSkeleton key={i} />
                        ))
                    ) : filteredRecipes.length === 0 ? (
                        <div className="col-span-full">
                            <EmptyStateBlock
                                icon={ChefHat}
                                title="Ingen oppskrifter funnet"
                                description="Prøv å endre søket ditt eller legg til en helt ny oppskrift!"
                                className="rounded-[40px]"
                            >
                                <Button asChild variant="premium" size="lg" className="rounded-2xl h-14 px-8">
                                    <Link href="/dashboard/recipes/new">Opprett ny oppskrift</Link>
                                </Button>
                            </EmptyStateBlock>
                        </div>
                    ) : (
                        filteredRecipes.map((recipe, index) => (
                            <motion.div
                                key={recipe.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <RecipeCard
                                    recipe={recipe}
                                    pantryCoverage={getPantryCoverage(recipe)}
                                    canCook={checkCanCook(recipe)}
                                    onPlan={planDate ? handlePlanMeal : undefined}
                                />
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </PageContainer>
    )
}
