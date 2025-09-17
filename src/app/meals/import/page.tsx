'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/MainLayout'
import toast from 'react-hot-toast'
import { getAI, getGenerativeModel } from 'firebase/ai'
import { app, db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { Meal, Ingredient } from '@/types'
import InputField from '@/components/ui/InputField'
import TextAreaField from '@/components/ui/TextAreaField'

export default function ImportMealPage() {
  const [importType, setImportType] = useState<'image' | 'text' | 'generate'>(
    'image'
  )
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [recipeText, setRecipeText] = useState('')
  const [generateName, setGenerateName] = useState('')
  const [generateServings, setGenerateServings] = useState<number | null>()
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImageFile(event.target.files[0])
    }
  }

  const handleImport = async () => {
    setIsLoading(true)
    const toastId = toast.loading('Analyserer oppskrift med AI...', {
      duration: Infinity,
    })

    try {
      let prompt
      let result
      const ai = getAI(app)
      const model = getGenerativeModel(ai, { model: 'gemini-2.5-flash' })

      const ingredientsSnapshot = await getDocs(collection(db, 'ingredients'))
      const masterIngredientList = ingredientsSnapshot.docs.map(
        (doc) => doc.data().name
      )
      const ingredientContext = `Her er en liste over eksisterende ingredienser i databasen. Hvis du finner en ingrediens i oppskriften som ligner på en av disse, vennligst bruk det nøyaktige navnet fra denne listen: ${masterIngredientList.join(', ')}.`

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
        prompt = `
          Du er en ekspert på å tolke oppskrifter. Analyser følgende oppskriftsinnhold.
          ${ingredientContext}
          Trekk ut navnet på retten, en liste over ingredienser (med navn, mengde og enhet), og en liste med trinnvise instruksjoner.
          Gi også et estimat for den totale kostnaden for måltidet i norske kroner (NOK), basert på gjennomsnittlige priser i Norge.
          De gyldige enhetene for ingredienser er: 'g', 'kg', 'l', 'dl', 'stk', 'ts', 'ss'. Normaliser til disse der det er mulig.
          For "instructions", hver streng i listen skal være ren tekst for ett trinn, uten "Steg X:" eller annen formatering.
          Returner KUN et enkelt, gyldig JSON-objekt med denne strukturen: { "name": "...", "ingredients": [{ "name": "...", "amount": ..., "unit": "..." }], "instructions": ["...", "..."], "costEstimate": ... }.
          Hele responsen din skal KUN være JSON-objektet, som starter med { og slutter med }. Ikke inkluder 'json' eller annen tekst.
        `
        result = await model.generateContent([prompt, imagePart])
      } else if (importType === 'text' && recipeText.trim()) {
        prompt = `
          Du er en ekspert på å tolke oppskrifter. Analyser følgende oppskriftstekst.
          ${ingredientContext}
          Trekk ut navnet på retten, en liste over ingredienser (med navn, mengde og enhet), og en liste med trinnvise instruksjoner.
          Gi også et estimat for den totale kostnaden for måltidet i norske kroner (NOK), basert på gjennomsnittlige priser i Norge.
          De gyldige enhetene for ingredienser er: 'g', 'kg', 'l', 'dl', 'stk', 'ts', 'ss'. Normaliser til disse der det er mulig.
          For "instructions", hver streng i listen skal være ren tekst for ett trinn, uten "Steg X:" eller annen formatering.
          Returner KUN et enkelt, gyldig JSON-objekt med denne strukturen: { "name": "...", "ingredients": [{ "name": "...", "amount": ..., "unit": "..." }], "instructions": ["...", "..."], "costEstimate": ... }.
          Hele responsen din skal KUN være JSON-objektet, som starter med { og slutter med }. Ikke inkluder 'json' eller annen tekst.
        `
        result = await model.generateContent([prompt, recipeText])
      } else if (importType === 'generate' && generateName.trim()) {
        prompt = `
          Du er en kreativ kokk. Generer en komplett oppskrift for "${generateName}" for ${generateServings} personer.
          ${ingredientContext}
          Lag en oppskrift som er praktisk for en travel hverdag; unngå unødvendig kompliserte steg eller å lage alt fra bunnen av.
          Oppgi ingrediensene, en liste med trinnvise instruksjoner, en estimert tilberedningstid i minutter, og en estimert kostnad i norske kroner (NOK).
          De gyldige enhetene for ingredienser er: 'g', 'kg', 'l', 'dl', 'stk', 'ts', 'ss'.
          For "instructions", hver streng i listen skal være ren tekst for ett trinn, uten "Steg X:" eller annen formatering.
          Returner KUN et enkelt, gyldig JSON-objekt med denne strukturen: { "name": "...", "ingredients": [{ "name": "...", "amount": ..., "unit": "..." }], "instructions": ["...", "..."], "prepTime": ..., "costEstimate": ... }.
          Hele responsen din skal KUN være JSON-objektet, som starter med { og slutter med }. Ikke inkluder 'json' eller annen tekst.
        `
        result = await model.generateContent(prompt)
      } else {
        toast.error(
          'Vennligst velg en fil, lim inn tekst, eller fyll inn et navn for generering.',
          { id: toastId, duration: 4000 }
        )
        setIsLoading(false)
        return
      }

      const response = result.response
      const jsonText = response.candidates?.[0]?.content?.parts?.[0]?.text

      if (!jsonText) {
        console.error('Could not find text in AI response:', response)
        toast.error('AI-en ga et uventet svar. Prøv igjen.', {
          id: toastId,
          duration: 4000,
        })
        setIsLoading(false)
        return
      }

      const cleanedJsonText = jsonText
        .replace(/```json\n?/, '')
        .replace(/```$/, '')
        .trim()
      const parsedRecipe = JSON.parse(cleanedJsonText) as {
        name: string
        ingredients: Omit<Ingredient, 'id'>[]
        instructions: string[]
        prepTime?: number
        costEstimate?: number
      }

      const recipeForForm: Omit<Meal, 'id'> = {
        name: parsedRecipe.name,
        instructions: parsedRecipe.instructions || [],
        servings: generateServings || 1,
        ingredients: parsedRecipe.ingredients || [],
        prepTime: parsedRecipe.prepTime || null,
        costEstimate: parsedRecipe.costEstimate || null,
        imageUrl: null,
      }

      sessionStorage.setItem('importedRecipe', JSON.stringify(recipeForForm))

      toast.success(
        'Oppskrift analysert! Omdirigerer til redigeringssiden...',
        {
          id: toastId,
          duration: 4000,
        }
      )
      router.push(`/meals/new`)
    } catch (error) {
      console.error('Feil under importering:', error)
      toast.error(
        `En feil oppsto: ${error instanceof Error ? error.message : 'Ukjent feil'}`,
        { id: toastId, duration: 4000 }
      )
    } finally {
      setIsLoading(false)
    }
  }

  const TabButton = ({
    tab,
    label,
  }: {
    tab: 'image' | 'text' | 'generate'
    label: string
  }) => (
    <button
      onClick={() => setImportType(tab)}
      className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
        importType === tab
          ? 'bg-blue-600 text-white shadow-md'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      {label}
    </button>
  )

  return (
    <MainLayout>
      <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col w-full h-full">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Importer eller generer en oppskrift
          </h1>
          <p className="text-gray-600 mt-1">
            Velg en metode for å starte. AI-en vil analysere innholdet og gjøre
            det om til en middag i biblioteket ditt.
          </p>
        </header>

        <div className="flex items-center bg-gray-100 p-1 rounded-lg mb-6 self-start">
          <TabButton tab="image" label="Fra bilde" />
          <TabButton tab="text" label="Fra tekst" />
          <TabButton tab="generate" label="Generer ny" />
        </div>

        <div className="flex-grow space-y-6">
          {importType === 'image' && (
            <div
              className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="material-icons text-5xl text-gray-400">
                add_photo_alternate
              </span>
              <p className="mt-2 text-gray-500">
                {imageFile
                  ? `Valgt fil: ${imageFile.name}`
                  : 'Klikk for å velge et bilde, eller dra og slipp'}
              </p>
            </div>
          )}

          {importType === 'text' && (
            <TextAreaField
              id="text-upload"
              label="Lim inn oppskriftstekst"
              value={recipeText}
              onChange={(e) => setRecipeText(e.target.value)}
              rows={10}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  handleImport()
                }
              }}
            />
          )}

          {importType === 'generate' && (
            <div className="space-y-6 max-w-md">
              <InputField
                id="meal-name"
                label="Hva vil du lage?"
                type="text"
                value={generateName}
                onChange={(e) => setGenerateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleImport()
                  }
                }}
                required
              />
              <InputField
                id="servings"
                label="Antall porsjoner"
                type="number"
                value={generateServings ?? ''}
                onChange={(e) =>
                  setGenerateServings(Number(e.target.value) || null)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleImport()
                  }
                }}
                min="1"
              />
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleImport}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm hover:shadow-md transition-shadow disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span className="material-icons text-base">auto_fix_high</span>
            {isLoading ? 'Analyserer...' : 'Start med AI'}
          </button>
        </div>
      </div>
    </MainLayout>
  )
}
