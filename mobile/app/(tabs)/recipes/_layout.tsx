import { Stack } from 'expo-router';

export default function RecipesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: true, title: 'Recipe Details', headerBackTitle: 'Back' }} />
      <Stack.Screen name="create" options={{ headerShown: true, title: 'New Recipe', presentation: 'modal' }} />
      <Stack.Screen name="edit/[id]" options={{ headerShown: true, title: 'Edit Recipe', presentation: 'modal' }} />
    </Stack>
  );
}
