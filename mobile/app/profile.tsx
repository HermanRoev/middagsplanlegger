import { View, Text, TouchableOpacity, Image, ScrollView, Alert, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/auth';
import { useRouter } from 'expo-router';
import { LogOut, User, Camera, Lock, Mail, Save, AlertCircle, ArrowLeft } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile, updatePassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { uploadImageFromUri } from '../lib/storage';

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
                router.replace('/login');
    } catch {
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
              const imagePath = `users/${auth.currentUser.uid}/avatar_${Date.now()}`;
              const url = await uploadImageFromUri(imageUri, imagePath);
              profileUpdates.photoURL = url;
          }

          if (Object.keys(profileUpdates).length > 0) {
              await updateProfile(auth.currentUser, profileUpdates);
          }

          Alert.alert('Success', 'Profile updated!');
          setIsDirty(false);
          setImageUri(null); // Clear preview
      } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to update profile';
          Alert.alert('Error', message);
      } finally {
          setLoading(false);
      }
  };

  const displayImage = imageUri || user?.photoURL;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <View className="px-6 pb-6 bg-white border-b border-gray-50 flex-row items-end h-28">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 p-3 bg-gray-50 rounded-2xl border border-gray-100">
             <ArrowLeft size={20} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-3xl font-black text-gray-900 flex-1 mb-1">Min profil</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
            <View className="items-center mb-10">
                 <TouchableOpacity onPress={pickImage} className="relative" activeOpacity={0.9}>
                    <View className={`w-44 h-44 rounded-[56px] border-4 shadow-2xl shadow-black/10 overflow-hidden bg-gray-100 ${isDirty && imageUri ? 'border-indigo-400' : 'border-white'}`}>
                        {displayImage ? (
                            <Image source={{ uri: displayImage }} className="w-full h-full" />
                        ) : (
                            <View className="w-full h-full items-center justify-center bg-indigo-50">
                                <User size={64} color="#4F46E5" />
                            </View>
                        )}
                    </View>
                    <View className="absolute bottom-1 right-1 bg-indigo-600 rounded-2xl p-3 border-4 border-white shadow-xl">
                        <Camera size={24} color="white" />
                    </View>
                 </TouchableOpacity>

                 <View className="mt-8 items-center">
                     <Text className="text-3xl font-black text-gray-900">{user?.displayName || 'Bruker'}</Text>
                     <View className="flex-row items-center mt-2 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100">
                         <Mail size={12} color="#9CA3AF" />
                         <Text className="text-gray-400 font-bold text-xs ml-2 tracking-wide">{user?.email}</Text>
                     </View>
                 </View>

                 {isDirty && (
                     <View className="mt-6 bg-amber-50 px-5 py-2 rounded-full border border-amber-100 flex-row items-center animate-pulse">
                         <AlertCircle size={14} color="#B45309" />
                         <Text className="text-amber-700 text-xs font-black uppercase tracking-widest ml-2">Ulagrede endringer</Text>
                     </View>
                 )}
            </View>

            {/* Personal Info */}
            <View className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 mb-6">
                <Text className="text-xl font-black text-gray-900 mb-1">Personlig info</Text>
                <Text className="text-gray-400 text-xs font-bold uppercase mb-8 tracking-widest">Slik ser andre deg i appen</Text>

                <Text className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-4">Visningsnavn</Text>
                <View className="bg-gray-50 border border-gray-100 rounded-[24px] flex-row items-center px-6 py-4 mb-2 shadow-inner">
                    <User size={18} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 ml-4 text-gray-900 text-lg font-bold"
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder="Ditt navn"
                        placeholderTextColor="#9CA3AF"
                    />
                </View>
            </View>

            {/* Security */}
            <View className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 mb-10">
                <Text className="text-xl font-black text-gray-900 mb-1">Sikkerhet</Text>
                <Text className="text-gray-400 text-xs font-bold uppercase mb-8 tracking-widest">Hold kontoen din trygg</Text>

                <Text className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-4">Nytt passord</Text>
                <View className="bg-gray-50 border border-gray-100 rounded-[24px] flex-row items-center px-6 py-4 shadow-inner">
                    <Lock size={18} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 ml-4 text-gray-900 text-lg font-bold"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Minst 6 tegn"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry
                    />
                </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
                onPress={handleSaveChanges}
                disabled={!isDirty || loading}
                activeOpacity={0.8}
                className={`flex-row items-center justify-center py-6 rounded-[32px] shadow-2xl mb-6 ${
                    isDirty ? 'bg-indigo-600 shadow-indigo-200' : 'bg-gray-100 shadow-none border border-gray-200'
                }`}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <>
                        <Save size={24} color={isDirty ? "white" : "#9CA3AF"} />
                        <Text className={`font-black text-lg uppercase tracking-[0.2em] ml-3 ${isDirty ? 'text-white' : 'text-gray-400'}`}>
                            {isDirty ? 'Lagre endringer' : 'Oppdatert'}
                        </Text>
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                onPress={handleSignOut}
                activeOpacity={0.7}
                className="bg-red-50 py-5 rounded-[28px] flex-row items-center justify-center border border-red-100 mb-10"
            >
                <LogOut size={20} color="#EF4444" />
                <Text className="ml-3 text-red-600 font-black uppercase tracking-widest text-sm">Logg ut</Text>
            </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
