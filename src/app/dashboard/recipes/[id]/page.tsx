"use client"

import { useState, useEffect } from "react"
import { doc, onSnapshot, deleteDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Meal, PlannedMeal, Ingredient } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Clock, Users, Trash2, Edit, Save, ArrowLeft, ArrowRightLeft, X, Plus } from "lucide-react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import Link from "next/link"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"

export default function RecipeDetailsPage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const plannedId = searchParams.get('plannedId')
  const router = useRouter()

  const [recipe, setRecipe] = useState<Meal | null>(null)
  const [plannedMeal, setPlannedMeal] = useState<PlannedMeal | null>(null)

  // Edit State for Planned Meal
  const [editNotes, setEditNotes] = useState("")
  const [editServings, setEditServings] = useState(4)
  const [editIngredients, setEditIngredients] = useState<Ingredient[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)

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

  useEffect(() => {
    if (!plannedId) return
    const unsubscribe = onSnapshot(doc(db, "plannedMeals", plannedId), (doc) => {
      if (doc.exists()) {
        const data = { id: doc.id, ...doc.data() } as PlannedMeal
        setPlannedMeal(data)
        setEditNotes(data.notes || "")
        setEditServings(data.plannedServings || 4)
        setEditIngredients(data.ingredients || [])
      } else {
        // If planned meal is deleted, maybe just go back to recipe or planner
        // For now, let's just stay but clear state
        setPlannedMeal(null)
      }
    })
    return () => unsubscribe()
  }, [plannedId])

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this recipe?")) return
    try {
      await deleteDoc(doc(db, "meals", id as string))
      toast.success("Recipe deleted")
      router.push("/dashboard/recipes")
    } catch {
      toast.error("Failed to delete")
    }
  }

  const handleRemovePlanned = async () => {
    if (!plannedId) return
    if (!confirm("Remove this meal from your plan?")) return
    try {
      await deleteDoc(doc(db, "plannedMeals", plannedId))
      toast.success("Removed from plan")
      router.push("/dashboard/planner")
    } catch {
        toast.error("Failed to remove")
    }
  }

  const handleSavePlanChanges = async () => {
     if (!plannedId) return
     setLoading(true)
     try {
       await updateDoc(doc(db, "plannedMeals", plannedId), {
         notes: editNotes,
         plannedServings: editServings,
         ingredients: editIngredients,
         updatedAt: new Date().toISOString()
       })
       toast.success("Plan updated")
       setIsEditing(false)
     } catch (e) {
       console.error(e)
       toast.error("Failed to update plan")
     } finally {
        setLoading(false)
     }
  }

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
    const newIngredients = [...editIngredients]
    newIngredients[index] = { ...newIngredients[index], [field]: value } as Ingredient
    setEditIngredients(newIngredients)
  }

  const handleRemoveIngredient = (index: number) => {
      setEditIngredients(editIngredients.filter((_, i) => i !== index))
  }

  const handleAddIngredient = () => {
      setEditIngredients([...editIngredients, { name: '', amount: 0, unit: 'stk' }])
  }


  if (!recipe) return <div className="p-8 text-center">Loading recipe...</div>

  const isPlannedMode = !!plannedMeal
  const displayedIngredients = isPlannedMode ? (isEditing ? editIngredients : (plannedMeal?.ingredients || recipe.ingredients)) : recipe.ingredients
  const displayedServings = isPlannedMode ? (isEditing ? editServings : plannedMeal?.plannedServings) : recipe.servings
  const displayedNotes = isPlannedMode ? (isEditing ? editNotes : plannedMeal?.notes) : null

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* Header / Hero */}
      <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden shadow-xl group">
        {recipe.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
            <span className="text-4xl font-bold text-indigo-200">{recipe.name}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8 flex flex-col justify-between">
           <div className="flex justify-between items-start">
              <Button variant="outline" size="sm" className="bg-white/20 backdrop-blur-md border-white/20 text-white hover:bg-white/30" onClick={() => router.back()}>
                 <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              {isPlannedMode && (
                  <div className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg animate-in fade-in slide-in-from-top-4">
                      Planned for {format(new Date(plannedMeal.date), "MMMM do")}
                  </div>
              )}
           </div>

           <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 shadow-sm">{recipe.name}</h1>
                <div className="flex flex-wrap gap-4 text-white/90 font-medium">
                    <span className="flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full"><Clock className="w-4 h-4"/> {recipe.prepTime} min</span>
                    <span className="flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full"><Users className="w-4 h-4"/> {displayedServings} servings</span>
                </div>
           </div>
        </div>
      </div>

      {/* Actions Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
         <div className="flex gap-2">
            {!isPlannedMode && (
                 <Link href={`/dashboard/recipes/${id}/edit`}>
                    <Button variant="outline"><Edit className="w-4 h-4 mr-2"/> Edit Recipe</Button>
                </Link>
            )}
            {isPlannedMode && !isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4 mr-2" /> Edit Plan Details
                </Button>
            )}
            {isPlannedMode && isEditing && (
                 <>
                    <Button onClick={handleSavePlanChanges} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                        <Save className="w-4 h-4 mr-2" /> Save Changes
                    </Button>
                    <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                 </>
            )}
         </div>

         <div className="flex gap-2">
             {isPlannedMode ? (
                 <>
                    <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleRemovePlanned}>
                        <Trash2 className="w-4 h-4 mr-2" /> Remove form Plan
                    </Button>
                     <Button variant="outline" onClick={() => router.push(`/dashboard/recipes?planDate=${plannedMeal.date}&replaceId=${plannedMeal.id}`)}>
                        <ArrowRightLeft className="w-4 h-4 mr-2" /> Replace
                    </Button>
                 </>
             ) : (
                <Button variant="destructive" onClick={handleDelete}><Trash2 className="w-4 h-4 mr-2"/> Delete Recipe</Button>
             )}
         </div>
      </div>

      {/* Content Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Ingredients Column */}
        <div className="md:col-span-1 space-y-6">
          {/* Notes Section (Only for Planned Mode) */}
          {isPlannedMode && (
              <Card className="border-indigo-100 bg-indigo-50/30 shadow-sm">
                  <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-indigo-900">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                      {isEditing ? (
                          <Textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Add notes for this meal..."
                            className="bg-white"
                          />
                      ) : (
                          <p className="text-gray-700 italic text-sm">{displayedNotes || "No notes added."}</p>
                      )}
                  </CardContent>
              </Card>
          )}

           {/* Servings Adjuster (Only for Editing Plan) */}
           {isPlannedMode && isEditing && (
               <Card>
                   <CardHeader className="pb-2">
                       <CardTitle className="text-lg">Adjust Servings</CardTitle>
                   </CardHeader>
                   <CardContent>
                       <div className="flex items-center gap-4">
                           <Button variant="outline" size="icon" onClick={() => setEditServings(Math.max(1, editServings - 1))}>-</Button>
                           <span className="text-xl font-bold w-8 text-center">{editServings}</span>
                           <Button variant="outline" size="icon" onClick={() => setEditServings(editServings + 1)}>+</Button>
                       </div>
                   </CardContent>
               </Card>
           )}

          <Card className="h-fit">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Ingredients</CardTitle>
              {isEditing && (
                   <Button variant="ghost" size="sm" onClick={handleAddIngredient} className="h-8 w-8 p-0">
                       <Plus className="w-4 h-4" />
                   </Button>
              )}
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <AnimatePresence>
                {displayedIngredients?.map((ing, i) => (
                  <motion.li
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    key={i}
                    className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 text-sm"
                  >
                    {isEditing ? (
                        <div className="flex gap-2 w-full items-center">
                            <Input
                                value={ing.name}
                                onChange={(e) => handleIngredientChange(i, 'name', e.target.value)}
                                className="h-8 text-xs"
                                placeholder="Name"
                            />
                            <div className="flex gap-1">
                                <Input
                                    type="number"
                                    value={ing.amount || ''}
                                    onChange={(e) => handleIngredientChange(i, 'amount', Number(e.target.value))}
                                    className="h-8 w-14 text-xs px-1 text-center"
                                    placeholder="#"
                                />
                                <select
                                    value={ing.unit}
                                    onChange={(e) => handleIngredientChange(i, 'unit', e.target.value)}
                                    className="h-8 w-14 rounded-md border text-xs px-0"
                                >
                                     {['g', 'kg', 'l', 'dl', 'stk', 'ts', 'ss'].map(u => (
                                        <option key={u} value={u}>{u}</option>
                                    ))}
                                </select>
                            </div>
                            <button onClick={() => handleRemoveIngredient(i)} className="text-gray-400 hover:text-red-500">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <span className="font-medium text-gray-700">{ing.name}</span>
                            <span className="text-gray-500 whitespace-nowrap">{ing.amount} {ing.unit}</span>
                        </>
                    )}
                  </motion.li>
                ))}
                </AnimatePresence>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Instructions Column */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
              <CardDescription>Step-by-step guide to prepare this meal.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {recipe.instructions?.map((step, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                      {i + 1}
                    </div>
                    <p className="text-gray-700 mt-1 leading-relaxed text-lg">{step}</p>
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
