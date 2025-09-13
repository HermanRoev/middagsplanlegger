// Fil: src/components/ShoppingListView.tsx
'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { nb } from 'date-fns/locale'
import { format } from 'date-fns'
import { Ingredient } from '@/types'
import toast from 'react-hot-toast'

interface AggregatedIngredient {
  name: string
  amount: number
  unit: string
}

export function ShoppingListView() {
  const [selectedDays, setSelectedDays] = useState<Date[]>([])
  const [shoppedDays, setShoppedDays] = useState<Date[]>([])
  const [shoppingList, setShoppingList] = useState<AggregatedIngredient[]>([])
  const [totalCost, setTotalCost] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [copyButtonText, setCopyButtonText] = useState(
    'Kopier til utklippstavlen'
  )

  // Fetch ALL planned meals once to display in the calendar
  useEffect(() => {
    const fetchShoppedDays = async () => {
      const plansQuery = query(
        collection(db, 'mealPlans'),
        where('isShopped', '==', true)
      )
      const querySnapshot = await getDocs(plansQuery)
      const dates = querySnapshot.docs.map(
        (d) => new Date(d.data().date + 'T12:00:00')
      )
      setShoppedDays(dates)
    }

    fetchShoppedDays()
  }, [])

  // Automatically generate the shopping list when selectedDays changes
  useEffect(() => {
    const generateList = async () => {
      if (selectedDays.length === 0) {
        setShoppingList([])
        setTotalCost(0)
        return
      }
      setIsLoading(true)
      try {
        const dateStrings = selectedDays.map((day) => format(day, 'yyyy-MM-dd'))
        const plansQuery = query(
          collection(db, 'mealPlans'),
          where('date', 'in', dateStrings),
          where('isShopped', '!=', true)
        )
        const querySnapshot = await getDocs(plansQuery)
        let cost = 0
        const aggregatedMap = new Map<
          string,
          { amount: number; unit: string; name: string }
        >()
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          cost += data.costEstimate || 0
          const ingredients = (data.scaledIngredients as Ingredient[]) || []
          ingredients.forEach((ing) => {
            if (
              typeof ing === 'object' &&
              ing !== null &&
              ing.name &&
              ing.unit &&
              ing.amount != null
            ) {
              let baseAmount = ing.amount
              let baseUnit = ing.unit
              let keySuffix = baseUnit
              if (ing.unit === 'kg') {
                baseAmount = ing.amount * 1000
                baseUnit = 'g'
              }
              if (ing.unit === 'g' || ing.unit === 'kg') keySuffix = 'g'
              if (ing.unit === 'l') {
                baseAmount = ing.amount * 10
                baseUnit = 'dl'
              }
              if (ing.unit === 'l' || ing.unit === 'dl') keySuffix = 'dl'
              if (ing.unit === 'ss') {
                baseAmount = ing.amount * 3
                baseUnit = 'ts'
              }
              if (ing.unit === 'ss' || ing.unit === 'ts') keySuffix = 'ts'
              const key = `${ing.name.trim().toLowerCase()}_${keySuffix}`
              const existing = aggregatedMap.get(key)
              if (existing) {
                existing.amount += baseAmount
              } else {
                aggregatedMap.set(key, {
                  name: ing.name.trim(),
                  amount: baseAmount,
                  unit: baseUnit,
                })
              }
            }
          })
        })
        const list = Array.from(aggregatedMap.values())
          .map((value) => {
            if (value.unit === 'g' && value.amount >= 1000)
              return { ...value, amount: value.amount / 1000, unit: 'kg' }
            if (value.unit === 'dl' && value.amount >= 10)
              return { ...value, amount: value.amount / 10, unit: 'l' }
            return value
          })
          .sort((a, b) => a.name.localeCompare(b.name))
        setShoppingList(list)
        setTotalCost(cost)
      } catch (error) {
        console.error('Feil ved generering av handleliste:', error)
        toast.error('Kunne ikke lage listen. Sjekk konsollen for feil.')
      } finally {
        setIsLoading(false)
      }
    }
    generateList()
  }, [selectedDays])

  const handleMarkAsShopped = async () => {
    if (selectedDays.length === 0) return
    const toastId = toast.loading('Merker dager som handlet...')
    try {
      const batch = writeBatch(db)
      const dateStrings = selectedDays.map((day) => format(day, 'yyyy-MM-dd'))
      const plansQuery = query(
        collection(db, 'mealPlans'),
        where('date', 'in', dateStrings)
      )
      const querySnapshot = await getDocs(plansQuery)

      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { isShopped: true })
      })

      await batch.commit()

      setShoppedDays((prev) => [...prev, ...selectedDays])
      setSelectedDays([])
      toast.success('Dagene er merket som handlet!', { id: toastId })
    } catch (error) {
      console.error('Feil ved merking som handlet:', error)
      toast.error('En feil oppstod.', { id: toastId })
    }
  }

  const handleCopyList = () => {
    if (shoppingList.length === 0) return

    const listAsString = shoppingList
      .map(
        (item) =>
          `${item.name}: ${parseFloat(item.amount.toFixed(2))} ${item.unit}`
      )
      .join('\n')

    navigator.clipboard.writeText(listAsString).then(
      () => {
        setCopyButtonText('Kopiert!')
        setTimeout(() => setCopyButtonText('Kopier til utklippstavlen'), 2000)
      },
      (err) => {
        console.error('Kunne ikke kopiere tekst: ', err)
        toast.error('Kunne ikke kopiere til utklippstavlen.')
      }
    )
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg w-full">
      <h2 className="text-3xl font-bold mb-2 text-gray-800">Handleliste</h2>
      <p className="text-gray-600 mb-6">
        Velg dager i kalenderen for å lage en handleliste. Listen oppdateres
        automatisk.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex justify-center">
          <DayPicker
            mode="multiple"
            min={0}
            selected={selectedDays}
            onSelect={(days) => setSelectedDays(days || [])}
            locale={nb}
            showOutsideDays
            fixedWeeks
            disabled={shoppedDays}
            modifiers={{ shopped: shoppedDays }}
            modifiersClassNames={{
              selected: 'day-selected',
              shopped: 'day-shopped',
              today: 'day-today',
              disabled: 'day-disabled',
              caption_label: 'text-2xl font-bold capitalize',
            }}
            classNames={{
              cell: 'h-36 w-full text-center relative',
              day: 'w-full h-full text-lg',
              caption: 'mb-6',
              head_cell: 'text-lg font-semibold mb-2',
              head_row: 'mb-1',
              table: 'w-full border-collapse',
              tbody: 'divide-y',
            }}
            formatters={{
              formatCaption: (date) => {
                return format(date, 'MMMM yyyy', { locale: nb }).replace(
                  /^\w/,
                  (c) => c.toUpperCase()
                )
              },
              formatWeekdayName: (weekday) => {
                return format(weekday, 'EEEE', { locale: nb })
                  .replace(/^\w/, (c) => c.toUpperCase())
                  .slice(0, 3)
              },
            }}
          />
        </div>
        <div>
          {/* The right-side panel logic remains the same */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <button
              onClick={handleCopyList}
              disabled={shoppingList.length === 0}
              className="flex-1 bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700 disabled:bg-gray-400 transition-colors"
            >
              {copyButtonText}
            </button>
            <button
              onClick={handleMarkAsShopped}
              disabled={selectedDays.length === 0}
              className="flex-1 bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              Merk som handlet
            </button>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl min-h-[40vh] shadow-sm">
            {totalCost > 0 && (
              <div className="mb-4 text-center">
                <p className="text-lg font-semibold text-gray-800">
                  Estimert total kostnad
                </p>
                <p className="text-2xl font-bold text-blue-600">{totalCost} kr</p>
              </div>
            )}
            {isLoading && (
              <p className="text-center text-gray-500 pt-10">
                Oppdaterer liste...
              </p>
            )}
            {!isLoading && shoppingList.length > 0 && (
              <ul className="space-y-3">
                {shoppingList.map((item, index) => (
                  <li key={index} className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <span className="font-medium text-gray-800 capitalize">
                      {item.name}:
                    </span>
                    <span className="ml-2 text-gray-700">
                      {parseFloat(item.amount.toFixed(2))} {item.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {!isLoading && shoppingList.length === 0 && (
              <p className="text-center text-gray-500 pt-10">
                {selectedDays.length > 0
                  ? 'Ingen måltider funnet for valgte dager.'
                  : 'Handlelisten er tom. Velg dager for å lage en liste.'}
              </p>
            )}
          </div>
        </div>
      </div>
      {/* Add a style tag for the custom modifier classes */}
      <style jsx global>{`
        .day-selected {
          background-color: #2563eb !important;
          color: white !important;
          border-radius: 0.375rem;
        }
        .day-shopped {
          background-color: #dcfce7 !important;
          color: #166534 !important;
          border-radius: 0.375rem;
        }
        .day-today {
          font-weight: bold;
          color: #1d4ed8;
        }
        .day-disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
