'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/MainLayout'
import toast from 'react-hot-toast'
import { getGenerativeModel } from 'firebase/ai'
import { db } from '@/lib/firebase'
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { Meal, Ingredient } from '@/types'

export default function ImportMealPage() {
  const [importType, setImportType] = useState<'image' | 'text' | 'generate'>(
    'image'
  )
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [recipeText, setRecipeText] = useState('')
  const [generateName, setGenerateName] = useState('')
  const [generateServings, setGenerateServings] = useState<number>(4)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImageFile(event.target.files[0])
    }
  }

  const getMasterIngredientId = async (
    ingredientName: string
  ): Promise<string> => {
    const cleanName = ingredientName.trim().toLowerCase()
    const ingredientsRef = collection(db, 'ingredients')
    const q = query(ingredientsRef, where('name', '==', cleanName))
    const snapshot = await getDocs(q)

    if (!snapshot.empty) {
      return snapshot.docs[0].id
    } else {
      const newIngredientRef = await addDoc(ingredientsRef, { name: cleanName })
      return newIngredientRef.id
    }
  }

  const handleImport = async () => {
    setIsLoading(true)
    toast.loading('Analyserer oppskrift med AI...')

    try {
      let prompt
      let result
      const model = getGenerativeModel({ model: 'gemini-2.5-flash' })

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
          Trekk ut navnet på retten, en liste over ingredienser (med navn, mengde og enhet), og instruksjonene.
          Gi også et estimat for den totale kostnaden for måltidet i norske kroner (NOK), basert på gjennomsnittlige priser i Norge.
          De gyldige enhetene for ingredienser er: 'g', 'kg', 'l', 'dl', 'stk', 'ts', 'ss'. Normaliser til disse der det er mulig.
          Returner KUN et enkelt, gyldig JSON-objekt med denne strukturen: { "name": "...", "ingredients": [{ "name": "...", "amount": ..., "unit": "..." }], "instructions": "...", "costEstimate": ... }.
          Ikke inkluder tekst, markdown eller formatering utenfor JSON-objektet.
        `
        result = await model.generateContent([prompt, imagePart])
      } else if (importType === 'text' && recipeText.trim()) {
        prompt = `
          Du er en ekspert på å tolke oppskrifter. Analyser følgende oppskriftstekst.
          Trekk ut navnet på retten, en liste over ingredienser (med navn, mengde og enhet), og instruksjonene.
          Gi også et estimat for den totale kostnaden for måltidet i norske kroner (NOK), basert på gjennomsnittlige priser i Norge.
          De gyldige enhetene for ingredienser er: 'g', 'kg', 'l', 'dl', 'stk', 'ts', 'ss'. Normaliser til disse der det er mulig.
          Returner KUN et enkelt, gyldig JSON-objekt med denne strukturen: { "name": "...", "ingredients": [{ "name": "...", "amount": ..., "unit": "..." }], "instructions": "...", "costEstimate": ... }.
          Ikke inkluder tekst, markdown eller formatering utenfor JSON-objektet.
        `
        result = await model.generateContent([prompt, recipeText])
      } else if (importType === 'generate' && generateName.trim()) {
        prompt = `
          Du er en kreativ kokk. Generer en komplett oppskrift for "${generateName}" for ${generateServings} personer.
          Oppgi ingrediensene, trinnvise instruksjoner, en estimert tilberedningstid i minutter, og en estimert kostnad i norske kroner (NOK).
          De gyldige enhetene for ingredienser er: 'g', 'kg', 'l', 'dl', 'stk', 'ts', 'ss'.
          Returner KUN et enkelt, gyldig JSON-objekt med denne strukturen: { "name": "...", "ingredients": [{ "name": "...", "amount": ..., "unit": "..." }], "instructions": "...", "prepTime": ..., "costEstimate": ... }.
          Ikke inkluder tekst, markdown eller formatering utenfor JSON-objektet.
        `
        result = await model.generateContent(prompt)
      } else {
        toast.dismiss()
        toast.error(
          'Vennligst velg en fil, lim inn tekst, eller fyll inn et navn for generering.'
        )
        setIsLoading(false)
        return
      }

      const response = result.response
      const responseText = response.text()
      const match = responseText.match(/```json\n([\s\S]*?)\n```/);
      const jsonString = match ? match[1] : responseText;
      const parsedRecipe = JSON.parse(jsonString) as {
        name: string
        ingredients: Omit<Ingredient, 'id'>[]
        instructions: string
        prepTime?: number
        costEstimate?: number
      }

      toast.loading('Lagrer ny oppskrift...')

      const newMealRef = await addDoc(collection(db, 'meals'), {
        name: parsedRecipe.name,
        instructions: parsedRecipe.instructions,
        servings: generateServings || 1,
        ingredients: parsedRecipe.ingredients || [],
        prepTime: parsedRecipe.prepTime || undefined,
        costEstimate: parsedRecipe.costEstimate || undefined,
        imageUrl: undefined,
      })

      if (parsedRecipe.ingredients && parsedRecipe.ingredients.length > 0) {
        await Promise.all(
          parsedRecipe.ingredients.map((ing) => getMasterIngredientId(ing.name))
        )
      }

      toast.dismiss()
      toast.success('Oppskrift importert! Omdirigerer for redigering...')
      router.push(`/meals/edit/${newMealRef.id}`)
    } catch (error) {
      toast.dismiss()
      console.error('Feil under importering:', error)
      toast.error(
        `En feil oppsto: ${error instanceof Error ? error.message : 'Ukjent feil'}`
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
                  value={generateServings}
                  onChange={(e) =>
                    setGenerateServings(Number(e.target.value))
                  }
                  min="1"
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
