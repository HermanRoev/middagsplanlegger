"use client"

import { useState, useEffect, useRef } from "react"
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { CupboardItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2, Search, Package, Camera, Loader2, Receipt } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import toast from "react-hot-toast"
import { parseReceiptImage } from "@/lib/gemini"

export default function CupboardPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<CupboardItem[]>([])
  const [newItem, setNewItem] = useState("")
  const [newAmount, setNewAmount] = useState<number | ''>('')
  const [newUnit, setNewUnit] = useState("stk")
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Receipt Scanning State
  const [isScanning, setIsScanning] = useState(false)
  const [scannedItems, setScannedItems] = useState<{ name: string, amount: number, unit: string }[]>([])
  const [scanLoading, setScanLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
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

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteDoc(doc(db, "cupboard", deleteId))
      setDeleteId(null)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0]
     if (!file) return

     setScanLoading(true)
     setIsScanning(true)

     try {
         const items = await parseReceiptImage(file)
         setScannedItems(items)
         toast.success(`Found ${items.length} items!`)
     } catch (error) {
         toast.error("Failed to scan receipt")
         console.error(error)
         setIsScanning(false)
     } finally {
         setScanLoading(false)
         if (fileInputRef.current) fileInputRef.current.value = ''
     }
  }

  const handleSaveScanned = async () => {
      if (!user || scannedItems.length === 0) return
      setScanLoading(true)
      try {
          const batch = writeBatch(db)
          scannedItems.forEach(item => {
              const ref = doc(collection(db, "cupboard"))
              batch.set(ref, {
                  userId: user.uid,
                  ingredientName: item.name,
                  amount: item.amount,
                  unit: item.unit,
                  wantedAmount: 0,
                  threshold: 0
              })
          })
          await batch.commit()
          toast.success("Added scanned items to cupboard")
          setIsScanning(false)
          setScannedItems([])
      } catch (e) {
          toast.error("Failed to save items")
          console.error(e)
      } finally {
          setScanLoading(false)
      }
  }

  const filteredItems = items.filter(item => 
    item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
             <div className="p-2 bg-amber-100 text-amber-700 rounded-full">
                <Package className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Cupboard</h1>
        </div>

        <Dialog open={isScanning} onOpenChange={setIsScanning}>
            <DialogTrigger asChild>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Camera className="w-4 h-4 mr-2" /> Scan Receipt
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                 <DialogHeader>
                     <DialogTitle>Scan Receipt</DialogTitle>
                     <DialogDescription>Upload a photo of your grocery receipt to automatically add items.</DialogDescription>
                 </DialogHeader>

                 {scanLoading ? (
                     <div className="py-12 flex flex-col items-center justify-center space-y-4">
                         <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                         <p className="text-sm text-gray-500">Analyzing receipt with AI...</p>
                     </div>
                 ) : (
                     <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                         {scannedItems.length > 0 ? (
                             <div className="space-y-2">
                                 <p className="text-sm font-medium text-green-600">Found {scannedItems.length} items:</p>
                                 {scannedItems.map((item, i) => (
                                     <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                                         <span>{item.name}</span>
                                         <span className="text-gray-500">{item.amount} {item.unit}</span>
                                     </div>
                                 ))}
                             </div>
                         ) : (
                             <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-xl">
                                 <Receipt className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                 <p>Upload an image to start</p>
                             </div>
                         )}
                     </div>
                 )}

                 <DialogFooter>
                     <Button variant="ghost" onClick={() => setIsScanning(false)}>Cancel</Button>
                     <Button onClick={handleSaveScanned} disabled={scannedItems.length === 0 || scanLoading}>
                         Add All
                     </Button>
                 </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Hidden Input for File Upload */}
        <input
            type="file"
            hidden
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
        />
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

                  <Dialog open={deleteId === item.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(item.id)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Item</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete {item.ingredientName}? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
