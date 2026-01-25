"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, orderBy, arrayUnion, arrayRemove } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Suggestion } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ThumbsUp, Check, X, MessageSquarePlus, Plus, Trash, Calendar } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import toast from "react-hot-toast"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { format, parseISO, isSameDay, addDays } from "date-fns"

export default function InboxPage() {
  const { user } = useAuth()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [newSuggestion, setNewSuggestion] = useState("")
  const [selectedDate, setSelectedDate] = useState<string>("") // Empty string = General

  useEffect(() => {
    const q = query(collection(db, "suggestions"), orderBy("createdAt", "desc"))
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
        const data: any = {
            text: newSuggestion,
            votes: 1,
            votedBy: [user.uid],
            status: 'pending',
            suggestedBy: {
                id: user.uid,
                name: user.displayName || user.email
            },
            createdAt: new Date().toISOString()
        }

        if (selectedDate) {
            data.forDate = selectedDate
        }

        await addDoc(collection(db, "suggestions"), data)
        setNewSuggestion("")
        // setSelectedDate("") // Optional: Reset date
        toast.success("Suggestion added!")
    } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
        toast.error("Failed to add suggestion")
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
          toast.error("Failed to vote")
      }
  }

  const handleApprove = async (suggestion: Suggestion) => {
      try {
          await updateDoc(doc(db, "suggestions", suggestion.id), {
              status: 'approved'
          })
          toast.success("Marked as approved!")
      } catch (e) { // eslint-disable-line @typescript-eslint/no-unused-vars
          toast.error("Failed to approve")
      }
  }

  const handleReject = async (id: string) => {
      if(!confirm("Reject this suggestion?")) return
      try {
          await deleteDoc(doc(db, "suggestions", id))
          toast.success("Suggestion removed")
      } catch (e) { // eslint-disable-line @typescript-eslint/no-unused-vars
          toast.error("Failed to remove")
      }
  }

  // Sort: General first, then by Date
  const generalSuggestions = suggestions.filter(s => !s.forDate)
  const datedSuggestions = suggestions.filter(s => s.forDate).sort((a, b) => (a.forDate! > b.forDate! ? 1 : -1))
  const sortedSuggestions = [...generalSuggestions, ...datedSuggestions]

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Family Inbox</h1>
            <p className="text-gray-500">Suggest meals for the upcoming week.</p>
        </div>
        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-full">
            <MessageSquarePlus className="w-6 h-6" />
        </div>
      </div>

      <Card className="border-0 shadow-lg bg-white">
          <CardContent className="p-6">
              <form onSubmit={handleAddSuggestion} className="flex gap-2 items-center">
                  <div className="flex-1 space-y-2">
                     <Input
                        placeholder="I want to eat..."
                        value={newSuggestion}
                        onChange={(e) => setNewSuggestion(e.target.value)}
                        className="bg-gray-50"
                      />
                      <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-medium">For specific day (optional):</span>
                          <Input
                             type="date"
                             value={selectedDate}
                             onChange={(e) => setSelectedDate(e.target.value)}
                             className="w-auto h-8 text-xs bg-white border-gray-200"
                             min={new Date().toISOString().split('T')[0]}
                          />
                          {selectedDate && (
                              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedDate("")} className="h-8 w-8 p-0 text-red-400">
                                  <X className="w-3 h-3" />
                              </Button>
                          )}
                      </div>
                  </div>
                  <Button type="submit" variant="premium" className="h-auto self-start py-3">
                      <Plus className="w-4 h-4 mr-2" /> Suggest
                  </Button>
              </form>
          </CardContent>
      </Card>

      <div className="space-y-4">
          <AnimatePresence>
              {sortedSuggestions.map((item, index) => {
                  const prevItem = index > 0 ? sortedSuggestions[index - 1] : null
                  const showGeneralHeader = index === 0 && !item.forDate
                  const showDateHeader = item.forDate && (!prevItem || prevItem.forDate !== item.forDate)

                  let headerText = ''
                  if (showGeneralHeader) headerText = 'General Ideas'
                  if (showDateHeader) {
                      const d = parseISO(item.forDate!)
                      if (isSameDay(d, new Date())) headerText = 'Today'
                      else if (isSameDay(d, addDays(new Date(), 1))) headerText = 'Tomorrow'
                      else headerText = format(d, 'EEEE d. MMM')
                  }

                  return (
                  <div key={item.id}>
                      {(showGeneralHeader || showDateHeader) && (
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-6 ml-1">
                              {headerText}
                          </h3>
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                          <Card className={`border-0 shadow-sm ${item.status === 'approved' ? 'bg-green-50' : 'bg-white'}`}>
                              <CardContent className="p-4 flex items-center justify-between">
                                  <div>
                                      <h3 className="font-semibold text-lg">{item.text}</h3>
                                      <div className="flex items-center gap-2 text-xs text-gray-500">
                                          <span>Suggested by {item.suggestedBy?.name}</span>
                                          {item.forDate && (
                                              <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">
                                                  <Calendar className="w-3 h-3" />
                                                  {format(parseISO(item.forDate), 'd. MMM')}
                                              </span>
                                          )}
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                      {item.status === 'pending' && (
                                          <>
                                            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-indigo-600" onClick={() => handleVote(item)}>
                                                <ThumbsUp className="w-4 h-4 mr-1" /> {item.votes || 0}
                                            </Button>
                                            <div className="h-4 w-px bg-gray-200" />
                                            <Button size="icon" variant="ghost" className="text-green-600 hover:bg-green-100" onClick={() => handleApprove(item)} title="Approve & Plan">
                                                <Check className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="text-red-400 hover:bg-red-100" onClick={() => handleReject(item.id)} title="Reject">
                                                <X className="w-4 h-4" />
                                            </Button>
                                          </>
                                      )}
                                      {item.status === 'approved' && (
                                          <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-xs font-bold flex items-center gap-1">
                                                <Check className="w-3 h-3" /> Approved
                                            </span>
                                            <Button size="icon" variant="ghost" className="text-red-400 hover:bg-red-100" onClick={() => handleReject(item.id)} title="Remove">
                                                <Trash className="w-4 h-4" />
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
                  <div className="text-center py-12 text-gray-400">
                      No suggestions yet. Be the first!
                  </div>
              )}
          </AnimatePresence>
      </div>
    </div>
  )
}
