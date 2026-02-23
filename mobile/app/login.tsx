import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, } from 'react-native';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useRouter } from 'expo-router';
import { ChefHat, Chrome } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

import { GlassScreen } from '../components/ui/GlassScreen';
import { GlassButton } from '../components/ui/GlassButton';

// Required for web browser auth sessions to close correctly
WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Initialize Google Auth Request
  // Replace these with your actual Android/iOS/Web Client IDs from Firebase Console -> Project Settings -> General -> Web App / iOS / Android App
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "ANDROID_CLIENT_ID", // TODO: Configure inside Google Cloud Console
    iosClientId: "IOS_CLIENT_ID",         // TODO: Configure inside Google Cloud Console
    webClientId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID, // Temp placeholder until real web client id is provisioned.
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    } else if (response?.type === 'error') {
      setError('Google login ble avbrutt eller feilet.');
    }
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    setLoading(true);
    setError('');

    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);

      // Check if user has a document in Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

      if (userDoc.exists()) {
        router.replace('/(tabs)');
      } else {
        router.push('/register');
      }
    } catch (_err: unknown) {
      console.error(_err);
      setError('Kunne ikke logge inn med Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassScreen bgVariant="glass" safeAreaEdges={['top', 'bottom']}>
      <View className="flex-1 justify-center p-10">
        {/* Header Section */}
        <View className="items-center mb-16">
          <View className="w-24 h-24 bg-indigo-600/10 rounded-[32px] items-center justify-center mb-8 shadow-xl shadow-indigo-200 transform rotate-3 border border-indigo-500/20">
            <ChefHat size={48} color="#4F46E5" />
          </View>
          <Text className="text-4xl font-black text-gray-900 mb-3 tracking-tight uppercase">Velkommen</Text>
          <Text className="text-gray-500 font-bold text-center leading-5 uppercase tracking-widest text-[10px]">
            Logg inn for å planlegge dine måltider
          </Text>
        </View>

        {/* Form Section */}
        <View className="gap-y-6">
          {error ? (
            <View className="bg-red-500/10 p-5 rounded-2xl flex-row items-center justify-center border border-red-500/20">
              <Text className="text-red-600 text-[10px] font-black uppercase tracking-widest">{error}</Text>
            </View>
          ) : null}

          <GlassButton
            title="Logg inn med Google"
            variant="primary"
            onPress={() => promptAsync()}
            loading={loading || !request}
            icon={<Chrome size={20} color="white" />}
            fullWidth
            className="mt-2 py-4"
          />
        </View>
      </View>
    </GlassScreen>
  );
}
