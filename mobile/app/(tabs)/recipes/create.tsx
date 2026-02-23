import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../../../context/auth';
import { createMeal } from '../../../lib/api';
import { Ingredient, Meal } from '../../../../src/types';
import { Plus, X, Upload, Trash2, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageFromUri } from '../../../lib/storage';
import UnitPicker from '../../../components/UnitPicker';
import { BlurView } from 'expo-blur';
import { GlassCard } from '../../../components/ui/GlassCard';
import { GlassInput } from '../../../components/ui/GlassInput';
import { GlassButton } from '../../../components/ui/GlassButton';

export default function CreateRecipe() {
  const router = useRouter();
  const { user, householdId } = useAuth();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [servings, setServings] = useState('4');
  const [prepTime, setPrepTime] = useState('30');
  const [imageUrl, setImageUrl] = useState('');

  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', amount: null, unit: 'stk' }
  ]);
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [tags, setTags] = useState('');
  const [difficulty, setDifficulty] = useState<"Enkel" | "Middels" | "Avansert">("Enkel");

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
        tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
        difficulty,
        createdBy: {
          id: user.uid,
          name: user.email || 'User'
        }
      };

      if (!householdId) return;
      await createMeal(newMeal, householdId);
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to create recipe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 text-white">
      <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
      <View style={StyleSheet.absoluteFill} className="bg-white/40" />

      <Stack.Screen
        options={{
          headerTitle: 'Ny Oppskrift',
          headerTransparent: true,
          headerBlurEffect: 'light',
          headerRight: () => (
            <GlassButton
              title="Lagre"
              variant="primary"
              onPress={handleSave}
              disabled={loading}
              loading={loading}
            />
          ),
          headerLeft: () => (
            <GlassButton
              variant="icon"
              icon={<X size={20} color="#6B7280" />}
              onPress={() => router.back()}
            />
          ),
          presentation: 'modal'
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView className="flex-1 px-4 pt-24" contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {/* Cover Image Section */}
          <GlassCard className="mb-6">
            <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Forsidebilde</Text>
            <View className="relative">
              <TouchableOpacity onPress={pickImage} className="flex-row items-center gap-3">
                <View className="bg-white/40 h-48 w-full rounded-2xl items-center justify-center border-dashed border border-white/60 overflow-hidden shadow-sm">
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} className="h-full w-full" resizeMode="cover" />
                  ) : (
                    <View className="items-center">
                      <Camera size={32} color="#9CA3AF" />
                      <Text className="text-gray-500 font-black uppercase tracking-widest text-[10px] mt-3">Trykk for å laste opp</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {imageUrl ? (
                <View className="absolute top-3 right-3">
                  <GlassButton
                    variant="danger"
                    icon={<Trash2 size={16} color="white" />}
                    onPress={() => setImageUrl('')}
                    className="w-10 h-10 p-0 items-center justify-center rounded-full"
                  />
                </View>
              ) : null}
            </View>
          </GlassCard>

          {/* Basic Details */}
          <GlassCard className="mb-6">
            <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">Detaljer</Text>

            <View className="space-y-4">
              <View>
                <Text className="text-[10px] font-black text-gray-500 uppercase mb-2 ml-2">Navn <Text className="text-red-500">*</Text></Text>
                <GlassInput
                  value={name}
                  onChangeText={setName}
                  placeholder="F.eks. Bestemors Pannekaker"
                />
              </View>

              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-[10px] font-black text-gray-500 uppercase mb-2 ml-2">Porsjoner</Text>
                  <GlassInput
                    value={servings}
                    onChangeText={setServings}
                    keyboardType="numeric"
                    textAlign="center"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-black text-gray-500 uppercase mb-2 ml-2">Tid (min)</Text>
                  <GlassInput
                    value={prepTime}
                    onChangeText={setPrepTime}
                    keyboardType="numeric"
                    textAlign="center"
                  />
                </View>
              </View>

              <View>
                <Text className="text-[10px] font-black text-gray-500 uppercase mb-2 ml-2">Tagger (komma-separert)</Text>
                <GlassInput
                  value={tags}
                  onChangeText={setTags}
                  placeholder="F.eks. Raskt, Barn, Fisk"
                />
              </View>

              <View>
                <Text className="text-[10px] font-black text-gray-500 uppercase mb-3 ml-2">Vanskelighetsgrad</Text>
                <View className="flex-row gap-2">
                  {(['Enkel', 'Middels', 'Avansert'] as const).map((level) => (
                    <TouchableOpacity
                      key={level}
                      onPress={() => setDifficulty(level)}
                      className={`flex-1 py-3 rounded-xl border outline-none items-center justify-center ${difficulty === level ? 'bg-indigo-600 border-indigo-500 shadow-md shadow-indigo-200' : 'bg-white/40 border-white/60'}`}
                      activeOpacity={0.7}
                    >
                      <Text className={`font-black text-[10px] uppercase tracking-widest ${difficulty === level ? 'text-white' : 'text-gray-500'}`}>{level}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </GlassCard>

          {/* Ingredients */}
          <GlassCard className="mb-6">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Ingredienser</Text>
              <GlassButton
                variant="ghost"
                icon={<Plus size={14} color="#4F46E5" />}
                title="Legg til"
                onPress={addIngredient}
                className="py-1 px-3"
              />
            </View>

            <View className="space-y-3">
              {ingredients.map((ing, idx) => (
                <View key={idx} className="flex-row gap-2 items-center">
                  <TextInput
                    className="flex-[2] bg-white/40 border border-white/60 shadow-sm rounded-xl p-3 text-gray-900 text-sm font-bold"
                    placeholder="Vare"
                    placeholderTextColor="#9CA3AF"
                    value={ing.name}
                    onChangeText={(t) => updateIngredient(idx, 'name', t)}
                  />
                  <TextInput
                    className="flex-1 bg-white/40 border border-white/60 shadow-sm rounded-xl p-3 text-indigo-600 text-center text-sm font-black"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    value={ing.amount?.toString() || ''}
                    onChangeText={(t) => updateIngredient(idx, 'amount', t)}
                    keyboardType="numeric"
                  />
                  <UnitPicker
                    value={ing.unit}
                    onChange={(unit) => updateIngredient(idx, 'unit', unit)}
                    className="w-20 bg-white/40"
                  />
                  <TouchableOpacity onPress={() => removeIngredient(idx)} className="p-2 bg-red-50 rounded-xl border border-red-100">
                    <X size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {ingredients.length === 0 && (
                <Text className="text-center text-gray-400 text-xs font-bold py-4 italic">Ingen ingredienser lagt til enda.</Text>
              )}
            </View>
          </GlassCard>

          {/* Instructions */}
          <GlassCard className="mb-6">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Fremgangsmåte</Text>
              <GlassButton
                variant="ghost"
                icon={<Plus size={14} color="#4F46E5" />}
                title="Legg til steg"
                onPress={addInstruction}
                className="py-1 px-3"
              />
            </View>

            <View className="space-y-4">
              {instructions.map((inst, idx) => (
                <View key={idx} className="flex-row gap-3 items-start">
                  <View className="mt-2 w-8 h-8 rounded-xl bg-indigo-600 items-center justify-center shadow-md shadow-indigo-200">
                    <Text className="text-white font-black text-sm">{idx + 1}</Text>
                  </View>
                  <TextInput
                    className="flex-1 min-h-[80px] bg-white/40 border border-white/60 shadow-sm rounded-xl p-3 text-gray-700 text-sm font-medium"
                    placeholder={`Steg ${idx + 1}...`}
                    placeholderTextColor="#9CA3AF"
                    multiline
                    value={inst}
                    onChangeText={(t) => updateInstruction(idx, t)}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity onPress={() => removeInstruction(idx)} className="mt-2 p-2 bg-red-50 rounded-xl border border-red-100">
                    <X size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
