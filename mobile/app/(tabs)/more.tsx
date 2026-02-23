import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { GlassScreen } from '../../components/ui/GlassScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, MessageSquare, Users, LogOut, ChevronRight, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

export default function More() {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.replace('/login');
        } catch (error) {
            console.error('Error signing out: ', error);
        }
    };

    const menuItems = [
        {
            title: 'Matbod',
            description: 'Se hva du har i skapene',
            icon: Package,
            color: '#059669', // Emerald 600
            bgColor: 'bg-emerald-50',
            route: '/(tabs)/cupboard'
        },
        {
            title: 'Forslag',
            description: 'AI-genererte middagsforslag',
            icon: MessageSquare,
            color: '#D97706', // Amber 600
            bgColor: 'bg-amber-50',
            route: '/(tabs)/inbox'
        },
        {
            title: 'Familie',
            description: 'Oversikt over husholdningen',
            icon: Users,
            color: '#4F46E5', // Indigo 600
            bgColor: 'bg-indigo-50',
            route: '/(tabs)/family'
        }
    ];

    return (
        <GlassScreen bgVariant="glass" safeAreaEdges={['top']}>
            <ScrollView
                className="flex-1 px-5"
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                <View className="py-6 flex-row items-center justify-between">
                    <View>
                        <Text className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-1">Mer</Text>
                        <Text className="text-gray-500 text-xs font-bold uppercase tracking-widest">Utforsk alt i appen</Text>
                    </View>
                </View>

                <View className="space-y-6">
                    {/* Main Menu Links */}
                    <GlassCard className="p-0 overflow-hidden">
                        {menuItems.map((item, index) => (
                            <View key={item.title}>
                                <TouchableOpacity
                                    onPress={() => router.push(item.route as any)}
                                    className="flex-row items-center justify-between p-5"
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-row items-center gap-4">
                                        <View className={`w-12 h-12 rounded-2xl items-center justify-center ${item.bgColor}`}>
                                            <item.icon size={24} color={item.color} />
                                        </View>
                                        <View>
                                            <Text className="text-lg font-bold text-gray-900 mb-0.5">{item.title}</Text>
                                            <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.description}</Text>
                                        </View>
                                    </View>
                                    <ChevronRight size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                                {index < menuItems.length - 1 && (
                                    <View className="h-px bg-gray-100 ml-20" />
                                )}
                            </View>
                        ))}
                    </GlassCard>

                    {/* Account */}
                    <GlassCard className="p-0 overflow-hidden">
                        <TouchableOpacity
                            onPress={() => router.push('/profile' as any)}
                            className="flex-row items-center justify-between p-5"
                            activeOpacity={0.7}
                        >
                            <View className="flex-row items-center gap-4">
                                <View className="w-12 h-12 rounded-2xl items-center justify-center bg-gray-50">
                                    <User size={24} color="#4B5563" />
                                </View>
                                <View>
                                    <Text className="text-lg font-bold text-gray-900 mb-0.5">Min profil</Text>
                                    <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{auth.currentUser?.email}</Text>
                                </View>
                            </View>
                            <ChevronRight size={20} color="#9CA3AF" />
                        </TouchableOpacity>

                        <View className="h-px bg-gray-100 ml-20" />

                        <TouchableOpacity
                            onPress={handleLogout}
                            className="flex-row items-center justify-between p-5"
                            activeOpacity={0.7}
                        >
                            <View className="flex-row items-center gap-4">
                                <View className="w-12 h-12 rounded-2xl items-center justify-center bg-red-50">
                                    <LogOut size={24} color="#DC2626" />
                                </View>
                                <View>
                                    <Text className="text-lg font-bold text-red-600 mb-0.5">Logg ut</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </GlassCard>
                </View>
            </ScrollView>
        </GlassScreen>
    );
}
