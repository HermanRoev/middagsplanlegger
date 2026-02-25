"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Plus, Save, ArrowLeft, Loader2 } from "lucide-react"
import toast from 'react-hot-toast'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { uploadImage } from '@/lib/storage'
import { Ingredient, Meal } from '@/types'
import { ImageUpload } from '@/components/ImageUpload'
import { generateRecipeImage } from '@/lib/gemini'
import { PageContainer } from "@/components/layout/PageLayout"
import { PageHeader } from "@/components/ui/action-blocks"
import { IngredientRow, StepRow, FormLabel } from "@/components/ui/forms"
import { TagInput } from "@/components/ui/tag-input"
import { getAllIngredients, addIngredientToMasterList } from '@/lib/ingredients'
import { getAllTags, addTag } from '@/lib/tags'

export default function EditRecipePage() {
  const router = useRouter()
  const { id } = useParams()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)

  const [name, setName] = useState('')
  const [servings, setServings] = useState<number | ''>('')
  const [prepTime, setPrepTime] = useState<number | ''>('')
  const [tags, setTags] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState<"Enkel" | "Middels" | "Avansert">('Middels')
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [instructions, setInstructions] = useState<string[]>([''])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [allIngredientNames, setAllIngredientNames] = useState<string[]>([])
  const [allTagNames, setAllTagNames] = useState<string[]>([])

  // Load existing recipe
  useEffect(() => {
    if (!id) return
    const fetchRecipe = async () => {
      try {
        const snap = await getDoc(doc(db, "meals", id as string))
        if (!snap.exists()) {
          toast.error("Oppskrift ikke funnet")
          router.push("/dashboard/recipes")
          return
        }
        const data = snap.data() as Meal
        setName(data.name || '')
        setServings(data.servings || 4)
        setPrepTime(data.prepTime || 30)
        setTags(Array.isArray(data.tags) ? data.tags : [])
        if (data.difficulty) setDifficulty(data.difficulty as "Enkel" | "Middels" | "Avansert")
        setIngredients(data.ingredients || [])
        setInstructions(data.instructions?.length ? data.instructions : [''])
        setExistingImageUrl(data.imageUrl || null)
      } catch (e) {
        console.error(e)
        toast.error("Kunne ikke laste oppskrift")
        router.push("/dashboard/recipes")
      } finally {
        setLoading(false)
      }
    }
    fetchRecipe()
  }, [id, router])

  // Fetch master lists on mount
  useEffect(() => {
    getAllIngredients().then(list => setAllIngredientNames(list.map(i => i.displayName)))
    getAllTags().then(list => setAllTagNames(list.map(t => t.id)))
  }, [])

  const handleAddIngredient = () => setIngredients([...ingredients, { name: '', amount: 0, unit: 'stk' }])
  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value } as Ingredient
    setIngredients(updated)
  }
  const handleRemoveIngredient = (index: number) => setIngredients(ingredients.filter((_, i) => i !== index))

  const handleAddInstruction = () => setInstructions([...instructions, ''])
  const handleInstructionChange = (index: number, value: string) => {
    const updated = [...instructions]
    updated[index] = value
    setInstructions(updated)
  }
  const handleRemoveInstruction = (index: number) => setInstructions(instructions.filter((_, i) => i !== index))

  const handleSave = async () => {
    if (!name) return toast.error("Vennligst navngi oppskriften")
    if (!servings) return toast.error("Vennligst oppgi antall porsjoner")
    if (!prepTime) return toast.error("Vennligst oppgi forberedelsestid")

    setSaving(true)
    try {
      let imageUrl = existingImageUrl
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, `meals/${Date.now()}_${imageFile.name}`)
      }

      await updateDoc(doc(db, "meals", id as string), {
        name,
        servings: Number(servings),
        prepTime: Number(prepTime),
        tags,
        difficulty,
        ingredients,
        instructions,
        imageUrl,
        updatedAt: new Date().toISOString(),
        updatedBy: user ? { id: user.uid, name: user.displayName || user.email || 'Ukjent' } : undefined,
      })

      // Persist new tags and ingredients to master lists
      await Promise.all([
        ...tags.map(t => addTag(t)),
        ...ingredients.map(i => addIngredientToMasterList(i.name)),
      ])

      toast.success("Oppskrift oppdatert!")
      router.push(`/dashboard/recipes/${id}`)
    } catch (error) {
      console.error(error)
      toast.error("Kunne ikke lagre oppskrift")
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateImage = async (descriptionPrompt: string): Promise<File | null> => {
    if (!name.trim()) {
      toast.error('Vennligst skriv inn et oppskriftsnavn først', { id: 'image-gen' })
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

  if (loading) {
    return (
      <PageContainer className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <p className="text-gray-500 font-medium">Laster oppskrift...</p>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-8 pb-10">
      <PageHeader
        title="Rediger oppskrift"
        description={`Oppdater detaljer for "${name}"`}
      >
        <Button variant="glass" onClick={() => router.back()} className="rounded-[24px] px-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Avbryt
        </Button>
        <Button onClick={handleSave} disabled={saving} variant="premium" className="rounded-[24px] px-8 shadow-lg shadow-indigo-100">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
          Lagre endringer
        </Button>
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Image & Basic Info */}
        <div className="space-y-8 lg:col-span-1">
          <Card className="shadow-lg border-white/50">
            <CardHeader className="pb-0">
              <CardTitle>Matfoto ✨</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-6">
              <ImageUpload
                value={imageFile}
                onChange={setImageFile}
                className="min-h-[16rem] w-full"
                onGenerate={handleGenerateImage}
                isGenerating={isGeneratingImage}
                previewUrl={existingImageUrl || undefined}
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
                  className="w-full min-h-[56px] rounded-[24px] border border-white/50 bg-white/40 backdrop-blur-md px-5 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-white/80 focus:border-white transition-all shadow-sm"
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
          <Card className="shadow-lg border-white/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Ingredienser</CardTitle>
                <CardDescription>Liste over alt som trengs for denne retten.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={handleAddIngredient} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
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

          <Card className="shadow-lg border-white/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Fremgangsmåte</CardTitle>
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
