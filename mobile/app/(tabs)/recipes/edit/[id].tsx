import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../../context/auth';
import { getRecipeById, updateMeal } from '../../../../lib/api';
import { Ingredient, Meal } from '../../../../../src/types';
import { Plus, X, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { UnitSelector } from '../../../../components/UnitSelector';

export default function EditRecipe() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [servings, setServings] = useState('4');
  const [prepTime, setPrepTime] = useState('30');
  const [imageUrl, setImageUrl] = useState('');

  type FormIngredient = { name: string; amount: string; unit: string };

  const [ingredients, setIngredients] = useState<FormIngredient[]>([
    { name: '', amount: '', unit: 'stk' }
  ]);
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [selectingUnitIndex, setSelectingUnitIndex] = useState<number | null>(null);

  useEffect(() => {
      if (typeof id === 'string') {
          loadRecipe(id);
      }
  }, [id]);

  const loadRecipe = async (recipeId: string) => {
      try {
          const data = await getRecipeById(recipeId);
          if (data) {
              setName(data.name);
              setServings(data.servings?.toString() || '4');
              setPrepTime(data.prepTime?.toString() || '30');
              setImageUrl(data.imageUrl || '');
              setIngredients(data.ingredients?.map(ing => ({
                  name: ing.name,
                  amount: ing.amount?.toString() || '',
                  unit: ing.unit
              })) || []);
              setInstructions(data.instructions || []);
          } else {
              Alert.alert('Error', 'Recipe not found');
              router.back();
          }
      } catch (error) {
          Alert.alert('Error', 'Failed to load recipe');
      } finally {
          setLoading(false);
      }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: '', unit: 'stk' }]);
  };

  const updateIngredient = (index: number, field: keyof FormIngredient, value: string) => {
    const newIngredients = [...ingredients];
    (newIngredients[index] as any)[field] = value;
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
      quality: 0.5,
      base64: true
    });

    if (!result.canceled) {
        setImageUrl(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!user || typeof id !== 'string') return;
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a recipe name');
      return;
    }

    const validIngredients = ingredients.filter(i => i.name.trim() !== '');
    if (validIngredients.length === 0) {
        Alert.alert('Error', 'Please add at least one ingredient');
        return;
    }

    setSaving(true);
    try {
      const formattedIngredients: Ingredient[] = validIngredients.map(ing => ({
          name: ing.name,
          unit: ing.unit,
          amount: ing.amount ? (isNaN(parseFloat(ing.amount)) ? null : parseFloat(ing.amount)) : null
      }));

      const updates: Partial<Meal> = {
        name,
        imageUrl: imageUrl || null,
        servings: parseInt(servings) || 4,
        prepTime: parseInt(prepTime) || 30,
        ingredients: formattedIngredients,
        instructions: instructions.filter(i => i.trim() !== ''),
      };

      await updateMeal(id, updates);
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update recipe');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
      return (
          <View className="flex-1 justify-center items-center bg-gray-50">
              <ActivityIndicator size="large" color="#4F46E5" />
          </View>
      );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          headerTitle: 'Edit Recipe',
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#4F46E5" />
              ) : (
                <Text className="text-indigo-600 font-bold text-lg">Save</Text>
              )}
            </TouchableOpacity>
          ),
          headerLeft: () => (
             <TouchableOpacity onPress={() => router.back()}>
                <Text className="text-gray-500 text-lg">Cancel</Text>
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
                  value={ing.amount}
                  onChangeText={(t) => updateIngredient(idx, 'amount', t)}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  onPress={() => setSelectingUnitIndex(idx)}
                  className="w-16 bg-gray-50 border border-gray-200 rounded-xl justify-center items-center"
                >
                    <Text className="text-gray-900 font-medium">{ing.unit}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeIngredient(idx)} className="p-2 bg-red-50 rounded-lg justify-center">
                  <X size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
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

          <View className="space-y-6">
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

      <UnitSelector
        visible={selectingUnitIndex !== null}
        onClose={() => setSelectingUnitIndex(null)}
        currentUnit={selectingUnitIndex !== null ? ingredients[selectingUnitIndex].unit : 'stk'}
        onSelect={(unit) => {
            if (selectingUnitIndex !== null) {
                updateIngredient(selectingUnitIndex, 'unit', unit);
            }
        }}
      />
    </View>
  );
}
