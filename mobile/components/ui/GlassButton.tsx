import React from 'react';
import { Text, TouchableOpacity, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

interface GlassButtonProps {
    title?: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
    icon?: React.ReactNode;
    fullWidth?: boolean;
    loading?: boolean;
    disabled?: boolean;
    className?: string;
    style?: StyleProp<ViewStyle>;
}

export function GlassButton({
    title,
    onPress,
    variant = 'primary',
    icon,
    fullWidth = false,
    loading = false,
    disabled = false,
    className = '',
    style,
}: GlassButtonProps) {
    const scale = useSharedValue(1);

    const handlePressIn = () => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    // Variant Styling
    let buttonStyle = "flex-row items-center justify-center overflow-hidden ";
    let contentStyle = "px-6 py-4 flex-row items-center justify-center ";
    let textStyle = "text-base font-black tracking-wider uppercase ";
    let spinnerColor = "#FFFFFF";

    switch (variant) {
        case 'primary':
            buttonStyle += "rounded-[28px] border border-indigo-200/50 shadow-lg shadow-indigo-300/30";
            contentStyle += "bg-indigo-600/90";
            textStyle += "text-white";
            spinnerColor = "#FFFFFF";
            break;
        case 'secondary':
            buttonStyle += "rounded-[28px] border border-white/60 shadow-sm";
            contentStyle += "bg-white/50";
            textStyle += "text-indigo-900";
            spinnerColor = "#4F46E5";
            break;
        case 'danger':
            buttonStyle += "rounded-[28px] border border-red-200/50 shadow-lg shadow-red-200/30";
            contentStyle += "bg-red-500/90";
            textStyle += "text-white";
            spinnerColor = "#FFFFFF";
            break;
        case 'ghost':
            buttonStyle += "rounded-[28px]";
            contentStyle += "bg-transparent";
            textStyle += "text-gray-500 hover:text-gray-800";
            spinnerColor = "#6B7280";
            break;
        case 'icon':
            buttonStyle += "rounded-[20px] border border-white/60 shadow-sm";
            contentStyle = "p-3 flex items-center justify-center bg-white/50";
            break;
    }

    if (fullWidth) buttonStyle += " w-full";
    if (disabled || loading) buttonStyle += " opacity-60";

    const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

    return (
        <AnimatedTouchable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
            activeOpacity={0.9}
            style={[animatedStyle, style]}
            className={`${buttonStyle} ${className}`}
        >
            {/* The Blur Layer runs behind the absolute content layer for secondary/icon buttons */}
            {(variant === 'secondary' || variant === 'icon') && (
                <BlurView intensity={30} tint="light" className="absolute inset-0" />
            )}

            <Animated.View className={contentStyle} style={{ width: '100%' }}>
                {loading ? (
                    <ActivityIndicator color={spinnerColor} size="small" />
                ) : (
                    <>
                        {icon && <Animated.View className={title ? "mr-2" : ""}>{icon}</Animated.View>}
                        {title && <Text className={textStyle}>{title}</Text>}
                    </>
                )}
            </Animated.View>
        </AnimatedTouchable>
    );
}
