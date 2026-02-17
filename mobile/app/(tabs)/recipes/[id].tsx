import { View, Text, Image, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { addPlannedMeal, deletePlannedMeal, getPlannedMealById, getRecipeById, updateMeal, updatePlannedMeal } from '../../../lib/api';
import { useAuth } from '../../../context/auth';
import { Meal, PlannedMeal } from '../../../../src/types';
import { Clock, Users, Utensils, CircleDollarSign, Calendar, X, Star, Minus, Plus, Flame, ChefHat, Edit, Trash2, Save } from 'lucide-react-native';
import { format, addDays, startOfToday } from 'date-fns';
import { nb } from 'date-fns/locale';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import UnitPicker from '../../../components/UnitPicker';

export default function RecipeDetail() {
  const params = useLocalSearchParams();
  const id = params.id;
  const planningDate = params.planningDate as string;
  const plannedId = params.plannedId as string | undefined;

  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Meal | null>(null);
  const [plannedMeal, setPlannedMeal] = useState<PlannedMeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDateModalVisible, setDateModalVisible] = useState(false);
  const [currentServings, setCurrentServings] = useState(4);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editServings, setEditServings] = useState(4);
  const [editIngredients, setEditIngredients] = useState<{ name: string; amount: number | null; unit: string }[]>([]);
  const [isCooked, setIsCooked] = useState(false);
  const [cookMode, setCookMode] = useState(false);
  const router = useRouter();
  const [ingredientsY, setIngredientsY] = useState(0);
  const [instructionsY, setInstructionsY] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    async function loadRecipe() {
      if (typeof id === 'string') {
        const data = await getRecipeById(id);
        setRecipe(data);
        if (data && !plannedId) {
          setCurrentServings(data.servings || 4);
        }
      }
      setLoading(false);
    }
    loadRecipe();
  }, [id, plannedId]);

  useEffect(() => {
    async function loadPlanned() {
      if (!plannedId) return;
      const data = await getPlannedMealById(plannedId);
      if (data) {
        setPlannedMeal(data);
        setEditNotes(data.notes || '');
        setEditServings(data.plannedServings || 4);
        setEditIngredients(data.ingredients || []);
        setCurrentServings(data.plannedServings || 4);
        setIsCooked(data.isCooked || false);
      }
    }
    loadPlanned();
  }, [plannedId]);

  useEffect(() => {
    return () => {
      if (cookMode) {
        deactivateKeepAwake();
      }
    };
  }, [cookMode]);

  const handleAddToPlan = async (dateStr: string) => {
      if (!user || !recipe) return;
      try {
          if (plannedId) {
            await updatePlannedMeal(plannedId, {
                date: dateStr,
                mealId: recipe.id,
                mealName: recipe.name,
                imageUrl: recipe.imageUrl || null,
                plannedServings: currentServings,
                ingredients: recipe.ingredients || [],
                scaledIngredients: recipe.ingredients || [],
                instructions: recipe.instructions || [],
                prepTime: recipe.prepTime || null,
                costEstimate: recipe.costEstimate || null,
            });
          } else {
            await addPlannedMeal(user.uid, recipe, dateStr);
          }
          setDateModalVisible(false);
          Alert.alert('Suksess', plannedId ? 'Måltidet er byttet ut!' : 'Lagt til i planen', [
              { text: 'OK', onPress: () => {
                  if (planningDate || plannedId) {
                      router.dismissAll();
                  }
              }}
          ]);
      } catch {
          Alert.alert('Feil', 'Kunne ikke legge til måltidet');
      }
  };

  const toggleIngredientCheck = (index: number) => {
    const next = new Set(checkedIngredients);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setCheckedIngredients(next);
  };

  const handleRate = async (rating: number) => {
    if (!recipe) return;
    try {
      await updateMeal(recipe.id, { rating });
      setRecipe({ ...recipe, rating });
    } catch {
      Alert.alert('Feil', 'Kunne ikke gi vurdering');
    }
  };

  const handleSavePlanChanges = async () => {
    if (!plannedMeal) return;
    try {
      await updatePlannedMeal(plannedMeal.id, {
        notes: editNotes,
        plannedServings: editServings,
        ingredients: editIngredients,
        scaledIngredients: editIngredients
      });
      setPlannedMeal({ ...plannedMeal, notes: editNotes, plannedServings: editServings, ingredients: editIngredients });
      setCurrentServings(editServings);
      setIsEditing(false);
    } catch {
      Alert.alert('Feil', 'Kunne ikke oppdatere planen');
    }
  };

  const handleEnterEdit = () => {
    setIsEditing(true);
    if (editIngredients.length === 0) {
      setEditIngredients(plannedMeal?.ingredients || recipe?.ingredients || []);
    }
  };

  const updateIngredient = (index: number, field: 'name' | 'amount' | 'unit', value: string) => {
    const next = [...editIngredients];
    if (field === 'amount') {
      next[index] = { ...next[index], amount: value ? Number(value) : null };
    } else {
      next[index] = { ...next[index], [field]: value };
    }
    setEditIngredients(next);
  };

  const addIngredient = () => {
    setEditIngredients([...editIngredients, { name: '', amount: null, unit: 'stk' }]);
  };

  const removeIngredient = (index: number) => {
    setEditIngredients(editIngredients.filter((_, i) => i !== index));
  };

  const handleMarkCooked = async () => {
    if (!plannedMeal || !recipe) return;
    try {
      const next = !isCooked;
      await updatePlannedMeal(plannedMeal.id, { isCooked: next });
      if (next) {
        await updateMeal(recipe.id, { lastCooked: new Date().toISOString() });
      }
      setIsCooked(next);
    } catch {
      Alert.alert('Feil', 'Kunne ikke oppdatere status');
    }
  };

  const handleRemoveFromPlan = async () => {
    if (!plannedMeal) return;
    try {
      await deletePlannedMeal(plannedMeal.id);
      router.push('/(tabs)/');
    } catch {
      Alert.alert('Feil', 'Kunne ikke fjerne fra plan');
    }
  };

  const toggleCookMode = async () => {
    try {
      if (cookMode) {
        deactivateKeepAwake();
        setCookMode(false);
      } else {
        activateKeepAwake();
        setCookMode(true);
      }
    } catch {
      Alert.alert('Feil', 'Kokemodus er ikke støttet');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text>Fant ikke oppskriften</Text>
      </View>
    );
  }

  const isPlannedMode = !!plannedMeal;
  const baseServings = isPlannedMode ? (plannedMeal?.plannedServings || 4) : (recipe.servings || 4);
  const scaleFactor = currentServings / baseServings;
  const baseIngredients = isPlannedMode ? (plannedMeal?.ingredients || recipe.ingredients) : recipe.ingredients;
  const displayedIngredients = baseIngredients.map((ing) => ({
    ...ing,
    amount: ing.amount ? Number((ing.amount * scaleFactor).toFixed(1)) : null
  }));

  return (
    <View className="flex-1 bg-white">
      {/* Custom header - floating over image */}
      <View className="absolute top-0 left-0 right-0 z-20 flex-row justify-between items-center px-5 pt-16 pb-3">
        <TouchableOpacity
            onPress={() => router.back()}
            className="bg-white/90 p-3 rounded-2xl shadow-sm"
        >
            <X size={20} color="#1F2937" />
        </TouchableOpacity>
        {user && recipe.createdBy?.id === user.uid && !isPlannedMode && (
          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/recipes/edit/${recipe.id}`)}
            className="bg-white/90 p-3 rounded-2xl shadow-sm"
          >
            <Edit size={20} color="#4F46E5" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image — shorter to give more room */}
        <View className="relative h-72 w-full">
          {recipe.imageUrl ? (
            <Image
              source={{ uri: recipe.imageUrl }}
              className="w-full h-full bg-gray-100"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full bg-indigo-50 items-center justify-center">
               <ChefHat size={80} color="#C7D2FE" />
            </View>
          )}
          <View className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
        </View>

        {/* Full-width content — no card wrapper */}
        <View className="px-5 pt-6 pb-4">
          {/* Title + Rating */}
          <View className="flex-row justify-between items-start mb-5">
              <View className="flex-1 mr-3">
                  <Text className="text-2xl font-black text-gray-900 leading-tight">
                      {recipe.name}
                  </Text>
              </View>
              <TouchableOpacity
                  onPress={() => handleRate((recipe.rating || 0) + 1)}
                  className="bg-amber-50 px-3 py-1.5 rounded-xl items-center border border-amber-100"
              >
                  <Star size={16} color="#F59E0B" fill={recipe.rating ? "#F59E0B" : "transparent"} />
                  <Text className="text-amber-700 font-black text-xs mt-0.5">{recipe.rating?.toFixed(1) || '0.0'}</Text>
              </TouchableOpacity>
          </View>

          {/* Quick nav tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
            <View className="flex-row items-center gap-x-2">
              <TouchableOpacity
                onPress={() => scrollRef.current?.scrollTo({ y: ingredientsY + 240, animated: true })}
                className="px-4 py-2 rounded-full bg-gray-50 border border-gray-100"
                activeOpacity={0.7}
              >
                <Text className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ingredienser</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => scrollRef.current?.scrollTo({ y: instructionsY + 240, animated: true })}
                className="px-4 py-2 rounded-full bg-gray-50 border border-gray-100"
                activeOpacity={0.7}
              >
                <Text className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Fremgangsmåte</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleCookMode}
                className={`flex-row items-center px-4 py-2 rounded-full border ${cookMode ? 'bg-amber-100 border-amber-200' : 'bg-gray-50 border-gray-100'}`}
                activeOpacity={0.7}
              >
                <Flame size={13} color={cookMode ? '#D97706' : '#9CA3AF'} />
                <Text className={`ml-1.5 text-[10px] font-black uppercase tracking-widest ${cookMode ? 'text-amber-700' : 'text-gray-500'}`}>
                    Kokemodus
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Stats row — compact */}
          <View className="flex-row justify-between mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <View className="items-center flex-1">
              <Clock size={18} color="#6366F1" />
              <Text className="font-black text-gray-900 mt-1">{recipe.prepTime || '-'}m</Text>
              <Text className="text-[9px] text-gray-400 font-bold uppercase">Tid</Text>
            </View>
            <View className="items-center flex-1 border-x border-gray-200/50">
              <Users size={18} color="#6366F1" />
              <Text className="font-black text-gray-900 mt-1">{currentServings || '-'}</Text>
              <Text className="text-[9px] text-gray-400 font-bold uppercase">Porsjoner</Text>
            </View>
            <View className="items-center flex-1">
              <CircleDollarSign size={18} color="#6366F1" />
              <Text className="font-black text-gray-900 mt-1">{recipe.costEstimate ? `${recipe.costEstimate}kr` : '-'}</Text>
              <Text className="text-[9px] text-gray-400 font-bold uppercase">Pris</Text>
            </View>
          </View>

          {/* Planned mode badge */}
          {isPlannedMode && (
            <View className="flex-row items-center justify-between mb-6 bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-200">
              <View className="flex-row items-center">
                <View className={`w-2.5 h-2.5 rounded-full mr-2.5 ${isCooked ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <Text className="text-white font-black uppercase tracking-widest text-[10px]">
                  {isCooked ? 'Middag er servert!' : 'Planlagt til middag'}
                </Text>
              </View>
              <TouchableOpacity
                  onPress={handleMarkCooked}
                  className={`px-3 py-1.5 rounded-xl ${isCooked ? 'bg-white/20' : 'bg-white shadow-sm'}`}
                  activeOpacity={0.8}
              >
                <Text className={`text-[10px] font-black uppercase tracking-widest ${isCooked ? 'text-white' : 'text-indigo-600'}`}>
                  {isCooked ? 'Ikke kokt' : 'Marker som kokt'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Servings adjuster */}
          {!isEditing && (
            <View className="flex-row items-center justify-between mb-6 bg-gray-50 px-5 py-4 rounded-2xl border border-gray-100">
              <View>
                  <Text className="text-gray-900 font-black text-sm">Porsjoner</Text>
                  <Text className="text-[10px] text-gray-400 font-bold">Juster ingredienser</Text>
              </View>
              <View className="flex-row items-center gap-x-4">
                <TouchableOpacity
                  onPress={() => setCurrentServings(Math.max(1, currentServings - 1))}
                  className="w-10 h-10 rounded-xl bg-white items-center justify-center shadow-sm border border-gray-100"
                  activeOpacity={0.7}
                >
                  <Minus size={18} color="#4F46E5" strokeWidth={3} />
                </TouchableOpacity>
                <Text className="text-xl font-black text-gray-900 w-6 text-center">{currentServings}</Text>
                <TouchableOpacity
                  onPress={() => setCurrentServings(currentServings + 1)}
                  className="w-10 h-10 rounded-xl bg-white items-center justify-center shadow-sm border border-gray-100"
                  activeOpacity={0.7}
                >
                  <Plus size={18} color="#4F46E5" strokeWidth={3} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Ingredients */}
          <View className="mb-8" onLayout={(e) => setIngredientsY(e.nativeEvent.layout.y)}>
            <View className="flex-row items-center justify-between mb-5">
              <View className="flex-row items-center">
                  <View className="w-9 h-9 rounded-xl bg-indigo-50 items-center justify-center mr-3 border border-indigo-100">
                      <Utensils size={18} color="#4F46E5" />
                  </View>
                  <Text className="text-xl font-black text-gray-900 tracking-tight uppercase">Ingredienser</Text>
              </View>
              {isEditing ? (
                  <TouchableOpacity onPress={addIngredient} className="bg-indigo-600 px-3 py-1.5 rounded-lg shadow-sm">
                      <Plus size={14} color="white" />
                  </TouchableOpacity>
              ) : (
                  <View className="bg-indigo-50 px-2.5 py-1 rounded-lg">
                      <Text className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                          {displayedIngredients.length} varer
                      </Text>
                  </View>
              )}
            </View>

            <View className="gap-y-2">
              {isEditing ? (
                  editIngredients.map((ing, idx) => (
                      <View key={idx} className="flex-row gap-x-1.5 items-center bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                          <TextInput
                              className="flex-[2] h-10 px-3 font-bold text-gray-900 text-sm"
                              placeholder="Vare"
                              value={ing.name}
                              onChangeText={(t) => updateIngredient(idx, 'name', t)}
                          />
                          <TextInput
                              className="w-14 h-10 px-1 font-black text-indigo-600 text-center text-sm"
                              placeholder="0"
                              value={ing.amount?.toString() || ''}
                              onChangeText={(t) => updateIngredient(idx, 'amount', t)}
                              keyboardType="numeric"
                          />
                          <UnitPicker
                              value={ing.unit}
                              onChange={(unit) => updateIngredient(idx, 'unit', unit)}
                          />
                          <TouchableOpacity onPress={() => removeIngredient(idx)} className="p-1.5 bg-red-50 rounded-lg">
                              <X size={14} color="#EF4444" />
                          </TouchableOpacity>
                      </View>
                  ))
              ) : (
                  displayedIngredients.map((ing, idx) => (
                  <TouchableOpacity
                      key={idx}
                      onPress={() => toggleIngredientCheck(idx)}
                      activeOpacity={0.6}
                      className={`flex-row justify-between items-center py-3.5 px-4 rounded-xl border ${
                          checkedIngredients.has(idx)
                          ? 'bg-gray-50/50 border-transparent opacity-50'
                          : 'bg-white border-gray-100'
                      }`}
                  >
                      <Text className={`text-gray-700 flex-1 font-bold text-base ${checkedIngredients.has(idx) ? 'line-through text-gray-400' : ''}`}>
                          {ing.name}
                      </Text>
                      <View className="bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                          <Text className="text-gray-900 font-black text-xs uppercase">
                              {ing.amount} {ing.unit}
                          </Text>
                      </View>
                  </TouchableOpacity>
                  ))
              )}
            </View>
          </View>

          {/* Instructions */}
          <View onLayout={(e) => setInstructionsY(e.nativeEvent.layout.y)}>
            <View className="flex-row items-center mb-6">
               <View className="w-9 h-9 rounded-xl bg-indigo-50 items-center justify-center mr-3 border border-indigo-100">
                  <ChefHat size={18} color="#4F46E5" />
               </View>
               <Text className="text-xl font-black text-gray-900 tracking-tight uppercase">Steg for steg</Text>
            </View>

            <View className="gap-y-6">
              {recipe.instructions.map((step, idx) => (
                <View key={idx} className="flex-row gap-x-4">
                  <View className="items-center">
                      <View className="w-10 h-10 rounded-xl bg-indigo-600 items-center justify-center z-10 shadow-md shadow-indigo-200">
                          <Text className="text-white font-black text-lg">{idx + 1}</Text>
                      </View>
                      {idx !== recipe.instructions.length - 1 && (
                          <View className="w-0.5 flex-1 bg-indigo-50 my-1.5 rounded-full" />
                      )}
                  </View>
                  <View className="flex-1 pt-0.5 pb-4">
                      <Text className="text-gray-700 leading-relaxed text-base font-medium">{step}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Planned mode action buttons */}
          {isPlannedMode && (
            <View className="mt-8 gap-y-3">
              {isEditing ? (
                <View className="flex-row gap-x-3">
                  <TouchableOpacity
                      onPress={handleSavePlanChanges}
                      activeOpacity={0.8}
                      className="flex-[2] bg-indigo-600 py-4 rounded-2xl items-center shadow-lg shadow-indigo-200"
                  >
                    <Save size={18} color="white" className="mb-1" />
                    <Text className="text-white font-black uppercase tracking-widest text-xs">Lagre plan</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                      onPress={() => setIsEditing(false)}
                      activeOpacity={0.7}
                      className="flex-1 bg-gray-100 py-4 rounded-2xl items-center"
                  >
                    <X size={18} color="#4B5563" className="mb-1" />
                    <Text className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Avbryt</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row gap-x-3">
                  <TouchableOpacity
                      onPress={handleEnterEdit}
                      activeOpacity={0.8}
                      className="flex-[2] bg-white border border-gray-200 py-4 rounded-2xl items-center"
                  >
                    <Edit size={18} color="#4B5563" className="mb-1" />
                    <Text className="text-gray-700 font-black uppercase tracking-widest text-[10px]">Rediger plan</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                      onPress={handleRemoveFromPlan}
                      activeOpacity={0.7}
                      className="flex-1 bg-red-50 border border-red-100 py-4 rounded-2xl items-center"
                  >
                    <Trash2 size={18} color="#EF4444" className="mb-1" />
                    <Text className="text-red-600 font-black uppercase tracking-widest text-[10px]">Fjern</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA — add to plan */}
      {!isPlannedMode && (
        <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-white/95 border-t border-gray-200">
          <TouchableOpacity
            onPress={() => planningDate ? handleAddToPlan(planningDate) : setDateModalVisible(true)}
            className="bg-indigo-600 py-4 rounded-2xl flex-row justify-center items-center shadow-lg shadow-indigo-200"
            activeOpacity={0.9}
          >
            <Calendar size={20} color="white" />
            <Text className="text-white font-black text-sm uppercase tracking-widest ml-3">
              {planningDate ? `Planlegg for ${format(new Date(planningDate), 'd. MMM', { locale: nb })}` : 'Legg til i ukeplanen'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Date picker modal */}
      <Modal
        visible={isDateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDateModalVisible(false)}
      >
          <View className="flex-1 justify-end bg-black/50 p-4 pb-10">
              <View className="bg-white rounded-[40px] p-8 shadow-2xl">
                  <View className="flex-row justify-between items-center mb-8">
                      <View>
                        <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Planlegg måltid</Text>
                        <Text className="text-2xl font-black text-gray-900 tracking-tight">Velg dato</Text>
                      </View>
                      <TouchableOpacity onPress={() => setDateModalVisible(false)} className="bg-gray-50 p-2.5 rounded-full border border-gray-100">
                          <X size={20} color="#6B7280" />
                      </TouchableOpacity>
                  </View>

                  <View className="gap-y-2 mb-4">
                      {Array.from({ length: 7 }).map((_, i) => {
                          const date = addDays(startOfToday(), i);
                          const dateStr = format(date, 'yyyy-MM-dd');
                          return (
                              <TouchableOpacity
                                  key={i}
                                  onPress={() => handleAddToPlan(dateStr)}
                                  className="flex-row items-center p-4 bg-gray-50 rounded-2xl border border-gray-100"
                                  activeOpacity={0.7}
                              >
                                  <Calendar size={18} color="#4F46E5" />
                                  <Text className="ml-4 font-black text-gray-900 text-base flex-1">
                                      {i === 0 ? 'I dag' : i === 1 ? 'I morgen' : format(date, 'EEEE', { locale: nb })}
                                  </Text>
                                  <Text className="text-gray-400 font-black text-xs uppercase tracking-widest">
                                      {format(date, 'd. MMM', { locale: nb })}
                                  </Text>
                              </TouchableOpacity>
                          );
                      })}
                  </View>
              </View>
          </View>
      </Modal>
    </View>
  );
}
