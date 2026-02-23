"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, query, where, doc, updateDoc, addDoc, setDoc, deleteDoc, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { PlannedMeal } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader, EmptyStateBlock, QuickAddBar } from "@/components/ui/action-blocks"
import { Check, Plus, ShoppingCart, Trash2, Copy } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { normalizeUnit, formatUnit, Unit } from "@/lib/units"
import { useAuth } from "@/contexts/AuthContext"
import { PageContainer } from "@/components/layout/PageLayout"
import toast from "react-hot-toast"
import { incrementUserStat } from "@/lib/stats"

interface ShopItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  checked: boolean;
  source?: string;
}

const STAPLES = [
  "Melk", "Brød", "Egg", "Smør", "Ost", "Kaffe", "Ris", "Pasta"
]

export default function ShopPage() {
  const { user, householdId } = useAuth()
  const [items, setItems] = useState<ShopItem[]>([])
  const [newItem, setNewItem] = useState("")
  const [plannedCheckedState, setPlannedCheckedState] = useState<Record<string, boolean>>({})

  // 1. Fetch manually added items
  useEffect(() => {
    if (!user) return
    const q = query(collection(db, "shoppingList"), where("householdId", "==", householdId))
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
    if (!user) return
    const q = query(collection(db, "shoppingChecked"), where("householdId", "==", householdId))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const checkedMap: Record<string, boolean> = {}
      snapshot.docs.forEach(doc => {
        checkedMap[doc.id] = doc.data().checked
      })
      setPlannedCheckedState(checkedMap)
    })
    return () => unsubscribe()
  }, [])

  // 3. Fetch cupboard items to exclude from shopping list
  const [cupboardItems, setCupboardItems] = useState<string[]>([])
  useEffect(() => {
    if (!user) return
    const q = query(collection(db, "cupboard"), where("householdId", "==", householdId))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Store just the lowercase names for easy checking
      setCupboardItems(snapshot.docs.map(doc => doc.data().ingredientName.toLowerCase()))
    })
    return () => unsubscribe()
  }, [])

  // 4. Fetch planned meals and aggregate
  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, "plannedMeals"),
      where("isShopped", "==", false),
      where("householdId", "==", householdId)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meals = snapshot.docs.map(doc => doc.data() as PlannedMeal)
      const aggregated: Record<string, { amount: number, unit: Unit }> = {}

      meals.forEach(meal => {
        const ingredientsToUse = meal.scaledIngredients || meal.ingredients || []
        ingredientsToUse.forEach(ing => {
          if (ing.isShopped) return
          if (!ing.amount || !ing.unit) return

          const normalizedName = ing.name.toLowerCase()
          // Skip if already in cupboard
          if (cupboardItems.includes(normalizedName)) return

          const { amount: normalizedAmount, unit: normalizedUnit } = normalizeUnit(ing.amount, ing.unit)
          const key = `${normalizedName}-${normalizedUnit}`

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
  }, [plannedCheckedState, cupboardItems, user]) // Re-run when checked state or cupboard changes

  const addItem = async (name: string) => {
    if (!name.trim() || !user) return
    await addDoc(collection(db, "shoppingList"), {
      name: name,
      checked: false,
      createdAt: new Date().toISOString(),
      userId: user.uid,
      householdId: householdId
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
        if (user) {
          await setDoc(doc(db, "shoppingChecked", id), { checked, userId: user.uid, householdId: householdId })
        }
      }

      if (checked && user) {
        // Track stats!
        incrementUserStat(user.uid, 'itemsShopped', 1)
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
      toast.error("Ingen varer å kopiere")
      return
    }
    const text = "Handleliste:\n" + uncheckedItems.map(i => `- ${i.name} ${i.source === 'planned' ? `(${formatUnit(i.amount, i.unit as Unit)})` : ''}`).join('\n')
    navigator.clipboard.writeText(text)
    toast.success("Listen er kopiert")
  }

  const clearChecked = async () => {
    const checkedManualItems = items.filter(i => i.source === 'manual' && i.checked)
    const checkedPlannedKeys = items.filter(i => i.source === 'planned' && i.checked).map(i => i.id)

    const toastId = toast.loading("Flytter til matbod og tømmer liste...")
    try {
      // 1. Move all checked items to Cupboard before deleting them
      const checkedItemsToMove = items.filter(i => i.checked && i.name)
      if (checkedItemsToMove.length > 0 && user) {
        const movePromises = checkedItemsToMove.map(item => {
          return addDoc(collection(db, "cupboard"), {
            ingredientName: item.name.toLowerCase(),
            amount: item.amount || null,
            unit: item.unit || 'stk',
            userId: user.uid,
            householdId: householdId,
            wantedAmount: null,
            threshold: null
          })
        })
        await Promise.all(movePromises)
      }

      // 2. Delete the Manual Shopping List Items
      const manualPromises = checkedManualItems.map(item => deleteDoc(doc(db, "shoppingList", item.id)))

      // 3. Update the plannedMeals 'isShopped' flag
      if (checkedPlannedKeys.length > 0 && user) {
        const q = query(collection(db, "plannedMeals"), where("isShopped", "==", false), where("householdId", "==", householdId))
        const snapshot = await getDocs(q)

        const updatePromises = snapshot.docs.map(mealDoc => {
          const meal = mealDoc.data() as PlannedMeal
          let updated = false

          const processIngredients = (ings: typeof meal.ingredients) => {
            if (!ings) return ings
            return ings.map(ing => {
              if (ing.isShopped || !ing.amount || !ing.unit) return ing
              const { unit: normalizedUnit } = normalizeUnit(ing.amount, ing.unit)
              const key = `${ing.name.toLowerCase()}-${normalizedUnit}`
              if (checkedPlannedKeys.includes(key)) {
                updated = true
                return { ...ing, isShopped: true }
              }
              return ing
            })
          }

          const newIngredients = processIngredients(meal.ingredients)
          const newScaledIngredients = processIngredients(meal.scaledIngredients)

          if (updated) {
            return updateDoc(doc(db, "plannedMeals", mealDoc.id), {
              ingredients: newIngredients || null,
              scaledIngredients: newScaledIngredients || null
            })
          }
          return Promise.resolve()
        })

        await Promise.all(updatePromises)
      }

      // 4. Clean up the shoppingChecked persistent state
      const checkedPromises = checkedPlannedKeys.map(key => deleteDoc(doc(db, "shoppingChecked", key)))

      await Promise.all([...manualPromises, ...checkedPromises])

      const itemCount = checkedItemsToMove.length;
      toast.success(itemCount > 0 ? `Flyttet ${itemCount} varer til Matboden` : "Fjernet ferdige varer", { id: toastId })
    } catch (e) {
      console.error(e)
      toast.error("Kunne ikke tømme listen", { id: toastId })
    }
  }

  const sortedItems = items.sort((a, b) => {
    if (a.checked !== b.checked) {
      return Number(a.checked) - Number(b.checked)
    }
    return a.name.localeCompare(b.name, 'no', { sensitivity: 'base' })
  })

  return (
    <PageContainer className="space-y-10 pb-12">
      <PageHeader
        title="Handleliste"
        description={
          <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 mt-2 w-fit">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{items.filter(i => !i.checked).length} varer igjen</span>
          </div>
        }
      >
        {items.some(i => i.checked) && (
          <Button variant="glass-destructive" size="sm" onClick={clearChecked} className="rounded-2xl px-4" iconLeft={<Trash2 className="w-4 h-4" />}>
            Tøm ferdige
          </Button>
        )}
        <Button variant="glass" className="h-12 rounded-2xl px-6" onClick={copyToClipboard} iconLeft={<Copy className="w-4 h-4 text-indigo-500" />}>
          Kopier liste
        </Button>
      </PageHeader>

      <div className="max-w-3xl mx-auto w-full space-y-10">
      <Card className="shadow-lg border-white/50">
        <CardContent className="p-8">
          <form onSubmit={handleFormSubmit} className="flex items-center gap-3 mb-8">
            <Input
              placeholder="Hva trenger du? (f.eks. Melk, Brød)"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              className="text-base font-medium shadow-inner"
            />
            <Button type="submit" variant="premium" size="xl" className="shrink-0 px-8 font-black shadow-lg shadow-indigo-100">
              <Plus className="w-5 h-5 mr-2" /> Legg til
            </Button>
          </form>

          {/* Staples Quick Add */}
          <QuickAddBar
            items={STAPLES}
            onAdd={addItem}
            className="pb-6 border-b border-gray-50 mb-6"
          />

          <div className="space-y-3">
            {items.length === 0 && (
              <EmptyStateBlock
                icon={ShoppingCart}
                title="Listen er tom"
                description="Legg til varer manuelt eller planlegg måltider."
              />
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
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <button
                      onClick={() => toggleItem(item.id, !item.checked, item.source)}
                      className={`w-8 h-8 shrink-0 rounded-xl border-2 flex items-center justify-center transition-all ${item.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-200 bg-gray-50/50 hover:border-indigo-500'}`}
                    >
                      {item.checked && <Check className="w-5 h-5 stroke-[3px]" />}
                    </button>
                    <div className="flex items-center gap-3 flex-wrap min-w-0">
                      <span className={`text-lg font-black tracking-tight transition-all duration-300 ${item.checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {item.name}
                      </span>
                      {item.source === 'planned' && (
                        <div className="flex items-center gap-2 opacity-80">
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">
                            {formatUnit(item.amount, item.unit as Unit)}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Planlagt</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {item.source === 'manual' && (
                    <Button variant="ghost" size="icon" onClick={() => deleteManualItem(item.id)} className="h-10 w-10 shrink-0 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl">
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
    </PageContainer>
  )
}
