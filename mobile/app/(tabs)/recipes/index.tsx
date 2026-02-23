import { View, Text, FlatList, ActivityIndicator, TextInput, TouchableOpacity, Modal, ScrollView, Alert, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/auth';
import { getUserRecipes, getCupboardItems } from '../../../lib/api';
import { Meal } from '../../../../src/types';
import { RecipeCard } from '../../../components/RecipeCard';
import { Search, Plus, Camera, ChefHat, Calendar, Filter, X } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { generateRecipeFromImageMobile, generateRecipeFromTextMobile } from '../../../lib/gemini-mobile';
import { createMeal } from '../../../lib/api';
import { nb } from 'date-fns/locale';
import { format } from 'date-fns';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassScreen } from '../../../components/ui/GlassScreen';
import { GlassHeader } from '../../../components/ui/GlassHeader';
import { GlassCard } from '../../../components/ui/GlassCard';
import { GlassButton } from '../../../components/ui/GlassButton';
import { GlassInput } from '../../../components/ui/GlassInput';

export default function RecipesList() {
  const insets = useSafeAreaInsets();
  const { user, householdId } = useAuth();
  const [recipes, setRecipes] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [cupboardItems, setCupboardItems] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // AI Input State
  const [textInputVisible, setTextInputVisible] = useState(false);
  const [aiText, setAiText] = useState('');

  const router = useRouter();
  const params = useLocalSearchParams();
  const planningDate = params.planningDate as string;

  useEffect(() => {
    fetchRecipes();
    fetchCupboard();
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

  async function fetchCupboard() {
    if (!user || !householdId) return;
    try {
      const items = await getCupboardItems(user.uid, householdId);
      const names = new Set(items.map(item => item.ingredientName.toLowerCase()));
      setCupboardItems(names);
    } catch (error) {
      console.error('Error fetching cupboard:', error);
    }
  }

  const checkCanCook = (recipe: Meal): boolean => {
    if (!recipe.ingredients || recipe.ingredients.length === 0) return false;
    let matchCount = 0;
    recipe.ingredients.forEach(ing => {
      if (cupboardItems.has(ing.name.toLowerCase())) {
        matchCount++;
      }
    });
    return matchCount >= (recipe.ingredients.length / 2);
  };

  const getPantryCoverage = (recipe: Meal): number => {
    if (!recipe.ingredients || recipe.ingredients.length === 0) return 0;
    let matchCount = 0;
    recipe.ingredients.forEach(ing => {
      if (cupboardItems.has(ing.name.toLowerCase())) {
        matchCount++;
      }
    });
    return Math.round((matchCount / recipe.ingredients.length) * 100);
  };

  const filters = [
    { id: 'quick', label: 'Raskt (< 30m)', check: (m: Meal) => (m.prepTime || 0) <= 30 },
    { id: 'few-ingredients', label: 'Enkelt (< 6 ingredienser)', check: (m: Meal) => (m.ingredients?.length || 0) < 6 },
    { id: 'family', label: 'Familie (4+ pers)', check: (m: Meal) => (m.servings || 0) >= 4 },
    { id: 'pantry', label: 'Bruk lager', check: (m: Meal) => checkCanCook(m) },
  ];

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter
      ? filters.find(f => f.id === activeFilter)?.check(recipe)
      : true;
    return matchesSearch && matchesFilter;
  });

  const handleRecipePress = (recipe: Meal) => {
    if (planningDate) {
      router.push(`/(tabs)/recipes/${recipe.id}?planningDate=${planningDate}`);
    } else {
      router.push(`/(tabs)/recipes/${recipe.id}`);
    }
  };

  const handleManualCreate = () => {
    setShowCreateOptions(false);
    router.push('/(tabs)/recipes/create');
  };

  const handleCameraCreate = async () => {
    setShowCreateOptions(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Tilgang kreves', 'Vi trenger tilgang til kameraet for å skanne oppskrifter.');

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
      } catch {
        Alert.alert('Feil', 'Kunne ikke generere oppskrift fra bilde');
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
    } catch {
      Alert.alert('Feil', 'Kunne ikke generere oppskrift');
    } finally {
      setAiLoading(false);
    }
  };

  const saveAiRecipe = async (data: Partial<Meal>) => {
    if (!user || !householdId) return;
    try {
      await createMeal({
        ...data,
        imageUrl: null,
        costEstimate: null,
        createdBy: { id: user.uid, name: user.email || 'Bruker' }
      } as Omit<Meal, 'id'>, householdId);
      Alert.alert('Suksess', 'Oppskriften er lagret!');
      fetchRecipes();
    } catch (e) {
      console.error(e);
      Alert.alert('Feil', 'Kunne ikke lagre oppskriften');
    }
  };

  return (
    <View className="flex-1 text-white">
      {/* Absolute Frosted Header */}
      <View style={{ paddingTop: insets.top }} className="absolute top-0 left-0 right-0 z-50 overflow-hidden rounded-b-[32px] border-b border-white/40 shadow-sm">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={StyleSheet.absoluteFill} className="bg-white/20" />

        <GlassHeader
          title="Oppskrifter"
          subtitle={`${recipes.length} oppskrifter`}
          transparent
          rightAction={
            <GlassButton variant="primary" icon={<Plus size={20} color="white" />} onPress={() => setShowCreateOptions(true)} />
          }
        />

        {/* Search */}
        <View className="px-6 py-4 border-t border-white/30">
          <GlassInput
            leftIcon={<Search size={18} color="#6B7280" />}
            placeholder="Søk i oppskrifter..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            rightIcon={searchQuery.length > 0 ? <X size={18} color="#6B7280" /> : undefined}
            onRightIconPress={() => setSearchQuery('')}
            containerStyle={{ marginBottom: 0 }}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-4">
          <View className="flex-row items-center gap-2 pr-8">
            <View className="flex-row items-center bg-black/5 px-3 py-2.5 rounded-[18px] mr-1 border border-white/30 z-10 h-11">
              <Filter size={14} color="#4B5563" />
              <Text className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Filter</Text>
            </View>
            {filters.map(filter => (
              <TouchableOpacity
                key={filter.id}
                onPress={() => setActiveFilter(activeFilter === filter.id ? null : filter.id)}
                className={`px-5 py-2.5 rounded-[18px] border outline-none h-11 justify-center ${activeFilter === filter.id
                  ? 'bg-indigo-600/80 border-indigo-400/50 shadow-md shadow-indigo-200'
                  : 'bg-white/40 border-white/60'
                  }`}
                activeOpacity={0.7}
              >
                <Text className={`text-xs font-black uppercase tracking-wider ${activeFilter === filter.id ? 'text-white' : 'text-gray-700'}`}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Planning Mode Banner */}
      {planningDate && (
        <View className="bg-indigo-600/80 relative overflow-hidden px-6 py-4 mt-[230px] mx-5 rounded-2xl border border-indigo-400/50 shadow-lg flex-row items-center justify-between">
          <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
          <View className="flex-row items-center relative z-10 w-3/4">
            <Calendar size={18} color="white" />
            <Text className="ml-3 text-white font-black uppercase tracking-widest text-[10px]" numberOfLines={1}>Planlegger for {format(new Date(planningDate), 'EEEE d. MMM', { locale: nb })}</Text>
          </View>
          <TouchableOpacity onPress={() => router.setParams({ planningDate: '' })} className="bg-white/20 border border-white/30 px-3 py-1.5 rounded-lg relative z-10">
            <Text className="text-white text-[10px] font-black uppercase tracking-widest">Avbryt</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* AI Loading Overlay */}
      {aiLoading && (
        <View className="absolute inset-0 bg-white/90 z-50 justify-center items-center">
          <View className="bg-indigo-50 p-10 rounded-[40px] items-center shadow-2xl shadow-indigo-100 border border-indigo-100">
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text className="mt-6 font-black text-indigo-600 uppercase tracking-widest text-xs">AI jobber med saken...</Text>
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
            <RecipeCard
              recipe={item}
              onPress={() => handleRecipePress(item)}
              pantryReady={checkCanCook(item)}
              pantryCoverage={getPantryCoverage(item)}
            />
          )}
          contentContainerStyle={{ paddingTop: insets.top + (planningDate ? 20 : 230), padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center mt-20 opacity-30">
              <ChefHat size={80} color="#9CA3AF" />
              <Text className="text-gray-500 font-black uppercase tracking-widest mt-4">Ingen oppskrifter</Text>
            </View>
          }
        />
      )}

      {/* Create Options Modal */}
      <Modal visible={showCreateOptions} transparent animationType="fade">
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowCreateOptions(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <View className="bg-white/95 rounded-t-[40px] p-8 shadow-2xl">
            <View className="w-12 h-1.5 bg-gray-200 rounded-full self-center mb-8" />
            <Text className="text-2xl font-black mb-10 text-center text-gray-900 uppercase tracking-tight">Ny oppskrift</Text>

            <View className="flex-row justify-around mb-12">
              <TouchableOpacity onPress={handleManualCreate} className="items-center" activeOpacity={0.7}>
                <View className="w-20 h-20 bg-gray-50 rounded-3xl items-center justify-center mb-3 border border-gray-100">
                  <Plus size={32} color="#4B5563" />
                </View>
                <Text className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Manuell</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleCameraCreate} className="items-center" activeOpacity={0.7}>
                <View className="w-20 h-20 bg-indigo-50 rounded-3xl items-center justify-center mb-3 border border-indigo-100 shadow-sm">
                  <Camera size={32} color="#4F46E5" />
                </View>
                <Text className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Skann bilde</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setShowCreateOptions(false); setTextInputVisible(true); }} className="items-center" activeOpacity={0.7}>
                <View className="w-20 h-20 bg-indigo-600 rounded-3xl items-center justify-center mb-3 shadow-xl shadow-indigo-200">
                  <ChefHat size={32} color="white" />
                </View>
                <Text className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Beskriv</Text>
              </TouchableOpacity>
            </View>

            <GlassButton
              title="Avbryt"
              variant="secondary"
              onPress={() => setShowCreateOptions(false)}
              className="w-full"
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Text/URL Input Modal */}
      <Modal visible={textInputVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-center p-4">
          <View className="bg-white/95 rounded-[40px] p-8 shadow-2xl">
            <Text className="text-3xl font-black mb-2 text-gray-900 uppercase tracking-tight">Beskriv retten</Text>
            <Text className="text-gray-400 mb-8 font-bold leading-5">
              Fortell meg hva du vil lage, lim inn en lenke eller en liste med ingredienser.
            </Text>

            <TextInput
              className="bg-gray-50 border border-gray-100 rounded-[24px] p-6 h-48 mb-8 text-gray-900 text-lg font-medium shadow-inner"
              multiline
              textAlignVertical="top"
              placeholder="F.eks. 'Kremet pasta med laks og spinat'..."
              placeholderTextColor="#9CA3AF"
              value={aiText}
              onChangeText={setAiText}
            />

            <View className="flex-row gap-4">
              <GlassButton
                title="Avbryt"
                variant="secondary"
                onPress={() => setTextInputVisible(false)}
                className="flex-1"
              />
              <GlassButton
                title="Generer"
                variant="primary"
                onPress={handleTextCreate}
                className="flex-[1.5]"
              />
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}
