import '../global.css';
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/auth';
import { StatusBar } from 'expo-status-bar';

import { View, Image, StyleSheet } from 'react-native';

export default function RootLayout() {
  return (
    <AuthProvider>
      <View className="flex-1 bg-gray-900">
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2670&auto=format&fit=crop' }}
          style={StyleSheet.absoluteFill}
          blurRadius={50}
        />
        <Stack screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' }
        }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </View>
      <StatusBar style="light" />
    </AuthProvider>
  );
}
