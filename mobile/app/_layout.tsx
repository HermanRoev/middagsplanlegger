import '../global.css';
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/auth';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="profile"
          options={{
            headerShown: true,
            title: 'Profile',
            headerBackTitle: 'Back',
            presentation: 'card',
            headerStyle: {
              backgroundColor: '#f9fafb',
            },
            headerTitleStyle: {
              fontSize: 18,
              fontWeight: '600',
              color: '#111827'
            },
            headerShadowVisible: false,
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
