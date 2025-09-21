'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'
import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { Ingredient, Meal } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import InputField from './ui/InputField'
import { COLLECTIONS } from '@/lib/constants'

const units = [
  { value: 'g', label: 'gram' },
  { value: 'kg', label: 'kg' },
  { value: 'l', label: 'liter' },
  { value: 'dl', label: 'dl' },
  { value: 'stk', label: 'stk' },
  { value: 'ts', label: 'ts' },
  { value: 'ss', label: 'ss' },
]

interface MealFormProps {
  initialData?: Omit<Meal, 'id'>
  onSave: (mealData: Omit<Meal, 'id'>, imageFile: File | null) => Promise<void>
  isEditing: boolean
}

export function MealForm({ initialData, onSave, isEditing }: MealFormProps) {
  const { user } = useAuth()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(initialData?.imageUrl || '')
  const [mealName, setMealName] = useState(initialData?.name || '')
  const [servings, setServings] = useState(initialData?.servings || null)
  const [prepTime, setPrepTime] = useState(initialData?.prepTime || null)
  const [costEstimate, setCostEstimate] = useState(
    initialData?.costEstimate || null
  )
  const [instructions, setInstructions] = useState<string[]>([''])
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialData?.ingredients || []
  )
  const [masterIngredientList, setMasterIngredientList] = useState<string[]>([])

  useEffect(() => {
    if (initialData) {
      setMealName(initialData.name || '')
      setServings(initialData.servings || null)
      setPrepTime(initialData.prepTime || null)
      setCostEstimate(initialData.costEstimate || null)
      if (initialData.instructions && Array.isArray(initialData.instructions)) {
        setInstructions(initialData.instructions)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if (typeof (initialData.instructions as any) === 'string') {
        // For backward compatibility with old string format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setInstructions((initialData.instructions as any).split('\n'))
      } else {
        setInstructions([''])
      }
      setIngredients(initialData.ingredients || [])
      setImagePreview(initialData.imageUrl || '')
    }
  }, [initialData])

  useEffect(() => {
    const fetchMasterIngredients = async () => {
      const querySnapshot = await getDocs(
        collection(db, COLLECTIONS.INGREDIENTS)
      )
      setMasterIngredientList(querySnapshot.docs.map((doc) => doc.id))
    }
    fetchMasterIngredients()
  }, [])

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    } else {
      toast.error('Vennligst velg en gyldig bildefil.')
    }
  }

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile()
          if (file) handleFile(file)
          break
        }
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: null, unit: 'stk' }])
  }

  const updateIngredient = (
    index: number,
    field: keyof Ingredient,
    value: string | number | null
  ) => {
    const newIngredients = [...ingredients]
    newIngredients[index] = { ...newIngredients[index], [field]: value }
    setIngredients(newIngredients)
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const addInstruction = () => {
    setInstructions([...instructions, ''])
  }

  const updateInstruction = (index: number, value: string) => {
    const newInstructions = [...instructions]
    newInstructions[index] = value
    setInstructions(newInstructions)
  }

  const removeInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mealName) {
      toast.error('Vennligst fyll inn navn på middagen')
      return
    }
    if (ingredients.length === 0) {
      toast.error('Legg til minst én ingrediens')
      return
    }
    const mealData: Omit<Meal, 'id'> = {
      name: mealName,
      servings: servings || 1,
      prepTime,
      costEstimate,
      ingredients: ingredients.filter((ing) => ing.name.trim() !== ''),
      instructions: instructions.filter((inst) => inst.trim() !== ''),
      imageUrl: initialData?.imageUrl || '',
      createdBy:
        initialData?.createdBy ||
        (user
          ? { id: user.uid, name: user.displayName || 'Ukjent bruker' }
          : undefined),
    }
    await onSave(mealData, imageFile)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-6">
        <div
          className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
          onClick={() => document.getElementById('imageInput')?.click()}
        >
          <input
            type="file"
            id="imageInput"
            accept="image/*"
            className="hidden"
            onChange={(e) =>
              e.target.files?.[0] && handleFile(e.target.files[0])
            }
          />
          {imagePreview ? (
            <Image
              src={imagePreview}
              alt="Preview"
              width={512}
              height={288}
              unoptimized={true}
              className="w-full h-auto rounded-lg object-contain"
            />
          ) : (
            <div className="text-center text-gray-500">
              <span className="material-icons text-5xl">
                add_photo_alternate
              </span>
              <p className="mt-2">Klikk for å velge bilde, eller lim inn</p>
            </div>
          )}
        </div>

        <div>
          <InputField
            id="mealName"
            label="Navn på middag"
            type="text"
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InputField
            id="servings"
            label="Antall porsjoner"
            type="number"
            value={servings ?? ''}
            onChange={(e) => setServings(Number(e.target.value) || null)}
            min="1"
          />
          <InputField
            id="prepTime"
            label="Tid (minutter)"
            type="number"
            value={prepTime ?? ''}
            onChange={(e) => setPrepTime(Number(e.target.value) || null)}
            min="0"
          />
          <InputField
            id="costEstimate"
            label="Pris (NOK)"
            type="number"
            value={costEstimate ?? ''}
            onChange={(e) => setCostEstimate(Number(e.target.value) || null)}
            min="0"
          />
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            Ingredienser
          </h3>
          <div className="space-y-4">
            {ingredients.map((ingredient, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-grow">
                  <InputField
                    id={`ingredient-name-${index}`}
                    label="Ingrediens"
                    type="text"
                    value={ingredient.name}
                    onChange={(e) =>
                      updateIngredient(index, 'name', e.target.value)
                    }
                    list="ingredients"
                  />
                </div>
                <div className="w-28">
                  <InputField
                    id={`ingredient-amount-${index}`}
                    label="Mengde"
                    type="number"
                    value={ingredient.amount ?? ''}
                    onChange={(e) =>
                      updateIngredient(
                        index,
                        'amount',
                        Number(e.target.value) || null
                      )
                    }
                  />
                </div>
                <select
                  value={ingredient.unit}
                  onChange={(e) =>
                    updateIngredient(index, 'unit', e.target.value)
                  }
                  className="w-24 h-[50px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {units.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="h-[50px] w-[50px] flex items-center justify-center bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <span className="material-icons">delete</span>
                </button>
              </div>
            ))}
            <datalist id="ingredients">
              {masterIngredientList.map((ingredient) => (
                <option key={ingredient} value={ingredient} />
              ))}
            </datalist>
          </div>
          <button
            type="button"
            onClick={addIngredient}
            className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors"
          >
            <span className="material-icons">add</span>
            Legg til ingrediens
          </button>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            Fremgangsmåte
          </h3>
          <div className="space-y-4">
            {instructions.map((step, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-grow">
                  <InputField
                    id={`instruction-${index}`}
                    label={`Steg ${index + 1}`}
                    type="text"
                    value={step}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeInstruction(index)}
                  className="h-[50px] w-[50px] flex items-center justify-center bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <span className="material-icons">delete</span>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addInstruction}
            className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors"
          >
            <span className="material-icons">add</span>
            Legg til steg
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <Link
          href="/"
          className="px-6 py-2 text-gray-700 rounded-lg hover:bg-gray-100"
        >
          Avbryt
        </Link>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm hover:shadow-md transition-shadow"
        >
          {isEditing ? 'Oppdater middag' : 'Lagre middag'}
        </button>
      </div>
    </form>
  )
}
