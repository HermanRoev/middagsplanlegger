import { View, Text, FlatList, ActivityIndicator, TextInput, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/auth';
import { getUserRecipes } from '../../../lib/api';
import { Meal } from '../../../../src/types';
import { RecipeCard } from '../../../components/RecipeCard';
import { Search, Plus, Inbox, Link as LinkIcon, Camera, Type } from 'lucide-react-native';
import { useRouter } from 'expo-router';
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

  const handleManualCreate = () => {
    setShowCreateOptions(false);
    router.push('/(tabs)/recipes/create');
  };

  const handleCameraCreate = async () => {
     setShowCreateOptions(false);
     const { status } = await ImagePicker.requestCameraPermissionsAsync();
     if (status !== 'granted') return Alert.alert('Permission needed');

     const result = await ImagePicker.launchCameraAsync({
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
          renderItem={({ item }) => <RecipeCard recipe={item} />}
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
                          <View className="w-14 h-14 bg-indigo-50 rounded-full items-center justify-center mb-2">
                              <Plus size={24} color="#4F46E5" />
                          </View>
                          <Text className="text-sm font-medium">Manual</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={handleCameraCreate} className="items-center">
                          <View className="w-14 h-14 bg-indigo-50 rounded-full items-center justify-center mb-2">
                              <Camera size={24} color="#4F46E5" />
                          </View>
                          <Text className="text-sm font-medium">Scan Image</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => { setShowCreateOptions(false); setTextInputVisible(true); }} className="items-center">
                          <View className="w-14 h-14 bg-indigo-50 rounded-full items-center justify-center mb-2">
                              <LinkIcon size={24} color="#4F46E5" />
                          </View>
                          <Text className="text-sm font-medium">URL / Text</Text>
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
                  <Text className="text-lg font-bold mb-2">Import from Text or URL</Text>
                  <Text className="text-sm text-gray-500 mb-4">
                      Paste a recipe URL or describe the dish you want to make.
                  </Text>

                  <TextInput
                      className="bg-gray-50 border border-gray-200 rounded-xl p-3 h-32 mb-4 text-gray-900"
                      multiline
                      textAlignVertical="top"
                      placeholder="e.g. https://... or 'Spicy Thai Curry with chicken...'"
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
