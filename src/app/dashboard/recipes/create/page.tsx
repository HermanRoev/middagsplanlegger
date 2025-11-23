"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Trash2, Plus, Save } from "lucide-react"
import toast from 'react-hot-toast'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { uploadImage } from '@/lib/storage'
import { Ingredient } from '@/types'
import { ImageUpload } from '@/components/ImageUpload'

export default function CreateRecipePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [servings, setServings] = useState(4)
  const [prepTime, setPrepTime] = useState(30)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [instructions, setInstructions] = useState<string[]>([''])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  // UseEffect for loading draft
  useEffect(() => {
    const draft = sessionStorage.getItem('recipeDraft')
    if (draft) {
      try {
        const data = JSON.parse(draft)
        setName(data.name || '')
        setServings(data.servings || 4)
        setPrepTime(data.prepTime || 30)
        setIngredients(data.ingredients || [])
        setInstructions(data.instructions || [''])
        toast.success("Loaded draft from AI")
        sessionStorage.removeItem('recipeDraft') // Clear after loading
      } catch (e) {
        console.error("Failed to parse draft", e)
      }
    }
  }, [])

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: 0, unit: 'stk' }])
  }

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
    const newIngredients = [...ingredients]
    newIngredients[index] = { ...newIngredients[index], [field]: value } as Ingredient
    setIngredients(newIngredients)
  }

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleAddInstruction = () => {
    setInstructions([...instructions, ''])
  }

  const handleInstructionChange = (index: number, value: string) => {
    const newInstructions = [...instructions]
    newInstructions[index] = value
    setInstructions(newInstructions)
  }

  const handleRemoveInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!name) return toast.error("Please name the recipe")
    setLoading(true)
    try {
      let imageUrl = null
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, `meals/${Date.now()}_${imageFile.name}`)
      }

      await addDoc(collection(db, "meals"), {
        name,
        servings,
        prepTime,
        ingredients,
        instructions,
        imageUrl,
        createdAt: new Date().toISOString(),
        createdBy: user ? {
          id: user.uid,
          name: user.displayName || user.email || 'Unknown'
        } : undefined
      })
      toast.success("Recipe saved!")
      router.push("/dashboard/recipes")
    } catch (error) {
      console.error(error)
      toast.error("Failed to save recipe")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Create Recipe</h1>
          <p className="text-gray-500">Add a new meal to your collection.</p>
        </div>
        <Button onClick={handleSave} disabled={loading} variant="premium">
          <Save className="w-4 h-4 mr-2" />
          Save Recipe
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Image & Basic Info */}
        <div className="space-y-8 lg:col-span-1">
           <Card className="border-0 shadow-md overflow-hidden">
             <CardHeader className="pb-0">
               <CardTitle>Cover Image</CardTitle>
             </CardHeader>
             <CardContent className="pt-6">
                <ImageUpload
                   value={imageFile}
                   onChange={setImageFile}
                   className="h-64"
                />
             </CardContent>
           </Card>

           <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Recipe Name</label>
                <Input 
                  placeholder="e.g. Grandma's Pancakes"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-gray-50/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Servings</label>
                  <Input 
                    type="number" 
                    value={servings}
                    onChange={(e) => setServings(Number(e.target.value))}
                    className="bg-gray-50/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Prep Time (m)</label>
                  <Input 
                    type="number" 
                    value={prepTime}
                    onChange={(e) => setPrepTime(Number(e.target.value))}
                    className="bg-gray-50/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Ingredients & Instructions */}
        <div className="space-y-8 lg:col-span-2">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Ingredients</CardTitle>
                <CardDescription>List everything needed for this dish.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={handleAddIngredient} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {ingredients.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-lg">
                  No ingredients added yet.
                </div>
              )}
              {ingredients.map((ing, i) => (
                <div key={i} className="flex gap-2 items-start group">
                  <Input 
                    placeholder="Ingredient name"
                    className="flex-1 bg-gray-50/50"
                    value={ing.name}
                    onChange={(e) => handleIngredientChange(i, 'name', e.target.value)}
                  />
                  <Input 
                    type="number" 
                    placeholder="0"
                    className="w-20 bg-gray-50/50 text-center"
                    value={ing.amount || ''}
                    onChange={(e) => handleIngredientChange(i, 'amount', Number(e.target.value))}
                  />
                  <select 
                    className="w-24 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={ing.unit}
                    onChange={(e) => handleIngredientChange(i, 'unit', e.target.value)}
                  >
                    {['g', 'kg', 'l', 'dl', 'stk', 'ts', 'ss'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveIngredient(i)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Instructions</CardTitle>
                <CardDescription>Step-by-step cooking guide.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={handleAddInstruction} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                <Plus className="w-4 h-4 mr-2" /> Add Step
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {instructions.map((inst, i) => (
                <div key={i} className="flex gap-4 group">
                   <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm mt-1">
                      {i + 1}
                   </div>
                   <textarea
                    className="flex-1 min-h-[80px] p-3 rounded-md border border-input bg-gray-50/50 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                    value={inst}
                    placeholder={`Step ${i + 1} details...`}
                    onChange={(e) => handleInstructionChange(i, e.target.value)}
                   />
                   <Button variant="ghost" size="icon" onClick={() => handleRemoveInstruction(i)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 mt-2">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
