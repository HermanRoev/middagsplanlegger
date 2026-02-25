"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { PageContainer } from "@/components/layout/PageLayout"
import { PageHeader, EmptyStateBlock } from "@/components/ui/action-blocks"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { collection, query, where, addDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Copy, Link, Plus, Ticket, Trash2 } from "lucide-react"
import toast from "react-hot-toast"

interface Invite {
    id: string
    code: string
    createdAt: string
    used: boolean
    householdId: string
}

export default function AdminPage() {
    const { userRole, loading } = useAuth()
    const router = useRouter()
    const [invites, setInvites] = useState<Invite[]>([])
    const [generating, setGenerating] = useState(false)

    useEffect(() => {
        if (!loading && userRole !== "admin") {
            router.push("/dashboard")
            toast.error("You do not have permission to view this page.")
        }
    }, [loading, userRole, router])

    useEffect(() => {
        if (userRole !== "admin") return

        const q = query(
            collection(db, "invites"),
            where("householdId", "==", "family-middagsplanlegger"),
            where("used", "==", false)
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const activeInvites: Invite[] = []
            snapshot.forEach((doc) => {
                activeInvites.push({ id: doc.id, ...doc.data() } as Invite)
            })
            // Sort by createdAt descending
            activeInvites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            setInvites(activeInvites)
        })

        return () => unsubscribe()
    }, [userRole])

    const generateInviteCode = async () => {
        setGenerating(true)
        try {
            const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase()

            await addDoc(collection(db, "invites"), {
                code: randomCode,
                createdAt: new Date().toISOString(),
                used: false,
                householdId: "family-middagsplanlegger"
            })

            toast.success("Invite code generated!")
        } catch (error) {
            console.error("Failed to generate invite:", error)
            toast.error("Failed to generate invite code.")
        } finally {
            setGenerating(false)
        }
    }

    const deleteInviteCode = async (id: string) => {
        try {
            await deleteDoc(doc(db, "invites", id))
            toast.success("Invite code deleted")
        } catch (error) {
            console.error("Failed to delete invite:", error)
            toast.error("Failed to delete invite code.")
        }
    }

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code)
        toast.success("Kode kopiert!")
    }

    const copyInviteLink = (code: string) => {
        const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
        navigator.clipboard.writeText(`${baseUrl}/register?code=${code}`)
        toast.success("Invitasjonslenke kopiert!")
    }

    if (loading || userRole !== "admin") {
        return (
            <PageContainer className="space-y-10 pb-12">
                <PageHeader title="Admin" description="Loading..." />
            </PageContainer>
        )
    }

    return (
        <PageContainer className="space-y-10 pb-12">
            <PageHeader
                title="Admin"
                description="Administrer engangskoder for nye familiemedlemmer."
            />
            <div className="space-y-6">
                <Card className="shadow-lg border-white/50">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Ticket className="w-5 h-5 text-indigo-600" />
                                Aktive invitasjonskoder
                            </CardTitle>
                            <CardDescription>
                                Kodene kan brukes én gang under registrering.
                            </CardDescription>
                        </div>
                        <Button
                            onClick={generateInviteCode}
                            disabled={generating}
                            variant="premium"
                            className="gap-2 w-full sm:w-auto"
                        >
                            <Plus className="w-4 h-4" />
                            Generer kode
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {invites.length === 0 ? (
                            <EmptyStateBlock
                                icon={Ticket}
                                title="Ingen aktive invitasjonskoder"
                                description="Generer en kode for å invitere et nytt familiemedlem."
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {invites.map(invite => (
                                    <Card key={invite.id} className="group hover:shadow-md transition-shadow border-white/50">
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                    {new Date(invite.createdAt).toLocaleDateString('nb-NO')}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => deleteInviteCode(invite.id)}
                                                    className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 h-8 w-8"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <div className="bg-indigo-50 px-4 py-3 rounded-xl border border-indigo-100 text-center">
                                                <span className="font-mono text-xl font-black text-indigo-700 tracking-[0.2em]">
                                                    {invite.code}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyCode(invite.code)}
                                                    className="flex-1 text-xs font-bold text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 gap-1.5"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                    Kopier kode
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyInviteLink(invite.code)}
                                                    className="flex-1 text-xs font-bold text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 gap-1.5"
                                                >
                                                    <Link className="w-3.5 h-3.5" />
                                                    Kopier lenke
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    )
}
