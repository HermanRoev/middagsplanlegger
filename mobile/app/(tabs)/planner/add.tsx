import { View, Text, FlatList, ActivityIndicator, TextInput, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/auth';
import { getUserRecipes } from '../../../lib/api';
import { Meal } from '../../../../src/types';
import { RecipeCard } from '../../../components/RecipeCard';
import { Search, Calendar, X, ChefHat } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function PlannerAddRecipe() {
  const { user, householdId } = useAuth();
  const [recipes, setRecipes] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const router = useRouter();
  const params = useLocalSearchParams();
  const planningDate = params.date as string;
  const replaceId = params.replaceId as string | undefined;

  useEffect(() => {
    fetchRecipes();
  }, [user]);

  async function fetchRecipes() {
    if (!user || !householdId) return;
    try {
      const fetchedRecipes = await getUserRecipes(user.uid, householdId);
      setRecipes(fetchedRecipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRecipePress = (recipe: Meal) => {
    const replaceParam = replaceId ? `&plannedId=${replaceId}` : '';
    router.push(`/(tabs)/recipes/${recipe.id}?planningDate=${planningDate}${replaceParam}`);
  };

  return (
    <View className="flex-1 bg-white">
      <View className="bg-white px-6 pb-4 pt-16 border-b border-gray-200 flex-row justify-between items-end">
        <View>
          <View className="flex-row items-center mb-1">
            <Calendar size={14} color="#4F46E5" />
            <Text className="ml-1.5 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em]">
              Planlegger for {format(new Date(planningDate + 'T12:00:00'), 'EEEE d. MMM', { locale: nb })}
            </Text>
          </View>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">Velg oppskrift</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-3 bg-gray-50 rounded-2xl border border-gray-100"
          activeOpacity={0.7}
        >
          <X size={20} color="#4B5563" />
        </TouchableOpacity>
      </View>

      <View className="bg-white px-5 py-4 border-b border-gray-200">
        <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-[20px] px-4 py-3">
          <Search size={18} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-3 text-gray-900 font-bold"
            placeholder="Søk i oppskrifter..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecipeCard recipe={item} onPress={() => handleRecipePress(item)} />
          )}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-24 opacity-30">
              <ChefHat size={80} color="#9CA3AF" />
              <Text className="text-gray-500 font-black uppercase tracking-widest mt-4">Ingen oppskrifter funnet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
