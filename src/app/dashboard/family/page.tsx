"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { PageContainer } from "@/components/layout/PageLayout"
import { PageHeader } from "@/components/ui/action-blocks"
import { Card, CardContent } from "@/components/ui/card"
import { collection, getDocs, doc, getDoc, updateDoc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { CalendarDays, ShoppingCart, Utensils, ChefHat, ShieldCheck } from "lucide-react"


interface UserProfile {
    id: string
    email: string
    role?: string
    createdAt: string
    displayName?: string
    googlePhotoUrl?: string  // Google/Firebase Auth photo stored at registration
    photoUrl?: string        // App-uploaded photo (takes priority)
}

interface UserStats {
    mealsPlanned?: number
    mealsCooked?: number
    itemsShopped?: number
    recipesCreated?: number
}

interface FamilyMember extends UserProfile {
    stats: UserStats
}

export default function FamilyPage() {
    const { user } = useAuth()
    const [members, setMembers] = useState<FamilyMember[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return

        const fetchFamilyMembers = async () => {
            try {
                setLoading(true)

                // Only fetch users that belong to this household
                const userDocRef = doc(db, "users", user.uid)
                const userDocSnap = await getDoc(userDocRef)

                if (!userDocSnap.exists()) {
                    console.error("User document not found")
                    setLoading(false)
                    return
                }

                const householdId = userDocSnap.data().householdId
                if (!householdId) {
                    console.error("User does not have a householdId")
                    setLoading(false)
                    return
                }

                const usersQuery = query(
                    collection(db, "users"),
                    where("householdId", "==", householdId)
                )

                // 1. Fetch all users
                const usersSnapshot = await getDocs(usersQuery)
                const usersData: UserProfile[] = usersSnapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data()
                } as UserProfile))

                // Backfill googlePhotoUrl for the current user if missing (handles existing accounts)
                const currentUserData = usersData.find(u => u.id === user.uid)
                if (currentUserData && !currentUserData.googlePhotoUrl && user.photoURL) {
                    currentUserData.googlePhotoUrl = user.photoURL
                    // Persist it so we don't need to backfill again
                    updateDoc(doc(db, "users", user.uid), { googlePhotoUrl: user.photoURL }).catch(() => {})
                }

                // 2. Fetch stats for each user
                const membersWithStats: FamilyMember[] = await Promise.all(
                    usersData.map(async (u) => {
                        const statsDoc = await getDoc(doc(db, "userStats", u.id))
                        const stats = statsDoc.exists() ? (statsDoc.data() as UserStats) : {}
                        return { ...u, stats }
                    })
                )

                // Sort so current user is first, then admins, then others
                membersWithStats.sort((a, b) => {
                    if (a.id === user.uid) return -1
                    if (b.id === user.uid) return 1
                    if (a.role === "admin" && b.role !== "admin") return -1
                    if (b.role === "admin" && a.role !== "admin") return 1
                    return 0
                })

                setMembers(membersWithStats)
            } catch (error) {
                console.error("Failed to fetch family members:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchFamilyMembers()
    }, [user])

    if (loading) {
        return (
            <PageContainer className="space-y-10 pb-12">
                <PageHeader title="Familie" description="Laster inn husholdningen..." />
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </PageContainer>
        )
    }

    // Per-member colour palette — cycles through hues
    const MEMBER_COLORS = [
        { bg: "bg-indigo-100/60", avatarBg: "bg-indigo-100", icon: "text-indigo-500", statBg: "bg-indigo-50/60 border-indigo-100/60", statIcon: "text-indigo-400", ring: "ring-indigo-300/60", header: "from-indigo-100/60 to-indigo-50/20" },
        { bg: "bg-violet-100/60", avatarBg: "bg-violet-100", icon: "text-violet-500", statBg: "bg-violet-50/60 border-violet-100/60", statIcon: "text-violet-400", ring: "ring-violet-300/60", header: "from-violet-100/60 to-violet-50/20" },
        { bg: "bg-emerald-100/60", avatarBg: "bg-emerald-100", icon: "text-emerald-500", statBg: "bg-emerald-50/60 border-emerald-100/60", statIcon: "text-emerald-400", ring: "ring-emerald-300/60", header: "from-emerald-100/60 to-emerald-50/20" },
        { bg: "bg-amber-100/60", avatarBg: "bg-amber-100", icon: "text-amber-500", statBg: "bg-amber-50/60 border-amber-100/60", statIcon: "text-amber-400", ring: "ring-amber-300/60", header: "from-amber-100/60 to-amber-50/20" },
        { bg: "bg-rose-100/60", avatarBg: "bg-rose-100", icon: "text-rose-500", statBg: "bg-rose-50/60 border-rose-100/60", statIcon: "text-rose-400", ring: "ring-rose-300/60", header: "from-rose-100/60 to-rose-50/20" },
        { bg: "bg-sky-100/60", avatarBg: "bg-sky-100", icon: "text-sky-500", statBg: "bg-sky-50/60 border-sky-100/60", statIcon: "text-sky-400", ring: "ring-sky-300/60", header: "from-sky-100/60 to-sky-50/20" },
    ]

    return (
        <PageContainer className="space-y-10 pb-12">
            <PageHeader
                title="Familie"
                description="Oversikt over alle medlemmer i husholdningen og deres innsats."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {members.map((member, index) => {
                    const isCurrentUser = member.id === user?.uid
                    const memberName = member.displayName || member.email?.split('@')[0] || 'Bruker'
                    // Priority: app-uploaded > Google OAuth > UI Avatars
                    const displayImage = member.photoUrl
                        || member.googlePhotoUrl
                        || `https://ui-avatars.com/api/?name=${encodeURIComponent(memberName)}&background=6366f1&color=fff&size=256`
                    const displayName = memberName
                    const colors = MEMBER_COLORS[index % MEMBER_COLORS.length]

                    return (
                        <Card key={member.id} className={`overflow-hidden shadow-lg border-white/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${isCurrentUser ? `ring-2 ${colors.ring}` : ''}`}>
                            {/* Coloured header band */}
                            <div className={`bg-gradient-to-r ${colors.header} px-6 pt-6 pb-4 flex items-center gap-5`}>
                                <div className={`w-20 h-20 rounded-2xl border-2 border-white/80 shadow-lg overflow-hidden ${colors.avatarBg} flex-shrink-0`}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={displayImage}
                                        alt={displayName}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-black text-gray-900 truncate leading-tight">{displayName}</h3>
                                    <p className="text-sm text-gray-500 font-medium truncate mt-0.5">{member.email}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        {isCurrentUser && (
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/70 ${colors.icon} border border-white/80 backdrop-blur-sm`}>Deg</span>
                                        )}
                                        {member.role === 'admin' && (
                                            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/70 text-gray-600 border border-white/80 backdrop-blur-sm flex items-center gap-1">
                                                <ShieldCheck className="w-2.5 h-2.5" /> Admin
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Stats grid */}
                            <CardContent className="p-5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className={`flex items-center gap-3 p-3.5 rounded-2xl border ${colors.statBg}`}>
                                        <CalendarDays className={`w-5 h-5 ${colors.statIcon} flex-shrink-0`} />
                                        <div>
                                            <div className="text-xl font-black text-gray-900 leading-none">{member.stats.mealsPlanned || 0}</div>
                                            <div className="text-[9px] uppercase tracking-widest font-bold text-gray-500 mt-0.5">Planlagt</div>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-3 p-3.5 rounded-2xl border ${colors.statBg}`}>
                                        <ShoppingCart className={`w-5 h-5 ${colors.statIcon} flex-shrink-0`} />
                                        <div>
                                            <div className="text-xl font-black text-gray-900 leading-none">{member.stats.itemsShopped || 0}</div>
                                            <div className="text-[9px] uppercase tracking-widest font-bold text-gray-500 mt-0.5">Handlet</div>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-3 p-3.5 rounded-2xl border ${colors.statBg}`}>
                                        <Utensils className={`w-5 h-5 ${colors.statIcon} flex-shrink-0`} />
                                        <div>
                                            <div className="text-xl font-black text-gray-900 leading-none">{member.stats.mealsCooked || 0}</div>
                                            <div className="text-[9px] uppercase tracking-widest font-bold text-gray-500 mt-0.5">Laget</div>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-3 p-3.5 rounded-2xl border ${colors.statBg}`}>
                                        <ChefHat className={`w-5 h-5 ${colors.statIcon} flex-shrink-0`} />
                                        <div>
                                            <div className="text-xl font-black text-gray-900 leading-none">{member.stats.recipesCreated || 0}</div>
                                            <div className="text-[9px] uppercase tracking-widest font-bold text-gray-500 mt-0.5">Oppskrifter</div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </PageContainer >
    )
}
