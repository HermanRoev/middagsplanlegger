import React from 'react';
import { View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassHeaderProps {
    title: string;
    subtitle?: string;
    rightAction?: React.ReactNode;
    leftAction?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    transparent?: boolean;
}

export function GlassHeader({
    title,
    subtitle,
    rightAction,
    leftAction,
    style,
    transparent = false
}: GlassHeaderProps) {

    // Transparent headers allow the GlassScreen's gradient to bleed through completely
    const HeaderContent = () => (
        <View className="flex-row items-end justify-between px-6 pb-4 pt-16">
            <View className="flex-row flex-1 items-end gap-x-4">
                {leftAction && (
                    <View className="pb-1">
                        {leftAction}
                    </View>
                )}
                <View className="flex-1 flex-col justify-end">
                    {subtitle && (
                        <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                            {subtitle}
                        </Text>
                    )}
                    <Text className="text-3xl font-black text-gray-900 tracking-tight" numberOfLines={1}>
                        {title}
                    </Text>
                </View>
            </View>

            {rightAction && (
                <View className="ml-4 flex-row gap-x-2 pb-1">
                    {rightAction}
                </View>
            )}
        </View>
    );

    if (transparent) {
        return (
            <View style={style} className="z-10">
                <HeaderContent />
            </View>
        );
    }

    return (
        <View style={style} className="overflow-hidden border-b border-white/30 shadow-sm z-10">
            <BlurView intensity={50} tint="light" className="absolute inset-0 bg-white/60" />
            <HeaderContent />
        </View>
    );
}
