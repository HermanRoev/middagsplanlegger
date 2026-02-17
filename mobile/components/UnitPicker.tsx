import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';

const UNITS = ['g', 'kg', 'l', 'dl', 'stk', 'ts', 'ss'] as const;

type Unit = (typeof UNITS)[number];

type UnitPickerProps = {
  value: string;
  onChange: (value: Unit) => void;
  className?: string;
};

export default function UnitPicker({ value, onChange, className }: UnitPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <View className={className}>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-3"
        accessibilityRole="button"
        accessibilityLabel="Unit"
      >
        <Text className="text-gray-900 text-center flex-1">{value}</Text>
        <ChevronDown size={16} color="#6B7280" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/30" onPress={() => setOpen(false)}>
          <View className="flex-1 justify-end">
            <View className="bg-white rounded-t-3xl p-4">
              <Text className="text-sm font-semibold text-gray-500 uppercase mb-3">Unit</Text>
              <ScrollView className="max-h-64">
                {UNITS.map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    onPress={() => {
                      onChange(unit);
                      setOpen(false);
                    }}
                    className="flex-row items-center justify-between px-4 py-3 rounded-xl"
                  >
                    <Text className="text-base text-gray-900">{unit}</Text>
                    {value === unit && <Check size={18} color="#4F46E5" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
