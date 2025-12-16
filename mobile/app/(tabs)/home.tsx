import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useAuth } from '../../context/auth';
import { ChefHat, Calendar, ShoppingCart, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  const menuItems = [
    {
      title: 'Weekly Plan',
      description: 'Check what\'s for dinner',
      icon: Calendar,
      color: 'bg-indigo-50',
      iconColor: '#4F46E5',
      route: '/(tabs)/planner',
    },
    {
      title: 'Recipes',
      description: 'Browse your collection',
      icon: ChefHat,
      color: 'bg-purple-50',
      iconColor: '#9333EA',
      route: '/(tabs)/recipes',
    },
    {
      title: 'Shopping List',
      description: 'See what you need',
      icon: ShoppingCart,
      color: 'bg-emerald-50',
      iconColor: '#10B981',
      route: '/(tabs)/shop',
    },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Welcome Header */}
        <View className="mb-8">
          <Text className="text-gray-500 text-lg mb-1">Hello,</Text>
          <Text className="text-3xl font-bold text-gray-900">
            {user?.displayName || 'Chef'}! 👋
          </Text>
        </View>

        {/* Quick Actions Grid */}
        <View className="gap-4">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => router.push(item.route as any)}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex-row items-center justify-between active:scale-[0.98] transition-transform"
            >
              <View className="flex-row items-center gap-4 flex-1">
                <View className={`p-3 rounded-xl ${item.color}`}>
                  <item.icon size={24} color={item.iconColor} />
                </View>
                <View>
                  <Text className="text-lg font-bold text-gray-900">{item.title}</Text>
                  <Text className="text-gray-500 text-sm">{item.description}</Text>
                </View>
              </View>
              <ArrowRight size={20} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Featured / Daily Insight Placeholder */}
        <View className="mt-8 bg-indigo-600 rounded-2xl p-6 shadow-lg shadow-indigo-200">
          <View className="flex-row justify-between items-start">
            <View>
              <Text className="text-indigo-100 font-medium mb-1">Did you know?</Text>
              <Text className="text-white text-xl font-bold w-48">
                Planning meals can save up to 2 hours a week!
              </Text>
            </View>
            <View className="bg-white/20 p-3 rounded-full">
              <Calendar size={24} color="white" />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
