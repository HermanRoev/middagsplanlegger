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
    // Optimistic update for immediate feedback
    setItems(current => 
      [...current].map(i => i.id === id ? { ...i, checked } : i)
    )

    try {
        if (source === 'manual') {
           await updateDoc(doc(db, "shoppingList", id), { checked })
        } else {
           // Persist checked state for planned items
           await setDoc(doc(db, "shoppingChecked", id), { checked })
        }
    } catch (e) {
        console.error(e)
        toast.error("Failed to update item")
        // onSnapshot will eventually revert the state if it fails
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

  const clearChecked = async () => {
      const checkedManualItems = items.filter(i => i.source === 'manual' && i.checked)
      const checkedPlannedKeys = items.filter(i => i.source === 'planned' && i.checked).map(i => i.id)

      const toastId = toast.loading("Clearing items...")
      try {
          // Delete manual items from 'shoppingList'
          const manualPromises = checkedManualItems.map(item => deleteDoc(doc(db, "shoppingList", item.id)))
          
          // For planned items, we don't delete them from 'plannedMeals', 
          // we just mark them as 'isShopped: true' or clear their checked state in 'shoppingChecked'.
          // Actually, the current logic uses 'shoppingChecked' to persist the UI state.
          // If we want them to disappear, we should probably mark the whole meal as 'isShopped: true' 
          // but that might be too aggressive if multiple items are from the same meal.
          // Let's just remove the checked state for now, or if they are checked, we mark them as shopped in the persistent map.
          const plannedPromises = checkedPlannedKeys.map(key => deleteDoc(doc(db, "shoppingChecked", key)))

          await Promise.all([...manualPromises, ...plannedPromises])
          toast.success("Cleared checked items", { id: toastId })
      } catch (e) {
          console.error(e)
          toast.error("Failed to clear items", { id: toastId })
      }
  }

  const sortedItems = items.sort((a,b) => Number(a.checked) - Number(b.checked))

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
            <h1 className="text-5xl font-black tracking-tight text-gray-900 leading-none">Handleliste</h1>
            <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{items.filter(i => !i.checked).length} varer igjen</span>
                </div>
            </div>
        </div>
        <div className="flex gap-2">
            {items.some(i => i.checked) && (
                <Button variant="ghost" size="sm" onClick={clearChecked} className="text-gray-400 hover:text-red-600 font-bold">
                    <Trash2 className="w-4 h-4 mr-2" /> Tøm ferdige
                </Button>
            )}
            <Button variant="outline" className="h-12 rounded-xl px-6 border-gray-200 bg-white shadow-sm font-bold" onClick={copyToClipboard}>
                <Copy className="w-4 h-4 mr-2 text-indigo-600" /> Kopier liste
            </Button>
        </div>
      </div>

      <Card className="border border-gray-100 shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-8">
          <form onSubmit={handleFormSubmit} className="flex gap-3 mb-8">
            <Input 
              placeholder="Hva trenger du? (f.eks. Melk, Brød)" 
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              className="h-12 rounded-xl bg-gray-50 border-gray-100 text-lg font-medium shadow-inner"
            />
            <Button type="submit" variant="premium" className="h-12 px-8 rounded-xl font-black shadow-lg shadow-indigo-100">
              <Plus className="w-5 h-5 mr-2" /> Legg til
            </Button>
          </form>

          {/* Staples Quick Add */}
          <div className="flex items-center gap-3 overflow-x-auto pb-6 no-scrollbar border-b border-gray-50 mb-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg mr-1">
                  <ClipboardList className="w-4 h-4 text-gray-500" />
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Hurtigvalg</span>
              </div>
              {STAPLES.map(staple => (
                  <button
                      key={staple}
                      onClick={() => addItem(staple)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-gray-600 border border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all whitespace-nowrap shadow-sm"
                  >
                      + {staple}
                  </button>
              ))}
          </div>

          <div className="space-y-3">
             {items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-gray-50/50 rounded-[24px] border-2 border-dashed border-gray-100">
                  <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-xl font-bold text-gray-900 mb-1">Listen er tom</p>
                  <p className="text-sm">Legg til varer manuelt eller planlegg måltider.</p>
                </div>
             )}
             <AnimatePresence mode="popLayout">
              {sortedItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  transition={{
                    layout: { type: "spring", stiffness: 300, damping: 30 }
                  }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${item.checked ? 'bg-gray-50/50 border-transparent opacity-60' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <button 
                      onClick={() => toggleItem(item.id, !item.checked, item.source)}
                      className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${item.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-200 bg-gray-50/50 hover:border-indigo-500'}`}
                    >
                      {item.checked && <Check className="w-5 h-5 stroke-[3px]" />}
                    </button>
                    <div className="flex flex-col">
                      <span className={`text-lg font-black tracking-tight ${item.checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {item.name}
                      </span>
                      {item.source === 'planned' && (
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">
                                {formatUnit(item.amount, item.unit as Unit)}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Planlagt</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {item.source === 'manual' && (
                      <Button variant="ghost" size="icon" onClick={() => deleteManualItem(item.id)} className="h-10 w-10 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl">
                          <Trash2 className="w-5 h-5" />
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
