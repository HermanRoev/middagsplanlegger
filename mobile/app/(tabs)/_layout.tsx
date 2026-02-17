import { Tabs } from 'expo-router';
import { ChefHat, Calendar, ShoppingCart, Package, MessageSquare, Home } from 'lucide-react-native';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
       <Tabs.Screen
        name="index"
        options={{
          title: 'Hjem',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
       <Tabs.Screen
        name="planner"
        options={{
          title: 'Planlegger',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Handel',
          tabBarIcon: ({ color, size }) => <ShoppingCart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Oppskrifter',
          tabBarIcon: ({ color, size }) => <ChefHat size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Forslag',
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cupboard"
        options={{
          title: 'Matbod',
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
