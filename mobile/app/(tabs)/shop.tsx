import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth';
import { getShoppingList } from '../../lib/api';
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function Shop() {
  const { user } = useAuth();
  const [items, setItems] = useState<{ id: string, text: string, checked: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShop() {
      if (!user) return;
      setLoading(true);
      try {
        const { manual } = await getShoppingList(user.uid);
        // Mapping manual items to a simple structure for display
        setItems(manual.map((m: any) => ({ id: m.id, text: m.item, checked: m.checked || false })));
      } catch (error) {
        console.error("Error fetching shopping list:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchShop();
  }, [user]);

  const toggleCheck = (id: string) => {
    setItems(current =>
      current.map(item => item.id === id ? { ...item, checked: !item.checked } : item)
    );
    // TODO: Sync with Firestore
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white p-4 border-b border-gray-100 flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Shopping List</Text>
          <Text className="text-gray-500 text-sm">{items.filter(i => !i.checked).length} items to buy</Text>
        </View>
        <TouchableOpacity className="bg-indigo-600 p-3 rounded-full shadow-sm">
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {loading ? (
          <View className="py-20">
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : items.length > 0 ? (
          <View className="p-4 gap-3">
             {items.map(item => (
               <TouchableOpacity
                 key={item.id}
                 onPress={() => toggleCheck(item.id)}
                 className={`flex-row items-center p-4 rounded-xl border ${
                   item.checked ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200 shadow-sm'
                 }`}
               >
                 {item.checked ? (
                   <CheckCircle2 size={24} color="#10B981" />
                 ) : (
                   <Circle size={24} color="#D1D5DB" />
                 )}
                 <Text className={`ml-3 flex-1 text-lg ${
                   item.checked ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'
                 }`}>
                   {item.text}
                 </Text>
               </TouchableOpacity>
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
