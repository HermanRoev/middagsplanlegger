import { View, Text, TouchableOpacity, Image, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/auth';
import { useRouter } from 'expo-router';
import { User, Camera, Mail, Save, AlertCircle, ArrowLeft } from 'lucide-react-native';
import { GlassScreen } from '../components/ui/GlassScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { uploadImageFromUri } from '../lib/storage';
import { doc, updateDoc } from 'firebase/firestore';

export default function ProfileScreen() {
    const { user, signOut } = useAuth();
    const router = useRouter();

    const [displayName, setDisplayName] = useState(user?.displayName || '');
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
        const imageChanged = !!imageUri;
        setIsDirty(nameChanged || imageChanged);
    }, [displayName, imageUri, user]);

    const handleSignOut = async () => {
        try {
            await signOut();
            router.replace('/login');
        } catch {
            Alert.alert('Feil', 'Kunne ikke logge ut');
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Tilgang kreves', 'Galleritilgang kreves for å endre profilbilde.');
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

                // Sync the changes to the Firestore users collection
                const firestoreUpdates: any = {};
                if (profileUpdates.displayName) firestoreUpdates.name = profileUpdates.displayName;
                if (profileUpdates.photoURL) firestoreUpdates.photoUrl = profileUpdates.photoURL;

                await updateDoc(doc(db, "users", auth.currentUser.uid), firestoreUpdates);
            }

            Alert.alert('Suksess', 'Profilen din ble oppdatert!');
            setIsDirty(false);
            setImageUri(null); // Clear preview
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Kunne ikke oppdatere profilen';
            Alert.alert('Feil', message);
        } finally {
            setLoading(false);
        }
    };

    const displayImage = imageUri || user?.photoURL;

    return (
        <GlassScreen bgVariant="glass" safeAreaEdges={['top']} scrollable keyboardAvoiding>
            {/* Header */}
            <View className="px-5 py-6 flex-row items-center gap-4">
                <TouchableOpacity onPress={() => router.back()} className="p-3 bg-white/40 rounded-2xl border border-white/30">
                    <ArrowLeft size={20} color="#1F2937" />
                </TouchableOpacity>
                <Text className="text-3xl font-black text-gray-900 tracking-tight">Min profil</Text>
            </View>

            <View className="px-5 pb-20 space-y-5">
                {/* Avatar */}
                <View className="items-center py-6">
                    <TouchableOpacity onPress={pickImage} className="relative" activeOpacity={0.9}>
                        <View className={`w-40 h-40 rounded-[48px] border-4 shadow-2xl shadow-black/10 overflow-hidden bg-gray-100 ${isDirty && imageUri ? 'border-indigo-400' : 'border-white'}`}>
                            {displayImage ? (
                                <Image source={{ uri: displayImage }} className="w-full h-full" />
                            ) : (
                                <View className="w-full h-full items-center justify-center bg-indigo-50">
                                    <User size={56} color="#4F46E5" />
                                </View>
                            )}
                        </View>
                        <View className="absolute bottom-1 right-1 bg-indigo-600 rounded-2xl p-3 border-4 border-white shadow-xl">
                            <Camera size={20} color="white" />
                        </View>
                    </TouchableOpacity>

                    <View className="mt-6 items-center">
                        <Text className="text-2xl font-black text-gray-900">{user?.displayName || 'Bruker'}</Text>
                        <View className="flex-row items-center mt-2 bg-white/60 px-4 py-1.5 rounded-full border border-white/40">
                            <Mail size={12} color="#9CA3AF" />
                            <Text className="text-gray-400 font-bold text-xs ml-2">{user?.email}</Text>
                        </View>
                    </View>

                    {isDirty && (
                        <View className="mt-4 bg-amber-50 px-5 py-2 rounded-full border border-amber-100 flex-row items-center">
                            <AlertCircle size={14} color="#B45309" />
                            <Text className="text-amber-700 text-xs font-black uppercase tracking-widest ml-2">Ulagrede endringer</Text>
                        </View>
                    )}
                </View>

                {/* Personal Info Card */}
                <GlassCard>
                    <Text className="text-lg font-black text-gray-900 mb-1">Personlig info</Text>
                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-6">Slik ser andre deg i appen</Text>
                    <Text className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Visningsnavn</Text>
                    <View className="bg-white/60 border border-white/40 rounded-2xl flex-row items-center px-4 py-4">
                        <User size={18} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-3 text-gray-900 text-base font-bold"
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder="Ditt navn"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>
                </GlassCard>

                {/* Save */}
                <GlassButton
                    title={loading ? '' : isDirty ? 'Lagre endringer' : 'Oppdatert'}
                    onPress={handleSaveChanges}
                    disabled={!isDirty || loading}
                    variant="primary"
                    leftIcon={loading ? <ActivityIndicator color="white" size="small" /> : <Save size={20} color="white" />}
                />

                {/* Sign out */}
                <GlassButton
                    title="Logg ut"
                    onPress={handleSignOut}
                    variant="danger"
                />
            </View>
        </GlassScreen>
    );
}
