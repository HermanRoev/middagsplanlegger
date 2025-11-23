"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, query, orderBy, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Meal } from "@/types"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Clock, Users, ChefHat } from "lucide-react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"

import { Suspense } from 'react'

function RecipesContent() {
  const { user } = useAuth()
  const [recipes, setRecipes] = useState<Meal[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const searchParams = useSearchParams()
  const planDate = searchParams.get("planDate")
  const router = useRouter()

  useEffect(() => {
    const q = query(collection(db, "meals"), orderBy("name"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meal))
      setRecipes(meals)
    })
    return () => unsubscribe()
  }, [])

  const filteredRecipes = recipes.filter(recipe => 
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handlePlanMeal = async (meal: Meal) => {
    if (!planDate) return

    try {
      await addDoc(collection(db, "plannedMeals"), {
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
      })
      toast.success(`Planned ${meal.name} for ${planDate}`)
      router.push("/dashboard/planner")
    } catch (error) {
      console.error(error)
      toast.error("Failed to plan meal")
    }
  }

  return (
    <div className="space-y-6">
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

      {planDate && (
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg flex items-center justify-between">
          <p className="text-indigo-900 font-medium">Select a recipe for {planDate}</p>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/planner">Cancel</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredRecipes.map((recipe, index) => (
          <motion.div
            key={recipe.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="h-full flex flex-col overflow-hidden group hover:shadow-lg transition-all border-0 bg-white">
              <div className="aspect-video bg-gray-100 relative overflow-hidden">
                {recipe.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img 
                    src={recipe.imageUrl} 
                    alt={recipe.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <ChefHat className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="font-bold text-lg leading-tight">{recipe.name}</h3>
                </div>
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
        ))}
      </div>
    </div>
  )
}

export default function RecipesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RecipesContent />
    </Suspense>
  )
}
