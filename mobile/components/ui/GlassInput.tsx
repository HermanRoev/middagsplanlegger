import React from 'react';
import { View, TextInput, TextInputProps, StyleProp, ViewStyle, TouchableOpacity, Text } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassInputProps extends TextInputProps {
    containerStyle?: StyleProp<ViewStyle>;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    onRightIconPress?: () => void;
    error?: string;
}

export const GlassInput = React.forwardRef<TextInput, GlassInputProps>(({
    containerStyle,
    leftIcon,
    rightIcon,
    onRightIconPress,
    error,
    ...props
}, ref) => {
    return (
        <View style={containerStyle} className="mb-4">
            <View className={`flex-row items-center overflow-hidden rounded-[24px] border ${error ? 'border-red-400' : 'border-white/50'} shadow-sm min-h-[56px]`}>
                <BlurView intensity={30} tint="light" className="absolute inset-0 bg-white/40" />

                {leftIcon && (
                    <View className="pl-4 pr-2">
                        {leftIcon}
                    </View>
                )}

                <TextInput
                    ref={ref}
                    {...props}
                    className={`flex-1 h-full font-bold text-gray-900 py-4 ${!leftIcon ? 'pl-5' : ''} ${!rightIcon ? 'pr-5' : ''}`}
                    placeholderTextColor="#9CA3AF"
                />

                {rightIcon && (
                    <TouchableOpacity
                        onPress={onRightIconPress}
                        disabled={!onRightIconPress}
                        className="pr-4 pl-2"
                    >
                        {rightIcon}
                    </TouchableOpacity>
                )}
            </View>

            {error && (
                <View className="mt-1.5 ml-2">
                    <Text className="text-red-500 text-xs font-bold">{error}</Text>
                </View>
            )}
        </View>
    );
});

export default GlassInput;
