import React from 'react';
import { View, StyleProp, ViewStyle, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

interface GlassCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    className?: string; // Appended to inner content container
    onPress?: () => void;
    blurIntensity?: number;
    blurTint?: 'light' | 'dark' | 'default';
}

export function GlassCard({
    children,
    style,
    className = "",
    onPress,
    blurIntensity = 40,
    blurTint = 'light'
}: GlassCardProps) {
    const scale = useSharedValue(1);

    const handlePressIn = () => {
        if (onPress) {
            scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
        }
    };

    const handlePressOut = () => {
        if (onPress) {
            scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        }
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    // The core glass styling is a mix of expo-blur, semi-transparent backgrounds, and an inner white border.
    const CardContent = () => (
        <View className="overflow-hidden rounded-[32px] border border-white/40 shadow-sm" style={style}>
            <BlurView intensity={blurIntensity} tint={blurTint} className="absolute inset-0 bg-white/40" />
            <View className={`p-6 ${className}`}>
                {children}
            </View>
        </View>
    );

    if (onPress) {
        return (
            <Animated.View style={animatedStyle} className="mb-4">
                <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
                    <CardContent />
                </Pressable>
            </Animated.View>
        );
    }

    return (
        <View className="mb-4">
            <CardContent />
        </View>
    );
}
