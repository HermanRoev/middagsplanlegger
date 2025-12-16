import { View, Text, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/auth';
import { useRouter } from 'expo-router';
import { LogOut, User, Settings, ChevronRight } from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
        await signOut();
        router.replace('/auth/login');
    } catch (error) {
        Alert.alert('Error', 'Failed to sign out');
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      <View className="px-4 py-3 bg-white border-b border-gray-100 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900">Profile</Text>
      </View>

      <ScrollView className="flex-1">
          {/* User Info Card */}
          <View className="m-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 items-center">
              <View className="w-24 h-24 bg-indigo-50 rounded-full items-center justify-center mb-4">
                  {user?.photoURL ? (
                      <Image source={{ uri: user.photoURL }} className="w-full h-full rounded-full" />
                  ) : (
                      <User size={48} color="#4F46E5" />
                  )}
              </View>
              <Text className="text-xl font-bold text-gray-900">{user?.displayName || 'User'}</Text>
              <Text className="text-gray-500">{user?.email}</Text>
          </View>

          {/* Settings Section */}
          <View className="mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
                  <View className="p-2 bg-gray-50 rounded-lg">
                    <Settings size={20} color="#374151" />
                  </View>
                  <Text className="flex-1 ml-3 font-medium text-gray-700">App Settings</Text>
                  <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
               {/* Add more items here if needed */}
          </View>

          <TouchableOpacity
            onPress={handleSignOut}
            className="mx-4 mt-6 bg-red-50 p-4 rounded-xl flex-row items-center justify-center"
          >
              <LogOut size={20} color="#EF4444" />
              <Text className="ml-2 text-red-600 font-bold">Sign Out</Text>
          </TouchableOpacity>

          <Text className="text-center text-gray-400 mt-8 text-xs">Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
