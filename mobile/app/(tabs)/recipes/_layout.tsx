import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { User } from 'lucide-react-native';

export default function RecipesLayout() {
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
    <Stack screenOptions={{
      headerStyle: {
        backgroundColor: '#f9fafb',
      },
      headerTitleStyle: {
          fontSize: 24,
          fontWeight: 'bold',
          color: '#111827'
      },
      headerTitleAlign: 'left',
      headerShadowVisible: false,
      contentStyle: { backgroundColor: '#ffffff' } // Ensure background
    }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          title: 'Recipes',
          headerRight: () => <HeaderRight />
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          title: 'Recipe Details',
          headerBackTitle: 'Back',
          headerTitleStyle: { fontSize: 18, fontWeight: '600' } // Standard size for details
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          headerShown: true,
          title: 'New Recipe',
          presentation: 'modal',
          headerTitleStyle: { fontSize: 18, fontWeight: '600' }
        }}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{
          headerShown: true,
          title: 'Edit Recipe',
          presentation: 'modal',
          headerTitleStyle: { fontSize: 18, fontWeight: '600' }
        }}
      />
    </Stack>
  );
}
