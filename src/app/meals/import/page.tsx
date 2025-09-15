'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/MainLayout'
import toast from 'react-hot-toast'
import { getAI, getGenerativeModel } from 'firebase/ai'
import { app, db } from '@/lib/firebase'
import {
  collection,
  getDocs,
} from 'firebase/firestore'
import { Meal, Ingredient } from '@/types'

export default function ImportMealPage() {
  const [importType, setImportType] = useState<'image' | 'text' | 'generate'>(
    'image'
  )
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [recipeText, setRecipeText] = useState('')
  const [generateName, setGenerateName] = useState('')
  const [generateServings, setGenerateServings] = useState<number | null>(4)
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
          reader.onload = () =>
            resolve((reader.result as string).split(',')[1])
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
          { id: toastId }
        )
        setIsLoading(false)
        return
      }

      const response = result.response
      const jsonText = response.candidates?.[0]?.content?.parts?.[0]?.text

      if (!jsonText) {
        console.error('Could not find text in AI response:', response)
        toast.error('AI-en ga et uventet svar. Prøv igjen.', { id: toastId })
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

      toast.success('Oppskrift analysert! Omdirigerer til redigeringssiden...', {
        id: toastId,
      })
      router.push(`/meals/new`)
    } catch (error) {
      console.error('Feil under importering:', error)
      toast.error(
        `En feil oppsto: ${error instanceof Error ? error.message : 'Ukjent feil'}`,
        { id: toastId }
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-4 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Importer oppskrift
        </h1>

        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setImportType('image')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                importType === 'image'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Importer fra bilde
            </button>
            <button
              onClick={() => setImportType('text')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                importType === 'text'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Importer fra tekst
            </button>
            <button
              onClick={() => setImportType('generate')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                importType === 'generate'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Generer fra navn
            </button>
          </nav>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md">
          {importType === 'image' && (
            <div>
              <label
                htmlFor="image-upload"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Velg et bilde av en oppskrift
              </label>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
              />
              {imageFile && (
                <p className="text-xs text-gray-500 mt-2">
                  Valgt fil: {imageFile.name}
                </p>
              )}
            </div>
          )}

          {importType === 'text' && (
            <div>
              <label
                htmlFor="text-upload"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Lim inn oppskriftstekst
              </label>
              <textarea
                id="text-upload"
                rows={12}
                value={recipeText}
                onChange={(e) => setRecipeText(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                placeholder="Lim inn hele oppskriften her, inkludert tittel, ingredienser og fremgangsmåte..."
              ></textarea>
            </div>
          )}

          {importType === 'generate' && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="meal-name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Navn på middag
                </label>
                <input
                  id="meal-name"
                  type="text"
                  value={generateName}
                  onChange={(e) => setGenerateName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="f.eks. Spaghetti Bolognese"
                />
              </div>
              <div>
                <label
                  htmlFor="servings"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Antall porsjoner
                </label>
                <input
                  id="servings"
                  type="number"
                  value={generateServings ?? ''}
                  onChange={(e) =>
                    setGenerateServings(Number(e.target.value) || null)
                  }
                  min="1"
                  placeholder="f.eks. 4"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>
          )}

          <div className="mt-8 text-right">
            <button
              onClick={handleImport}
              disabled={isLoading}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? 'Importerer...' : 'Start import'}
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
