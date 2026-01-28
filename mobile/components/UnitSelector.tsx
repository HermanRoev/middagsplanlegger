import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { X } from 'lucide-react-native';

const UNITS = ['stk', 'g', 'kg', 'l', 'dl', 'ml', 'ss', 'ts'];

interface UnitSelectorProps {
  visible: boolean;
  onSelect: (unit: string) => void;
  onClose: () => void;
  currentUnit: string;
}

export function UnitSelector({ visible, onSelect, onClose, currentUnit }: UnitSelectorProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/50 p-4">
        <View className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-xl">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-900">Select Unit</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {UNITS.map(unit => (
              <TouchableOpacity
                key={unit}
                onPress={() => { onSelect(unit); onClose(); }}
                className={`px-4 py-3 rounded-xl border ${
                  currentUnit === unit
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'bg-white border-gray-200'
                }`}
              >
                <Text className={`font-semibold ${currentUnit === unit ? 'text-white' : 'text-gray-900'}`}>
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
