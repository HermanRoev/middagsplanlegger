import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Meal } from '../../src/types';
import { Clock, Users, Star, ChefHat } from 'lucide-react-native';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';

interface RecipeCardProps {
  recipe: Meal;
  onPress?: () => void;
  pantryReady?: boolean;
  pantryCoverage?: number;
}

export function RecipeCard({ recipe, onPress, pantryReady, pantryCoverage = 0 }: RecipeCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/(tabs)/recipes/${recipe.id}`);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      className="rounded-[32px] mb-6 shadow-sm border border-white/60 overflow-hidden"
    >
      <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />
      <View style={StyleSheet.absoluteFill} className="bg-white/30" />

      <View className="relative aspect-[16/10] border-b border-white/30">
        {recipe.imageUrl ? (
          <Image
            source={{ uri: recipe.imageUrl }}
            className="w-full h-full bg-gray-100"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full bg-indigo-500/10 items-center justify-center">
            <ChefHat size={48} color="#C7D2FE" />
          </View>
        )}

        <View className="absolute inset-0 bg-black/20" />

        {pantryReady && (
          <View className="absolute top-4 right-4 bg-emerald-500 px-3 py-1.5 rounded-full shadow-sm">
            <Text className="text-white text-[10px] font-black uppercase tracking-wider">Klar på lager</Text>
          </View>
        )}

        {pantryCoverage > 0 && !pantryReady && (
          <View className="absolute top-4 left-4 overflow-hidden rounded-full shadow-lg border border-white/20">
            <BlurView intensity={100} tint="systemThinMaterialDark" className="px-3 py-1.5">
              <Text className="text-white text-[10px] font-black uppercase tracking-wider">{pantryCoverage}% på lager</Text>
            </BlurView>
          </View>
        )}

        <View className="absolute bottom-4 left-5 right-5">
          <View className="flex-row items-center mb-1">
            {recipe.rating ? (
              <View className="flex-row items-center bg-white/90 px-2 py-0.5 rounded-md mr-2">
                <Star size={10} color="#FBBF24" fill="#FBBF24" />
                <Text className="ml-1 text-[10px] text-gray-900 font-bold">{recipe.rating.toFixed(1)}</Text>
              </View>
            ) : null}
            {recipe.prepTime && (
              <View className="flex-row items-center bg-black/40 px-2 py-0.5 rounded-md">
                <Clock size={10} color="white" />
                <Text className="ml-1 text-[10px] text-white font-bold">{recipe.prepTime}m</Text>
              </View>
            )}
          </View>
          <Text className="text-white font-black text-2xl leading-tight" numberOfLines={2}>
            {recipe.name}
          </Text>
        </View>
      </View>

      <View className="px-5 py-4 flex-row justify-between items-center">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-black/5 border border-white/40 shadow-sm items-center justify-center mr-3">
            <Users size={14} color="#6B7280" />
          </View>
          <View>
            <Text className="text-[10px] text-gray-400 font-black uppercase">Porsjoner</Text>
            <Text className="text-sm text-gray-900 font-black">{recipe.servings || 4} pers</Text>
          </View>
        </View>

        {recipe.lastCooked ? (
          <View className="items-end">
            <Text className="text-[10px] text-gray-400 font-black uppercase text-right">Sist laget</Text>
            <Text className="text-sm text-gray-500 font-bold">
              {formatDistanceToNow(parseISO(recipe.lastCooked), { addSuffix: true, locale: nb })}
            </Text>
          </View>
        ) : (
          <View className="bg-indigo-600/10 border border-indigo-400/30 px-3 py-1.5 rounded-xl">
            <Text className="text-[10px] text-indigo-700 font-black uppercase tracking-widest">Ny oppskrift</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
