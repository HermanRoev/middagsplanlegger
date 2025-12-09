"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, Loader2, PenTool } from "lucide-react"
import { ImageUpload } from '@/components/ImageUpload'
import { generateRecipeFromText, generateRecipeFromImage } from '@/lib/gemini'

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
      let parsedData;

      if (importType === 'image' && imageFile) {
        parsedData = await generateRecipeFromImage(imageFile)

      } else if (importType === 'text' && recipeText.trim()) {
        parsedData = await generateRecipeFromText(recipeText)

      } else if (importType === 'generate' && generateName.trim()) {
        parsedData = await generateRecipeFromText(`Create a recipe for: ${generateName}. Make it family friendly.`)

      } else {
        throw new Error("Missing input")
      }

      if (parsedData) {
          sessionStorage.setItem('recipeDraft', JSON.stringify(parsedData))
          toast.success('Recipe analyzed! Review details.', { id: toastId })
          router.push('/dashboard/recipes/create')
      }

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
      
      <Tabs defaultValue="text" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="text">Paste Text/URL</TabsTrigger>
          <TabsTrigger value="generate">AI Generate</TabsTrigger>
          <TabsTrigger value="image">Image</TabsTrigger>
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
                placeholder="Paste ingredients and instructions here (or a description)..."
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
