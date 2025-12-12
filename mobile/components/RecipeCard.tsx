import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Meal } from '../../src/types'; // Import directly from shared src
import { Clock, Users } from 'lucide-react-native';

interface RecipeCardProps {
  recipe: Meal;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/(tabs)/recipes/${recipe.id}`)}
      className="bg-white rounded-2xl mb-4 shadow-sm border border-gray-100 overflow-hidden"
    >
      <View className="relative aspect-[4/3]">
        {recipe.imageUrl ? (
          <Image
            source={{ uri: recipe.imageUrl }}
            className="w-full h-full bg-gray-200"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full bg-indigo-50 items-center justify-center">
             <Text className="text-4xl">🥘</Text>
          </View>
        )}
        <View className="absolute inset-0 bg-black/30" />
        <View className="absolute bottom-3 left-3 right-3">
          <Text className="text-white font-bold text-lg leading-tight" numberOfLines={2}>
            {recipe.name}
          </Text>
        </View>
      </View>

      <View className="p-4 flex-row justify-between items-center">
        {recipe.prepTime && (
          <View className="flex-row items-center bg-gray-50 px-3 py-1.5 rounded-full">
            <Clock size={14} color="#6B7280" />
            <Text className="ml-1.5 text-xs text-gray-500 font-medium">{recipe.prepTime}m</Text>
          </View>
        )}

        {recipe.servings && (
          <View className="flex-row items-center bg-gray-50 px-3 py-1.5 rounded-full">
            <Users size={14} color="#6B7280" />
            <Text className="ml-1.5 text-xs text-gray-500 font-medium">{recipe.servings} ppl</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
