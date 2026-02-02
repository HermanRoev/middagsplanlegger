import { View, Text, Image, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { getRecipeById, addPlannedMeal } from '../../../../lib/api';
import { useAuth } from '../../../../context/auth';
import { Meal } from '../../../../../src/types';
import { Clock, Users, Utensils, CircleDollarSign, Calendar } from 'lucide-react-native';

export default function PlannerRecipeDetail() {
  const params = useLocalSearchParams();
  const id = params.id;
  const planningDate = params.date as string;

  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadRecipe() {
      if (typeof id === 'string') {
        const data = await getRecipeById(id);
        setRecipe(data);
      }
      setLoading(false);
    }
    loadRecipe();
  }, [id]);

  const handleAddToPlan = async () => {
      if (!user || !recipe || !planningDate) return;
      try {
          await addPlannedMeal(user.uid, recipe, planningDate);
          Alert.alert('Success', 'Meal added to plan!', [
              { text: 'OK', onPress: () => {
                  // Navigate back to the main planner screen
                  router.dismissAll();
              }}
          ]);
      } catch (e) {
          Alert.alert('Error', 'Failed to add meal');
      }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text>Recipe not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ title: recipe.name }} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Image Header */}
        <View className="relative h-72 w-full">
          {recipe.imageUrl ? (
            <Image
              source={{ uri: recipe.imageUrl }}
              className="w-full h-full bg-gray-200"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full bg-indigo-50 items-center justify-center">
               <Text className="text-6xl">🥘</Text>
            </View>
          )}
          <View className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
        </View>

        <View className="px-6 -mt-8 relative z-10">
          <View className="bg-white rounded-3xl shadow-sm p-6 pb-8">
            <Text className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
              {recipe.name}
            </Text>

            {/* Meta Data */}
            <View className="flex-row justify-between mb-8 bg-gray-50 p-4 rounded-xl">
              <View className="items-center flex-1 border-r border-gray-200">
                <Clock size={20} color="#4F46E5" className="mb-1" />
                <Text className="text-xs text-gray-500 font-medium uppercase tracking-wide">Time</Text>
                <Text className="font-semibold text-gray-900">{recipe.prepTime || '-'}m</Text>
              </View>
              <View className="items-center flex-1 border-r border-gray-200">
                <Users size={20} color="#4F46E5" className="mb-1" />
                <Text className="text-xs text-gray-500 font-medium uppercase tracking-wide">Servings</Text>
                <Text className="font-semibold text-gray-900">{recipe.servings || '-'}</Text>
              </View>
              <View className="items-center flex-1">
                <CircleDollarSign size={20} color="#4F46E5" className="mb-1" />
                <Text className="text-xs text-gray-500 font-medium uppercase tracking-wide">Cost</Text>
                <Text className="font-semibold text-gray-900">{recipe.costEstimate ? `${recipe.costEstimate}kr` : '-'}</Text>
              </View>
            </View>

            {/* Ingredients */}
            <View className="mb-8">
              <View className="flex-row items-center gap-2 mb-4">
                <Utensils size={20} color="#4F46E5" />
                <Text className="text-lg font-bold text-gray-900">Ingredients</Text>
              </View>
              <View className="space-y-3">
                {recipe.ingredients.map((ing: any, idx: number) => (
                  <View key={idx} className="flex-row justify-between items-center py-2 border-b border-gray-50">
                    <Text className="text-gray-700 flex-1 font-medium">{ing.name}</Text>
                    <Text className="text-gray-500 font-medium">
                      {ing.amount} {ing.unit}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Instructions */}
            <View>
              <Text className="text-lg font-bold text-gray-900 mb-6">Instructions</Text>
              <View className="space-y-8">
                {recipe.instructions.map((step: string, idx: number) => (
                  <View key={idx} className="flex-row gap-4 mb-2">
                    <View className="w-8 h-8 rounded-full bg-indigo-100 items-center justify-center">
                      <Text className="text-indigo-700 font-bold">{idx + 1}</Text>
                    </View>
                    <Text className="text-gray-600 flex-1 leading-7 pt-1 text-base">{step}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add to Plan Button */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
          <TouchableOpacity
              onPress={handleAddToPlan}
              className="bg-indigo-600 p-4 rounded-xl flex-row justify-center items-center shadow-sm"
          >
              <Calendar size={20} color="white" />
              <Text className="text-white font-bold text-lg ml-2">
                  Add to Plan
              </Text>
          </TouchableOpacity>
      </View>
    </View>
  );
}
