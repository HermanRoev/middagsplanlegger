import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth';
import { getShoppingList, addManualShoppingItem, toggleShoppingItem, deleteShoppingItem, clearCheckedItems } from '../../lib/api';
import { CheckCircle2, Plus, Trash2, X, Copy, ClipboardList, ShoppingCart } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

export default function Shop() {
  const { user } = useAuth();
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
      if (!user) return;
      try {
        const { manual, planned } = await getShoppingList(user.uid);

        const manualMapped = manual.map((m: { id: string, name?: string, item?: string, checked?: boolean }) => ({
          id: m.id,
          name: m.name || m.item,
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

        const allItems = [...manualMapped, ...plannedMapped].sort((a, b) => Number(a.checked) - Number(b.checked));
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

          await addManualShoppingItem(newItemName);
          fetchShop();
      } catch {
          Alert.alert('Feil', 'Kunne ikke legge til vare');
          fetchShop();
      }
  };

  const handleQuickAdd = async (item: string) => {
    try {
      await addManualShoppingItem(item);
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
             .sort((a, b) => Number(a.checked) - Number(b.checked))
    );

    try {
        await toggleShoppingItem(id, !item.checked, isManual);
    } catch {
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

      Alert.alert('Tøm listen', `Er du sikker på at du vil fjerne ${checkedCount} avhukede varer fra listen?`, [
          { text: 'Avbryt', style: 'cancel' },
          {
              text: 'Tøm',
              style: 'destructive',
              onPress: async () => {
                  try {
                      setLoading(true);
                      await clearCheckedItems(user?.uid || '');
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
    <View className="flex-1 bg-white">
      <View className="bg-white px-6 pb-4 pt-16 border-b border-gray-200 flex-row justify-between items-end">
        <View>
          <Text className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{items.filter(i => !i.checked).length} varer igjen</Text>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">Handleliste</Text>
        </View>
        <View className="flex-row gap-x-2">
            {items.some(i => i.checked) && (
                <TouchableOpacity
                    onPress={handleClearChecked}
                    className="bg-gray-50 p-3 rounded-2xl border border-gray-100"
                    activeOpacity={0.7}
                >
                    <Trash2 size={20} color="#EF4444" />
                </TouchableOpacity>
            )}
            <TouchableOpacity
                onPress={handleCopyList}
                className="bg-gray-50 p-3 rounded-2xl border border-gray-100"
                activeOpacity={0.7}
            >
              <Copy size={20} color="#6366F1" />
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => setIsAdding(true)}
                className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200"
                activeOpacity={0.8}
            >
              <Plus size={20} color="white" />
            </TouchableOpacity>
        </View>
      </View>

      <View className="bg-white border-b border-gray-200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6 py-4">
          <View className="flex-row items-center gap-x-3 pr-8">
            <View className="flex-row items-center bg-gray-100 px-3 py-2 rounded-xl mr-1">
              <ClipboardList size={14} color="#4B5563" />
              <Text className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Hurtigvalg</Text>
            </View>
            {staples.map(item => (
              <TouchableOpacity
                key={item}
                onPress={() => handleQuickAdd(item)}
                className="px-4 py-2.5 rounded-[18px] border border-gray-100 bg-gray-50/50"
                activeOpacity={0.7}
              >
                <Text className="text-xs font-bold text-gray-600">+ {item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className="py-20">
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : items.length > 0 ? (
          <View className="gap-y-3">
             {items.map(item => (
               <TouchableOpacity
                 key={item.id}
                 onPress={() => toggleCheck(item.id, item.isManual)}
                 activeOpacity={0.7}
                 className={`flex-row items-center p-5 rounded-[28px] border transition-all ${
                   item.checked ? 'bg-gray-50/50 border-transparent opacity-50' : 'bg-white border-gray-100 shadow-sm'
                 }`}
               >
                 <View className="mr-5">
                    {item.checked ? (
                    <View className="bg-emerald-500 rounded-xl p-1">
                      <CheckCircle2 size={24} color="white" />
                    </View>
                    ) : (
                    <View className="w-8 h-8 rounded-xl border-2 border-gray-200 bg-gray-50/50" />
                    )}
                 </View>

                  <View className="flex-1">
                    <Text className={`text-lg font-black tracking-tight ${
                   item.checked ? 'text-gray-400 line-through' : 'text-gray-900'
                    }`}>
                     {item.name}
                    </Text>
                    {!item.isManual && item.unit && (
                      <View className="flex-row items-center mt-1">
                        <View className="bg-indigo-50 px-2 py-0.5 rounded-md">
                          <Text className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{item.amount} {item.unit}</Text>
                        </View>
                        <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Planlagt</Text>
                      </View>
                    )}
                  </View>

                 {item.isManual && (
                     <TouchableOpacity
                        onPress={() => handleDelete(item.id)}
                        className="p-2 bg-red-50 rounded-xl ml-2"
                        activeOpacity={0.6}
                      >
                         <Trash2 size={18} color="#EF4444" />
                     </TouchableOpacity>
                 )}
               </TouchableOpacity>
             ))}
          </View>
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
                className="bg-white p-8 rounded-t-[40px] shadow-2xl"
              >
                  <View className="flex-row justify-between items-center mb-8">
                      <Text className="text-2xl font-black text-gray-900 uppercase tracking-tight">Legg til vare</Text>
                      <TouchableOpacity onPress={() => setIsAdding(false)} className="bg-gray-100 p-2 rounded-full">
                          <X size={24} color="#9CA3AF" />
                      </TouchableOpacity>
                  </View>
                  <View className="flex-row gap-x-3 mb-10">
                      <TextInput
                          className="flex-1 bg-gray-50 border border-gray-100 rounded-[24px] p-6 text-lg font-medium text-gray-900 shadow-inner"
                          placeholder="Hva trenger du?"
                          placeholderTextColor="#9CA3AF"
                          value={newItemName}
                          onChangeText={setNewItemName}
                          autoFocus
                          returnKeyType="done"
                          onSubmitEditing={handleAddItem}
                      />
                      <TouchableOpacity
                        onPress={handleAddItem}
                        className="bg-indigo-600 w-20 rounded-[24px] justify-center items-center shadow-lg shadow-indigo-200"
                      >
                          <Plus size={32} color="white" />
                      </TouchableOpacity>
                  </View>
              </KeyboardAvoidingView>
          </View>
      )}
    </View>
  );
}
