import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, Keyboard } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { CupboardItem } from '../../../src/types';
import { Package, Plus, Search, Trash2, Camera, X, Video, CheckCircle2 } from 'lucide-react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { parseReceiptImageMobile, parseCupboardVideoMobile } from '../../lib/gemini-mobile';
import { GlassScreen } from '../../components/ui/GlassScreen';
import { GlassHeader } from '../../components/ui/GlassHeader';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassInput } from '../../components/ui/GlassInput';

const UNITS = ['stk', 'g', 'kg', 'l', 'dl', 'ml', 'ss', 'ts'];

export default function Cupboard() {
  const { user, householdId } = useAuth();
  const [items, setItems] = useState<CupboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Add Item State
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('stk');

  // Scanning State
  const [scanning, setScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<{ name: string, amount: number, unit: string }[]>([]);
  const [showScanResult, setShowScanResult] = useState(false);
  const [scanType, setScanType] = useState<'receipt' | 'video' | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'cupboard'), where('householdId', '==', householdId), orderBy('ingredientName'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CupboardItem));
      setItems(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddItem = async () => {
    if (!newItemName.trim() || !user) return;
    try {
      await addDoc(collection(db, 'cupboard'), {
        userId: user.uid,
        householdId: householdId,
        ingredientName: newItemName,
        amount: parseFloat(newItemAmount) || 0,
        unit: newItemUnit,
        wantedAmount: 0,
        threshold: 0
      });
      setNewItemName('');
      setNewItemAmount('');
      setNewItemUnit('stk');
      setIsAdding(false);
      Keyboard.dismiss();
    } catch (e) {
      console.error(e);
      Alert.alert('Feil', 'Kunne ikke legge til vare');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'cupboard', id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleScanReceipt = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Tilgang kreves', 'Vi trenger tilgang til kameraet for å skanne kvitteringer.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: false,
    });

    if (!result.canceled && result.assets[0].uri) {
      setScanning(true);
      setShowScanResult(true);
      setScanType('receipt');
      try {
        const resultItems = await parseReceiptImageMobile(result.assets[0].uri);
        setScannedItems(resultItems);
      } catch (e) {
        console.error(e);
        Alert.alert('Feil', 'Kunne ikke analysere kvittering');
        setShowScanResult(false);
      } finally {
        setScanning(false);
      }
    }
  };

  const handleScanVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Tilgang kreves', 'Vi trenger tilgang til kameraet for å skanne video.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.5,
      videoMaxDuration: 10,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0].uri) {
      setScanning(true);
      setShowScanResult(true);
      setScanType('video');
      try {
        const resultItems = await parseCupboardVideoMobile(result.assets[0].uri);
        setScannedItems(resultItems);
      } catch (e) {
        console.error(e);
        Alert.alert('Feil', 'Kunne ikke analysere video');
        setShowScanResult(false);
      } finally {
        setScanning(false);
      }
    }
  };

  const saveScannedItems = async () => {
    if (!user || scannedItems.length === 0) return;
    setScanning(true);
    try {
      const batch = writeBatch(db);
      scannedItems.forEach(item => {
        const ref = doc(collection(db, "cupboard"));
        batch.set(ref, {
          userId: user.uid,
          householdId: householdId,
          ingredientName: item.name,
          amount: item.amount,
          unit: item.unit,
          wantedAmount: 0,
          threshold: 0
        });
      });
      await batch.commit();
      setScannedItems([]);
      setShowScanResult(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Feil', 'Kunne ikke lagre varene');
    } finally {
      setScanning(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <GlassScreen bgVariant="glass" safeAreaEdges={['top']}>
      <GlassHeader
        title="Matbod"
        subtitle={`${items.length} varer på lager`}
        transparent
        rightAction={
          <>
            <GlassButton variant="icon" icon={<Video size={20} color="#6366F1" />} onPress={handleScanVideo} />
            <GlassButton variant="icon" icon={<Camera size={20} color="#6366F1" />} onPress={handleScanReceipt} />
            <GlassButton variant="primary" icon={<Plus size={20} color="white" />} onPress={() => setIsAdding(!isAdding)} />
          </>
        }
      />

      <View className="px-6 mb-2">
        <GlassInput
          placeholder="Søk i matboden..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          leftIcon={<Search size={18} color="#9CA3AF" />}
        />
      </View>

      {loading ? (
        <View className="py-20 items-center">
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <Animated.FlatList
          data={filteredItems}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          itemLayoutAnimation={LinearTransition}
          renderItem={({ item }) => (
            <Animated.View entering={FadeInDown} exiting={FadeOutUp}>
              <GlassCard className="flex-row justify-between items-center p-5 mb-3">
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 bg-white/60 rounded-2xl items-center justify-center mr-4 border border-white/40 shadow-sm">
                    <Package size={24} color="#6366F1" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-black text-gray-900 text-lg leading-tight" numberOfLines={1}>{item.ingredientName}</Text>
                    {item.amount && item.amount > 0 ? (
                      <View className="flex-row items-center mt-1">
                        <View className="bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100/50">
                          <Text className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">{item.amount} {item.unit}</Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>
                <GlassButton
                  variant="ghost"
                  icon={<Trash2 size={20} color="#EF4444" />}
                  onPress={() => handleDelete(item.id)}
                  className="ml-2 px-2 py-2"
                />
              </GlassCard>
            </Animated.View>
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-24 opacity-30">
              <Package size={80} color="#9CA3AF" />
              <Text className="text-gray-500 font-black uppercase tracking-widest mt-4">Boden er tom</Text>
            </View>
          }
        />
      )}

      {/* Add Item Overlay */}
      {isAdding && (
        <View className="absolute inset-0 bg-black/40 z-50 justify-end">
          <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={() => setIsAdding(false)} />
          <View className="bg-white/95 p-8 rounded-t-[40px] shadow-2xl">
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-2xl font-black text-gray-900 uppercase tracking-tight">Legg til vare</Text>
              <GlassButton variant="icon" icon={<X size={20} color="#9CA3AF" />} onPress={() => setIsAdding(false)} />
            </View>

            <View className="space-y-4 mb-10">
              <GlassInput
                placeholder="Varenavn (f.eks. Melk)"
                value={newItemName}
                onChangeText={setNewItemName}
                autoFocus
              />
              <View className="flex-row gap-x-3 mt-4">
                <GlassInput
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                  placeholder="Antall"
                  keyboardType="numeric"
                  value={newItemAmount}
                  onChangeText={setNewItemAmount}
                />
                <GlassCard className="flex-[2] py-2 px-1 flex-row flex-wrap justify-center items-center shadow-sm">
                  {UNITS.slice(0, 4).map(unit => (
                    <TouchableOpacity
                      key={unit}
                      onPress={() => setNewItemUnit(unit)}
                      className={`px-3 py-2 m-1 rounded-xl ${newItemUnit === unit ? 'bg-indigo-600 shadow-md shadow-indigo-200' : 'bg-transparent'}`}
                    >
                      <Text className={`text-[11px] font-black uppercase ${newItemUnit === unit ? 'text-white' : 'text-gray-500'}`}>{unit}</Text>
                    </TouchableOpacity>
                  ))}
                </GlassCard>
              </View>

              <View className="mt-8">
                <GlassButton
                  title="Lagre vare"
                  variant="primary"
                  fullWidth
                  onPress={handleAddItem}
                />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Scan Results Modal */}
      <Modal visible={showScanResult} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowScanResult(false)}>
        <GlassScreen bgVariant="glass" safeAreaEdges={[]}>
          <GlassHeader
            title="Resultater"
            subtitle={scanType === 'receipt' ? 'Kvittering' : 'Video-skann'}
            transparent
            rightAction={<GlassButton variant="icon" icon={<X size={20} color="#1F2937" />} onPress={() => setShowScanResult(false)} />}
          />

          {scanning ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text className="mt-6 font-black text-indigo-900/40 uppercase tracking-widest text-xs">Analyserer {scanType === 'receipt' ? 'kvittering' : 'video'}...</Text>
            </View>
          ) : (
            <View className="flex-1 p-6">
              <GlassCard className="mb-6">
                <View className="flex-row items-center gap-x-4">
                  <View className="w-12 h-12 bg-emerald-500/20 rounded-2xl items-center justify-center border border-emerald-500/30">
                    <CheckCircle2 size={24} color="#10B981" />
                  </View>
                  <Text className="text-xl font-black text-gray-900">Fant {scannedItems.length} varer</Text>
                </View>
              </GlassCard>

              <FlatList
                data={scannedItems}
                keyExtractor={(i, idx) => idx.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <GlassCard className="flex-row justify-between items-center py-4 px-5 mb-3">
                    <Text className="text-lg font-bold text-gray-700">{item.name}</Text>
                    <View className="bg-white/40 px-3 py-1.5 rounded-xl border border-white/60">
                      <Text className="text-xs font-black text-indigo-700 uppercase">{item.amount} {item.unit}</Text>
                    </View>
                  </GlassCard>
                )}
              />

              <View className="pt-8 pb-10">
                <GlassButton
                  title="Legg til alt i boden"
                  variant="primary"
                  fullWidth
                  onPress={saveScannedItems}
                />
              </View>
            </View>
          )}
        </GlassScreen>
      </Modal>
    </GlassScreen>
  );
}
