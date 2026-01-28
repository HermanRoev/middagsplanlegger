import { Tabs, useRouter } from 'expo-router';
import { ChefHat, Calendar, ShoppingCart, Package, User, MessageSquare } from 'lucide-react-native';
import { TouchableOpacity, Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';

export default function TabLayout() {
  const router = useRouter();

  const HeaderRight = () => (
    <TouchableOpacity
      onPress={() => router.push('/profile')}
      className="mr-4 p-2 bg-gray-100 rounded-full"
    >
      <User size={20} color="#374151" />
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 30,
          left: 20,
          right: 20,
          height: 80,
          borderRadius: 40,
          borderTopWidth: 0,
          elevation: 10, // Shadow for Android
          backgroundColor: 'transparent',
          paddingBottom: 0,
          paddingTop: 0,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 10,
          },
          shadowOpacity: 0.25,
          shadowRadius: 10,
        },
        tabBarBackground: () => (
             <BlurView
                intensity={40}
                style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 40, backgroundColor: 'rgba(255, 255, 255, 0.7)' }]}
                tint="light"
             />
        ),
        tabBarActiveTintColor: '#4F46E5', // Indigo for active
        tabBarInactiveTintColor: '#9CA3AF', // Gray for inactive
        tabBarShowLabel: true,
        tabBarLabelStyle: {
            fontSize: 11,
            marginBottom: 10,
            fontWeight: '600',
        },
        tabBarItemStyle: {
            height: 80,
            paddingTop: 10,
        }
      }}
    >
       <Tabs.Screen
        name="index"
        options={{
          title: 'Plan',
          tabBarLabel: 'Plan',
          tabBarIcon: ({ color, size }) => <Calendar size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarLabel: 'Shop',
          tabBarIcon: ({ color, size }) => <ShoppingCart size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarLabel: 'Recipes',
          tabBarIcon: ({ color, size }) => <ChefHat size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarLabel: 'Inbox',
          tabBarIcon: ({ color, size }) => <MessageSquare size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cupboard"
        options={{
          title: 'Cupboard',
          tabBarLabel: 'Pantry',
          tabBarIcon: ({ color, size }) => <Package size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
