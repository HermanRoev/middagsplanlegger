import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth';
import { getPlannedMeals, getShoppingList, getUserRecipes } from '../../lib/api';
import { Calendar, ChefHat, ShoppingCart, Plus, Clock, Users, ArrowRight, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { PlannedMeal } from '../../src/types';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plannedCount, setPlannedCount] = useState(0);
  const [recipesCount, setRecipesCount] = useState(0);
  const [shopCount, setShopCount] = useState(0);
  const [todayMeals, setTodayMeals] = useState<PlannedMeal[]>([]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      try {
        const todayDate = new Date();
        const [planned, recipes, shopping] = await Promise.all([
          getPlannedMeals(user.uid, todayDate),
          getUserRecipes(user.uid),
          getShoppingList(user.uid)
        ]);
        
        setPlannedCount(planned.length);
        setRecipesCount(recipes.length);
        const unchecked = [...shopping.manual, ...shopping.planned].filter((i: { checked: boolean }) => !i.checked);
        setShopCount(unchecked.length);
        
        const todayStr = todayDate.toISOString().split('T')[0];
        const today = planned.filter(p => p.date === todayStr);
        setTodayMeals(today);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const todayText = format(new Date(), "EEEE d. MMMM", { locale: nb });

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-white px-6 pb-4 pt-16 border-b border-gray-200 flex-row justify-between items-end">
        <View>
          <Text className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{todayText}</Text>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">
            Hei, <Text className="text-indigo-600">{user?.displayName?.split(' ')[0] || 'Kokk'}!</Text>
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/profile')}
          className="p-3 bg-gray-50 rounded-2xl border border-gray-100"
          activeOpacity={0.7}
        >
          <User size={22} color="#4B5563" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >

        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : (
          <View className="gap-y-6">
            {/* Featured Today Card */}
            <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => todayMeals[0] ? router.push(`/(tabs)/recipes/${todayMeals[0].mealId}?plannedId=${todayMeals[0].id}`) : router.push('/(tabs)/planner')}
                className="bg-white rounded-[40px] shadow-sm overflow-hidden border border-gray-200"
            >
                <View className="relative h-64 bg-gray-100">
                    {todayMeals[0]?.imageUrl ? (
                        <Image source={{ uri: todayMeals[0].imageUrl }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                        <View className="w-full h-full items-center justify-center bg-indigo-50/50">
                            <ChefHat size={60} color="#C7D2FE" />
                        </View>
                    )}
                    <View className="absolute top-5 left-5 bg-indigo-600 px-4 py-2 rounded-2xl shadow-lg">
                        <Text className="text-white font-black text-xs uppercase tracking-wider">Dagens middag</Text>
                    </View>
                </View>
                
                <View className="p-8 bg-white flex-row justify-between items-center">
                    <View className="flex-1 mr-4">
                        {todayMeals.length > 0 ? (
                            <>
                                <Text className="text-2xl font-black text-gray-900 leading-tight mb-2">{todayMeals[0].mealName}</Text>
                                <View className="flex-row items-center gap-x-4">
                                    <View className="flex-row items-center">
                                        <Clock size={14} color="#6366F1" />
                                        <Text className="ml-1.5 text-xs font-bold text-gray-400">{todayMeals[0].prepTime || 30} min</Text>
                                    </View>
                                    <View className="flex-row items-center">
                                        <Users size={14} color="#6366F1" />
                                        <Text className="ml-1.5 text-xs font-bold text-gray-400">{todayMeals[0].plannedServings} pers</Text>
                                    </View>
                                </View>
                            </>
                        ) : (
                            <>
                                <Text className="text-xl font-black text-gray-400 italic">Ingen plan for i dag</Text>
                                <Text className="text-xs font-bold text-gray-300 uppercase tracking-widest mt-1">Planlegg noe godt!</Text>
                            </>
                        )}
                    </View>
                    <View className="w-12 h-12 bg-indigo-50 rounded-2xl items-center justify-center">
                        <ArrowRight size={24} color="#4F46E5" />
                    </View>
                </View>
            </TouchableOpacity>

            {/* Stats Row */}
            <View className="flex-row gap-x-4">
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/planner')}
                className="flex-1 bg-white rounded-[32px] p-5 items-center border border-gray-200 shadow-sm"
              >
                <View className="w-10 h-10 rounded-2xl bg-blue-100 items-center justify-center mb-2">
                  <Calendar size={20} color="#3B82F6" />
                </View>
                <Text className="text-2xl font-black text-gray-900">{plannedCount}</Text>
                <Text className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Planlagt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/(tabs)/shop')}
                className="flex-1 bg-white rounded-[32px] p-5 items-center border border-gray-200 shadow-sm"
              >
                <View className="w-10 h-10 rounded-2xl bg-emerald-100 items-center justify-center mb-2">
                  <ShoppingCart size={20} color="#10B981" />
                </View>
                <Text className="text-2xl font-black text-gray-900">{shopCount}</Text>
                <Text className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Handle</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/(tabs)/recipes')}
                className="flex-1 bg-white rounded-[32px] p-5 items-center border border-gray-200 shadow-sm"
              >
                <View className="w-10 h-10 rounded-2xl bg-purple-100 items-center justify-center mb-2">
                  <ChefHat size={20} color="#8B5CF6" />
                </View>
                <Text className="text-2xl font-black text-gray-900">{recipesCount}</Text>
                <Text className="text-[10px] font-black text-purple-600 uppercase tracking-widest mt-1">Matretter</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Actions List */}
            <View className="mt-4 gap-y-4">
                <Text className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Hurtigvalg</Text>
                
                <TouchableOpacity
                    onPress={() => router.push('/(tabs)/recipes/create')}
                    activeOpacity={0.7}
                    className="bg-indigo-600 p-6 rounded-[28px] flex-row items-center justify-between shadow-xl shadow-indigo-200"
                >
                    <View className="flex-row items-center">
                        <View className="bg-white/20 p-3 rounded-2xl mr-4">
                            <Plus size={24} color="white" />
                        </View>
                        <Text className="text-white font-black text-lg">Legg til ny oppskrift</Text>
                    </View>
                    <ArrowRight size={20} color="white" opacity={0.5} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push('/(tabs)/cupboard')}
                    activeOpacity={0.7}
                    className="bg-white p-6 rounded-[28px] flex-row items-center justify-between border border-gray-200 shadow-sm"
                >
                    <View className="flex-row items-center">
                        <View className="bg-amber-50 p-3 rounded-2xl mr-4">
                            <Plus size={24} color="#D97706" />
                        </View>
                        <Text className="text-gray-900 font-black text-lg">Sjekk matboden</Text>
                    </View>
                    <ArrowRight size={20} color="#D1D5DB" />
                </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
