"use client"

import { useState, useEffect, useCallback } from 'react'
import { collection, getDocs, deleteDoc, doc, query, where, writeBatch, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/lib/constants'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Trash2, Edit, Check, X, Tag, Carrot, Loader2, Search, Sparkles } from "lucide-react"
import { PageContainer } from "@/components/layout/PageLayout"
import { PageHeader } from "@/components/ui/action-blocks"
import toast from 'react-hot-toast'
import { Meal } from '@/types'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface MasterItem {
    id: string        // Firestore doc ID
    displayName: string // Proper-cased name for display  
    usageCount: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

async function fetchUsageCounts(
    items: { id: string; displayName: string }[],
    fieldName: 'tags' | 'ingredients',
    householdId: string
): Promise<Map<string, number>> {
    const counts = new Map<string, number>()
    items.forEach(i => counts.set(i.id, 0))

    const mealsSnap = await getDocs(
        query(collection(db, COLLECTIONS.MEALS), where('householdId', '==', householdId))
    )

    mealsSnap.docs.forEach(d => {
        const data = d.data() as Meal
        if (fieldName === 'tags') {
            (data.tags || []).forEach(t => {
                if (counts.has(t)) counts.set(t, (counts.get(t) || 0) + 1)
            })
        } else {
            (data.ingredients || []).forEach(ing => {
                // Case-insensitive match: find master item whose ID matches
                const lowerName = ing.name.toLowerCase()
                if (counts.has(lowerName)) {
                    counts.set(lowerName, (counts.get(lowerName) || 0) + 1)
                }
                // Also check non-lowered ID (legacy data)
                if (counts.has(ing.name) && ing.name !== lowerName) {
                    counts.set(ing.name, (counts.get(ing.name) || 0) + 1)
                }
            })
        }
    })

    return counts
}

async function deleteTagUpstream(tagName: string, householdId: string) {
    await deleteDoc(doc(db, COLLECTIONS.TAGS, tagName))

    const mealsSnap = await getDocs(
        query(collection(db, COLLECTIONS.MEALS), where('householdId', '==', householdId))
    )

    const batch = writeBatch(db)
    mealsSnap.docs.forEach(d => {
        const data = d.data() as Meal
        if (data.tags?.includes(tagName)) {
            batch.update(d.ref, {
                tags: data.tags.filter(t => t !== tagName)
            })
        }
    })
    await batch.commit()
}

async function renameTagUpstream(oldName: string, newName: string, householdId: string) {
    const batch = writeBatch(db)
    batch.delete(doc(db, COLLECTIONS.TAGS, oldName))
    batch.set(doc(db, COLLECTIONS.TAGS, newName), {})

    const mealsSnap = await getDocs(
        query(collection(db, COLLECTIONS.MEALS), where('householdId', '==', householdId))
    )

    mealsSnap.docs.forEach(d => {
        const data = d.data() as Meal
        if (data.tags?.includes(oldName)) {
            batch.update(d.ref, {
                tags: data.tags.map(t => t === oldName ? newName : t)
            })
        }
    })
    await batch.commit()
}

async function deleteIngredientUpstream(docId: string, householdId: string) {
    await deleteDoc(doc(db, COLLECTIONS.INGREDIENTS, docId))

    const mealsSnap = await getDocs(
        query(collection(db, COLLECTIONS.MEALS), where('householdId', '==', householdId))
    )

    const batch = writeBatch(db)
    mealsSnap.docs.forEach(d => {
        const data = d.data() as Meal
        if (data.ingredients?.some(i => i.name.toLowerCase() === docId.toLowerCase())) {
            batch.update(d.ref, {
                ingredients: data.ingredients.filter(i => i.name.toLowerCase() !== docId.toLowerCase())
            })
        }
    })
    await batch.commit()
}

async function renameIngredientUpstream(oldDocId: string, newName: string, householdId: string) {
    const newDocId = newName.toLowerCase()
    const batch = writeBatch(db)
    batch.delete(doc(db, COLLECTIONS.INGREDIENTS, oldDocId))
    batch.set(doc(db, COLLECTIONS.INGREDIENTS, newDocId), { displayName: newName })

    const mealsSnap = await getDocs(
        query(collection(db, COLLECTIONS.MEALS), where('householdId', '==', householdId))
    )

    mealsSnap.docs.forEach(d => {
        const data = d.data() as Meal
        if (data.ingredients?.some(i => i.name.toLowerCase() === oldDocId.toLowerCase())) {
            batch.update(d.ref, {
                ingredients: data.ingredients.map(i =>
                    i.name.toLowerCase() === oldDocId.toLowerCase() ? { ...i, name: newName } : i
                )
            })
        }
    })
    await batch.commit()
}

async function cleanupUnused(
    items: MasterItem[],
    collectionName: string,
) {
    const unused = items.filter(i => i.usageCount === 0)
    if (unused.length === 0) return 0

    const batch = writeBatch(db)
    unused.forEach(item => {
        batch.delete(doc(db, collectionName, item.id))
    })
    await batch.commit()
    return unused.length
}

// ─── Item Row Component ─────────────────────────────────────────────────────────

function ItemRow({
    item,
    onDelete,
    onRename,
    type,
}: {
    item: MasterItem
    onDelete: (id: string) => void
    onRename: (oldId: string, newName: string) => void
    type: 'tag' | 'ingredient'
}) {
    const [editing, setEditing] = useState(false)
    const [newName, setNewName] = useState(item.displayName)
    const [loading, setLoading] = useState(false)

    const handleRename = async () => {
        if (!newName.trim() || newName.trim() === item.displayName) {
            setEditing(false)
            setNewName(item.displayName)
            return
        }
        setLoading(true)
        try {
            await onRename(item.id, newName.trim())
            setEditing(false)
        } catch {
            toast.error("Kunne ikke endre navn")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        setLoading(true)
        try {
            await onDelete(item.id)
        } catch {
            toast.error("Kunne ikke slette")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100/80 last:border-0 group hover:bg-gray-50/30 transition-colors">
            {editing ? (
                <>
                    <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1 h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename()
                            if (e.key === 'Escape') { setEditing(false); setNewName(item.displayName) }
                        }}
                    />
                    <Button size="icon" variant="ghost" onClick={handleRename} disabled={loading} className="h-7 w-7">
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-green-600" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setNewName(item.displayName) }} className="h-7 w-7">
                        <X className="w-3.5 h-3.5" />
                    </Button>
                </>
            ) : (
                <>
                    <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm text-gray-900">{item.displayName}</span>
                        <span className="ml-2 text-xs text-gray-400">
                            {item.usageCount} oppskrifter
                        </span>
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(true)}
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Edit className="w-3.5 h-3.5 text-gray-400" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleDelete}
                        disabled={loading}
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
                    </Button>
                </>
            )}
        </div>
    )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function ManagePage() {
    const { householdId } = useAuth()
    const [tags, setTags] = useState<MasterItem[]>([])
    const [ingredients, setIngredients] = useState<MasterItem[]>([])
    const [loading, setLoading] = useState(true)
    const [cleaningTags, setCleaningTags] = useState(false)
    const [cleaningIngs, setCleaningIngs] = useState(false)
    const [tagSearch, setTagSearch] = useState('')
    const [ingSearch, setIngSearch] = useState('')

    const loadData = useCallback(async () => {
        if (!householdId) return
        setLoading(true)
        try {
            const [tagsSnap, ingredientsSnap] = await Promise.all([
                getDocs(collection(db, COLLECTIONS.TAGS)),
                getDocs(collection(db, COLLECTIONS.INGREDIENTS)),
            ])

            const tagItems = tagsSnap.docs.map(d => ({ id: d.id, displayName: d.id }))
            const ingItems = ingredientsSnap.docs.map(d => ({
                id: d.id,
                displayName: d.data().displayName || d.id,
            }))

            const [tagCounts, ingCounts] = await Promise.all([
                fetchUsageCounts(tagItems, 'tags', householdId),
                fetchUsageCounts(ingItems, 'ingredients', householdId),
            ])

            setTags(
                tagItems
                    .map(t => ({ ...t, usageCount: tagCounts.get(t.id) || 0 }))
                    .sort((a, b) => a.displayName.localeCompare(b.displayName))
            )
            setIngredients(
                ingItems
                    .map(i => ({ ...i, usageCount: ingCounts.get(i.id) || 0 }))
                    .sort((a, b) => a.displayName.localeCompare(b.displayName))
            )
        } catch (err) {
            console.error(err)
            toast.error("Kunne ikke laste data")
        } finally {
            setLoading(false)
        }
    }, [householdId])

    useEffect(() => { loadData() }, [loadData])

    const handleDeleteTag = async (name: string) => {
        if (!householdId) return
        await deleteTagUpstream(name, householdId)
        toast.success(`Tag "${name}" slettet fra alle oppskrifter`)
        loadData()
    }

    const handleRenameTag = async (oldName: string, newName: string) => {
        if (!householdId) return
        await renameTagUpstream(oldName, newName, householdId)
        toast.success(`Tag endret: "${oldName}" → "${newName}"`)
        loadData()
    }

    const handleDeleteIngredient = async (docId: string) => {
        if (!householdId) return
        const item = ingredients.find(i => i.id === docId)
        await deleteIngredientUpstream(docId, householdId)
        toast.success(`Ingrediens "${item?.displayName || docId}" slettet fra alle oppskrifter`)
        loadData()
    }

    const handleRenameIngredient = async (oldDocId: string, newName: string) => {
        if (!householdId) return
        await renameIngredientUpstream(oldDocId, newName, householdId)
        toast.success(`Ingrediens endret: → "${newName}"`)
        loadData()
    }

    const handleCleanupTags = async () => {
        setCleaningTags(true)
        try {
            const count = await cleanupUnused(tags, COLLECTIONS.TAGS)
            toast.success(count > 0 ? `Ryddet opp ${count} ubrukte tags` : 'Ingen ubrukte tags å fjerne')
            loadData()
        } catch {
            toast.error("Kunne ikke rydde opp")
        } finally {
            setCleaningTags(false)
        }
    }

    const handleCleanupIngs = async () => {
        setCleaningIngs(true)
        try {
            const count = await cleanupUnused(ingredients, COLLECTIONS.INGREDIENTS)
            toast.success(count > 0 ? `Ryddet opp ${count} ubrukte ingredienser` : 'Ingen ubrukte ingredienser å fjerne')
            loadData()
        } catch {
            toast.error("Kunne ikke rydde opp")
        } finally {
            setCleaningIngs(false)
        }
    }

    const unusedTagCount = tags.filter(t => t.usageCount === 0).length
    const unusedIngCount = ingredients.filter(i => i.usageCount === 0).length
    const filteredTags = tags.filter(t => t.displayName.toLowerCase().includes(tagSearch.toLowerCase()))
    const filteredIngs = ingredients.filter(i => i.displayName.toLowerCase().includes(ingSearch.toLowerCase()))

    if (loading) {
        return (
            <PageContainer className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </PageContainer>
        )
    }

    return (
        <PageContainer className="space-y-8 pb-24">
            <PageHeader
                title="Administrer bibliotek"
                description="Rediger eller slett tags og ingredienser. Endringer oppdateres i alle oppskrifter."
            />

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Tags Section */}
                <Card className="shadow-lg border-white/50">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                                    <Tag className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Tags</CardTitle>
                                    <CardDescription>{tags.length} totalt</CardDescription>
                                </div>
                            </div>
                            {unusedTagCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCleanupTags}
                                    disabled={cleaningTags}
                                    className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50/50"
                                >
                                    {cleaningTags ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                                    ) : (
                                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                                    )}
                                    Rydd opp ({unusedTagCount})
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Søk i tags..."
                                value={tagSearch}
                                onChange={(e) => setTagSearch(e.target.value)}
                                className="pl-9 h-9 text-sm"
                            />
                        </div>
                        <div className="border border-gray-100/80 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                            {filteredTags.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm">
                                    {tagSearch ? 'Ingen treff' : 'Ingen tags ennå'}
                                </div>
                            ) : (
                                filteredTags.map(tag => (
                                    <ItemRow
                                        key={tag.id}
                                        item={tag}
                                        type="tag"
                                        onDelete={handleDeleteTag}
                                        onRename={handleRenameTag}
                                    />
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Ingredients Section */}
                <Card className="shadow-lg border-white/50">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                                    <Carrot className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Ingredienser</CardTitle>
                                    <CardDescription>{ingredients.length} totalt</CardDescription>
                                </div>
                            </div>
                            {unusedIngCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCleanupIngs}
                                    disabled={cleaningIngs}
                                    className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50/50"
                                >
                                    {cleaningIngs ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                                    ) : (
                                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                                    )}
                                    Rydd opp ({unusedIngCount})
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Søk i ingredienser..."
                                value={ingSearch}
                                onChange={(e) => setIngSearch(e.target.value)}
                                className="pl-9 h-9 text-sm"
                            />
                        </div>
                        <div className="border border-gray-100/80 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                            {filteredIngs.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm">
                                    {ingSearch ? 'Ingen treff' : 'Ingen ingredienser ennå'}
                                </div>
                            ) : (
                                filteredIngs.map(ing => (
                                    <ItemRow
                                        key={ing.id}
                                        item={ing}
                                        type="ingredient"
                                        onDelete={handleDeleteIngredient}
                                        onRename={handleRenameIngredient}
                                    />
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    )
}
