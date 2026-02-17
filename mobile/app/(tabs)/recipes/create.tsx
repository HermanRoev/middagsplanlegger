import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../../../context/auth';
import { createMeal } from '../../../lib/api';
import { Ingredient, Meal } from '../../../../src/types';
import { Plus, X, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageFromUri } from '../../../lib/storage';
import UnitPicker from '../../../components/UnitPicker';

export default function CreateRecipe() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [servings, setServings] = useState('4');
  const [prepTime, setPrepTime] = useState('30');
  const [imageUrl, setImageUrl] = useState('');

  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', amount: null, unit: 'stk' }
  ]);
  const [instructions, setInstructions] = useState<string[]>(['']);

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: null, unit: 'stk' }]);
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const newIngredients = [...ingredients];
    if (field === 'amount') {
      newIngredients[index].amount = value ? parseFloat(value) : null;
    } else {
      (newIngredients[index] as any)[field] = value;
    }
    setIngredients(newIngredients);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const addInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const updateInstruction = (index: number, value: string) => {
    const newInstructions = [...instructions];
    newInstructions[index] = value;
    setInstructions(newInstructions);
  };

  const removeInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.5
    });

    if (!result.canceled) {
        setImageUrl(result.assets[0].uri);
    }
  };

  const isLocalUri = (uri: string) =>
    uri.startsWith('file:') || uri.startsWith('content:') || uri.startsWith('ph://');

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a recipe name');
      return;
    }

    const validIngredients = ingredients.filter(i => i.name.trim() !== '');
    if (validIngredients.length === 0) {
        Alert.alert('Error', 'Please add at least one ingredient');
        return;
    }

    setLoading(true);
    try {
      let finalImageUrl: string | null = imageUrl || null;
      if (imageUrl && isLocalUri(imageUrl)) {
        const imagePath = `meals/${user.uid}/cover_${Date.now()}`;
        finalImageUrl = await uploadImageFromUri(imageUrl, imagePath);
      }

      const newMeal: Omit<Meal, 'id'> = {
        name,
        imageUrl: finalImageUrl,
        servings: parseInt(servings) || 4,
        prepTime: parseInt(prepTime) || 30,
        costEstimate: null,
        ingredients: validIngredients,
        instructions: instructions.filter(i => i.trim() !== ''),
        createdBy: {
          id: user.uid,
          name: user.email || 'User'
        }
      };

      await createMeal(newMeal);
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to create recipe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          headerTitle: 'Add Recipe',
          headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.7} className="bg-indigo-600 px-4 py-1.5 rounded-full">
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-bold">Save</Text>
              )}
            </TouchableOpacity>
          ),
          headerLeft: () => (
             <TouchableOpacity onPress={() => router.back()} className="p-2">
                <X size={22} color="#4B5563" />
             </TouchableOpacity>
          ),
          presentation: 'modal'
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Cover Image Section */}
        <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
           <Text className="text-sm font-bold text-gray-900 mb-3">Cover Image</Text>
           <TouchableOpacity onPress={pickImage} className="flex-row items-center gap-3">
              <View className="bg-gray-100 h-24 w-full rounded-xl items-center justify-center border-dashed border-2 border-gray-300">
                 {imageUrl ? (
                     <Image source={{ uri: imageUrl }} className="h-full w-full rounded-xl" resizeMode="cover" />
                 ) : (
                     <View className="items-center">
                        <Upload size={24} color="#9CA3AF" />
                        <Text className="text-gray-400 text-xs mt-2">Tap to upload</Text>
                     </View>
                 )}
              </View>
           </TouchableOpacity>
        </View>

        {/* Basic Details */}
        <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <Text className="text-lg font-bold text-gray-900 mb-4">Details</Text>

            <View className="space-y-4">
              <View>
                <Text className="text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">Recipe Name <Text className="text-red-500">*</Text></Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 font-medium"
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Grandma's Pancakes"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">Servings</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 text-center"
                    value={servings}
                    onChangeText={setServings}
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">Prep Time (min)</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 text-center"
                    value={prepTime}
                    onChangeText={setPrepTime}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
        </View>

        {/* Ingredients */}
        <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-900">Ingredients</Text>
            <TouchableOpacity onPress={addIngredient} className="bg-indigo-50 px-3 py-1.5 rounded-full flex-row items-center">
              <Plus size={14} color="#4F46E5" />
              <Text className="text-indigo-600 font-bold ml-1 text-xs">Add Item</Text>
            </TouchableOpacity>
          </View>

          <View className="space-y-3">
            {ingredients.map((ing, idx) => (
              <View key={idx} className="flex-row gap-2 items-center">
                <TextInput
                  className="flex-[2] bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900"
                  placeholder="Item"
                  placeholderTextColor="#9CA3AF"
                  value={ing.name}
                  onChangeText={(t) => updateIngredient(idx, 'name', t)}
                />
                <TextInput
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 text-center"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  value={ing.amount?.toString() || ''}
                  onChangeText={(t) => updateIngredient(idx, 'amount', t)}
                  keyboardType="numeric"
                />
                <UnitPicker
                  value={ing.unit}
                  onChange={(unit) => updateIngredient(idx, 'unit', unit)}
                  className="w-20"
                />
                <TouchableOpacity onPress={() => removeIngredient(idx)} className="p-2 bg-red-50 rounded-lg">
                  <X size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            {ingredients.length === 0 && (
                <Text className="text-center text-gray-400 py-4 italic">No ingredients added.</Text>
            )}
          </View>
        </View>

        {/* Instructions */}
        <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-900">Instructions</Text>
            <TouchableOpacity onPress={addInstruction} className="bg-indigo-50 px-3 py-1.5 rounded-full flex-row items-center">
              <Plus size={14} color="#4F46E5" />
              <Text className="text-indigo-600 font-bold ml-1 text-xs">Add Step</Text>
            </TouchableOpacity>
          </View>

          <View className="space-y-4">
            {instructions.map((inst, idx) => (
              <View key={idx} className="flex-row gap-3 items-start">
                <View className="mt-3 w-6 h-6 rounded-full bg-indigo-100 items-center justify-center">
                    <Text className="text-indigo-600 font-bold text-xs">{idx + 1}</Text>
                </View>
                <TextInput
                  className="flex-1 min-h-[80px] bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900"
                  placeholder={`Step ${idx + 1} details...`}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  value={inst}
                  onChangeText={(t) => updateInstruction(idx, t)}
                  textAlignVertical="top"
                />
                <TouchableOpacity onPress={() => removeInstruction(idx)} className="mt-3 p-2 bg-red-50 rounded-lg">
                  <X size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
