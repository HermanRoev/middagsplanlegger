"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { CupboardItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2, Search, Package } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"

export default function CupboardPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<CupboardItem[]>([])
  const [newItem, setNewItem] = useState("")
  const [newAmount, setNewAmount] = useState<number | ''>('')
  const [newUnit, setNewUnit] = useState("stk")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!user) return
    // Assuming 'cupboard' collection or similar. The types file had CupboardItem.
    const q = query(collection(db, "cupboard"), orderBy("ingredientName"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CupboardItem))
      setItems(data)
    })
    return () => unsubscribe()
  }, [user])

  const handleAdd = async () => {
    if (!newItem.trim() || !user) return
    await addDoc(collection(db, "cupboard"), {
      userId: user.uid,
      ingredientName: newItem,
      amount: Number(newAmount) || 0,
      unit: newUnit,
      wantedAmount: 0,
      threshold: 0
    })
    setNewItem("")
    setNewAmount("")
  }

  const handleDelete = async (id: string) => {
    if (confirm("Remove item?")) {
      await deleteDoc(doc(db, "cupboard", id))
    }
  }

  const filteredItems = items.filter(item => 
    item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Cupboard</h1>
        <div className="p-2 bg-amber-100 text-amber-700 rounded-full">
          <Package className="w-6 h-6" />
        </div>
      </div>

      <Card className="glass">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
               <Input 
                placeholder="Add new item..." 
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
              />
            </div>
            <div className="w-24">
              <Input 
                type="number" 
                placeholder="Qty"
                value={newAmount}
                onChange={(e) => setNewAmount(Number(e.target.value))}
              />
            </div>
            <div className="w-24">
              <select 
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
              >
                {['stk', 'g', 'kg', 'l', 'dl', 'ss', 'ts'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <Button onClick={handleAdd} variant="premium">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search cupboard..."
              className="pl-9 bg-white/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {filteredItems.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm"
                >
                  <div>
                    <div className="font-medium">{item.ingredientName}</div>
                    <div className="text-xs text-gray-500">{item.amount} {item.unit}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
