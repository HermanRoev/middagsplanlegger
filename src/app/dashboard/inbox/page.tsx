"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, orderBy, arrayUnion, arrayRemove, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Suggestion } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ThumbsUp, Check, X, MessageSquarePlus, Plus, Trash, Calendar, Utensils } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import toast from "react-hot-toast"
import { motion, AnimatePresence } from "framer-motion"
import { format, parseISO, isSameDay, addDays } from "date-fns"
import { nb } from "date-fns/locale"
import { PageContainer } from "@/components/layout/PageLayout"
import { PageHeader, EmptyStateBlock } from "@/components/ui/action-blocks"

export default function InboxPage() {
    const { user, householdId } = useAuth()
    const [suggestions, setSuggestions] = useState<Suggestion[]>([])
    const [newSuggestion, setNewSuggestion] = useState("")
    const [selectedDate, setSelectedDate] = useState<string>("") // Empty string = General
    const [approveTarget, setApproveTarget] = useState<Suggestion | null>(null)
    const [approveDate, setApproveDate] = useState<string>("")
    const [rejectTarget, setRejectTarget] = useState<string | null>(null)

    useEffect(() => {
        const q = query(
            collection(db, "suggestions"),
            where("householdId", "==", householdId),
            orderBy("createdAt", "desc")
        )
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Suggestion))
            setSuggestions(items)
        })
        return () => unsubscribe()
    }, [])

    const handleAddSuggestion = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newSuggestion.trim() || !user) return

        try {
            const data: Omit<Suggestion, "id"> = {
                text: newSuggestion,
                votes: 1,
                votedBy: [user.uid],
                status: 'pending',
                suggestedBy: {
                    id: user.uid,
                    name: user.displayName || user.email || "Unknown"
                },
                createdAt: new Date().toISOString(),
                householdId: householdId as string,
                ...(selectedDate ? { forDate: selectedDate } : {})
            }

            await addDoc(collection(db, "suggestions"), data)
            setNewSuggestion("")
            toast.success("Forslag sendt!")
        } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
            toast.error("Kunne ikke sende forslag")
        }
    }

    const handleVote = async (suggestion: Suggestion) => {
        if (!user) return

        const currentVoters = suggestion.votedBy || []
        const hasVoted = currentVoters.includes(user.uid)

        try {
            if (hasVoted) {
                await updateDoc(doc(db, "suggestions", suggestion.id), {
                    votes: (suggestion.votes || 1) - 1,
                    votedBy: arrayRemove(user.uid)
                })
            } else {
                await updateDoc(doc(db, "suggestions", suggestion.id), {
                    votes: (suggestion.votes || 0) + 1,
                    votedBy: arrayUnion(user.uid)
                })
            }
        } catch (e) { // eslint-disable-line @typescript-eslint/no-unused-vars
            toast.error("Kunne ikke stemme")
        }
    }

    const planSuggestion = async (suggestion: Suggestion, date: string) => {
        await addDoc(collection(db, "plannedMeals"), {
            date,
            mealId: "suggestion-placeholder",
            mealName: suggestion.text,
            imageUrl: null,
            plannedServings: 4,
            isShopped: false,
            isCooked: false,
            ingredients: [],
            notes: "Planlagt fra forslag",
            plannedBy: user ? { id: user.uid, name: user.displayName || user.email || 'Ukjent' } : undefined,
            createdAt: new Date().toISOString(),
            userId: user?.uid,
            householdId: householdId
        })
    }

    const handleApprove = async (suggestion: Suggestion) => {
        try {
            if (!suggestion.forDate) {
                setApproveTarget(suggestion)
                setApproveDate(new Date().toISOString().split('T')[0])
                return
            }

            await planSuggestion(suggestion, suggestion.forDate)
            await updateDoc(doc(db, "suggestions", suggestion.id), {
                status: 'approved'
            })
            toast.success("Godkjent og planlagt!")
        } catch (e) { // eslint-disable-line @typescript-eslint/no-unused-vars
            toast.error("Kunne ikke godkjenne")
        }
    }

    const handleConfirmApprove = async () => {
        if (!approveTarget || !approveDate) return
        try {
            await planSuggestion(approveTarget, approveDate)
            await updateDoc(doc(db, "suggestions", approveTarget.id), {
                status: 'approved'
            })
            toast.success("Godkjent og planlagt!")
            setApproveTarget(null)
        } catch (e) { // eslint-disable-line @typescript-eslint/no-unused-vars
            toast.error("Kunne ikke godkjenne")
        }
    }

    const handleReject = async () => {
        if (!rejectTarget) return
        try {
            await deleteDoc(doc(db, "suggestions", rejectTarget))
            toast.success("Forslag fjernet")
        } catch (e) {
            toast.error("Kunne ikke fjerne")
        } finally {
            setRejectTarget(null)
        }
    }

    // Sort: General first, then by Date
    const generalSuggestions = suggestions.filter(s => !s.forDate)
    const datedSuggestions = suggestions.filter(s => s.forDate).sort((a, b) => (a.forDate! > b.forDate! ? 1 : -1))
    const sortedSuggestions = [...generalSuggestions, ...datedSuggestions]

    return (
        <PageContainer className="space-y-10 pb-12">
            <PageHeader
                title="Forslag"
                description="Del dine matønsker med familien."
            />

            <div className="max-w-3xl mx-auto w-full space-y-10">
            <Card className="shadow-lg border-white/50">
                <CardContent className="p-6">
                    <form onSubmit={handleAddSuggestion} className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 w-full space-y-3">
                                <div className="relative group">
                                    <Utensils className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-indigo-500 transition-colors z-10 pointer-events-none" />
                                    <Input
                                        placeholder="Hva har du lyst på? (f.eks. Taco)"
                                        value={newSuggestion}
                                        onChange={(e) => setNewSuggestion(e.target.value)}
                                        className="pl-12 text-base"
                                    />
                                </div>

                                <div className="flex items-center gap-3 bg-gray-50/30 p-2 rounded-xl border border-gray-100 w-fit">
                                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-2">Dag?</span>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="w-auto h-8 px-3 font-semibold text-gray-700 text-xs"
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                        {selectedDate && (
                                            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedDate("")} className="h-8 w-8 p-0 text-red-400 hover:bg-red-50 rounded-lg">
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Button type="submit" variant="premium" size="xl" className="px-8 font-bold shadow-sm w-full sm:w-auto sm:self-start">
                                <Plus className="w-4 h-4 mr-2" /> Foreslå
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                    {sortedSuggestions.map((item, index) => {
                        const prevItem = index > 0 ? sortedSuggestions[index - 1] : null
                        const showGeneralHeader = index === 0 && !item.forDate
                        const showDateHeader = item.forDate && (!prevItem || prevItem.forDate !== item.forDate)

                        let headerText = ''
                        if (showGeneralHeader) headerText = 'Generelle ønsker'
                        if (showDateHeader) {
                            const d = parseISO(item.forDate!)
                            if (isSameDay(d, new Date())) headerText = 'I dag'
                            else if (isSameDay(d, addDays(new Date(), 1))) headerText = 'I morgen'
                            else headerText = format(d, 'EEEE d. MMM', { locale: nb })
                        }

                        return (
                            <div key={item.id} className="space-y-3">
                                {(showGeneralHeader || showDateHeader) && (
                                    <div className="flex items-center gap-4 mt-8 mb-4">
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                                            {headerText}
                                        </h3>
                                        <div className="h-px flex-1 bg-gray-100" />
                                    </div>
                                )}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                >
                                    <Card className={`shadow-lg border-white/50 overflow-hidden transition-all hover:shadow-xl ${item.status === 'approved' ? 'bg-emerald-50/20' : ''}`}>
                                        <CardContent className="p-5 flex items-center justify-between">
                                            <div className="flex items-center gap-5">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.status === 'approved' ? 'bg-emerald-100' : 'bg-indigo-50'}`}>
                                                    <Utensils className={`w-6 h-6 ${item.status === 'approved' ? 'text-emerald-600' : 'text-indigo-600'}`} />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-xl text-gray-900 leading-tight">{item.text}</h3>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-xs font-bold text-gray-400">Foreslått av {item.suggestedBy?.name}</span>
                                                        {item.forDate && (
                                                            <span className="bg-white/80 px-2 py-0.5 rounded-lg border border-gray-100 text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" />
                                                                {format(parseISO(item.forDate), 'd. MMM')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {item.status === 'pending' && (
                                                    <div className="flex items-center bg-gray-50 rounded-2xl p-1 gap-1 border border-gray-100">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={`rounded-xl px-4 font-black ${item.votedBy?.includes(user?.uid || '') ? 'text-indigo-600 bg-white shadow-sm' : 'text-gray-400 hover:text-indigo-600'}`}
                                                            onClick={() => handleVote(item)}
                                                        >
                                                            <ThumbsUp className="w-4 h-4 mr-2" /> {item.votes || 0}
                                                        </Button>
                                                        <div className="w-px h-6 bg-gray-200 mx-1" />
                                                        <Button size="icon" variant="ghost" className="text-emerald-600 hover:bg-emerald-100 rounded-xl" onClick={() => handleApprove(item)} title="Godkjenn & Planlegg">
                                                            <Check className="w-5 h-5" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="text-red-400 hover:bg-red-50 rounded-xl" onClick={() => setRejectTarget(item.id)} title="Avvis">
                                                            <X className="w-5 h-5" />
                                                        </Button>
                                                    </div>
                                                )}
                                                {item.status === 'approved' && (
                                                    <div className="flex items-center gap-3">
                                                        <div className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-100">
                                                            <Check className="w-4 h-4" /> Godkjent
                                                        </div>
                                                        <Button size="icon" variant="ghost" className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl" onClick={() => setRejectTarget(item.id)} title="Fjern">
                                                            <Trash className="w-5 h-5" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </div>
                        )
                    })}
                    {suggestions.length === 0 && (
                        <div className="col-span-full">
                            <EmptyStateBlock
                                icon={MessageSquarePlus}
                                title="Ingen forslag ennå"
                                description="Vær den første til å foreslå noe godt!"
                                className="rounded-[40px]"
                            />
                        </div>
                    )}
                </AnimatePresence>
            </div>
            </div>

            <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
                <DialogContent className="rounded-[32px] p-8 border-0 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">Planlegg forslag</DialogTitle>
                        <DialogDescription className="text-base pt-2">
                            Velg en dato for å legge til <strong>{approveTarget?.text}</strong> i ukeplanen.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6">
                        <Input
                            type="date"
                            value={approveDate}
                            onChange={(e) => setApproveDate(e.target.value)}
                            className="h-14 text-lg font-medium"
                        />
                    </div>
                    <DialogFooter className="gap-3">
                        <Button variant="ghost" className="rounded-xl h-12 px-6" onClick={() => setApproveTarget(null)}>Avbryt</Button>
                        <Button onClick={handleConfirmApprove} variant="premium" className="rounded-xl h-12 px-8 font-black shadow-lg shadow-indigo-100">Godkjenn & Planlegg</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!rejectTarget}
                onOpenChange={(open) => !open && setRejectTarget(null)}
                title="Fjerne forslag?"
                description="Er du sikker på at du vil slette dette forslaget? Dette kan ikke angres."
                confirmText="Slett"
                cancelText="Avbryt"
                variant="destructive"
                onConfirm={handleReject}
            />
        </PageContainer>
    )
}
