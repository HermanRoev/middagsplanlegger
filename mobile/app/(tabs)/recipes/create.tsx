import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../context/auth';
import { createMeal } from '../../../lib/api';
import { Ingredient, Meal } from '../../../../src/types';
import { Plus, Minus, Check, X } from 'lucide-react-native';

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

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a recipe name');
      return;
    }

    setLoading(true);
    try {
      const newMeal: Omit<Meal, 'id'> = {
        name,
        imageUrl: imageUrl || null,
        servings: parseInt(servings) || 4,
        prepTime: parseInt(prepTime) || 30,
        costEstimate: null,
        ingredients: ingredients.filter(i => i.name.trim() !== ''),
        instructions: instructions.filter(i => i.trim() !== ''),
        createdBy: {
          id: user.uid,
          name: user.email || 'User' // Ideally fetch display name
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
    <View className="flex-1 bg-white">
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-gray-500 text-lg">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold">New Recipe</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#4F46E5" />
          ) : (
            <Text className="text-indigo-600 font-bold text-lg">Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="space-y-4 pb-10">
          <View>
            <Text className="label">Name</Text>
            <TextInput
              className="input"
              value={name}
              onChangeText={setName}
              placeholder="Spaghetti Bolognese"
            />
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="label">Servings</Text>
              <TextInput
                className="input"
                value={servings}
                onChangeText={setServings}
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1">
              <Text className="label">Prep Time (min)</Text>
              <TextInput
                className="input"
                value={prepTime}
                onChangeText={setPrepTime}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View>
            <Text className="label">Image URL (Optional)</Text>
            <TextInput
              className="input"
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://..."
            />
          </View>

          <View>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="font-bold text-lg">Ingredients</Text>
              <TouchableOpacity onPress={addIngredient} className="bg-indigo-50 p-2 rounded-full">
                <Plus size={20} color="#4F46E5" />
              </TouchableOpacity>
            </View>
            {ingredients.map((ing, idx) => (
              <View key={idx} className="flex-row gap-2 mb-2 items-center">
                <TextInput
                  className="input flex-[2]"
                  placeholder="Item"
                  value={ing.name}
                  onChangeText={(t) => updateIngredient(idx, 'name', t)}
                />
                <TextInput
                  className="input flex-1"
                  placeholder="Amt"
                  value={ing.amount?.toString() || ''}
                  onChangeText={(t) => updateIngredient(idx, 'amount', t)}
                  keyboardType="numeric"
                />
                <TextInput
                  className="input flex-1"
                  placeholder="Unit"
                  value={ing.unit}
                  onChangeText={(t) => updateIngredient(idx, 'unit', t)}
                />
                <TouchableOpacity onPress={() => removeIngredient(idx)}>
                  <X size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="font-bold text-lg">Instructions</Text>
              <TouchableOpacity onPress={addInstruction} className="bg-indigo-50 p-2 rounded-full">
                <Plus size={20} color="#4F46E5" />
              </TouchableOpacity>
            </View>
            {instructions.map((inst, idx) => (
              <View key={idx} className="flex-row gap-2 mb-2 items-start">
                <Text className="mt-3 font-bold text-gray-400">{idx + 1}.</Text>
                <TextInput
                  className="input flex-1 h-20"
                  placeholder="Step description..."
                  multiline
                  value={inst}
                  onChangeText={(t) => updateInstruction(idx, t)}
                  textAlignVertical="top"
                />
                <TouchableOpacity onPress={() => removeInstruction(idx)} className="mt-3">
                  <X size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
