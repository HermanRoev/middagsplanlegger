"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, orderBy, arrayUnion, arrayRemove } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Suggestion } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ThumbsUp, Check, X, MessageSquarePlus, Plus, Trash } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import toast from "react-hot-toast"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"

export default function InboxPage() {
  const { user } = useAuth()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [newSuggestion, setNewSuggestion] = useState("")
  const router = useRouter()

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
        await addDoc(collection(db, "suggestions"), {
            text: newSuggestion,
            votes: 1,
            votedBy: [user.uid],
            status: 'pending',
            suggestedBy: {
                id: user.uid,
                name: user.displayName || user.email
            },
            createdAt: new Date().toISOString()
        })
        setNewSuggestion("")
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
               // Remove vote
               await updateDoc(doc(db, "suggestions", suggestion.id), {
                   votes: (suggestion.votes || 1) - 1,
                   votedBy: arrayRemove(user.uid)
               })
          } else {
               // Add vote
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
              <form onSubmit={handleAddSuggestion} className="flex gap-2">
                  <Input
                    placeholder="I want to eat..."
                    value={newSuggestion}
                    onChange={(e) => setNewSuggestion(e.target.value)}
                    className="bg-gray-50"
                  />
                  <Button type="submit" variant="premium">
                      <Plus className="w-4 h-4 mr-2" /> Suggest
                  </Button>
              </form>
          </CardContent>
      </Card>

      <div className="space-y-4">
          <AnimatePresence>
              {suggestions.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                      <Card className={`border-0 shadow-sm ${item.status === 'approved' ? 'bg-green-50' : 'bg-white'}`}>
                          <CardContent className="p-4 flex items-center justify-between">
                              <div>
                                  <h3 className="font-semibold text-lg">{item.text}</h3>
                                  <p className="text-xs text-gray-500">Suggested by {item.suggestedBy?.name}</p>
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
              ))}
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
