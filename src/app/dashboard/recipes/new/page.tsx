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
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Add New Recipe</h1>
        <p className="text-gray-500 mt-1">Choose your preferred way to add a recipe.</p>
      </div>
      
      <Tabs defaultValue="text" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6 h-11 bg-gray-100/50 p-1 rounded-xl border border-gray-100">
          <TabsTrigger value="text" className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">Describe</TabsTrigger>
          <TabsTrigger value="generate" className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">AI Suggest</TabsTrigger>
          <TabsTrigger value="image" className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">From Photo</TabsTrigger>
          <TabsTrigger value="manual" className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="focus-visible:outline-none">
          <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="pt-8 flex flex-col items-center text-center px-6">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-3 border border-indigo-100">
                <Sparkles className="w-6 h-6 text-indigo-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">Describe dish</CardTitle>
              <p className="text-sm text-gray-500 max-w-sm mt-1">Paste a URL, ingredients, or just describe the dish in your own words. AI will handle the rest.</p>
            </CardHeader>
            <CardContent className="px-6 pb-8 space-y-4">
              <textarea
                className="w-full min-h-[160px] p-4 rounded-xl border border-gray-200 bg-gray-50/30 text-base focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                placeholder="e.g. 'Creamy pasta with salmon, garlic and spinach...' or paste a website link here."
                value={recipeText}
                onChange={(e) => setRecipeText(e.target.value)}
              />
              <Button 
                size="lg"
                className="w-full rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 shadow-sm" 
                disabled={!recipeText || isLoading}
                onClick={() => handleImport('text')}
              >
                {isLoading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null}
                Generate Recipe
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate" className="focus-visible:outline-none">
           <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="pt-8 flex flex-col items-center text-center px-6">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-3 border border-purple-100">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">AI Suggestion</CardTitle>
              <p className="text-sm text-gray-500 max-w-sm mt-1">Just type a name, and I will suggest a complete recipe for you.</p>
            </CardHeader>
            <CardContent className="px-6 pb-8 space-y-4">
              <Input 
                className="h-12 rounded-xl border-gray-200 bg-gray-50/30 px-4 text-base focus:ring-2 focus:ring-purple-500/10 focus:border-purple-200 outline-none"
                placeholder="e.g. Spicy Chicken Pasta" 
                value={generateName}
                onChange={(e) => setGenerateName(e.target.value)}
              />
              <Button 
                size="lg"
                className="w-full rounded-xl font-bold bg-purple-600 hover:bg-purple-700 shadow-sm" 
                disabled={!generateName || isLoading}
                onClick={() => handleImport('generate')}
              >
                {isLoading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null}
                Get AI Suggestion
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="image" className="focus-visible:outline-none">
          <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="pt-8 flex flex-col items-center text-center px-6">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-3 border border-blue-100">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">From Photo</CardTitle>
              <p className="text-sm text-gray-500 max-w-sm mt-1">Upload a picture of a physical recipe or a screenshot, and I will extract the details.</p>
            </CardHeader>
            <CardContent className="px-6 pb-8 space-y-4">
              <div className="p-1 bg-gray-50/30 rounded-2xl border border-gray-100">
                <ImageUpload
                    value={imageFile}
                    onChange={setImageFile}
                />
              </div>
              <Button 
                size="lg"
                className="w-full rounded-xl font-bold bg-blue-600 hover:bg-blue-700 shadow-sm" 
                disabled={!imageFile || isLoading}
                onClick={() => handleImport('image')}
              >
                {isLoading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null}
                Analyze Photo
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="focus-visible:outline-none">
          <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="pt-8 flex flex-col items-center text-center px-6">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-3 border border-gray-100">
                <PenTool className="w-6 h-6 text-gray-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">Manual Entry</CardTitle>
              <p className="text-sm text-gray-500 max-w-sm mt-1">Create a recipe from scratch without any automated assistance.</p>
            </CardHeader>
            <CardContent className="px-6 pb-8 space-y-4">
              <div className="bg-gray-50/30 py-8 px-4 rounded-2xl border border-dashed border-gray-200 text-center">
                <p className="text-gray-400 font-medium text-sm">Standard manual form with all details.</p>
              </div>
              <Button asChild size="lg" className="w-full rounded-xl font-bold" variant="outline">
                <Link href="/dashboard/recipes/create">
                  Start Manual Entry
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
