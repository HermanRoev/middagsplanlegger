import { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { GlassScreen } from '../../components/ui/GlassScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { Users, ShieldCheck, Mail, CalendarDays, ShoppingCart, Utensils, ChefHat } from 'lucide-react-native';

interface UserProfile {
    id: string;
    email: string;
    role?: string;
    createdAt: string;
    displayName?: string;
}

interface UserStats {
    mealsPlanned?: number;
    mealsCooked?: number;
    itemsShopped?: number;
    recipesCreated?: number;
}

interface FamilyMember extends UserProfile {
    stats: UserStats;
}

export default function Family() {
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFamilyMembers = async () => {
        if (!auth.currentUser) return;

        try {
            setLoading(true);
            const usersSnapshot = await getDocs(collection(db, "users"));
            const usersData: UserProfile[] = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as UserProfile));

            const membersWithStats: FamilyMember[] = await Promise.all(
                usersData.map(async (u) => {
                    const statsDoc = await getDoc(doc(db, "userStats", u.id));
                    const stats = statsDoc.exists() ? (statsDoc.data() as UserStats) : {};
                    return { ...u, stats };
                })
            );

            membersWithStats.sort((a, b) => {
                if (a.id === auth.currentUser?.uid) return -1;
                if (b.id === auth.currentUser?.uid) return 1;
                if (a.role === "admin" && b.role !== "admin") return -1;
                if (b.role === "admin" && a.role !== "admin") return 1;
                return 0;
            });

            setMembers(membersWithStats);
        } catch (error) {
            console.error("Failed to fetch family members:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFamilyMembers();
    }, []);

    return (
        <GlassScreen bgVariant="glass" safeAreaEdges={['top']}>
            <ScrollView
                className="flex-1 px-5"
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchFamilyMembers} tintColor="#4F46E5" />
                }
            >
                <View className="py-6 flex-row items-center justify-between">
                    <View>
                        <View className="flex-row items-center gap-2 mb-1">
                            <Users size={24} color="#4F46E5" />
                            <Text className="text-3xl font-black text-gray-900 uppercase tracking-tight">Familie</Text>
                        </View>
                        <Text className="text-gray-500 text-xs font-bold uppercase tracking-widest pl-8">Oversikt over husholdningen</Text>
                    </View>
                </View>

                <View className="gap-y-6">
                    {members.map((member) => {
                        const isCurrentUser = member.id === auth.currentUser?.uid;
                        const displayName = member.displayName || member.email?.split('@')[0] || 'Bruker';

                        return (
                            <GlassCard
                                key={member.id}
                                className={`p-0 overflow-hidden ${isCurrentUser ? 'border-indigo-400' : ''}`}
                            >
                                <View className="h-20 bg-indigo-500/10 px-6 pt-4 flex-row justify-between items-start">
                                    <View className="flex-row items-center gap-2">
                                        {member.role === 'admin' && (
                                            <View className="bg-white/60 px-2 py-1 flex-row items-center gap-1 rounded-full border border-white">
                                                <ShieldCheck size={12} color="#4F46E5" />
                                                <Text className="text-[10px] font-black uppercase text-indigo-700">Admin</Text>
                                            </View>
                                        )}
                                        {isCurrentUser && (
                                            <View className="bg-white/60 px-2 py-1 flex-row items-center gap-1 rounded-full border border-white">
                                                <Text className="text-[10px] font-black uppercase text-gray-700">Deg</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                <View className="px-5 pb-5 -mt-10">
                                    <View className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-sm overflow-hidden mb-3">
                                        <View className="flex-1 bg-indigo-50 items-center justify-center">
                                            <Text className="text-2xl font-black text-indigo-300 uppercase">
                                                {displayName.substring(0, 1)}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text className="text-xl font-bold text-gray-900 mb-1">{displayName}</Text>

                                    <View className="flex-row items-center gap-1.5 mb-5 opacity-60">
                                        <Mail size={12} color="#4B5563" />
                                        <Text className="text-xs font-medium text-gray-600">{member.email}</Text>
                                    </View>

                                    <View className="bg-gray-50/50 rounded-2xl p-4 gap-y-3 border border-gray-100/50">
                                        <View className="flex-row justify-around">
                                            <View className="items-center">
                                                <CalendarDays size={18} color="#D97706" className="mb-1 opacity-80" />
                                                <Text className="text-lg font-black text-amber-600">{member.stats.mealsPlanned || 0}</Text>
                                                <Text className="text-[9px] uppercase tracking-widest font-bold text-amber-700/60 mt-0.5">Planlagt</Text>
                                            </View>
                                            <View className="w-px bg-gray-200" />
                                            <View className="items-center">
                                                <ShoppingCart size={18} color="#059669" className="mb-1 opacity-80" />
                                                <Text className="text-lg font-black text-emerald-600">{member.stats.itemsShopped || 0}</Text>
                                                <Text className="text-[9px] uppercase tracking-widest font-bold text-emerald-700/60 mt-0.5">Handlet</Text>
                                            </View>
                                        </View>
                                        <View className="h-px bg-gray-200" />
                                        <View className="flex-row justify-around">
                                            <View className="items-center">
                                                <Utensils size={18} color="#4F46E5" className="mb-1 opacity-80" />
                                                <Text className="text-lg font-black text-indigo-600">{member.stats.mealsCooked || 0}</Text>
                                                <Text className="text-[9px] uppercase tracking-widest font-bold text-indigo-700/60 mt-0.5">Laget</Text>
                                            </View>
                                            <View className="w-px bg-gray-200" />
                                            <View className="items-center">
                                                <ChefHat size={18} color="#7C3AED" className="mb-1 opacity-80" />
                                                <Text className="text-lg font-black text-purple-600">{member.stats.recipesCreated || 0}</Text>
                                                <Text className="text-[9px] uppercase tracking-widest font-bold text-purple-700/60 mt-0.5">Oppskrifter</Text>
                                            </View>
                                        </View>
                                    </View>

                                </View>
                            </GlassCard>
                        );
                    })}
                </View>
            </ScrollView>
        </GlassScreen >
    );
}
