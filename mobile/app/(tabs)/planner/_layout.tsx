import { Stack } from 'expo-router';

export default function PlannerLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="add" options={{ headerShown: true, title: 'Add Meal', headerBackTitle: 'Planner' }} />
      <Stack.Screen name="recipe/[id]" options={{ headerShown: true, title: 'Meal Details', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
