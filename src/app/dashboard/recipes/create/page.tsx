"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Plus, Save } from "lucide-react"
import toast from 'react-hot-toast'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Ingredient } from '@/types'

export default function CreateRecipePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [servings, setServings] = useState(4)
  const [prepTime, setPrepTime] = useState(30)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [instructions, setInstructions] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)

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
      await addDoc(collection(db, "meals"), {
        name,
        servings,
        prepTime,
        ingredients,
        instructions,
        imageUrl: null, // TODO: Add image upload here later if needed
        createdAt: new Date().toISOString()
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
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Recipe</h1>
        <Button onClick={handleSave} disabled={loading} variant="premium">
          <Save className="w-4 h-4 mr-2" />
          Save Recipe
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Recipe Name</label>
                <Input 
                  placeholder="e.g. Grandma's Pancakes"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Servings</label>
                  <Input 
                    type="number" 
                    value={servings}
                    onChange={(e) => setServings(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Prep Time (min)</label>
                  <Input 
                    type="number" 
                    value={prepTime}
                    onChange={(e) => setPrepTime(Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ingredients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex gap-2">
                  <Input 
                    placeholder="Name" 
                    className="flex-1"
                    value={ing.name}
                    onChange={(e) => handleIngredientChange(i, 'name', e.target.value)}
                  />
                  <Input 
                    type="number" 
                    placeholder="Qty" 
                    className="w-20"
                    value={ing.amount || ''}
                    onChange={(e) => handleIngredientChange(i, 'amount', Number(e.target.value))}
                  />
                  <select 
                    className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={ing.unit}
                    onChange={(e) => handleIngredientChange(i, 'unit', e.target.value)}
                  >
                    {['g', 'kg', 'l', 'dl', 'stk', 'ts', 'ss'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveIngredient(i)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddIngredient} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Ingredient
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {instructions.map((inst, i) => (
                <div key={i} className="flex gap-2">
                   <span className="mt-2 text-sm font-medium text-gray-500 w-6">{i+1}.</span>
                   <textarea
                    className="flex-1 min-h-[80px] p-3 rounded-md border border-input bg-transparent text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={inst}
                    onChange={(e) => handleInstructionChange(i, e.target.value)}
                   />
                   <Button variant="ghost" size="icon" onClick={() => handleRemoveInstruction(i)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddInstruction} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Step
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
