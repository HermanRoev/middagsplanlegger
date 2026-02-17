import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChefHat, Mail, Lock, ArrowRight } from 'lucide-react-native';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/(tabs)');
    } catch (_err: unknown) {
      console.error(_err);
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View className="flex-1 p-10 justify-center">

            {/* Header Section */}
            <View className="items-center mb-16">
              <View className="w-24 h-24 bg-indigo-50 rounded-[32px] items-center justify-center mb-8 shadow-xl shadow-indigo-100 transform rotate-3 border border-indigo-100">
                <ChefHat size={48} color="#4F46E5" />
              </View>
              <Text className="text-4xl font-black text-gray-900 mb-3 tracking-tight uppercase">Velkommen</Text>
              <Text className="text-gray-400 font-bold text-center leading-5 uppercase tracking-widest text-[10px]">
                Logg inn for å planlegge dine måltider
              </Text>
            </View>

            {/* Form Section */}
            <View className="gap-y-6">
              <View>
                <Text className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-6">E-post</Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-[28px] px-6 py-5 shadow-inner">
                  <Mail size={20} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-4 text-gray-900 text-lg font-bold"
                    placeholder="Din e-post"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View>
                <Text className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-6">Passord</Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-[28px] px-6 py-5 shadow-inner">
                  <Lock size={20} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-4 text-gray-900 text-lg font-bold"
                    placeholder="Ditt passord"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              {error ? (
                <View className="bg-red-50 p-5 rounded-[24px] flex-row items-center justify-center border border-red-100">
                  <Text className="text-red-600 text-xs font-black uppercase tracking-widest">{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
                className={`bg-indigo-600 rounded-[32px] py-6 flex-row justify-center items-center shadow-2xl shadow-indigo-200 mt-6 ${
                  loading ? 'opacity-70' : ''
                }`}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text className="text-white font-black text-lg uppercase tracking-[0.2em] mr-3">Logg inn</Text>
                    <ArrowRight size={22} color="white" />
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View className="mt-12 flex-row justify-center bg-gray-50 py-4 rounded-2xl border border-gray-100">
              <Text className="text-gray-400 font-bold text-xs uppercase tracking-widest">Mangler du konto? </Text>
              <TouchableOpacity>
                <Text className="text-indigo-600 font-black text-xs uppercase tracking-widest">Kontakt admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
