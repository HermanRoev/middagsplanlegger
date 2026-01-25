import { Tabs, useRouter } from 'expo-router';
import { ChefHat, Calendar, ShoppingCart, Package, User, MessageSquare } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';

export default function TabLayout() {
  const router = useRouter();

  const HeaderRight = () => (
    <TouchableOpacity
      onPress={() => router.push('/profile')}
      className="mr-4 p-2"
    >
      <User size={24} color="#374151" />
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: true, // Show header to display the Profile icon
        headerTitle: '', // Remove the text title as requested
        headerShadowVisible: false, // Remove shadow for cleaner look
        headerStyle: {
          backgroundColor: 'white',
          height: 100, // Slightly taller for better spacing
        },
        headerRight: () => <HeaderRight />,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          height: 85,
          paddingTop: 10,
          paddingBottom: 30,
        },
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontWeight: '500',
          fontSize: 12,
        },
      }}
    >
       <Tabs.Screen
        name="index"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, size }) => <ShoppingCart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color, size }) => <ChefHat size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cupboard"
        options={{
          title: 'Cupboard',
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
