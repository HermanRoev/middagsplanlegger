"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { getAI, getGenerativeModel } from 'firebase/ai'
import { app, db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, Loader2, PenTool } from "lucide-react"
import { ImageUpload } from '@/components/ImageUpload'

export default function NewRecipePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [recipeText, setRecipeText] = useState('')
  const [generateName, setGenerateName] = useState('')
  const router = useRouter()

  const handleImport = async (importType: 'image' | 'text' | 'generate') => {
    setIsLoading(true)
    const toastId = toast.loading('Consulting with AI Chef...', { duration: Infinity })

    try {
      let prompt
      let result
      const ai = getAI(app)
      // Note: Ensure this model is enabled in your Firebase project
      const model = getGenerativeModel(ai, { model: 'gemini-2.0-flash' })

      // Context for standardized ingredients
      const ingredientsSnapshot = await getDocs(collection(db, 'ingredients'))
      const masterIngredientList = ingredientsSnapshot.docs.map(doc => doc.data().name)
      const ingredientContext = `Existing ingredients in database (try to match these): ${masterIngredientList.join(', ')}.`

      const baseSystemPrompt = `
        You are an expert chef and nutritionist. Analyze the input and extract a structured recipe.
        ${ingredientContext}
        Output Format: JSON only. No markdown code blocks.
        Structure: { 
          "name": "string", 
          "ingredients": [{ "name": "string", "amount": number, "unit": "g"|"kg"|"l"|"dl"|"stk"|"ts"|"ss" }], 
          "instructions": ["string"], 
          "costEstimate": number (NOK),
          "prepTime": number (minutes),
          "servings": number
        }
        Ensure units are normalized. Instructions should be clear steps.
      `

      if (importType === 'image' && imageFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.readAsDataURL(imageFile)
          reader.onload = () => resolve((reader.result as string).split(',')[1])
          reader.onerror = (error) => reject(error)
        })

        const imagePart = {
          inlineData: {
            data: base64,
            mimeType: imageFile.type,
          },
        }
        prompt = `${baseSystemPrompt} Analyze this image of a recipe or meal.`
        result = await model.generateContent([prompt, imagePart])

      } else if (importType === 'text' && recipeText.trim()) {
        prompt = `${baseSystemPrompt} Analyze this recipe text: ${recipeText}`
        result = await model.generateContent(prompt)

      } else if (importType === 'generate' && generateName.trim()) {
        prompt = `${baseSystemPrompt} Create a recipe for: ${generateName}. Make it family friendly.`
        result = await model.generateContent(prompt)
      } else {
        throw new Error("Missing input")
      }

      const response = result.response
      const text = response.text()
      
      // Clean up JSON (sometimes AI adds markdown blocks)
      const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim()
      const parsedData = JSON.parse(jsonString)

      sessionStorage.setItem('recipeDraft', JSON.stringify(parsedData))
      
      toast.success('Recipe analyzed! Review details.', { id: toastId })
      router.push('/dashboard/recipes/create') // This page will read the draft

    } catch (error: unknown) {
      console.error(error)
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Error: ${message}`, { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Add New Recipe</h1>
      
      <Tabs defaultValue="image" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="image">Image Import</TabsTrigger>
          <TabsTrigger value="text">Paste Text</TabsTrigger>
          <TabsTrigger value="generate">AI Generate</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="image">
          <Card>
            <CardHeader>
              <CardTitle>Upload Recipe Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageUpload
                value={imageFile}
                onChange={setImageFile}
              />
              <Button 
                className="w-full" 
                disabled={!imageFile || isLoading}
                onClick={() => handleImport('image')}
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                Analyze Image
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="text">
          <Card>
            <CardHeader>
              <CardTitle>Paste Recipe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                className="w-full min-h-[200px] p-4 rounded-md border border-input bg-transparent text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Paste ingredients and instructions here..."
                value={recipeText}
                onChange={(e) => setRecipeText(e.target.value)}
              />
              <Button 
                className="w-full" 
                disabled={!recipeText || isLoading}
                onClick={() => handleImport('text')}
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                Analyze Text
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate">
           <Card>
            <CardHeader>
              <CardTitle>Generate with AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                placeholder="e.g. Spicy Chicken Pasta" 
                value={generateName}
                onChange={(e) => setGenerateName(e.target.value)}
              />
              <Button 
                className="w-full" 
                disabled={!generateName || isLoading}
                onClick={() => handleImport('generate')}
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                Generate Recipe
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Manual Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-500">Create a recipe from scratch without AI assistance.</p>
              <Button asChild className="w-full" variant="outline">
                <Link href="/dashboard/recipes/create">
                  <PenTool className="mr-2 w-4 h-4" />
                  Create Manually
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
