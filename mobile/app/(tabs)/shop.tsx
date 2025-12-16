import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth';
import { getShoppingList, addManualShoppingItem, toggleShoppingItem, deleteShoppingItem } from '../../lib/api';
import { CheckCircle2, Circle, Plus, Trash2, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function Shop() {
  const { user } = useAuth();
  const [items, setItems] = useState<{ id: string, text: string, checked: boolean, isManual: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Item State
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  useEffect(() => {
    fetchShop();
  }, [user]);

  async function fetchShop() {
      if (!user) return;
      // setLoading(true); // Don't block UI on refresh
      try {
        const { manual, planned } = await getShoppingList(user.uid);

        const manualMapped = manual.map((m: any) => ({
            id: m.id,
            text: m.name || m.item, // Handle legacy 'item' field if exists
            checked: m.checked || false,
            isManual: true
        }));

        const plannedMapped = planned.map((p: any) => ({
            id: p.id,
            text: `${p.name} ${p.unit ? `(${p.amount} ${p.unit})` : ''}`,
            checked: p.checked || false,
            isManual: false
        }));

        // Sort: Unchecked first
        const allItems = [...manualMapped, ...plannedMapped].sort((a, b) => Number(a.checked) - Number(b.checked));
        setItems(allItems);
      } catch (error) {
        console.error("Error fetching shopping list:", error);
      } finally {
        setLoading(false);
      }
    }

  const handleAddItem = async () => {
      if (!newItemName.trim()) return;
      try {
          // Optimistic update
          const tempId = Date.now().toString();
          setItems(prev => [{ id: tempId, text: newItemName, checked: false, isManual: true }, ...prev]);
          setNewItemName('');
          setIsAdding(false);

          await addManualShoppingItem(newItemName);
          fetchShop(); // Refresh to get real ID
      } catch (error) {
          Alert.alert('Error', 'Failed to add item');
          fetchShop(); // Revert
      }
  };

  const toggleCheck = async (id: string, isManual: boolean) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    // Optimistic
    setItems(current =>
      current.map(i => i.id === id ? { ...i, checked: !i.checked } : i)
             .sort((a, b) => Number(a.checked) - Number(b.checked)) // Re-sort? Maybe annoying if it jumps. Let's keep position or sort.
             // Usually sorting on check is standard but can be jarring. Let's not sort immediately on toggle for UX stability.
    );

    try {
        await toggleShoppingItem(id, !item.checked, isManual);
    } catch (error) {
        console.error(error);
        fetchShop(); // Revert
    }
  };

  const handleDelete = async (id: string) => {
      // Optimistic
      setItems(current => current.filter(i => i.id !== id));
      try {
          await deleteShoppingItem(id);
      } catch (error) {
          Alert.alert('Error', 'Failed to delete item');
          fetchShop();
      }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white p-4 border-b border-gray-100 flex-row justify-between items-center pt-12">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Shopping List</Text>
          <Text className="text-gray-500 text-sm">{items.filter(i => !i.checked).length} items to buy</Text>
        </View>
        <TouchableOpacity
            onPress={() => setIsAdding(true)}
            className="bg-indigo-600 p-3 rounded-full shadow-sm"
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Add Item Modal/Overlay */}
      {isAdding && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 shadow-lg z-50 rounded-t-3xl"
          >
              <View className="flex-row justify-between items-center mb-4">
                  <Text className="font-bold text-lg">Add Item</Text>
                  <TouchableOpacity onPress={() => setIsAdding(false)}>
                      <X size={24} color="#9CA3AF" />
                  </TouchableOpacity>
              </View>
              <View className="flex-row gap-2">
                  <TextInput
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg"
                      placeholder="What do you need?"
                      value={newItemName}
                      onChangeText={setNewItemName}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={handleAddItem}
                  />
                  <TouchableOpacity
                    onPress={handleAddItem}
                    className="bg-indigo-600 p-3 rounded-xl justify-center items-center"
                  >
                      <Plus size={24} color="white" />
                  </TouchableOpacity>
              </View>
          </KeyboardAvoidingView>
      )}

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {loading ? (
          <View className="py-20">
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : items.length > 0 ? (
          <View className="p-4 gap-3">
             {items.map(item => (
               <View
                 key={item.id}
                 className={`flex-row items-center p-4 rounded-xl border ${
                   item.checked ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200 shadow-sm'
                 }`}
               >
                 <TouchableOpacity onPress={() => toggleCheck(item.id, item.isManual)} className="mr-3">
                    {item.checked ? (
                    <CheckCircle2 size={24} color="#10B981" />
                    ) : (
                    <Circle size={24} color="#D1D5DB" />
                    )}
                 </TouchableOpacity>

                 <Text className={`flex-1 text-lg ${
                   item.checked ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'
                 }`}>
                   {item.text}
                 </Text>

                 {item.isManual && (
                     <TouchableOpacity onPress={() => handleDelete(item.id)} className="p-2">
                         <Trash2 size={20} color="#EF4444" opacity={0.5} />
                     </TouchableOpacity>
                 )}
               </View>
             ))}
          </View>
        ) : (
          <View className="flex-1 justify-center items-center py-20 px-10">
            <View className="bg-indigo-50 p-6 rounded-full mb-4">
              <Plus size={40} color="#4F46E5" />
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">Your list is empty</Text>
            <Text className="text-gray-500 text-center">
              Add items manually or plan meals to generate your shopping list.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
