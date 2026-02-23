import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Keyboard, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth';
import { getShoppingList, addManualShoppingItem, toggleShoppingItem, deleteShoppingItem, clearCheckedItems } from '../../lib/api';
import { CheckCircle2, Plus, Trash2, X, Copy, ClipboardList, ShoppingCart } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassScreen } from '../../components/ui/GlassScreen';
import { GlassHeader } from '../../components/ui/GlassHeader';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassInput } from '../../components/ui/GlassInput';

export default function Shop() {
  const insets = useSafeAreaInsets();
  const { user, householdId } = useAuth();
  const [items, setItems] = useState<{ id: string, name: string, amount?: number, unit?: string, checked: boolean, isManual: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Item State
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const staples = ['Melk', 'Brød', 'Egg', 'Smør', 'Ost', 'Kaffe', 'Ris', 'Pasta'];

  useEffect(() => {
    fetchShop();
  }, [user]);

  async function fetchShop() {
    if (!user || !householdId) return;
    try {
      const { manual, planned } = await getShoppingList(user.uid, householdId);

      const manualMapped = manual.map((m: { id: string, name?: string, item?: string, checked?: boolean }) => ({
        id: m.id,
        name: m.name || m.item || 'Ukjent vare',
        checked: m.checked || false,
        isManual: true
      }));

      // Aggregate planned items with the same ingredient+unit to avoid duplicate keys
      const aggregated = new Map<string, { id: string, name: string, amount: number, unit: string, checked: boolean }>();
      planned.forEach((p: { id: string, name: string, amount: number, unit: string, checked?: boolean }) => {
        const existing = aggregated.get(p.id);
        if (existing) {
          existing.amount += p.amount;
          // If any instance is unchecked, the aggregate is unchecked
          if (!p.checked) existing.checked = false;
        } else {
          aggregated.set(p.id, {
            id: p.id,
            name: p.name,
            amount: p.amount,
            unit: p.unit,
            checked: p.checked || false,
          });
        }
      });

      // Filter out fully-checked planned items (already shopped) so they don't reappear
      const plannedMapped = Array.from(aggregated.values())
        .filter(p => !p.checked)
        .map(p => ({
          ...p,
          isManual: false
        }));

      const allItems = [...manualMapped, ...plannedMapped].sort((a, b) => {
        if (a.checked !== b.checked) {
          return Number(a.checked) - Number(b.checked);
        }
        return a.name.localeCompare(b.name, 'no', { sensitivity: 'base' });
      });
      setItems(allItems);
    } catch {
      console.error("Error fetching shopping list");
    } finally {
      setLoading(false);
    }
  }

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;
    try {
      const tempId = Date.now().toString();
      setItems(prev => [{ id: tempId, name: newItemName, checked: false, isManual: true }, ...prev]);
      setNewItemName('');
      setIsAdding(false);
      Keyboard.dismiss();

      await addManualShoppingItem(newItemName, householdId!);
      fetchShop();
    } catch {
      Alert.alert('Feil', 'Kunne ikke legge til vare');
      fetchShop();
    }
  };

  const handleQuickAdd = async (item: string) => {
    try {
      await addManualShoppingItem(item, householdId!);
      fetchShop();
    } catch {
      Alert.alert('Feil', 'Kunne ikke legge til vare');
    }
  };

  const toggleCheck = async (id: string, isManual: boolean) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    setItems(current =>
      current.map(i => i.id === id ? { ...i, checked: !i.checked } : i)
        .sort((a, b) => {
          if (a.checked !== b.checked) {
            return Number(a.checked) - Number(b.checked);
          }
          return a.name.localeCompare(b.name, 'no', { sensitivity: 'base' });
        })
    );

    try {
      await toggleShoppingItem(id, !item.checked, isManual);
    } catch (error) {
      console.error(error);
      fetchShop();
    }
  };

  const handleDelete = async (id: string) => {
    setItems(current => current.filter(i => i.id !== id));
    try {
      await deleteShoppingItem(id);
    } catch {
      Alert.alert('Feil', 'Kunne ikke slette vare');
      fetchShop();
    }
  };

  const handleClearChecked = async () => {
    const checkedCount = items.filter(i => i.checked).length;
    if (checkedCount === 0) return;

    Alert.alert('Ferdig med handleturen?', `Er du sikker på at du vil flytte ${checkedCount} avhukede varer til matboden og tømme listen?`, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Flytt til matbod',
        style: 'default',
        onPress: async () => {
          try {
            setLoading(true);
            await clearCheckedItems(user?.uid || '', householdId!);
            // Remove checked items from UI
            // Manual items are deleted from Firestore
            // Planned items keep their checked status in shoppingChecked so they won't reappear
            setItems(prev => prev.filter(i => !i.checked));
            setLoading(false);
          } catch {
            Alert.alert('Feil', 'Kunne ikke tømme listen');
            setLoading(false);
          }
        }
      }
    ]);
  };

  const handleCopyList = async () => {
    const uncheckedItems = items.filter(i => !i.checked);
    if (uncheckedItems.length === 0) {
      Alert.alert('Info', 'Ingen varer å kopiere');
      return;
    }
    const text = "Handleliste:\n" + uncheckedItems.map(i => `- ${i.name} ${i.unit ? `(${i.amount} ${i.unit})` : ''}`).join('\n');
    await Clipboard.setStringAsync(text);
    Alert.alert('Suksess', 'Handlelisten er kopiert til utklippstavlen');
  };

  return (
    <GlassScreen bgVariant="glass" safeAreaEdges={['top']}>
      {/* Absolute Frosted Header */}
      <View style={{ paddingTop: insets.top }} className="absolute top-0 left-0 right-0 z-50 overflow-hidden rounded-b-[32px] border-b border-white/40 shadow-sm">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={StyleSheet.absoluteFill} className="bg-white/20" />

        <GlassHeader
          title="Handleliste"
          subtitle={`${items.filter(i => !i.checked).length} varer igjen`}
          transparent
          rightAction={
            <>
              {items.some(i => i.checked) && (
                <GlassButton variant="icon" icon={<Trash2 size={20} color="#EF4444" />} onPress={handleClearChecked} />
              )}
              <GlassButton variant="icon" icon={<Copy size={20} color="#6366F1" />} onPress={handleCopyList} />
              <GlassButton variant="primary" icon={<Plus size={20} color="white" />} onPress={() => setIsAdding(true)} />
            </>
          }
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6 py-4 border-t border-white/30" contentContainerStyle={{ gap: 12, paddingRight: 32 }}>
          <View className="flex-row items-center bg-black/5 px-3 py-2 rounded-xl border border-white/30 h-10">
            <ClipboardList size={14} color="#4B5563" />
            <Text className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Hurtigvalg</Text>
          </View>
          {staples.map(item => (
            <TouchableOpacity
              key={item}
              onPress={() => handleQuickAdd(item)}
              className="px-4 py-2.5 rounded-[18px] border border-white/50 bg-white/40 h-10 justify-center"
              activeOpacity={0.7}
            >
              <Text className="text-xs font-bold text-gray-700">+ {item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: insets.top + 160, padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className="py-20">
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : items.length > 0 ? (
          <Animated.FlatList
            data={items}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            itemLayoutAnimation={LinearTransition}
            contentContainerStyle={{ gap: 12 }}
            renderItem={({ item }) => (
              <Animated.View entering={FadeInDown} exiting={FadeOutUp}>
                <TouchableOpacity
                  onPress={() => toggleCheck(item.id, item.isManual)}
                  activeOpacity={0.7}
                >
                  <GlassCard className={`flex-row items-center overflow-hidden transition-all ${item.checked ? 'border-transparent opacity-50' : 'border-white/60 shadow-sm'} p-0`} blurIntensity={item.checked ? 40 : 80}>
                    <View className="p-5 flex-row items-center w-full">
                      <View className="mr-5">
                        {item.checked ? (
                          <View className="bg-emerald-500 rounded-xl p-1 shadow-sm shadow-emerald-200">
                            <CheckCircle2 size={24} color="white" />
                          </View>
                        ) : (
                          <View className="w-8 h-8 rounded-xl border-2 border-indigo-200 bg-white/50" />
                        )}
                      </View>

                      <View className="flex-1">
                        <Text className={`text-lg font-black tracking-tight ${item.checked ? 'text-gray-400 line-through' : 'text-gray-900'
                          }`}>
                          {item.name}
                        </Text>
                        {!item.isManual && item.unit && item.amount && item.amount > 0 ? (
                          <View className="flex-row items-center mt-1">
                            <View className="bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100/50">
                              <Text className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">{item.amount} {item.unit}</Text>
                            </View>
                            <Text className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-2">Planlagt</Text>
                          </View>
                        ) : null}
                      </View>

                      {item.isManual && (
                        <GlassButton
                          variant="ghost"
                          icon={<Trash2 size={18} color="#EF4444" />}
                          onPress={() => handleDelete(item.id)}
                          className="p-3 bg-red-400/20 rounded-xl ml-2 border border-red-200/50"
                        />
                      )}
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              </Animated.View>
            )}
          />
        ) : (
          <View className="flex-1 justify-center items-center py-24 opacity-30">
            <ShoppingCart size={80} color="#9CA3AF" />
            <Text className="text-gray-500 font-black uppercase tracking-widest mt-4">Listen er tom</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Item Overlay */}
      {isAdding && (
        <View className="absolute inset-0 bg-black/40 z-50 justify-end">
          <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={() => setIsAdding(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="overflow-hidden rounded-t-[40px] shadow-2xl border-t border-white/60"
          >
            <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />
            <View style={StyleSheet.absoluteFill} className="bg-white/40" />
            <View className="p-8">
              <View className="flex-row justify-between items-center mb-8">
                <Text className="text-2xl font-black text-gray-900 uppercase tracking-tight">Legg til vare</Text>
                <GlassButton variant="icon" icon={<X size={20} color="#6B7280" />} onPress={() => setIsAdding(false)} />
              </View>
              <View className="flex-row gap-x-3 mb-10">
                <GlassInput
                  containerStyle={{ flex: 1 }}
                  placeholder="Hva trenger du?"
                  value={newItemName}
                  onChangeText={setNewItemName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleAddItem}
                />
                <GlassButton
                  variant="primary"
                  icon={<Plus size={24} color="white" />}
                  onPress={handleAddItem}
                  className="w-[56px] h-[56px] rounded-[24px]"
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </GlassScreen>
  );
}
