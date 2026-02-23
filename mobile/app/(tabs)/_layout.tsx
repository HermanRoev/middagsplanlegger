import { Tabs } from 'expo-router';
import { ChefHat, Calendar, ShoppingCart, Home, Menu } from 'lucide-react-native';
import { Platform } from 'react-native';

import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarBackground: () => (
          <BlurView tint="light" intensity={60} style={StyleSheet.absoluteFill} className="bg-white/40 border-t border-white/40" />
        ),
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontWeight: '900',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
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
        name="more"
        options={{
          title: 'Mer',
          tabBarIcon: ({ color, size }) => <Menu size={size} color={color} />,
        }}
      />

      {/* Hidden Tabs (Accessible via the "Mer" menu) */}
      <Tabs.Screen
        name="inbox"
        options={{
          href: null,
          title: 'Forslag',
        }}
      />
      <Tabs.Screen
        name="cupboard"
        options={{
          href: null,
          title: 'Matbod',
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          href: null,
          title: 'Familie',
        }}
      />
    </Tabs>
  );
}
