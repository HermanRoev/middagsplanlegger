"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, query, where, doc, updateDoc, addDoc, setDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { PlannedMeal } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, Plus, ShoppingCart, Trash2, Copy, ClipboardList } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { normalizeUnit, formatUnit, Unit } from "@/lib/units"
import toast from "react-hot-toast"

interface ShopItem {
    id: string;
    name: string;
    amount: number;
    unit: string;
    checked: boolean;
    source?: string;
}

const STAPLES = [
    "Milk", "Bread", "Eggs", "Butter", "Cheese", "Coffee", "Rice", "Pasta"
]

export default function ShopPage() {
  const [items, setItems] = useState<ShopItem[]>([])
  const [newItem, setNewItem] = useState("")
  const [plannedCheckedState, setPlannedCheckedState] = useState<Record<string, boolean>>({})

  // 1. Fetch manually added items
  useEffect(() => {
    const q = query(collection(db, "shoppingList"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const manualItems = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        source: 'manual'
      })) as ShopItem[]

      setItems(prev => {
        const plannedOnly = prev.filter(i => i.source === 'planned')
        return [...plannedOnly, ...manualItems]
      })
    })
    return () => unsubscribe()
  }, [])

  // 2. Fetch persistent checked state for planned items (Using a separate collection 'shoppingChecked')
  useEffect(() => {
    const q = query(collection(db, "shoppingChecked"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
       const checkedMap: Record<string, boolean> = {}
       snapshot.docs.forEach(doc => {
         checkedMap[doc.id] = doc.data().checked
       })
       setPlannedCheckedState(checkedMap)
    })
    return () => unsubscribe()
  }, [])

  // 3. Fetch planned meals and aggregate
  useEffect(() => {
    const q = query(
      collection(db, "plannedMeals"), 
      where("isShopped", "==", false)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meals = snapshot.docs.map(doc => doc.data() as PlannedMeal)
      const aggregated: Record<string, { amount: number, unit: Unit }> = {}

      meals.forEach(meal => {
        meal.ingredients?.forEach(ing => {
          if (!ing.amount || !ing.unit) return
          const { amount: normalizedAmount, unit: normalizedUnit } = normalizeUnit(ing.amount, ing.unit)
          const key = `${ing.name.toLowerCase()}-${normalizedUnit}`
          
          if (!aggregated[key]) {
            aggregated[key] = { amount: 0, unit: normalizedUnit }
          }
          aggregated[key].amount += normalizedAmount
        })
      })

      const plannedList = Object.entries(aggregated).map(([key, val]) => {
        const name = key.split('-')[0]
        // Check if this item ID is in our persistent checked map
        const isChecked = plannedCheckedState[key] || false

        return {
          id: key,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          amount: val.amount,
          unit: val.unit,
          checked: isChecked,
          source: 'planned'
        }
      })
      
      setItems(prev => {
         const manualOnly = prev.filter(i => i.source === 'manual')
         return [...manualOnly, ...plannedList]
      })
    })
    
    return () => unsubscribe()
  }, [plannedCheckedState]) // Re-run when plannedCheckedState updates

  const addItem = async (name: string) => {
    if (!name.trim()) return
    await addDoc(collection(db, "shoppingList"), {
      name: name,
      checked: false,
      createdAt: new Date().toISOString()
    })
  }

  const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      addItem(newItem)
      setNewItem("")
  }

  const toggleItem = async (id: string, checked: boolean, source: string = 'manual') => {
    if (source === 'manual') {
       await updateDoc(doc(db, "shoppingList", id), { checked })
    } else {
       // Persist checked state for planned items
       await setDoc(doc(db, "shoppingChecked", id), { checked })
    }
  }

  const deleteManualItem = async (id: string) => {
      await deleteDoc(doc(db, "shoppingList", id))
  }

  const copyToClipboard = () => {
      const uncheckedItems = items.filter(i => !i.checked)
      if (uncheckedItems.length === 0) {
          toast.error("No items to copy")
          return
      }
      const text = "Shopping List:\n" + uncheckedItems.map(i => `- ${i.name} ${i.source === 'planned' ? `(${formatUnit(i.amount, i.unit as Unit)})` : ''}`).join('\n')
      navigator.clipboard.writeText(text)
      toast.success("List copied to clipboard")
  }

  const sortedItems = items.sort((a,b) => Number(a.checked) - Number(b.checked))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Shopping List</h1>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="w-4 h-4 mr-2" /> Copy List
            </Button>
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-full">
                <ShoppingCart className="w-6 h-6" />
            </div>
        </div>
      </div>

      {/* Staples Quick Add */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <div className="flex items-center gap-1 text-sm text-gray-500 mr-2 whitespace-nowrap">
              <ClipboardList className="w-4 h-4" /> Quick Add:
          </div>
          {STAPLES.map(staple => (
              <button
                  key={staple}
                  onClick={() => addItem(staple)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-600 border border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors whitespace-nowrap"
              >
                  + {staple}
              </button>
          ))}
      </div>

      <Card className="glass border-0 shadow-lg">
        <CardContent className="p-6">
          <form onSubmit={handleFormSubmit} className="flex gap-2 mb-6">
            <Input 
              placeholder="Add item (e.g. Milk, Bread)" 
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              className="bg-white/50 border-indigo-100 focus:border-indigo-300"
            />
            <Button type="submit" variant="premium">
              <Plus className="w-4 h-4" />
            </Button>
          </form>

          <div className="space-y-2">
             {items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
                  <p>Your list is empty.</p>
                </div>
             )}
             <AnimatePresence>
              {sortedItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${item.checked ? 'bg-gray-50 opacity-60' : 'bg-white shadow-sm'}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <button 
                      onClick={() => toggleItem(item.id, !item.checked, item.source)}
                      className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${item.checked ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-indigo-500'}`}
                    >
                      {item.checked && <Check className="w-4 h-4" />}
                    </button>
                    <div className="flex flex-col">
                      <span className={item.checked ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}>
                        {item.name}
                      </span>
                      {item.source === 'planned' && (
                        <span className="text-xs text-indigo-500">{formatUnit(item.amount, item.unit as Unit)} (Planned)</span>
                      )}
                    </div>
                  </div>
                  {item.source === 'manual' && (
                      <Button variant="ghost" size="icon" onClick={() => deleteManualItem(item.id)} className="text-gray-300 hover:text-red-400 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                      </Button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
