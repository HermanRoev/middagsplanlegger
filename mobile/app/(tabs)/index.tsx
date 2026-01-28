import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth';
import { getPlannedMeals, addLeftoverMeal, updatePlannedMeal, deletePlannedMeal } from '../../lib/api';
import { PlannedMeal } from '../../../src/types';
import { startOfWeek, addDays, format, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Utensils, Plus, Copy, User, Trash2, Eye, X, Save } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Planner() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Edit Modal State
  const [selectedMeal, setSelectedMeal] = useState<PlannedMeal | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editServings, setEditServings] = useState('');
  const [editNotes, setEditNotes] = useState('');

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
    // Navigate with query param string to ensure it updates even if tab is already mounted
    router.push(`/(tabs)/recipes?planningDate=${dateStr}`);
  };

  const handleAddLeftovers = async (dateStr: string) => {
      if (!user) return;
      try {
          await addLeftoverMeal(user.uid, dateStr);
          fetchPlanner();
      } catch (e) {
          Alert.alert('Error', 'Failed to plan leftovers');
      }
  };

  const handleMealPress = (meal: PlannedMeal) => {
      setSelectedMeal(meal);
      setEditServings(meal.plannedServings?.toString() || '4');
      setEditNotes(meal.notes || '');
      setModalVisible(true);
  };

  const handleSaveEdit = async () => {
      if (!selectedMeal) return;
      try {
          await updatePlannedMeal(selectedMeal.id, {
              plannedServings: parseInt(editServings) || 1,
              notes: editNotes
          });
          setModalVisible(false);
          fetchPlanner();
      } catch (e) {
          Alert.alert('Error', 'Failed to update meal');
      }
  };

  const handleDeleteMeal = async () => {
      if (!selectedMeal) return;
      Alert.alert('Remove Meal', 'Are you sure you want to remove this meal from your plan?', [
          { text: 'Cancel', style: 'cancel' },
          {
              text: 'Remove',
              style: 'destructive',
              onPress: async () => {
                  try {
                      await deletePlannedMeal(selectedMeal.id);
                      setModalVisible(false);
                      fetchPlanner();
                  } catch (e) {
                      Alert.alert('Error', 'Failed to remove meal');
                  }
              }
          }
      ]);
  };

  const navigateToRecipe = () => {
      if (selectedMeal && selectedMeal.mealId !== 'leftover-placeholder') {
          setModalVisible(false);
          router.push(`/(tabs)/recipes/${selectedMeal.mealId}`);
      }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView edges={['top']} className="bg-white">
        {/* Date Header */}
        <View className="flex-row justify-between items-center px-4 py-4 border-b border-gray-100">
          <TouchableOpacity onPress={() => changeWeek('prev')} className="p-2 bg-gray-50 rounded-full">
            <ChevronLeft size={20} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">
            Week of {format(weekStart, 'MMM d')}
          </Text>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity onPress={() => changeWeek('next')} className="p-2 bg-gray-50 rounded-full">
              <ChevronRight size={20} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/profile')} className="p-2 bg-gray-50 rounded-full">
              <User size={20} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 130 }}>
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
                        onPress={() => handleMealPress(meal)}
                        className={`flex-row items-center p-3 rounded-xl border border-gray-100 mb-2 ${
                            meal.mealId === 'leftover-placeholder' ? 'bg-amber-50 border-amber-100' : 'bg-gray-50'
                        }`}
                      >
                        <View className={`p-2 rounded-lg mr-3 shadow-sm ${
                            meal.mealId === 'leftover-placeholder' ? 'bg-amber-100' : 'bg-white'
                        }`}>
                          {meal.mealId === 'leftover-placeholder' ? (
                              <Copy size={16} color="#B45309" />
                          ) : (
                              <Utensils size={16} color="#4F46E5" />
                          )}
                        </View>
                        <View className="flex-1">
                          <Text className={`font-semibold ${
                              meal.mealId === 'leftover-placeholder' ? 'text-amber-900' : 'text-gray-900'
                          }`}>{meal.mealName}</Text>
                          {meal.mealId !== 'leftover-placeholder' && (
                              <Text className="text-xs text-gray-500">{meal.plannedServings} servings</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View className="flex-row gap-2">
                        <TouchableOpacity
                            onPress={() => handleAddMeal(dayStr)}
                            className="flex-1 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200 items-center flex-row justify-center"
                        >
                          <Plus size={16} color="#9CA3AF" />
                          <Text className="text-gray-500 text-sm ml-2 font-medium">Add Meal</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handleAddLeftovers(dayStr)}
                            className="w-12 bg-amber-50 rounded-xl border border-dashed border-amber-200 items-center justify-center"
                        >
                            <Copy size={16} color="#D97706" />
                        </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View className="flex-1 justify-end bg-black/50">
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        className="bg-white rounded-t-3xl p-6"
                    >
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900 flex-1 mr-4" numberOfLines={1}>
                                {selectedMeal?.mealName}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} className="p-1 bg-gray-100 rounded-full">
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {selectedMeal?.mealId !== 'leftover-placeholder' && (
                             <TouchableOpacity
                                onPress={navigateToRecipe}
                                className="flex-row items-center justify-center bg-indigo-50 p-3 rounded-xl mb-6 border border-indigo-100"
                             >
                                 <Eye size={20} color="#4F46E5" />
                                 <Text className="text-indigo-600 font-semibold ml-2">View Recipe</Text>
                             </TouchableOpacity>
                        )}

                        <View className="flex-row gap-4 mb-4">
                            <View className="flex-1">
                                <Text className="text-sm font-medium text-gray-700 mb-2">Servings</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg"
                                    keyboardType="number-pad"
                                    value={editServings}
                                    onChangeText={setEditServings}
                                />
                            </View>
                        </View>

                        <View className="mb-6">
                            <Text className="text-sm font-medium text-gray-700 mb-2">Notes</Text>
                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-base h-24"
                                multiline
                                textAlignVertical="top"
                                placeholder="Add notes..."
                                value={editNotes}
                                onChangeText={setEditNotes}
                            />
                        </View>

                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={handleDeleteMeal}
                                className="flex-1 bg-red-50 p-4 rounded-xl items-center flex-row justify-center border border-red-100"
                            >
                                <Trash2 size={20} color="#EF4444" />
                                <Text className="text-red-600 font-bold ml-2">Remove</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleSaveEdit}
                                className="flex-2 bg-indigo-600 p-4 rounded-xl items-center flex-row justify-center flex-1"
                            >
                                <Save size={20} color="white" />
                                <Text className="text-white font-bold ml-2">Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                        <View className="h-8" />
                    </KeyboardAvoidingView>
                </TouchableWithoutFeedback>
            </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
