import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Ticket, ArrowRight } from 'lucide-react-native';

export default function Register() {
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleRegister = async () => {
    if (!inviteCode || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const invitesRef = collection(db, 'invites');
      const q = query(invitesRef, where('code', '==', inviteCode), where('used', '==', false));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Invalid or used invite code.');
      }

      const inviteDoc = querySnapshot.docs[0];
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateDoc(doc(db, 'invites', inviteDoc.id), {
        used: true,
        usedBy: user.uid,
        usedAt: new Date().toISOString(),
      });

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        createdAt: new Date().toISOString(),
      });

      router.replace('/(tabs)');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to register');
      Alert.alert('Error', err?.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 p-8 justify-center">
            <View className="items-center mb-10">
              <Text className="text-3xl font-bold text-gray-900 mb-2">Create Account</Text>
              <Text className="text-gray-500 text-center">You need an invite code to continue.</Text>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1.5 ml-1">Invite Code</Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5">
                  <Ticket size={20} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-3 text-gray-900 text-base uppercase tracking-widest"
                    placeholder="Invite Code"
                    placeholderTextColor="#9CA3AF"
                    value={inviteCode}
                    onChangeText={setInviteCode}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1.5 ml-1">Email</Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5">
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
                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5">
                  <Lock size={20} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-3 text-gray-900 text-base"
                    placeholder="Min. 6 characters"
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
                onPress={handleRegister}
                disabled={loading}
                className={`bg-indigo-600 rounded-xl py-4 flex-row justify-center items-center shadow-lg shadow-indigo-200 mt-4 ${
                  loading ? 'opacity-70' : ''
                }`}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text className="text-white font-bold text-lg mr-2">Create Account</Text>
                    <ArrowRight size={20} color="white" />
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View className="mt-8 flex-row justify-center">
              <Text className="text-gray-500">Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text className="text-indigo-600 font-semibold">Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
