"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Plus, Save, Loader2 } from "lucide-react"
import toast from 'react-hot-toast'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { uploadImage } from '@/lib/storage'
import { Ingredient } from '@/types'
import { ImageUpload } from '@/components/ImageUpload'
import { generateRecipeImage } from '@/lib/gemini'
import { incrementUserStat } from '@/lib/stats'
import { PageContainer } from "@/components/layout/PageLayout"
import { PageHeader } from "@/components/ui/action-blocks"
import { IngredientRow, StepRow, FormLabel } from "@/components/ui/forms"
import { TagInput } from "@/components/ui/tag-input"
import { getAllIngredients, addIngredientToMasterList } from '@/lib/ingredients'
import { getAllTags, addTag } from '@/lib/tags'

export default function CreateRecipePage() {
  const router = useRouter()
  const { user, householdId } = useAuth()
  const [name, setName] = useState('')
  // Changed defaults from 4/30 to '' to force user entry (or use placeholders)
  const [servings, setServings] = useState<number | ''>('')
  const [prepTime, setPrepTime] = useState<number | ''>('')
  const [tags, setTags] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState<"Enkel" | "Middels" | "Avansert">('Middels')
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [instructions, setInstructions] = useState<string[]>([''])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [allIngredientNames, setAllIngredientNames] = useState<string[]>([])
  const [allTagNames, setAllTagNames] = useState<string[]>([])

  // UseEffect for loading draft
  useEffect(() => {
    const draft = sessionStorage.getItem('recipeDraft')
    if (draft) {
      try {
        const data = JSON.parse(draft)
        setName(data.name || '')
        setServings(data.servings || 4) // Drafts can default to 4 if missing
        setPrepTime(data.prepTime || 30)
        setTags(Array.isArray(data.tags) ? data.tags : [])
        if (data.difficulty) setDifficulty(data.difficulty)
        setIngredients(data.ingredients || [])
        setInstructions(data.instructions || [''])
        sessionStorage.removeItem('recipeDraft') // Clear after loading
      } catch (e) {
        console.error("Kunne ikke laste inn utkast", e)
      }
    }
  }, [])

  // Fetch master lists on mount
  useEffect(() => {
    getAllIngredients().then(list => setAllIngredientNames(list.map(i => i.displayName)))
    getAllTags().then(list => setAllTagNames(list.map(t => t.id)))
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
    if (!name) return toast.error("Vennligst navngi oppskriften")
    if (!servings) return toast.error("Vennligst oppgi antall porsjoner")
    if (!prepTime) return toast.error("Vennligst oppgi forberedelsestid")

    setLoading(true)
    try {
      let imageUrl = null
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, `meals/${Date.now()}_${imageFile.name}`)
      }

      await addDoc(collection(db, "meals"), {
        name,
        servings: Number(servings),
        prepTime: Number(prepTime),
        tags,
        difficulty,
        ingredients,
        instructions,
        imageUrl,
        createdAt: new Date().toISOString(),
        createdBy: user ? {
          id: user.uid,
          name: user.displayName || user.email || 'Unknown'
        } : undefined,
        householdId: householdId
      })

      // Persist new tags and ingredients to master lists
      await Promise.all([
        ...tags.map(t => addTag(t)),
        ...ingredients.map(i => addIngredientToMasterList(i.name)),
      ])
      if (user) {
        await incrementUserStat(user.uid, 'recipesCreated', 1)
      }
      toast.success("Oppskrift lagret!")
      router.push("/dashboard/recipes")
    } catch (error) {
      console.error(error)
      toast.error("Kunne ikke lagre oppskrift")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateImage = async (descriptionPrompt: string): Promise<File | null> => {
    if (!name.trim()) {
      toast.error('Vennligst skriv inn et oppskriftsnavn først for å generere et bilde.', { id: 'image-gen' })
      return null
    }

    setIsGeneratingImage(true)
    let generatedFile = null

    try {
      toast.loading('Genererer et mesterverk...', { id: 'image-gen' })
      generatedFile = await generateRecipeImage(name, descriptionPrompt)
      toast.success('Bilde generert!', { id: 'image-gen' })
    } catch (error) {
      console.error(error)
      toast.error('Kunne ikke generere bilde. Prøv igjen.', { id: 'image-gen' })
    } finally {
      setIsGeneratingImage(false)
    }

    return generatedFile
  }

  return (
    <PageContainer className="space-y-8 pb-10">
      <PageHeader
        title="Opprett oppskrift"
        description="Legg til et nytt måltid i samlingen din."
      >
        <Button onClick={handleSave} disabled={loading} variant="premium" className="rounded-[24px] px-8 shadow-lg shadow-indigo-100">
          <Save className="w-5 h-5 mr-2" />
          Lagre oppskrift
        </Button>
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Image & Basic Info */}
        <div className="space-y-8 lg:col-span-1">
          <Card className="shadow-lg border-white/50">
            <CardHeader className="pb-0">
              <CardTitle>Omslagsbilde</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-6">
              <ImageUpload
                value={imageFile}
                onChange={setImageFile}
                className="min-h-[16rem] w-full"
                onGenerate={handleGenerateImage}
                isGenerating={isGeneratingImage}
              />
            </CardContent>
          </Card>

          <Card className="shadow-lg border-white/50">
            <CardHeader>
              <CardTitle>Detaljer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FormLabel required>Navn på oppskrift</FormLabel>
                <Input
                  placeholder="Pannekaker, taco, lasagne..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FormLabel required>Porsjoner</FormLabel>
                  <Input
                    type="number"
                    value={servings}
                    onChange={(e) => setServings(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="4"
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel required>Tid (min)</FormLabel>
                  <Input
                    type="number"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="30"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <FormLabel>Vanskelighetsgrad</FormLabel>
                <select
                  className="w-full h-10 rounded-md border border-input bg-gray-50/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as "Enkel" | "Middels" | "Avansert")}
                >
                  <option value="Enkel">Enkel</option>
                  <option value="Middels">Middels</option>
                  <option value="Avansert">Avansert</option>
                </select>
              </div>
              <div className="space-y-2">
                <FormLabel>Tags</FormLabel>
                <TagInput
                  tags={tags}
                  allTags={allTagNames}
                  onChange={setTags}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Ingredients & Instructions */}
        <div className="space-y-8 lg:col-span-2">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Ingredienser</CardTitle>
                <CardDescription>Liste over alt som trengs for denne retten.</CardDescription>
              </div>
              <Button data-testid="add-ingredient-button" variant="ghost" size="sm" onClick={handleAddIngredient} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                <Plus className="w-4 h-4 mr-2" /> Legg til ny
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {ingredients.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-lg">
                  Ingen ingredienser lagt til ennå.
                </div>
              )}
              {ingredients.map((ing, i) => (
                <IngredientRow
                  key={i}
                  ingredient={ing}
                  index={i}
                  onChange={handleIngredientChange}
                  onRemove={handleRemoveIngredient}
                  ingredientSuggestions={allIngredientNames}
                />
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Instruksjoner</CardTitle>
                <CardDescription>Steg-for-steg guide.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={handleAddInstruction} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                <Plus className="w-4 h-4 mr-2" /> Legg til steg
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {instructions.map((inst, i) => (
                <StepRow
                  key={i}
                  step={inst}
                  index={i}
                  onChange={handleInstructionChange}
                  onRemove={handleRemoveInstruction}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
