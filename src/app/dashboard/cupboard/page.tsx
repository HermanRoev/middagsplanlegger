"use client"

import { useState, useEffect, useRef } from "react"
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, writeBatch, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { CupboardItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AutocompleteInput } from "@/components/ui/autocomplete-input"
import { getAllIngredients } from "@/lib/ingredients"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, Search, Package, Camera, Video } from "lucide-react"
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
import { parseReceiptImage, parseCupboardVideo } from "@/lib/gemini"
import { PageContainer } from "@/components/layout/PageLayout"
import { PageHeader, EmptyStateBlock } from "@/components/ui/action-blocks"
import { UnitSelect } from "@/components/ui/unit-select"

export default function CupboardPage() {
    const { user, householdId } = useAuth()
    const [items, setItems] = useState<CupboardItem[]>([])
    const [newItem, setNewItem] = useState("")
    const [newAmount, setNewAmount] = useState<number | ''>('')
    const [newUnit, setNewUnit] = useState("stk")
    const [searchTerm, setSearchTerm] = useState("")
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [ingredientSuggestions, setIngredientSuggestions] = useState<string[]>([])

    // Scanning State
    const [isScanning, setIsScanning] = useState(false)
    const [scanType, setScanType] = useState<'receipt' | 'video'>('receipt')
    const [scannedItems, setScannedItems] = useState<{ name: string, amount: number, unit: string }[]>([])
    const [scanLoading, setScanLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const videoInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!user || !householdId) return
        const q = query(collection(db, "cupboard"), where("householdId", "==", householdId), orderBy("ingredientName"))
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CupboardItem))
            setItems(data)
        })
        return () => unsubscribe()
    }, [user])

    // Fetch master ingredients for autocomplete
    useEffect(() => {
        getAllIngredients().then(list => setIngredientSuggestions(list.map(i => i.displayName)))
    }, [])

    const handleAdd = async () => {
        if (!newItem.trim() || !user || !householdId) return
        await addDoc(collection(db, "cupboard"), {
            userId: user.uid,
            householdId: householdId,
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

        setScanType('receipt')
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

    const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setScanType('video')
        setScanLoading(true)
        setIsScanning(true)

        try {
            const items = await parseCupboardVideo(file)
            setScannedItems(items)
            toast.success(`Found ${items.length} items!`)
        } catch (error) {
            toast.error("Failed to analyze video")
            console.error(error)
            setIsScanning(false)
        } finally {
            setScanLoading(false)
            if (videoInputRef.current) videoInputRef.current.value = ''
        }
    }

    const handleSaveScanned = async () => {
        if (!user || !householdId || scannedItems.length === 0) return
        setScanLoading(true)
        try {
            const batch = writeBatch(db)
            scannedItems.forEach(item => {
                const ref = doc(collection(db, "cupboard"))
                batch.set(ref, {
                    userId: user.uid,
                    householdId: householdId,
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
        <PageContainer className="space-y-10 pb-12">
            <PageHeader
                title="Matbod"
                description={
                    <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5 bg-amber-50/50 backdrop-blur-md px-3 py-1 rounded-full border border-amber-100/50">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-[10px] font-black text-amber-700 uppercase tracking-[0.2em]">{items.length} varer</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-blue-50/50 backdrop-blur-md px-3 py-1 rounded-full border border-blue-100/50">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-[10px] font-black text-blue-700 uppercase tracking-[0.2em]">Oppdatert nå</span>
                        </div>
                    </div>
                }
            >
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button
                        variant="glass"
                        className="h-12 rounded-2xl px-6 flex-1 sm:flex-none"
                        onClick={() => fileInputRef.current?.click()}
                        iconLeft={<Camera className="w-4 h-4 text-indigo-500" />}
                    >
                        Kvittering
                    </Button>
                    <Button
                        variant="glass"
                        className="h-12 rounded-2xl px-6 flex-1 sm:flex-none"
                        onClick={() => videoInputRef.current?.click()}
                        iconLeft={<Video className="w-4 h-4 text-indigo-500" />}
                    >
                        Video-skann
                    </Button>
                </div>
            </PageHeader>

            <Dialog open={isScanning} onOpenChange={setIsScanning}>
                <DialogContent className="rounded-[32px] p-8 border-0 shadow-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">{scanType === 'receipt' ? 'Skann kvittering' : 'Video-skann'}</DialogTitle>
                        <DialogDescription className="text-base pt-2">
                            {scanType === 'receipt'
                                ? 'Analyser kvitteringen din for å legge til varer automatisk.'
                                : 'Video-skann av matboden din.'}
                        </DialogDescription>
                    </DialogHeader>

                    {scanLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-4">
                            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                                {scanType === 'receipt' ? 'Analyserer kvittering...' : 'Analyserer video...'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 my-4">
                            {scannedItems.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3">Fant {scannedItems.length} varer:</p>
                                    {scannedItems.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <span className="font-bold text-gray-700">{item.name}</span>
                                            <span className="text-xs font-black text-indigo-500 uppercase">{item.amount} {item.unit}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                    <p className="font-medium">Ingen varer funnet ennå</p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="gap-3">
                        <Button variant="ghost" className="rounded-xl h-12 px-6" onClick={() => setIsScanning(false)}>Avbryt</Button>
                        <Button
                            onClick={handleSaveScanned}
                            disabled={scannedItems.length === 0 || scanLoading}
                            className="rounded-xl h-12 px-8 font-black shadow-lg shadow-indigo-100"
                            variant="premium"
                        >
                            Legg til alle
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Left Column: Add & Search */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="shadow-lg border-white/50">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-bold">Legg til vare</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <AutocompleteInput
                                    placeholder="Varenavn (f.eks. Melk)"
                                    value={newItem}
                                    onChange={setNewItem}
                                    suggestions={ingredientSuggestions}
                                />
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        placeholder="Antall"
                                        className="flex-1"
                                        value={newAmount}
                                        onChange={(e) => setNewAmount(Number(e.target.value))}
                                    />
                                    <UnitSelect
                                        value={newUnit}
                                        onChange={setNewUnit}
                                        className="w-24"
                                    />
                                </div>
                                <Button onClick={handleAdd} variant="premium" className="w-full h-11 rounded-lg font-bold shadow-sm">
                                    <Plus className="w-4 h-4 mr-2" /> Legg til
                                </Button>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <div className="relative group">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-indigo-500 transition-colors z-10 pointer-events-none" />
                                    <Input
                                        placeholder="Søk i matboden..."
                                        className="pl-12 text-sm"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Grid of items */}
                <div className="lg:col-span-2">
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                        <AnimatePresence mode="popLayout">
                            {filteredItems.map(item => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                >
                                    <Card className="shadow-lg border-white/50 p-4 group hover:shadow-xl transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-amber-50/50 rounded-xl flex items-center justify-center">
                                                    <Package className="w-6 h-6 text-amber-600" />
                                                </div>
                                                <div>
                                                    <div className="font-black text-gray-900 leading-tight">{item.ingredientName}</div>
                                                    {item.amount && item.amount > 0 && (
                                                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5 bg-indigo-50/50 px-2 py-0.5 rounded-full w-fit">{item.amount} {item.unit}</div>
                                                    )}
                                                </div>
                                            </div>

                                            <Dialog open={deleteId === item.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeleteId(item.id)}
                                                        className="h-10 w-10 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="rounded-[32px] p-8 border-0 shadow-2xl">
                                                    <DialogHeader>
                                                        <DialogTitle className="text-2xl font-black">Slette vare?</DialogTitle>
                                                        <DialogDescription className="text-base pt-2">
                                                            Er du sikker på at du vil fjerne <strong>{item.ingredientName}</strong> fra matboden?
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <DialogFooter className="pt-6 gap-3">
                                                        <Button variant="ghost" className="rounded-xl h-12 px-6" onClick={() => setDeleteId(null)}>Avbryt</Button>
                                                        <Button variant="destructive" className="rounded-xl h-12 px-6 font-bold shadow-lg shadow-red-100" onClick={confirmDelete}>Slett vare</Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {filteredItems.length === 0 && (
                            <div className="col-span-full">
                                <EmptyStateBlock icon={Package} title="Ingen varer funnet i boden" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Hidden Inputs for File Upload */}
            <input
                type="file"
                hidden
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
            />
            <input
                type="file"
                hidden
                ref={videoInputRef}
                accept="video/*"
                capture="environment"
                onChange={handleVideoSelect}
            />
        </PageContainer>
    )
}
