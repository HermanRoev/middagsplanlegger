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
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: '#f9fafb', // Match bg-gray-50
        },
        headerTitleStyle: {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#111827'
        },
        headerTitleAlign: 'left', // Align title to left
        headerRight: () => <HeaderRight />,
        tabBarStyle: {
          position: 'absolute',
          bottom: 25,
          left: 20,
          right: 20,
          height: 70,
          borderRadius: 35,
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: 'transparent', // Handled by BlurView
          paddingBottom: 0, // Reset padding
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarBackground: () => (
             <BlurView
                intensity={80}
                style={StyleSheet.absoluteFill}
                tint="dark" // Dark glass as per screenshot
             />
        ),
        tabBarActiveTintColor: '#FFFFFF', // White for active on dark glass
        tabBarInactiveTintColor: '#9CA3AF', // Gray for inactive
        tabBarShowLabel: false, // Screenshot seems to have no labels or small ones? Screenshot HAD labels.
        // Let's keep labels but style them.
        tabBarLabelStyle: {
            fontSize: 10,
            marginBottom: 5,
            fontWeight: '600',
        },
        tabBarItemStyle: {
            height: 70,
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
          headerShown: false, // Hide Tab Header, let Stack handle it
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
