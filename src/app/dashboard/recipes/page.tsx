"use client"

import { useState, useEffect, Suspense } from "react"
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Meal, CupboardItem } from "@/types"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Clock, Users, ChefHat, Filter, PackageCheck } from "lucide-react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { useDebounce } from "@/hooks/useDebounce"
import Image from "next/image"
import { RecipeCardSkeleton } from "@/components/skeletons/RecipeCardSkeleton"

function RecipesContent() {
  const { user } = useAuth()
  const [recipes, setRecipes] = useState<Meal[]>([])
  const [cupboardItems, setCupboardItems] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const planDate = searchParams.get("planDate")
  const replaceId = searchParams.get("replaceId")
  const router = useRouter()

  useEffect(() => {
    const q = query(collection(db, "meals"), orderBy("name"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meal))
      setRecipes(meals)
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

  const filters = [
    { id: 'quick', label: 'Quick (< 30m)', check: (m: Meal) => (m.prepTime || 0) <= 30 },
    { id: 'few-ingredients', label: 'Simple (< 6 items)', check: (m: Meal) => (m.ingredients?.length || 0) < 6 },
    { id: 'family', label: 'Family (4+ servings)', check: (m: Meal) => (m.servings || 0) >= 4 },
    { id: 'pantry', label: 'Use Pantry', check: (m: Meal) => checkCanCook(m) },
  ]

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
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
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Recipes</h1>
            <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                placeholder="Search recipes..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button asChild variant="premium">
                <Link href="/dashboard/recipes/new">
                <Plus className="w-4 h-4 mr-2" />
                New
                </Link>
            </Button>
            </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <div className="flex items-center gap-1 text-sm text-gray-500 mr-2">
                <Filter className="w-4 h-4" /> Filters:
            </div>
            {filters.map(filter => (
                <button
                    key={filter.id}
                    onClick={() => setActiveFilter(activeFilter === filter.id ? null : filter.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap border ${
                        activeFilter === filter.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    {filter.label}
                </button>
            ))}
            {activeFilter && (
                <button
                    onClick={() => setActiveFilter(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 underline ml-2"
                >
                    Clear
                </button>
            )}
        </div>
      </div>

      {planDate && (
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg flex items-center justify-between">
          <p className="text-indigo-900 font-medium">Select a recipe for {planDate}</p>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/planner">Cancel</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? (
           Array.from({ length: 8 }).map((_, i) => (
             <RecipeCardSkeleton key={i} />
           ))
        ) : filteredRecipes.length === 0 ? (
           <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed">
             <ChefHat className="w-12 h-12 mb-4 text-gray-300" />
             <p className="text-lg font-medium">No recipes found</p>
             <p className="text-sm">Try adjusting your search or add a new recipe.</p>
             <Button asChild variant="link" className="mt-2">
                <Link href="/dashboard/recipes/new">Create Recipe</Link>
             </Button>
           </div>
        ) : (
          filteredRecipes.map((recipe, index) => {
            const canCook = checkCanCook(recipe)
            return (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full flex flex-col overflow-hidden group hover:shadow-lg transition-all border-0 bg-white">
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {recipe.imageUrl ? (
                    <Image
                      src={recipe.imageUrl}
                      alt={recipe.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <ChefHat className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                  <div className="absolute bottom-4 left-4 right-4 text-white z-10">
                    <h3 className="font-bold text-lg leading-tight">{recipe.name}</h3>
                  </div>

                  {/* Pantry Badge */}
                  {canCook && (
                      <div className="absolute top-3 right-3 z-10 bg-green-500/90 backdrop-blur-md text-white px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm">
                          <PackageCheck className="w-3 h-3" /> Pantry Ready
                      </div>
                  )}
                </div>

                <CardContent className="p-4 flex-1">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {recipe.prepTime || 30} min
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {recipe.servings || 4}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="p-4 pt-0 gap-2">
                  {planDate ? (
                    <Button className="w-full" onClick={() => handlePlanMeal(recipe)}>
                      Select
                    </Button>
                  ) : (
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/dashboard/recipes/${recipe.id}`}>View Details</Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          )})
        )}
      </div>
    </div>
  )
}

export default function RecipesPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <RecipesContent />
    </Suspense>
  )
}
