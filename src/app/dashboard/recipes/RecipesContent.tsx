"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Meal, CupboardItem } from "@/types"
import { firestoreMealSchema } from "@/lib/validations"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Clock, Users, ChefHat, Filter, PackageCheck, Star } from "lucide-react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { useDebounce } from "@/hooks/useDebounce"
import Image from "next/image"
import { RecipeCardSkeleton } from "@/components/skeletons/RecipeCardSkeleton"
import { format, formatDistanceToNow, parseISO } from "date-fns"
import { nb } from "date-fns/locale"

export default function RecipesContent() {
  const { user } = useAuth()
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
    const q = query(collection(db, "meals"), orderBy("name"))
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

  // Fetch cupboard for "Use First" logic
  useEffect(() => {
      if (!user) return
      const q = query(collection(db, "cupboard"))
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
    { id: 'quick', label: 'Quick (< 30m)', check: (m: Meal) => (m.prepTime || 0) <= 30 },
    { id: 'few-ingredients', label: 'Simple (< 6 items)', check: (m: Meal) => (m.ingredients?.length || 0) < 6 },
    { id: 'family', label: 'Family (4+ servings)', check: (m: Meal) => (m.servings || 0) >= 4 },
    { id: 'pantry', label: 'Use Pantry', check: (m: Meal) => checkCanCook(m) },
  ]

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe && recipe.name && recipe.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    const matchesFilter = activeFilter
       ? filters.find(f => f.id === activeFilter)?.check(recipe)
       : true
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
        } : undefined
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
        toast.success(`Planned ${meal.name} for ${planDate}`)
      }

      router.push("/dashboard/planner")
    } catch (error) {
      console.error(error)
      toast.error("Failed to plan meal")
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-12">
      {/* Header & Stats */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 className="text-5xl font-black tracking-tight text-gray-900 leading-none">Oppskrifter</h1>
            <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">{recipes.length} totalt</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                        {recipes.filter(r => checkCanCook(r)).length} kan lages nå
                    </span>
                </div>
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-80 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                <Input
                    placeholder="Søk i dine oppskrifter..."
                    className="pl-12 h-14 rounded-2xl border-gray-200 bg-white shadow-sm focus:ring-4 focus:ring-indigo-500/5 transition-all text-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button asChild variant="premium" className="h-14 rounded-2xl px-8 shadow-lg shadow-indigo-100 w-full sm:w-auto">
                <Link href="/dashboard/recipes/new">
                    <Plus className="w-5 h-5 mr-2" /> Ny oppskrift
                </Link>
            </Button>
        </div>
      </header>

      {/* Featured / Random Suggestion (Only shown when not searching) */}
      {!searchTerm && !activeFilter && recipes.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden lg:block"
          >
            <Link href={`/dashboard/recipes/${recipes[Math.floor(Math.random() * recipes.length)].id}`}>
                <div className="relative h-64 rounded-[40px] overflow-hidden group shadow-2xl shadow-indigo-100/20">
                    <Image 
                        src={recipes.find(r => r.imageUrl)?.imageUrl || recipes[0].imageUrl || ''} 
                        alt="Featured" 
                        fill 
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex flex-col justify-center px-12">
                        <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit mb-4">
                            Dagens anbefaling
                        </div>
                        <h2 className="text-4xl font-black text-white mb-2 max-w-xl">Hva med {recipes.find(r => r.imageUrl)?.name || recipes[0].name} til middag?</h2>
                        <div className="flex items-center gap-6 text-white/80 font-bold text-sm uppercase">
                            <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> 30 min</span>
                            <span className="flex items-center gap-2"><Users className="w-4 h-4" /> 4 porsjoner</span>
                        </div>
                    </div>
                </div>
            </Link>
          </motion.div>
      )}

      {/* Main Grid Section */}
      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl mr-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filter</span>
                </div>
                {filters.map(filter => (
                    <button
                        key={filter.id}
                        onClick={() => setActiveFilter(activeFilter === filter.id ? null : filter.id)}
                        className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap border ${
                            activeFilter === filter.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {filter.label}
                    </button>
                ))}
                {activeFilter && (
                    <button
                        onClick={() => setActiveFilter(null)}
                        className="text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors ml-4 underline underline-offset-4"
                    >
                        Nullstill
                    </button>
                )}
            </div>
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
            <div className="col-span-full flex flex-col items-center justify-center py-24 text-gray-500 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
                <div className="bg-white p-6 rounded-full shadow-sm mb-6">
                    <ChefHat className="w-16 h-16 text-indigo-100" />
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-2">Ingen oppskrifter funnet</p>
                <p className="text-gray-500 mb-8 max-w-xs text-center">Prøv å endre søket ditt eller legg til en helt ny oppskrift!</p>
                <Button asChild variant="premium" size="lg" className="rounded-2xl h-14 px-8">
                    <Link href="/dashboard/recipes/new">Opprett ny oppskrift</Link>
                </Button>
            </div>
            ) : (
            filteredRecipes.map((recipe, index) => {
                const canCook = checkCanCook(recipe)
                const coverage = getPantryCoverage(recipe)
                return (
                <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                >
                <Card className="h-full flex flex-col overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border-0 bg-white rounded-[32px] shadow-lg shadow-gray-100/50">
                    <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                    {recipe.imageUrl ? (
                        <Image
                        src={recipe.imageUrl}
                        alt={recipe.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                        unoptimized
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-50/50">
                        <ChefHat className="w-12 h-12 text-indigo-100" />
                        </div>
                    )}
                    
                    {/* Floating Badges */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                        {coverage > 0 ? (
                            <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm border border-white/50">
                                <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{coverage}% på lager</span>
                            </div>
                        ) : <div />}
                        
                        {canCook && (
                            <div className="bg-emerald-500 text-white p-1.5 rounded-xl shadow-lg">
                                <PackageCheck className="w-4 h-4" />
                            </div>
                        )}
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="absolute bottom-4 left-4 right-4 text-white z-10 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity delay-100">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {recipe.prepTime || 30}m</span>
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {recipe.servings || 4}p</span>
                        </div>
                    </div>
                    </div>

                    <CardContent className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-black text-xl leading-tight text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                    {recipe.name}
                                </h3>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500 font-bold uppercase tracking-wider mt-4">
                                {recipe.rating ? (
                                    <div className="flex items-center gap-1 text-amber-500">
                                        <Star className="w-4 h-4 fill-amber-500" /> {recipe.rating.toFixed(1)}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-gray-300">
                                        <Star className="w-4 h-4" /> Ny
                                    </div>
                                )}
                                {recipe.lastCooked && (
                                    <div className="text-[10px] text-gray-400 ml-auto whitespace-nowrap">
                                        Laget {formatDistanceToNow(parseISO(recipe.lastCooked), { addSuffix: true, locale: nb })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>

                    <div className="px-6 pb-6 mt-auto">
                    {planDate ? (
                        <Button className="w-full h-12 rounded-xl font-bold text-lg shadow-lg shadow-indigo-100" onClick={() => handlePlanMeal(recipe)}>
                        Velg oppskrift
                        </Button>
                    ) : (
                        <Button asChild variant="secondary" className="w-full h-12 rounded-xl font-bold bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 border-0 shadow-none transition-all">
                        <Link href={`/dashboard/recipes/${recipe.id}`}>Se detaljer</Link>
                        </Button>
                    )}
                    </div>
                </Card>
                </motion.div>
                )})
            )}
        </div>
      </div>
    </div>
  )
}
