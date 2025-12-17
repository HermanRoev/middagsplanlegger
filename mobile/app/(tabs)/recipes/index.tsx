import { View, Text, FlatList, ActivityIndicator, TextInput, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/auth';
import { getUserRecipes, addPlannedMeal } from '../../../lib/api';
import { Meal } from '../../../../src/types';
import { RecipeCard } from '../../../components/RecipeCard';
import { Search, Plus, Inbox, Link as LinkIcon, Camera, Type, ChefHat, Calendar } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { generateRecipeFromImageMobile, generateRecipeFromTextMobile } from '../../../lib/gemini-mobile';
import { createMeal } from '../../../lib/api';

export default function RecipesList() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // AI Input State
  const [textInputVisible, setTextInputVisible] = useState(false);
  const [aiText, setAiText] = useState('');

  const router = useRouter();
  const params = useLocalSearchParams();
  const planningDate = params.planningDate as string;

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
      if (planningDate) {
          Alert.alert(
              'Plan Meal',
              `Add ${recipe.name} to your plan for ${planningDate}?`,
              [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Add to Plan', onPress: async () => {
                      if (!user) return;
                      try {
                          await addPlannedMeal(user.uid, recipe, planningDate);
                          Alert.alert('Success', 'Meal added to plan!');
                          router.push('/(tabs)/'); // Go back to planner
                      } catch (e) {
                          Alert.alert('Error', 'Failed to add meal');
                      }
                  }}
              ]
          );
      } else {
          // Standard details view (if we had a details page route configured fully, or expand card)
          // For now, let's just show an alert or expand if implemented.
          // The card doesn't have an onPress prop exposed typically unless wrapped.
          // Wait, RecipeCard is a component. Let's see if it handles press.
          // If not, we wrap it here.
      }
  };

  const handleManualCreate = () => {
    setShowCreateOptions(false);
    router.push('/(tabs)/recipes/create');
  };

  const handleCameraCreate = async () => {
     setShowCreateOptions(false);
     const { status } = await ImagePicker.requestCameraPermissionsAsync();
     if (status !== 'granted') return Alert.alert('Permission needed');

     const result = await ImagePicker.launchCameraAsync({
         mediaTypes: ImagePicker.MediaTypeOptions.Images,
         quality: 0.5,
         base64: false
     });

     if (!result.canceled && result.assets[0].uri) {
         setAiLoading(true);
         try {
             const recipeData = await generateRecipeFromImageMobile(result.assets[0].uri);
             await saveAiRecipe(recipeData);
         } catch (e) {
             Alert.alert('Error', 'Failed to generate recipe');
         } finally {
             setAiLoading(false);
         }
     }
  };

  const handleTextCreate = async () => {
      if (!aiText.trim()) return;
      setTextInputVisible(false);
      setShowCreateOptions(false);
      setAiLoading(true);
      try {
          const recipeData = await generateRecipeFromTextMobile(aiText);
          await saveAiRecipe(recipeData);
      } catch (e) {
          Alert.alert('Error', 'Failed to generate recipe');
      } finally {
          setAiLoading(false);
      }
  };

  const saveAiRecipe = async (data: any) => {
      if (!user) return;
      try {
          await createMeal({
              ...data,
              imageUrl: null,
              costEstimate: null,
              createdBy: { id: user.uid, name: user.email || 'User' }
          });
          Alert.alert('Success', 'Recipe created from AI!');
          fetchRecipes();
      } catch (e) {
          console.error(e);
          Alert.alert('Error', 'Failed to save recipe');
      }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-3 border-b border-gray-100 flex-row items-center gap-3">
        <View className="flex-1 flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
          <Search size={18} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-2 text-gray-900"
            placeholder="Search recipes..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/recipes/inbox')}
          className="bg-indigo-50 p-3 rounded-xl"
        >
          <Inbox size={20} color="#4F46E5" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowCreateOptions(true)}
          className="bg-indigo-600 p-3 rounded-xl shadow-sm"
        >
          <Plus size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Planning Mode Banner */}
      {planningDate && (
          <View className="bg-indigo-50 px-4 py-2 flex-row items-center justify-between border-b border-indigo-100">
              <View className="flex-row items-center">
                  <Calendar size={16} color="#4F46E5" />
                  <Text className="ml-2 text-indigo-700 font-medium">Selecting for {planningDate}</Text>
              </View>
              <TouchableOpacity onPress={() => router.setParams({ planningDate: '' })}>
                  <Text className="text-indigo-500 text-xs font-bold">CANCEL</Text>
              </TouchableOpacity>
          </View>
      )}

      {/* AI Loading Overlay */}
      {aiLoading && (
          <View className="absolute inset-0 bg-black/50 z-50 justify-center items-center">
              <View className="bg-white p-6 rounded-2xl items-center">
                  <ActivityIndicator size="large" color="#4F46E5" />
                  <Text className="mt-4 font-medium text-gray-900">AI is working its magic...</Text>
              </View>
          </View>
      )}

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleRecipePress(item)}>
                  <RecipeCard recipe={item} />
              </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center mt-20">
              <Text className="text-gray-400">No recipes found.</Text>
            </View>
          }
        />
      )}

      {/* Create Options Modal */}
      <Modal visible={showCreateOptions} transparent animationType="fade">
          <TouchableOpacity
              activeOpacity={1}
              onPress={() => setShowCreateOptions(false)}
              className="flex-1 bg-black/30 justify-end"
          >
              <View className="bg-white rounded-t-3xl p-6">
                  <Text className="text-xl font-bold mb-6 text-center">Add New Recipe</Text>

                  <View className="flex-row justify-around mb-8">
                      <TouchableOpacity onPress={handleManualCreate} className="items-center">
                          <View className="w-16 h-16 bg-indigo-50 rounded-full items-center justify-center mb-2">
                              <Plus size={28} color="#4F46E5" />
                          </View>
                          <Text className="text-sm font-medium text-gray-700">Manual</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={handleCameraCreate} className="items-center">
                          <View className="w-16 h-16 bg-indigo-50 rounded-full items-center justify-center mb-2">
                              <Camera size={28} color="#4F46E5" />
                          </View>
                          <Text className="text-sm font-medium text-gray-700">Scan</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => { setShowCreateOptions(false); setTextInputVisible(true); }} className="items-center">
                          <View className="w-16 h-16 bg-indigo-50 rounded-full items-center justify-center mb-2">
                              <ChefHat size={28} color="#4F46E5" />
                          </View>
                          <Text className="text-sm font-medium text-gray-700">AI Chef</Text>
                      </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                      onPress={() => setShowCreateOptions(false)}
                      className="bg-gray-100 py-3 rounded-xl items-center"
                  >
                      <Text className="font-semibold text-gray-600">Cancel</Text>
                  </TouchableOpacity>
              </View>
          </TouchableOpacity>
      </Modal>

      {/* Text/URL Input Modal */}
      <Modal visible={textInputVisible} transparent animationType="slide">
          <View className="flex-1 bg-black/50 justify-center px-4">
              <View className="bg-white rounded-2xl p-6">
                  <Text className="text-lg font-bold mb-2">Ask AI Chef</Text>
                  <Text className="text-sm text-gray-500 mb-4">
                      Enter a recipe name, a description, or paste a URL.
                  </Text>

                  <TextInput
                      className="bg-gray-50 border border-gray-200 rounded-xl p-3 h-32 mb-4 text-gray-900"
                      multiline
                      textAlignVertical="top"
                      placeholder="e.g. 'Spaghetti Bolognese' or 'https://...'"
                      value={aiText}
                      onChangeText={setAiText}
                  />

                  <View className="flex-row gap-3">
                      <TouchableOpacity
                          onPress={() => setTextInputVisible(false)}
                          className="flex-1 bg-gray-100 py-3 rounded-xl items-center"
                      >
                          <Text className="font-semibold text-gray-600">Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                          onPress={handleTextCreate}
                          className="flex-1 bg-indigo-600 py-3 rounded-xl items-center"
                      >
                          <Text className="font-bold text-white">Generate</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

    </View>
  );
}
