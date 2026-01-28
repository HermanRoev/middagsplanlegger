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
          bottom: 40, // Increased bottom spacing
          marginHorizontal: 20, // Use margin for spacing from edges
          height: 70, // Slightly more compact height
          borderRadius: 35, // Rounded pill shape
          borderTopWidth: 0,
          elevation: 0, // Remove default elevation, handle shadow manually if needed or via container
          backgroundColor: 'transparent',
          paddingHorizontal: 10, // Add padding to edges to push tabs in
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 5,
          },
          shadowOpacity: 0.1,
          shadowRadius: 5,
        },
        tabBarBackground: () => (
             <View style={{ flex: 1, borderRadius: 35, overflow: 'hidden', backgroundColor: 'transparent' }}>
                 <BlurView
                    intensity={60} // Higher intensity for better glass effect
                    style={StyleSheet.absoluteFill}
                    tint="extraLight" // Frosted glass look
                 />
                 <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.5)' }} />
             </View>
        ),
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#6B7280',
        tabBarShowLabel: false, // Cleaner look without labels often works better for "Liquid"
        tabBarItemStyle: {
            height: 70,
            paddingTop: 12, // Center icon
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
