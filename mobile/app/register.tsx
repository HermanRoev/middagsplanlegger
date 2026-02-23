import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useRouter } from 'expo-router';
import { Ticket, ArrowRight, LogOut } from 'lucide-react-native';

import { GlassScreen } from '../components/ui/GlassScreen';
import { GlassInput } from '../components/ui/GlassInput';
import { GlassButton } from '../components/ui/GlassButton';

export default function Register() {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // If they got here without an auth session somehow
    if (!auth.currentUser) {
      router.replace('/login');
    }
  }, []);

  const handleRegister = async () => {
    if (!auth.currentUser) {
      setError('Du må logge inn først');
      router.replace('/login');
      return;
    }

    if (!inviteCode) {
      setError('Vennligst oppgi en kode');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const invitesRef = collection(db, 'invites');
      const q = query(invitesRef, where('code', '==', inviteCode), where('used', '==', false));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Ugyldig eller allerede brukt kode.');
      }

      const inviteDoc = querySnapshot.docs[0];
      const user = auth.currentUser;

      // Mark invite as used
      await updateDoc(doc(db, 'invites', inviteDoc.id), {
        used: true,
        usedBy: user.uid,
        usedAt: new Date().toISOString(),
      });

      // Create user profile
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        createdAt: new Date().toISOString()
      });

      router.replace('/(tabs)');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Kunne ikke verifisere kode');
      Alert.alert('Feil', err?.message || 'Kunne ikke verifisere kode');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    auth.signOut();
    router.replace('/login');
  };

  return (
    <GlassScreen bgVariant="glass" safeAreaEdges={['top', 'bottom']}>
      <View className="flex-1 justify-center p-10">
        <TouchableOpacity
          onPress={handleLogout}
          className="absolute top-10 right-5 p-3"
        >
          <LogOut size={24} color="#EF4444" />
        </TouchableOpacity>

        <View className="items-center mb-10">
          <View className="w-20 h-20 bg-indigo-600/10 rounded-3xl items-center justify-center mb-6 shadow-xl shadow-indigo-200 border border-indigo-500/20">
            <Ticket size={36} color="#4F46E5" />
          </View>
          <Text className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight text-center">Bli med</Text>
          <Text className="text-gray-500 text-center text-xs font-bold uppercase tracking-widest">Skriv inn koden for å koble til husholdningen</Text>
        </View>

        <View className="gap-y-5">
          <GlassInput
            placeholder="X X X X X X"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
            leftIcon={<Ticket size={20} color="#9CA3AF" />}
          />

          {error ? (
            <View className="bg-red-500/10 p-4 rounded-2xl flex-row items-center justify-center mt-2 border border-red-500/20">
              <Text className="text-red-600 text-[10px] font-black uppercase tracking-widest text-center">{error}</Text>
            </View>
          ) : null}

          <GlassButton
            title="Sjekk kode"
            variant="primary"
            onPress={handleRegister}
            loading={loading}
            icon={<ArrowRight size={20} color="white" />}
            fullWidth
            className="mt-4 py-4"
          />
        </View>
      </View>
    </GlassScreen>
  );
}
