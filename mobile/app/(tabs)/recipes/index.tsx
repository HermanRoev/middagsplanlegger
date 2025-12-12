import { View, Text, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/auth';
import { getUserRecipes } from '../../../lib/api';
import { Meal } from '../../../../src/types';
import { RecipeCard } from '../../../components/RecipeCard';
import { Search } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RecipesList() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
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
    fetchRecipes();
  }, [user]);

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-3 border-b border-gray-100">
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
          renderItem={({ item }) => <RecipeCard recipe={item} />}
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
