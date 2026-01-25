import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { CupboardItem } from '../../../src/types';
import { Package, Plus, Search, Trash2, Camera, X, Video } from 'lucide-react-native';
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
      setNewItemUnit('stk'); // Reset to default
      setIsAdding(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to add item');
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
      Alert.alert('Permission needed', 'Camera permission is required to scan receipts.');
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
        const items = await parseReceiptImageMobile(result.assets[0].uri);
        setScannedItems(items);
      } catch (e) {
        Alert.alert('Error', 'Failed to analyze receipt.');
        setShowScanResult(false);
      } finally {
        setScanning(false);
      }
    }
  };

  const handleScanVideo = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required to scan video.');
          return;
      }

      const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          quality: 0.5,
          videoMaxDuration: 10, // Limit duration to keep upload size manageable
          allowsEditing: true,
      });

      if (!result.canceled && result.assets[0].uri) {
          setScanning(true);
          setShowScanResult(true);
          setScanType('video');
          try {
              const items = await parseCupboardVideoMobile(result.assets[0].uri);
              setScannedItems(items);
          } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to analyze video.');
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
        Alert.alert('Error', 'Failed to save items');
    } finally {
        setScanning(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-4 py-3 bg-white border-b border-gray-100 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-gray-900">Cupboard</Text>
        <View className="flex-row gap-2">
            <TouchableOpacity onPress={handleScanVideo} className="p-2 bg-indigo-50 rounded-full">
                <Video size={20} color="#4F46E5" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleScanReceipt} className="p-2 bg-indigo-50 rounded-full">
                <Camera size={20} color="#4F46E5" />
            </TouchableOpacity>
        </View>
      </View>

      <View className="p-4 bg-white shadow-sm z-10">
        <View className="flex-row bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 items-center mb-3">
             <Search size={18} color="#9CA3AF" />
             <TextInput
                className="flex-1 ml-2 text-gray-900"
                placeholder="Search pantry..."
                placeholderTextColor="#9CA3AF"
                value={searchTerm}
                onChangeText={setSearchTerm}
             />
        </View>
        <TouchableOpacity
            onPress={() => setIsAdding(!isAdding)}
            className="flex-row items-center justify-center bg-indigo-600 py-3 rounded-xl"
        >
            <Plus size={18} color="white" />
            <Text className="text-white font-bold ml-2">Add Manual Item</Text>
        </TouchableOpacity>

        {isAdding && (
             <View className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <TextInput
                    className="bg-white border border-gray-200 rounded-lg p-2 mb-2"
                    placeholder="Item Name"
                    value={newItemName}
                    onChangeText={setNewItemName}
                />
                <View className="flex-row gap-2 mb-2">
                    <TextInput
                        className="flex-1 bg-white border border-gray-200 rounded-lg p-2"
                        placeholder="Amount"
                        keyboardType="numeric"
                        value={newItemAmount}
                        onChangeText={setNewItemAmount}
                    />
                </View>

                {/* Unit Chips */}
                <View className="mb-4">
                  <Text className="text-xs text-gray-500 font-bold mb-2 uppercase">Unit</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {UNITS.map(unit => (
                      <TouchableOpacity
                        key={unit}
                        onPress={() => setNewItemUnit(unit)}
                        className={`mr-2 px-3 py-1.5 rounded-full border ${
                          newItemUnit === unit
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <Text className={`text-xs font-semibold ${newItemUnit === unit ? 'text-white' : 'text-gray-600'}`}>
                          {unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <TouchableOpacity onPress={handleAddItem} className="bg-green-600 py-2 rounded-lg items-center">
                    <Text className="text-white font-bold">Save Item</Text>
                </TouchableOpacity>
             </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" className="mt-10" color="#4F46E5" />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View className="flex-row justify-between items-center bg-white p-4 rounded-xl mb-3 shadow-sm border border-gray-100">
                <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-amber-50 rounded-full items-center justify-center mr-3">
                        <Package size={20} color="#D97706" />
                    </View>
                    <View>
                        <Text className="font-semibold text-gray-900 text-lg">{item.ingredientName}</Text>
                        <Text className="text-gray-500">{item.amount} {item.unit}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)} className="p-2">
                    <Trash2 size={18} color="#EF4444" opacity={0.7} />
                </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
              <View className="items-center justify-center py-10 opacity-50">
                  <Package size={48} color="#9CA3AF" />
                  <Text className="mt-2 text-gray-500">Your cupboard is empty</Text>
              </View>
          }
        />
      )}

      {/* Scan Results Modal */}
      <Modal visible={showScanResult} animationType="slide" presentationStyle="pageSheet">
          <View className="flex-1 bg-white p-6">
              <View className="flex-row justify-between items-center mb-6">
                  <Text className="text-2xl font-bold">
                    {scanType === 'receipt' ? 'Receipt Scan' : 'Video Scan'} Results
                  </Text>
                  <TouchableOpacity onPress={() => setShowScanResult(false)}>
                      <X size={24} color="#1F2937" />
                  </TouchableOpacity>
              </View>

              {scanning ? (
                  <View className="flex-1 justify-center items-center">
                      <ActivityIndicator size="large" color="#4F46E5" />
                      <Text className="mt-4 text-gray-500">Analyzing {scanType}...</Text>
                  </View>
              ) : (
                  <>
                      <Text className="text-green-600 font-bold mb-4">Found {scannedItems.length} items</Text>
                      <FlatList
                          data={scannedItems}
                          keyExtractor={(i, idx) => idx.toString()}
                          renderItem={({item}) => (
                              <View className="flex-row justify-between py-3 border-b border-gray-100">
                                  <Text className="font-medium">{item.name}</Text>
                                  <Text className="text-gray-500">{item.amount} {item.unit}</Text>
                              </View>
                          )}
                      />
                      <TouchableOpacity
                          onPress={saveScannedItems}
                          className="bg-indigo-600 py-4 rounded-xl items-center mt-4 mb-8"
                      >
                          <Text className="text-white font-bold text-lg">Add All to Cupboard</Text>
                      </TouchableOpacity>
                  </>
              )}
          </View>
      </Modal>
    </View>
  );
}
