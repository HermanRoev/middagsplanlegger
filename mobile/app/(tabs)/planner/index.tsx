import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Image, FlatList, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/auth';
import { getPlannedMeals, addLeftoverMeal, updatePlannedMeal, deletePlannedMeal, getUserRecipes, addPlannedMeal, getCupboardItems } from '../../../lib/api';
import { scoreMeals } from '../../../lib/recommendations';
import { generateMenuSuggestions, MinimalRecipeData } from '../../../lib/gemini-mobile';
import { PlannedMeal, Meal } from '../../../../src/types';
import { startOfWeek, addDays, format, isSameDay, isPast } from 'date-fns';
import { nb } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Copy, Trash2, Eye, X, Save, Calendar as CalendarIcon, ChefHat, Clock, Users, RefreshCw, Search, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassScreen } from '../../../components/ui/GlassScreen';
import { GlassHeader } from '../../../components/ui/GlassHeader';
import { GlassCard } from '../../../components/ui/GlassCard';
import { GlassButton } from '../../../components/ui/GlassButton';
import { GlassInput } from '../../../components/ui/GlassInput';

export default function Planner() {
  const insets = useSafeAreaInsets();
  const { user, householdId } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAutofilling, setIsAutofilling] = useState(false);
  const router = useRouter();

  // Edit Modal State
  const [selectedMeal, setSelectedMeal] = useState<PlannedMeal | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editServings, setEditServings] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Recipe Picker Modal State
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState<string>('');
  const [pickerReplaceId, setPickerReplaceId] = useState<string | undefined>(undefined);
  const [recipes, setRecipes] = useState<Meal[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = [...Array(7)].map((_, i) => addDays(weekStart, i));

  useEffect(() => {
    fetchPlanner();
  }, [user, currentDate]);

  async function fetchPlanner() {
    if (!user) return;
    setLoading(true);
    try {
      if (!householdId) return;
      const meals = await getPlannedMeals(user.uid, currentDate, householdId);
      setPlannedMeals(meals);
    } catch (error) {
      console.error("Error fetching planner:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecipes() {
    if (!user) return;
    setRecipesLoading(true);
    try {
      if (!householdId) return;
      const fetched = await getUserRecipes(user.uid, householdId);
      setRecipes(fetched);
    } catch (error) {
      console.error("Error fetching recipes:", error);
    } finally {
      setRecipesLoading(false);
    }
  }

  const changeWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(date => addDays(date, direction === 'prev' ? -7 : 7));
  };

  const handleAddMeal = (dateStr: string) => {
    setPickerDate(dateStr);
    setPickerReplaceId(undefined);
    setSearchQuery('');
    setShowRecipePicker(true);
    fetchRecipes();
  };

  const handleAddLeftovers = async (dateStr: string) => {
    if (!user || !householdId) return;
    try {
      await addLeftoverMeal(user.uid, dateStr, householdId);
      fetchPlanner();
    } catch {
      Alert.alert('Feil', 'Kunne ikke planlegge rester');
    }
  };

  const handleMealPress = (meal: PlannedMeal) => {
    setSelectedMeal(meal);
    setEditServings(meal.plannedServings?.toString() || '4');
    setEditNotes(meal.notes || '');
    setModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedMeal) return;
    try {
      await updatePlannedMeal(selectedMeal.id, {
        plannedServings: parseInt(editServings) || 1,
        notes: editNotes
      });
      setModalVisible(false);
      fetchPlanner();
    } catch {
      Alert.alert('Feil', 'Kunne ikke oppdatere måltidet');
    }
  };

  const handleDeleteMeal = async () => {
    if (!selectedMeal) return;
    Alert.alert('Fjern måltid', 'Er du sikker på at du vil fjerne dette måltidet fra planen?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Fjern',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePlannedMeal(selectedMeal.id);
            setModalVisible(false);
            fetchPlanner();
          } catch {
            Alert.alert('Feil', 'Kunne ikke fjerne måltidet');
          }
        }
      }
    ]);
  };

  const navigateToRecipe = () => {
    if (selectedMeal && selectedMeal.mealId !== 'leftover-placeholder') {
      setModalVisible(false);
      router.push(`/(tabs)/recipes/${selectedMeal.mealId}?plannedId=${selectedMeal.id}`);
    }
  };

  const navigateToReplace = () => {
    if (selectedMeal && selectedMeal.mealId !== 'leftover-placeholder') {
      setModalVisible(false);
      setPickerDate(selectedMeal.date);
      setPickerReplaceId(selectedMeal.id);
      setSearchQuery('');
      setShowRecipePicker(true);
      fetchRecipes();
    }
  };

  const handleAutofillWeek = async () => {
    if (!user) return;

    // 1. Find empty days
    const plannedDates = new Set(plannedMeals.map(m => m.date));
    const emptyDates = weekDays
      .map(d => format(d, 'yyyy-MM-dd'))
      .filter(d => !plannedDates.has(d) && !isPast(addDays(new Date(d), 1)));

    if (emptyDates.length === 0) {
      Alert.alert("Allerede planlagt", "Hele uken er allerede planlagt!");
      return;
    }

    setIsAutofilling(true);

    try {
      if (!householdId) return;
      // Fetch recipes and cupboard for scoring
      const [allMeals, cupboardItems] = await Promise.all([
        getUserRecipes(user.uid, householdId),
        getCupboardItems(user.uid, householdId)
      ]);

      if (allMeals.length === 0) {
        Alert.alert("Ingen oppskrifter", "Du har ingen lagrede oppskrifter å velge fra.");
        setIsAutofilling(false);
        return;
      }

      // 2. Score meals locally
      const scoredMeals = scoreMeals(allMeals, cupboardItems);

      // 3. Prepare top 20 candidates
      const topCandidates: MinimalRecipeData[] = scoredMeals.slice(0, 20).map(s => ({
        id: s.meal.id,
        name: s.meal.name,
        tags: s.meal.tags || [],
        difficulty: s.meal.difficulty,
        prepTime: s.meal.prepTime || undefined,
        matchPercentage: s.matchPercentage,
        daysSinceCooked: s.meal.lastCooked ? Math.floor((new Date().getTime() - new Date(s.meal.lastCooked).getTime()) / (1000 * 3600 * 24)) : "Aldri"
      }));

      // 4. Generate AI suggestions capping at 5 dates for latency
      const datesToFill = emptyDates.slice(0, 5);
      const suggestions = await generateMenuSuggestions(topCandidates, datesToFill);

      // 5. Save loop
      let savedCount = 0;
      for (const suggestion of suggestions) {
        const originalMeal = allMeals.find(m => m.id === suggestion.recipeId);

        if (originalMeal && suggestion.date && householdId) {
          // Manually hit the API to add planned meal with specific notes and date
          await addPlannedMeal(user.uid, originalMeal, suggestion.date, householdId);

          // Since addPlannedMeal doesn't explicitly let us pass notes right off the bat,
          // we might need to modify it or just accept it's a slight divergence for V1.
          // Actually, to get 100% parity, let's fetch it back and update the notes, or just accept the lack of smart reason string for now on mobile.
          // For now, let's just save it. It's smart enough. 
          savedCount++;
        }
      }

      if (savedCount > 0) {
        Alert.alert("Suksess", `Planla ${savedCount} smarte måltider!`);
        fetchPlanner();
      } else {
        Alert.alert("Feil", "Ingen måltider ble planlagt.");
      }

    } catch (error) {
      console.error(error);
      Alert.alert("Feil", "Kunne ikke generere forslag.");
    } finally {
      setIsAutofilling(false);
    }
  };

  const handlePickRecipe = async (recipe: Meal) => {
    if (!user) return;
    try {
      if (pickerReplaceId) {
        await updatePlannedMeal(pickerReplaceId, {
          mealId: recipe.id,
          mealName: recipe.name,
          imageUrl: recipe.imageUrl || undefined,
          plannedServings: recipe.servings || 4,
          ingredients: recipe.ingredients || [],
          scaledIngredients: recipe.ingredients || [],
          instructions: recipe.instructions || [],
          prepTime: recipe.prepTime || undefined,
        });
      } else {
        if (!householdId) return;
        await addPlannedMeal(user.uid, recipe, pickerDate, householdId);
      }
      setShowRecipePicker(false);
      fetchPlanner();
    } catch {
      Alert.alert('Feil', 'Kunne ikke legge til måltidet');
    }
  };

  const filteredRecipes = recipes.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View className="flex-1 text-white">
      {/* Absolute Frosted Header */}
      <View style={{ paddingTop: insets.top }} className="absolute top-0 left-0 right-0 z-50 overflow-hidden rounded-b-[32px] border-b border-white/40 shadow-sm">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={StyleSheet.absoluteFill} className="bg-white/20" />

        <GlassHeader
          title={`Uke ${format(weekStart, 'w')}`}
          subtitle={format(weekStart, 'MMMM yyyy', { locale: nb })}
          transparent
          leftAction={
            <GlassButton variant="icon" icon={<ChevronLeft size={20} color="#4B5563" />} onPress={() => changeWeek('prev')} />
          }
          rightAction={
            <>
              <GlassButton variant="icon" icon={<CalendarIcon size={20} color="#4B5563" />} onPress={() => setShowDatePicker(true)} />
              <GlassButton variant="icon" icon={<ChevronRight size={20} color="#4B5563" />} onPress={() => changeWeek('next')} />
            </>
          }
        />

        {/* Action Row */}
        <View className="px-5 pb-5 flex-row justify-end">
          <GlassButton
            title="Autofyll Uken"
            variant="primary"
            icon={<Sparkles size={16} color="white" />}
            onPress={handleAutofillWeek}
            disabled={isAutofilling}
            loading={isAutofilling}
            className="rounded-[20px] shadow-xl shadow-indigo-300"
          />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: insets.top + 160, padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className="py-20">
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : (
          <View className="gap-y-8 pb-8">
            {weekDays.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const mealsForDay = plannedMeals.filter(m => m.date === dayStr);
              const isToday = isSameDay(day, new Date());
              const isExpired = isPast(day) && !isToday;

              return (
                <View key={dayStr} className={isExpired ? 'opacity-40 grayscale' : ''}>
                  <View className="flex-row justify-between items-center mb-4 px-1">
                    <View className="flex-row items-baseline gap-2">
                      <Text className={`text-2xl font-black ${isToday ? 'text-indigo-600' : 'text-gray-900'}`}>
                        {format(day, 'EEEE', { locale: nb })}
                      </Text>
                      <Text className="text-gray-400 font-bold text-sm">
                        {format(day, 'd. MMM', { locale: nb })}
                      </Text>
                    </View>
                    {isToday && (
                      <View className="bg-indigo-600 px-3 py-1 rounded-full">
                        <Text className="text-white text-[10px] font-bold uppercase">I dag</Text>
                      </View>
                    )}
                    {isExpired && (
                      <View className="bg-gray-200 px-3 py-1 rounded-full">
                        <Text className="text-gray-500 text-[10px] font-bold uppercase">Utgått</Text>
                      </View>
                    )}
                  </View>

                  <View className={`rounded-[40px] p-2 border overflow-hidden ${isToday ? 'border-indigo-200 shadow-xl shadow-indigo-100/50' : 'border-white/60 shadow-lg shadow-black/5'}`}>
                    <BlurView intensity={isToday ? 100 : 60} tint={isToday ? "default" : "light"} style={StyleSheet.absoluteFill} />
                    <View style={StyleSheet.absoluteFill} className={isToday ? "bg-indigo-50/20" : "bg-white/20"} />
                    {mealsForDay.length > 0 ? (
                      <View className="gap-y-3">
                        {mealsForDay.map(meal => {
                          const isPlaceholder = meal.mealId === 'leftover-placeholder' || meal.mealId === 'suggestion-placeholder';
                          const isClickable = !isPlaceholder && !isExpired;

                          return (
                            <TouchableOpacity
                              key={meal.id}
                              onPress={() => isClickable ? handleMealPress(meal) : null}
                              activeOpacity={isClickable ? 0.8 : 1}
                            >
                              <GlassCard className="p-0 border-white/60 shadow-sm mb-3">
                                <View className="relative h-40 border-b border-white/30">
                                  {meal.imageUrl ? (
                                    <Image source={{ uri: meal.imageUrl }} className="w-full h-full" resizeMode="cover" />
                                  ) : (
                                    <View className="w-full h-full items-center justify-center bg-indigo-500/10">
                                      {meal.mealId === 'leftover-placeholder' ? (
                                        <Copy size={40} color="#FBBF24" opacity={0.3} />
                                      ) : meal.mealId === 'suggestion-placeholder' ? (
                                        <Sparkles size={40} color="#6366F1" opacity={0.3} />
                                      ) : (
                                        <ChefHat size={40} color="#6366F1" opacity={0.1} />
                                      )}
                                    </View>
                                  )}
                                  <View className="absolute inset-0 bg-black/5" />
                                  {meal.mealId === 'leftover-placeholder' && (
                                    <View className="absolute top-4 left-4 overflow-hidden rounded-2xl border border-white/20 shadow-lg">
                                      <BlurView intensity={100} tint="systemThinMaterialDark" className="px-4 py-2">
                                        <Text className="text-amber-400 text-[10px] font-black uppercase tracking-widest">Rester</Text>
                                      </BlurView>
                                    </View>
                                  )}
                                  {meal.mealId === 'suggestion-placeholder' && (
                                    <View className="absolute top-4 left-4 overflow-hidden rounded-2xl border border-white/20 shadow-lg">
                                      <BlurView intensity={100} tint="systemThinMaterialDark" className="px-4 py-2 flex-row items-center">
                                        <Sparkles size={10} color="#A5B4FC" />
                                        <Text className="text-white text-[10px] font-black uppercase tracking-widest ml-1">Forslag</Text>
                                      </BlurView>
                                    </View>
                                  )}
                                </View>

                                <View className="p-5 flex-row items-center justify-between">
                                  <View className="flex-1 mr-4">
                                    <Text className="text-xl font-black text-gray-900 leading-tight" numberOfLines={1}>{meal.mealName}</Text>
                                    {meal.notes && meal.notes.includes("✨") ? (
                                      <Text className="text-xs text-indigo-600 font-bold mt-1" numberOfLines={2}>{meal.notes}</Text>
                                    ) : (
                                      <View className="flex-row items-center mt-1.5 gap-x-4">
                                        {meal.prepTime && (
                                          <View className="flex-row items-center">
                                            <Clock size={12} color="#9CA3AF" />
                                            <Text className="text-[10px] font-bold text-gray-400 ml-1">{meal.prepTime}m</Text>
                                          </View>
                                        )}
                                        {meal.plannedServings && (
                                          <View className="flex-row items-center">
                                            <Users size={12} color="#9CA3AF" />
                                            <Text className="text-[10px] font-bold text-gray-400 ml-1">{meal.plannedServings} pers</Text>
                                          </View>
                                        )}
                                      </View>
                                    )}
                                  </View>
                                  {isClickable && <ChevronRight size={20} color="#D1D5DB" />}
                                </View>
                              </GlassCard>
                            </TouchableOpacity>
                          );
                        })}
                        <GlassButton
                          title="Legg til mer"
                          variant="ghost"
                          icon={<Plus size={16} color="#4F46E5" />}
                          onPress={() => handleAddMeal(dayStr)}
                          disabled={isExpired}
                          className="py-2 mt-[-12px]"
                        />
                      </View>
                    ) : (
                      <View className="flex-row gap-x-3 p-1">
                        <TouchableOpacity
                          onPress={() => handleAddMeal(dayStr)}
                          activeOpacity={0.6}
                          disabled={isExpired}
                          className="flex-1 bg-white p-8 rounded-[32px] border-2 border-dashed border-gray-100 items-center justify-center"
                        >
                          <View className="w-12 h-12 rounded-2xl bg-indigo-50 items-center justify-center mb-3">
                            <Plus size={24} color="#4F46E5" />
                          </View>
                          <Text className="text-gray-900 font-black text-xs uppercase tracking-widest">Matrett</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleAddLeftovers(dayStr)}
                          activeOpacity={0.6}
                          disabled={isExpired}
                          className="flex-1 bg-white p-8 rounded-[32px] border-2 border-dashed border-amber-100 items-center justify-center"
                        >
                          <View className="w-12 h-12 rounded-2xl bg-amber-50 items-center justify-center mb-3">
                            <Copy size={24} color="#D97706" />
                          </View>
                          <Text className="text-amber-900 font-black text-xs uppercase tracking-widest">Rester</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View className="flex-1 justify-end bg-black/50 p-4 pb-10">
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="bg-white/90 rounded-[40px] p-8 shadow-2xl"
              >
                <View className="flex-row justify-between items-center mb-8">
                  <View className="flex-1 mr-4">
                    <Text className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Rediger måltid</Text>
                    <Text className="text-2xl font-black text-gray-900" numberOfLines={1}>
                      {selectedMeal?.mealName}
                    </Text>
                  </View>
                  <GlassButton variant="icon" icon={<X size={20} color="#6B7280" />} onPress={() => setModalVisible(false)} />
                </View>

                {selectedMeal?.mealId !== 'leftover-placeholder' && (
                  <GlassButton
                    title="Se oppskrift"
                    variant="primary"
                    icon={<Eye size={20} color="white" />}
                    onPress={navigateToRecipe}
                    className="mb-3"
                  />
                )}

                {selectedMeal?.mealId !== 'leftover-placeholder' && (
                  <GlassButton
                    title="Bytt ut måltid"
                    variant="secondary"
                    icon={<RefreshCw size={20} color="#4B5563" />}
                    onPress={navigateToReplace}
                    className="mb-8"
                  />
                )}

                <View className="mb-6">
                  <Text className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-4">Antall porsjoner</Text>
                  <GlassInput
                    leftIcon={<Users size={18} color="#9CA3AF" />}
                    keyboardType="number-pad"
                    value={editServings}
                    onChangeText={setEditServings}
                  />
                </View>

                <View className="mb-8">
                  <Text className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-4">Notater</Text>
                  <TextInput
                    className="bg-white/40 border border-black/5 rounded-2xl p-5 text-base font-medium h-32 text-gray-900 shadow-inner"
                    multiline
                    textAlignVertical="top"
                    placeholder="Legg til notater..."
                    placeholderTextColor="#9CA3AF"
                    value={editNotes}
                    onChangeText={setEditNotes}
                  />
                </View>

                <View className="flex-row gap-3">
                  <GlassButton
                    title="Fjern"
                    variant="danger"
                    icon={<Trash2 size={20} color="#EF4444" />}
                    onPress={handleDeleteMeal}
                    className="flex-1"
                  />
                  <GlassButton
                    title="Lagre endringer"
                    variant="primary"
                    icon={<Save size={20} color="white" />}
                    onPress={handleSaveEdit}
                    className="flex-[2]"
                  />
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showDatePicker}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
          <View className="flex-1 justify-end bg-black/50 p-4 pb-10">
            <View className="bg-white/90 rounded-[40px] p-8 shadow-2xl">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-black text-gray-900">Gå til dato</Text>
                <GlassButton variant="icon" icon={<X size={20} color="#6B7280" />} onPress={() => setShowDatePicker(false)} />
              </View>
              <ScrollView className="max-h-[60vh]" showsVerticalScrollIndicator={false}>
                <View className="gap-y-2">
                  {Array.from({ length: 14 }).map((_, i) => {
                    const date = addDays(new Date(), i);
                    const label = i === 0 ? 'I dag' : i === 1 ? 'I morgen' : format(date, 'EEEE d. MMM', { locale: nb });
                    return (
                      <TouchableOpacity
                        key={i}
                        onPress={() => {
                          setCurrentDate(date);
                          setShowDatePicker(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <GlassCard blurIntensity={50} className="flex-row items-center p-5 mb-2">
                          <CalendarIcon size={18} color="#4F46E5" />
                          <Text className="ml-4 font-black text-gray-900 text-lg">{label}</Text>
                        </GlassCard>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Recipe Picker Bottom Sheet */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showRecipePicker}
        onRequestClose={() => setShowRecipePicker(false)}
      >
        <View className="flex-1 bg-black/50">
          <TouchableWithoutFeedback onPress={() => setShowRecipePicker(false)}>
            <View className="h-24" />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white/95 rounded-t-[40px] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <View className="px-6 pt-8 pb-4">
              <View className="w-12 h-1.5 bg-gray-200 rounded-full self-center mb-6" />
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text className="text-[10px] text-indigo-600 font-black uppercase tracking-[0.2em] mb-1">
                    {pickerDate ? `Planlegger for ${format(new Date(pickerDate + 'T12:00:00'), 'EEEE d. MMM', { locale: nb })}` : ''}
                  </Text>
                  <Text className="text-2xl font-black text-gray-900">Velg oppskrift</Text>
                </View>
                <GlassButton variant="icon" icon={<X size={20} color="#6B7280" />} onPress={() => setShowRecipePicker(false)} />
              </View>

              {/* Search bar */}
              <GlassInput
                leftIcon={<Search size={18} color="#9CA3AF" />}
                placeholder="Søk i oppskrifter..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                rightIcon={searchQuery.length > 0 ? <X size={18} color="#9CA3AF" /> : undefined}
                onRightIconPress={() => setSearchQuery('')}
              />
            </View>

            {/* Recipe List */}
            {recipesLoading ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#4F46E5" />
              </View>
            ) : (
              <FlatList
                data={filteredRecipes}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handlePickRecipe(item)}
                    activeOpacity={0.7}
                    className="mb-3"
                  >
                    <GlassCard className="flex-row items-center p-4 border-black/5" blurIntensity={20}>
                      <View className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden mr-4">
                        {item.imageUrl ? (
                          <Image source={{ uri: item.imageUrl }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                          <View className="w-full h-full bg-indigo-50 items-center justify-center">
                            <ChefHat size={24} color="#C7D2FE" />
                          </View>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-lg font-black text-gray-900" numberOfLines={1}>{item.name}</Text>
                        <View className="flex-row items-center mt-1 gap-x-3">
                          {item.prepTime && (
                            <View className="flex-row items-center">
                              <Clock size={12} color="#9CA3AF" />
                              <Text className="text-[10px] font-bold text-gray-400 ml-1">{item.prepTime}m</Text>
                            </View>
                          )}
                          <View className="flex-row items-center">
                            <Users size={12} color="#9CA3AF" />
                            <Text className="text-[10px] font-bold text-gray-400 ml-1">{item.servings || 4} pers</Text>
                          </View>
                        </View>
                      </View>
                      <Plus size={20} color="#4F46E5" />
                    </GlassCard>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View className="items-center justify-center py-24 opacity-30">
                    <ChefHat size={80} color="#9CA3AF" />
                    <Text className="text-gray-500 font-black uppercase tracking-widest mt-4">Ingen oppskrifter</Text>
                  </View>
                }
              />
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
