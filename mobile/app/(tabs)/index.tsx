import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth';
import { getPlannedMeals, getShoppingList, getUserRecipes, getCupboardItems } from '../../lib/api';
import { scoreMeals, RecipeScoreResult } from '../../lib/recommendations';
import { Calendar, ChefHat, ShoppingCart, Plus, Clock, Users, ArrowRight, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { PlannedMeal, Meal } from '../../../src/types';
import { GlassHeader } from '../../components/ui/GlassHeader';
import { GlassCard } from '../../components/ui/GlassCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Home() {
  const insets = useSafeAreaInsets();
  const { user, householdId } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plannedCount, setPlannedCount] = useState(0);
  const [recipesCount, setRecipesCount] = useState(0);
  const [shopCount, setShopCount] = useState(0);
  const [todayMeals, setTodayMeals] = useState<PlannedMeal[]>([]);
  const [recommendation, setRecommendation] = useState<RecipeScoreResult | null>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      try {
        const todayDate = new Date();
        if (!householdId) return;
        const [planned, recipes, shopping, cupboard] = await Promise.all([
          getPlannedMeals(user!.uid, todayDate, householdId),
          getUserRecipes(user!.uid, householdId),
          getShoppingList(user!.uid, householdId),
          getCupboardItems(user!.uid, householdId)
        ]);

        setPlannedCount(planned.length);
        setRecipesCount(recipes.length);
        const unchecked = [...shopping.manual, ...shopping.planned].filter((i: { checked?: boolean }) => !i.checked);
        setShopCount(unchecked.length);

        const todayStr = todayDate.toISOString().split('T')[0];
        const today = planned.filter(p => p.date === todayStr);
        setTodayMeals(today);

        if (recipes.length > 0) {
          const scored = scoreMeals(recipes, cupboard);
          // Filter out anything already planned for the week (similar to web)
          const plannedIdsForWeek = new Set(planned.map((p: PlannedMeal) => p.mealId));
          const availableRecommendations = scored.filter(s => !plannedIdsForWeek.has(s.meal.id));

          if (availableRecommendations.length > 0) {
            setRecommendation(availableRecommendations[0]);
          }
        }
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
    <View className="flex-1">
      {/* Absolute Frosted Glass Header */}
      <GlassHeader
        title={todayText}
        subtitle={`Hei, ${user?.displayName?.split(' ')[0] || 'Kokk'}!`}
        transparent
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: insets.top + 100, padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >

        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : (
          <View className="gap-y-6">
            {/* Featured Today Card */}
            <TouchableOpacity onPress={() => todayMeals[0] ? router.push(`/(tabs)/recipes/${todayMeals[0].mealId}?plannedId=${todayMeals[0].id}`) : router.push('/(tabs)/planner')} activeOpacity={0.8}>
              <GlassCard className="p-0 overflow-hidden min-h-[220px]">
                {todayMeals[0]?.imageUrl ? (
                  <Image source={{ uri: todayMeals[0].imageUrl }} className="absolute inset-0 w-full h-full opacity-60" style={{ resizeMode: 'cover' }} />
                ) : (
                  <View className="absolute inset-0 bg-indigo-900/10" />
                )}
                <View className="flex-1 p-6 justify-between bg-black/20">
                  <View className="bg-indigo-600/90 self-start px-3 py-1.5 rounded-full border border-indigo-400/50">
                    <Text className="text-[10px] font-black text-white uppercase tracking-widest">I dag</Text>
                  </View>
                  <View>
                    <Text className="text-3xl font-black text-white tracking-tight leading-tight mb-2 drop-shadow-lg">
                      {todayMeals[0] ? todayMeals[0].mealName : 'Ingen planlagt middag'}
                    </Text>
                    {todayMeals[0] && (
                      <View className="flex-row gap-x-4">
                        <View className="flex-row items-center">
                          <Clock size={14} color="rgba(255,255,255,0.8)" />
                          <Text className="text-white ml-2 text-xs font-bold">{todayMeals[0].prepTime || 30} min</Text>
                        </View>
                        <View className="flex-row items-center">
                          <Users size={14} color="rgba(255,255,255,0.8)" />
                          <Text className="text-white ml-2 text-xs font-bold">{todayMeals[0].plannedServings || 4} porsj.</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>

            {recommendation && todayMeals.length === 0 && (
              <TouchableOpacity onPress={() => router.push(`/(tabs)/recipes/${recommendation.meal.id}`)} activeOpacity={0.8}>
                <GlassCard className="p-0 overflow-hidden flex-row">
                  <View className="w-1/3 min-h-[120px] bg-indigo-900/10">
                    {recommendation.meal.imageUrl && (
                      <Image source={{ uri: recommendation.meal.imageUrl }} className="w-full h-full" style={{ resizeMode: 'cover' }} />
                    )}
                  </View>
                  <View className="flex-1 p-4 justify-center">
                    <Text className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Dagens anbefaling</Text>
                    <Text className="text-lg font-black text-gray-900 leading-tight mb-1" numberOfLines={2}>
                      {recommendation.meal.name}
                    </Text>
                    <Text className="text-xs font-bold text-gray-500">
                      Du har {recommendation.matchPercentage}% av ingrediensene
                    </Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            )}

            {/* Stats Row */}
            <View className="flex-row gap-x-4">
              <TouchableOpacity className="flex-1" onPress={() => router.push('/(tabs)/planner')} activeOpacity={0.7}>
                <GlassCard className="items-center py-5 px-2">
                  <View className="w-12 h-12 rounded-2xl bg-blue-100 items-center justify-center mb-3">
                    <Calendar size={24} color="#3B82F6" />
                  </View>
                  <Text className="text-2xl font-black text-gray-900 mb-1">{plannedCount}</Text>
                  <Text className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Planlagt</Text>
                </GlassCard>
              </TouchableOpacity>

              <TouchableOpacity className="flex-1" onPress={() => router.push('/(tabs)/shop')} activeOpacity={0.7}>
                <GlassCard className="items-center py-5 px-2">
                  <View className="w-12 h-12 rounded-2xl bg-emerald-100 items-center justify-center mb-3">
                    <ShoppingCart size={24} color="#10B981" />
                  </View>
                  <Text className="text-2xl font-black text-gray-900 mb-1">{shopCount}</Text>
                  <Text className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Handle</Text>
                </GlassCard>
              </TouchableOpacity>

              <TouchableOpacity className="flex-1" onPress={() => router.push('/(tabs)/recipes')} activeOpacity={0.7}>
                <GlassCard className="items-center py-5 px-2">
                  <View className="w-12 h-12 rounded-2xl bg-purple-100 items-center justify-center mb-3">
                    <ChefHat size={24} color="#8B5CF6" />
                  </View>
                  <Text className="text-2xl font-black text-gray-900 mb-1">{recipesCount}</Text>
                  <Text className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Matretter</Text>
                </GlassCard>
              </TouchableOpacity>
            </View>

            {/* Quick Actions List */}
            <View className="mt-4 gap-y-4">
              <Text className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Hurtigvalg</Text>

              <TouchableOpacity onPress={() => router.push('/(tabs)/recipes/create')} activeOpacity={0.8}>
                <GlassCard className="flex-row items-center p-4 bg-indigo-600/90 border-indigo-500 shadow-indigo-300">
                  <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center mr-4">
                    <Plus size={20} color="white" />
                  </View>
                  <Text className="flex-1 text-white font-black text-sm uppercase tracking-widest">Legg til ny oppskrift</Text>
                  <ArrowRight size={20} color="white" />
                </GlassCard>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/(tabs)/cupboard')} activeOpacity={0.8}>
                <GlassCard className="flex-row items-center p-4">
                  <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center mr-4 border border-amber-100/50">
                    <Plus size={20} color="#D97706" />
                  </View>
                  <Text className="flex-1 text-gray-700 font-bold text-sm">Sjekk matboden</Text>
                  <ArrowRight size={20} color="#9CA3AF" />
                </GlassCard>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
