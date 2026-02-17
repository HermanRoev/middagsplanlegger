import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { CupboardItem } from '../../../src/types';
import { Package, Plus, Search, Trash2, Camera, X, Video, CheckCircle2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { parseReceiptImageMobile, parseCupboardVideoMobile } from '../../lib/gemini-mobile';

const UNITS = ['stk', 'g', 'kg', 'l', 'dl', 'ml', 'ss', 'ts'];

export default function Cupboard() {
  const { user } = useAuth();
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
  const [scannedItems, setScannedItems] = useState<{name: string, amount: number, unit: string}[]>([]);
  const [showScanResult, setShowScanResult] = useState(false);
  const [scanType, setScanType] = useState<'receipt' | 'video' | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'cupboard'), where('userId', '==', user.uid), orderBy('ingredientName'));
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
    <View className="flex-1 bg-white">
      <View className="bg-white px-6 pb-4 pt-16 border-b border-gray-200 flex-row justify-between items-end">
        <View>
          <Text className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{items.length} varer på lager</Text>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">Matbod</Text>
        </View>
        <View className="flex-row gap-x-2">
            <TouchableOpacity 
                onPress={handleScanVideo} 
                className="p-3 bg-gray-50 rounded-2xl border border-gray-100"
                activeOpacity={0.7}
            >
                <Video size={20} color="#6366F1" />
            </TouchableOpacity>
            <TouchableOpacity 
                onPress={handleScanReceipt} 
                className="p-3 bg-gray-50 rounded-2xl border border-gray-100"
                activeOpacity={0.7}
            >
                <Camera size={20} color="#6366F1" />
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => setIsAdding(!isAdding)}
                className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200"
                activeOpacity={0.8}
            >
                <Plus size={20} color="white" />
            </TouchableOpacity>
        </View>
      </View>

      <View className="p-6 bg-white border-b border-gray-200">
        <View className="flex-row bg-gray-50 border border-gray-100 rounded-[20px] px-4 py-3 items-center">
             <Search size={18} color="#9CA3AF" />
             <TextInput
                className="flex-1 ml-3 text-gray-900 font-bold"
                placeholder="Søk i matboden..."
                placeholderTextColor="#9CA3AF"
                value={searchTerm}
                onChangeText={setSearchTerm}
             />
        </View>
      </View>

      {loading ? (
        <View className="py-20 items-center">
            <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View className="flex-row justify-between items-center bg-white p-5 rounded-[28px] mb-4 shadow-sm border border-gray-100">
                <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 bg-amber-50 rounded-2xl items-center justify-center mr-4">
                        <Package size={24} color="#D97706" />
                    </View>
                    <View className="flex-1">
                        <Text className="font-black text-gray-900 text-lg leading-tight" numberOfLines={1}>{item.ingredientName}</Text>
                        <View className="flex-row items-center mt-1">
                            <View className="bg-indigo-50 px-2 py-0.5 rounded-md">
                                <Text className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{item.amount} {item.unit}</Text>
                            </View>
                        </View>
                    </View>
                </View>
                <TouchableOpacity 
                    onPress={() => handleDelete(item.id)} 
                    className="p-3 bg-red-50 rounded-xl ml-2"
                    activeOpacity={0.6}
                >
                    <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
            </View>
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
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="bg-white p-8 rounded-t-[40px] shadow-2xl"
              >
                  <View className="flex-row justify-between items-center mb-8">
                      <Text className="text-2xl font-black text-gray-900 uppercase tracking-tight">Legg til vare</Text>
                      <TouchableOpacity onPress={() => setIsAdding(false)} className="bg-gray-100 p-2 rounded-full">
                          <X size={24} color="#9CA3AF" />
                      </TouchableOpacity>
                  </View>
                  
                  <View className="space-y-4 mb-10">
                    <TextInput
                        className="bg-gray-50 border border-gray-100 rounded-[24px] p-6 text-lg font-medium text-gray-900 shadow-inner"
                        placeholder="Varenavn (f.eks. Melk)"
                        placeholderTextColor="#9CA3AF"
                        value={newItemName}
                        onChangeText={setNewItemName}
                        autoFocus
                    />
                    <View className="flex-row gap-x-3">
                        <TextInput
                            className="flex-1 bg-gray-50 border border-gray-100 rounded-[20px] p-4 text-base font-bold text-gray-900 shadow-inner"
                            placeholder="Antall"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            value={newItemAmount}
                            onChangeText={setNewItemAmount}
                        />
                        <View className="flex-[2] bg-gray-50 border border-gray-100 rounded-[20px] p-1 flex-row flex-wrap justify-center items-center">
                            {UNITS.slice(0, 4).map(unit => (
                                <TouchableOpacity 
                                    key={unit} 
                                    onPress={() => setNewItemUnit(unit)}
                                    className={`px-3 py-1.5 m-1 rounded-xl ${newItemUnit === unit ? 'bg-indigo-600' : 'bg-white border border-gray-100'}`}
                                >
                                    <Text className={`text-[10px] font-black uppercase ${newItemUnit === unit ? 'text-white' : 'text-gray-400'}`}>{unit}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                    
                    <TouchableOpacity
                        onPress={handleAddItem}
                        className="bg-indigo-600 py-5 rounded-[24px] items-center shadow-lg shadow-indigo-200 mt-4"
                    >
                        <Text className="text-white font-black text-lg uppercase tracking-widest">Lagre vare</Text>
                    </TouchableOpacity>
                  </View>
              </KeyboardAvoidingView>
          </View>
      )}

      {/* Scan Results Modal */}
      <Modal visible={showScanResult} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowScanResult(false)}>
          <View className="flex-1 bg-white">
              <View className="px-8 pt-12 pb-6 flex-row justify-between items-center border-b border-gray-200">
                  <View>
                    <Text className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">{scanType === 'receipt' ? 'Kvittering' : 'Video-skann'}</Text>
                    <Text className="text-3xl font-black text-gray-900 uppercase tracking-tight">Resultater</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowScanResult(false)} className="bg-gray-100 p-3 rounded-full">
                      <X size={24} color="#1F2937" />
                  </TouchableOpacity>
              </View>

              {scanning ? (
                  <View className="flex-1 justify-center items-center">
                      <ActivityIndicator size="large" color="#4F46E5" />
                      <Text className="mt-6 font-black text-gray-400 uppercase tracking-widest text-xs">Analyserer {scanType === 'receipt' ? 'kvittering' : 'video'}...</Text>
                  </View>
              ) : (
                  <View className="flex-1 p-8">
                      <View className="flex-row items-center gap-x-3 mb-8">
                        <View className="w-12 h-12 bg-emerald-50 rounded-2xl items-center justify-center">
                            <CheckCircle2 size={24} color="#10B981" />
                        </View>
                        <Text className="text-lg font-black text-gray-900">Fant {scannedItems.length} varer</Text>
                      </View>

                      <FlatList
                          data={scannedItems}
                          keyExtractor={(i, idx) => idx.toString()}
                          showsVerticalScrollIndicator={false}
                          renderItem={({item}) => (
                              <View className="flex-row justify-between items-center py-5 border-b border-gray-200">
                                  <Text className="text-lg font-bold text-gray-700">{item.name}</Text>
                                  <View className="bg-indigo-50 px-3 py-1.5 rounded-xl">
                                    <Text className="text-xs font-black text-indigo-600 uppercase">{item.amount} {item.unit}</Text>
                                  </View>
                              </View>
                          )}
                      />
                      
                      <View className="pt-8 pb-10">
                        <TouchableOpacity
                            onPress={saveScannedItems}
                            className="bg-indigo-600 py-6 rounded-[32px] items-center shadow-2xl shadow-indigo-200"
                        >
                            <Text className="text-white font-black text-xl uppercase tracking-widest">Legg til alt</Text>
                        </TouchableOpacity>
                      </View>
                  </View>
              )}
          </View>
      </Modal>
    </View>
  );
}
