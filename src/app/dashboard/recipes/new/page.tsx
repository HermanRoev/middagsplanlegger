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
import { PageContainer } from "@/components/layout/PageLayout"
import { PageHeader } from "@/components/ui/action-blocks"

export default function NewRecipePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [recipeText, setRecipeText] = useState('')
  const [generateName, setGenerateName] = useState('')
  const router = useRouter()

  const handleImport = async (importType: 'image' | 'text' | 'generate') => {
    setIsLoading(true)
    const toastId = toast.loading('Konsulterer med AI Kokken...', { duration: Infinity })

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
        toast.success('Oppskrift analysert! Gå gjennom detaljene.', { id: toastId, duration: 3000 })
        router.push('/dashboard/recipes/create')
      }

    } catch (error: unknown) {
      console.error(error)
      const message = error instanceof Error ? error.message : "Ukjent feil";
      toast.error(`Feil: ${message}`, { id: toastId, duration: 4000 })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PageContainer className="space-y-8 pb-12">
      <PageHeader
        title="Legg til ny oppskrift"
        description="Velg hvordan du vil legge til oppskriften."
      />

      <div className="max-w-2xl mx-auto w-full">
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 h-11 bg-gray-100/50 p-1 rounded-xl border border-gray-100">
            <TabsTrigger value="text" className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm">Beskriv</TabsTrigger>
            <TabsTrigger value="generate" className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm">AI Forslag</TabsTrigger>
            <TabsTrigger value="image" className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm">Fra Bilde</TabsTrigger>
            <TabsTrigger value="manual" className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm">Manuelt</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="focus-visible:outline-none">
            <Card className="shadow-lg border-white/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  Beskriv retten
                </CardTitle>
                <p className="text-sm text-gray-500">Lim inn en lenke, ingredienser, eller bare beskriv retten med egne ord. AI fikser resten.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <textarea
                  className="w-full min-h-[160px] p-4 rounded-[24px] border border-white/50 bg-white/40 backdrop-blur-md text-base font-bold text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:border-white transition-all shadow-sm"
                  placeholder="f.eks. 'Kremet pasta med laks, hvitløk og spinat...' eller lim inn en lenke fra en nettside her."
                  value={recipeText}
                  onChange={(e) => setRecipeText(e.target.value)}
                />
                <Button
                  size="lg"
                  variant="premium"
                  className="w-full font-bold"
                  disabled={!recipeText || isLoading}
                  onClick={() => handleImport('text')}
                >
                  {isLoading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null}
                  Generer oppskrift
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="generate" className="focus-visible:outline-none">
            <Card className="shadow-lg border-white/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  AI Forslag
                </CardTitle>
                <p className="text-sm text-gray-500">Bare skriv inn et navn, så foreslår jeg en komplett oppskrift for deg.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="f.eks. Spicy Kyllingpasta"
                  value={generateName}
                  onChange={(e) => setGenerateName(e.target.value)}
                />
                <Button
                  size="lg"
                  variant="premium"
                  className="w-full font-bold"
                  disabled={!generateName || isLoading}
                  onClick={() => handleImport('generate')}
                >
                  {isLoading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null}
                  Få AI Forslag
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="image" className="focus-visible:outline-none">
            <Card className="shadow-lg border-white/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  Fra Bilde
                </CardTitle>
                <p className="text-sm text-gray-500">Last opp et bilde av en oppskrift eller et skjermbilde, så trekker jeg ut detaljene.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-white/50 overflow-hidden">
                  <ImageUpload
                    value={imageFile}
                    onChange={setImageFile}
                  />
                </div>
                <Button
                  size="lg"
                  variant="premium"
                  className="w-full font-bold"
                  disabled={!imageFile || isLoading}
                  onClick={() => handleImport('image')}
                >
                  {isLoading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null}
                  Analyser Bilde
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="focus-visible:outline-none">
            <Card className="shadow-lg border-white/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <PenTool className="w-5 h-5 text-indigo-600" />
                  Manuell inntasting
                </CardTitle>
                <p className="text-sm text-gray-500">Legg inn en oppskrift fra bunnen av uten automatisk assistanse.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="py-8 px-4 rounded-2xl border-2 border-dashed border-gray-100 text-center text-gray-400 font-medium text-sm">
                  Fyll inn alle detaljer selv.
                </div>
                <Button asChild size="lg" variant="premium" className="w-full font-bold">
                  <Link href="/dashboard/recipes/create">
                    Start manuell inntasting
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  )
}
