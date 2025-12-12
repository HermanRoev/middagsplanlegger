import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChefHat, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react-native';

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
    } catch (err: any) {
      console.error(err);
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
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 p-8 justify-center">

            {/* Header Section */}
            <View className="items-center mb-12">
              <View className="w-20 h-20 bg-indigo-50 rounded-3xl items-center justify-center mb-6 shadow-sm transform rotate-3">
                <ChefHat size={40} color="#4F46E5" />
              </View>
              <Text className="text-3xl font-bold text-gray-900 mb-2">Welcome Back!</Text>
              <Text className="text-gray-500 text-center">
                Sign in to manage your recipes and meal plans
              </Text>
            </View>

            {/* Form Section */}
            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1.5 ml-1">Email</Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 focus:border-indigo-500 focus:bg-white transition-all">
                  <Mail size={20} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-3 text-gray-900 text-base"
                    placeholder="Enter your email"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1.5 ml-1">Password</Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 focus:border-indigo-500 focus:bg-white transition-all">
                  <Lock size={20} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-3 text-gray-900 text-base"
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              {error ? (
                <View className="bg-red-50 p-3 rounded-lg flex-row items-center justify-center">
                  <Text className="text-red-600 text-sm font-medium">{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                className={`bg-indigo-600 rounded-xl py-4 flex-row justify-center items-center shadow-lg shadow-indigo-200 mt-4 ${
                  loading ? 'opacity-70' : ''
                }`}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text className="text-white font-bold text-lg mr-2">Sign In</Text>
                    <ArrowRight size={20} color="white" />
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View className="mt-8 flex-row justify-center">
              <Text className="text-gray-500">Don't have an account? </Text>
              <Text className="text-indigo-600 font-semibold">Contact Admin</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
