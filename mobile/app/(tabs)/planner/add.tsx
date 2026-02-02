import { View, Text, FlatList, ActivityIndicator, TextInput, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/auth';
import { getUserRecipes } from '../../../lib/api';
import { Meal } from '../../../../src/types';
import { RecipeCard } from '../../../components/RecipeCard';
import { Search, Calendar } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function PlannerAddRecipe() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const router = useRouter();
  const params = useLocalSearchParams();
  const planningDate = params.date as string;

  useEffect(() => {
    fetchRecipes();
  }, [user]);

  async function fetchRecipes() {
    if (!user) return;
    try {
      const fetchedRecipes = await getUserRecipes(user.uid);
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
      // Navigate to the planner-specific details page
      router.push(`/(tabs)/planner/recipe/${recipe.id}?date=${planningDate}`);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-3 border-b border-gray-100">
         {planningDate && (
             <View className="flex-row items-center mb-3">
                  <Calendar size={16} color="#4F46E5" />
                  <Text className="ml-2 text-indigo-700 font-medium">Add to {planningDate}</Text>
             </View>
         )}
        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
          <Search size={18} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-2 text-gray-900"
            placeholder="Search recipes..."
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
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center mt-20">
              <Text className="text-gray-400">No recipes found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
