import { View, Text, TouchableOpacity, Image, ScrollView, Alert, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/auth';
import { useRouter } from 'expo-router';
import { LogOut, User, Settings, Camera, Lock, Mail, Save, AlertCircle, ArrowLeft } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile, updatePassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (user) {
        setDisplayName(user.displayName || '');
    }
  }, [user]);

  useEffect(() => {
      const nameChanged = displayName !== (user?.displayName || '');
      const passChanged = newPassword.length > 0;
      const imageChanged = !!imageUri;
      setIsDirty(nameChanged || passChanged || imageChanged);
  }, [displayName, newPassword, imageUri, user]);

  const handleSignOut = async () => {
    try {
        await signOut();
        router.replace('/auth/login');
    } catch (error) {
        Alert.alert('Error', 'Failed to sign out');
    }
  };

  const pickImage = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
          Alert.alert('Permission needed', 'Gallery permission is required to change avatar.');
          return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
      });

      if (!result.canceled) {
          setImageUri(result.assets[0].uri);
      }
  };

  const handleSaveChanges = async () => {
      if (!auth.currentUser) return;
      setLoading(true);
      try {
          if (newPassword) {
              await updatePassword(auth.currentUser, newPassword);
              setNewPassword('');
          }

          const profileUpdates: { displayName?: string, photoURL?: string } = {};

          if (displayName !== user?.displayName) {
              profileUpdates.displayName = displayName;
          }

          if (imageUri) {
              // TODO: Implement real Firebase Storage upload here.
              // For now, we just mock it or skip it to prevent crashes if storage isn't configured for RN.
              // Real impl: fetch(uri).then(res => res.blob()).then(blob => uploadBytes(ref, blob))...
              Alert.alert('Info', 'Avatar upload not fully implemented in this demo (requires Storage setup). Name/Password updated.');
              // profileUpdates.photoURL = ...
          }

          if (Object.keys(profileUpdates).length > 0) {
              await updateProfile(auth.currentUser, profileUpdates);
          }

          Alert.alert('Success', 'Profile updated!');
          setIsDirty(false);
          setImageUri(null); // Clear preview
      } catch (error: any) {
          Alert.alert('Error', error.message || 'Failed to update profile');
      } finally {
          setLoading(false);
      }
  };

  const displayImage = imageUri || user?.photoURL;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'left', 'right']}>
      <View className="px-4 py-3 bg-white border-b border-gray-100 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
             <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900 flex-1">Account Settings</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
            <View className="items-center mb-6">
                 <TouchableOpacity onPress={pickImage} className="relative group">
                    <View className={`w-32 h-32 rounded-full border-4 shadow-sm overflow-hidden bg-gray-200 ${isDirty && imageUri ? 'border-indigo-400' : 'border-white'}`}>
                        {displayImage ? (
                            <Image source={{ uri: displayImage }} className="w-full h-full" />
                        ) : (
                            <View className="w-full h-full items-center justify-center bg-indigo-50">
                                <User size={48} color="#4F46E5" />
                            </View>
                        )}
                    </View>
                    <View className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-2 border-2 border-white shadow-sm">
                        <Camera size={16} color="white" />
                    </View>
                 </TouchableOpacity>

                 <View className="mt-4 items-center">
                     <Text className="text-xl font-bold text-gray-900">{user?.displayName || 'User'}</Text>
                     <View className="flex-row items-center mt-1">
                         <Mail size={14} color="#6B7280" />
                         <Text className="text-gray-500 ml-1.5">{user?.email}</Text>
                     </View>
                 </View>

                 {isDirty && (
                     <View className="mt-3 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex-row items-center">
                         <AlertCircle size={12} color="#B45309" />
                         <Text className="text-amber-700 text-xs font-medium ml-1">Unsaved Changes</Text>
                     </View>
                 )}
            </View>

            {/* Personal Info */}
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
                <Text className="text-lg font-bold text-gray-900 mb-1">Personal Information</Text>
                <Text className="text-gray-500 text-xs mb-4">Update how others see you.</Text>

                <Text className="text-xs font-bold text-gray-700 uppercase mb-1 ml-1">Display Name</Text>
                <View className="bg-gray-50 border border-gray-200 rounded-xl flex-row items-center px-3 py-3">
                    <User size={18} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 ml-3 text-gray-900 text-base"
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder="Your Name"
                    />
                </View>
            </View>

            {/* Security */}
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
                <Text className="text-lg font-bold text-gray-900 mb-1">Security</Text>
                <Text className="text-gray-500 text-xs mb-4">Ensure your account remains safe.</Text>

                <Text className="text-xs font-bold text-gray-700 uppercase mb-1 ml-1">New Password</Text>
                <View className="bg-gray-50 border border-gray-200 rounded-xl flex-row items-center px-3 py-3">
                    <Lock size={18} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 ml-3 text-gray-900 text-base"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Min. 6 characters"
                        secureTextEntry
                    />
                </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
                onPress={handleSaveChanges}
                disabled={!isDirty || loading}
                className={`flex-row items-center justify-center p-4 rounded-xl shadow-sm mb-6 ${
                    isDirty ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <>
                        <Save size={20} color={isDirty ? "white" : "#9CA3AF"} />
                        <Text className={`font-bold text-lg ml-2 ${isDirty ? 'text-white' : 'text-gray-400'}`}>
                            {isDirty ? 'Save Changes' : 'Saved'}
                        </Text>
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                onPress={handleSignOut}
                className="bg-red-50 p-4 rounded-xl flex-row items-center justify-center mb-8"
            >
                <LogOut size={20} color="#EF4444" />
                <Text className="ml-2 text-red-600 font-bold">Sign Out</Text>
            </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
