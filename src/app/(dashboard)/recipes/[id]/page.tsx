"use client"

import { useState, useEffect } from "react"
import { doc, onSnapshot, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Meal } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Users, Trash2, Edit } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import toast from "react-hot-toast"
import Link from "next/link"

export default function RecipeDetailsPage() {
  const { id } = useParams()
  const [recipe, setRecipe] = useState<Meal | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!id) return
    const unsubscribe = onSnapshot(doc(db, "meals", id as string), (doc) => {
      if (doc.exists()) {
        setRecipe({ id: doc.id, ...doc.data() } as Meal)
      } else {
        toast.error("Recipe not found")
        router.push("/dashboard/recipes")
      }
    })
    return () => unsubscribe()
  }, [id, router])

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this recipe?")) return
    try {
      await deleteDoc(doc(db, "meals", id as string))
      toast.success("Recipe deleted")
      router.push("/dashboard/recipes")
    } catch (e) {
      toast.error("Failed to delete")
    }
  }

  if (!recipe) return <div className="p-8 text-center">Loading recipe...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden shadow-xl">
        {recipe.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
            <span className="text-4xl font-bold text-indigo-200">{recipe.name}</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8">
          <h1 className="text-4xl font-bold text-white mb-2">{recipe.name}</h1>
          <div className="flex gap-4 text-white/90">
            <span className="flex items-center gap-2"><Clock className="w-4 h-4"/> {recipe.prepTime} min</span>
            <span className="flex items-center gap-2"><Users className="w-4 h-4"/> {recipe.servings} servings</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Link href={`/dashboard/recipes/${id}/edit`}> 
          <Button variant="outline"><Edit className="w-4 h-4 mr-2"/> Edit</Button>
        </Link>
        <Button variant="destructive" onClick={handleDelete}><Trash2 className="w-4 h-4 mr-2"/> Delete</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Ingredients</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {recipe.ingredients?.map((ing, i) => (
                  <li key={i} className="flex justify-between border-b border-gray-100 pb-2 last:border-0">
                    <span className="font-medium">{ing.name}</span>
                    <span className="text-gray-500">{ing.amount} {ing.unit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recipe.instructions?.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                      {i + 1}
                    </div>
                    <p className="text-gray-700 mt-1 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
