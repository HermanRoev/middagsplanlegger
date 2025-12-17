import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth';
import { getPlannedMeals } from '../../lib/api';
import { PlannedMeal } from '../../../src/types';
import { startOfWeek, addDays, format, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Utensils, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function Planner() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = [...Array(7)].map((_, i) => addDays(weekStart, i));

  useEffect(() => {
    fetchPlanner();
  }, [user, currentDate]);

  async function fetchPlanner() {
      if (!user) return;
      setLoading(true);
      try {
        const meals = await getPlannedMeals(user.uid, currentDate);
        setPlannedMeals(meals);
      } catch (error) {
        console.error("Error fetching planner:", error);
      } finally {
        setLoading(false);
      }
    }

  const changeWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(date => addDays(date, direction === 'prev' ? -7 : 7));
  };

  const handleAddMeal = (dateStr: string) => {
    // Navigate to recipes list with a selection mode or param
    // Since we don't have a sophisticated "Select Mode", we can push to recipes
    // and pass the date as a param. The Recipes page needs to handle this "selection" mode.
    // Alternatively, simpler for MVP: Go to recipes, user clicks a recipe, and if we are in "planning mode" it adds it.
    // Or, we show a modal here.

    // For now, let's navigate to recipes with a query param `planningDate`.
    router.push({ pathname: '/(tabs)/recipes', params: { planningDate: dateStr } });
  };

  const handleEditMeal = (meal: PlannedMeal) => {
      // Navigate to meal details.
      // If we want to edit the *planned* instance (e.g. servings), we need a specific route.
      // But typically we just view the recipe.
      router.push(`/(tabs)/recipes/${meal.mealId}`);
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Date Header */}
      <View className="flex-row justify-between items-center px-4 py-4 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => changeWeek('prev')} className="p-2 bg-gray-50 rounded-full">
          <ChevronLeft size={20} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">
          Week of {format(weekStart, 'MMM d')}
        </Text>
        <TouchableOpacity onPress={() => changeWeek('next')} className="p-2 bg-gray-50 rounded-full">
          <ChevronRight size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {loading ? (
          <View className="py-20">
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : (
          <View className="gap-4 pb-8">
            {weekDays.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const mealsForDay = plannedMeals.filter(m => m.date === dayStr);
              const isToday = isSameDay(day, new Date());

              return (
                <View key={dayStr} className={`bg-white rounded-2xl p-4 border ${isToday ? 'border-indigo-500 shadow-sm' : 'border-gray-100 shadow-sm'}`}>
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center gap-2">
                      <Text className={`font-bold ${isToday ? 'text-indigo-600' : 'text-gray-900'}`}>
                        {format(day, 'EEEE')}
                      </Text>
                      <Text className="text-gray-400 font-medium">
                        {format(day, 'MMM d')}
                      </Text>
                    </View>
                    {isToday && (
                      <View className="bg-indigo-100 px-2 py-0.5 rounded text-xs">
                         <Text className="text-indigo-700 text-xs font-bold">Today</Text>
                      </View>
                    )}
                  </View>

                  {mealsForDay.length > 0 ? (
                    mealsForDay.map(meal => (
                      <TouchableOpacity
                        key={meal.id}
                        onPress={() => handleEditMeal(meal)}
                        className="flex-row items-center bg-gray-50 p-3 rounded-xl border border-gray-100"
                      >
                        <View className="bg-white p-2 rounded-lg mr-3 shadow-sm">
                          <Utensils size={16} color="#4F46E5" />
                        </View>
                        <View className="flex-1">
                          <Text className="font-semibold text-gray-900">{meal.mealName}</Text>
                          <Text className="text-xs text-gray-500">{meal.plannedServings} servings</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <TouchableOpacity
                        onPress={() => handleAddMeal(dayStr)}
                        className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200 items-center flex-row justify-center"
                    >
                      <Plus size={16} color="#9CA3AF" />
                      <Text className="text-gray-500 text-sm ml-2 font-medium">Add Meal</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
