import React from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, RefreshControl, StyleProp, ViewStyle, StyleSheet, ImageBackground } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

interface GlassScreenProps {
    children: React.ReactNode;
    scrollable?: boolean;
    className?: string; // Appended to inner content container
    refreshing?: boolean;
    onRefresh?: () => void;
    safeAreaEdges?: Edge[];
    contentContainerStyle?: StyleProp<ViewStyle>;
    bgVariant?: 'light' | 'dark' | 'glass';
}

export function GlassScreen({
    children,
    scrollable = true,
    className = "",
    refreshing = false,
    onRefresh,
    safeAreaEdges = ['top', 'bottom', 'left', 'right'],
    contentContainerStyle,
    bgVariant = 'glass'
}: GlassScreenProps) {

    // Stunning gradient backgrounds
    const renderBackground = () => {
        if (bgVariant === 'glass') {
            return (
                <View style={StyleSheet.absoluteFill}>
                    <LinearGradient
                        colors={['#FFFFFF', '#F9FAFB', '#F3F4F6']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    <View className="absolute top-[-20%] left-[-10%] w-[120%] h-[50%] bg-indigo-100/40 rounded-full blur-3xl opacity-60" />
                    <View className="absolute bottom-[-10%] right-[-20%] w-[100%] h-[60%] bg-purple-100/30 rounded-full blur-3xl opacity-50" />
                </View>
            )
        }
        if (bgVariant === 'dark') {
            return (
                <LinearGradient
                    colors={['#111827', '#0F172A', '#020617']}
                    style={StyleSheet.absoluteFill}
                />
            )
        }
        return <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F9FAFB' }]} />;
    }

    const content = scrollable ? (
        <ScrollView
            contentContainerStyle={[contentContainerStyle, { flexGrow: 1 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" /> : undefined}
        >
            <View className={`flex-1 ${className}`}>
                {children}
            </View>
        </ScrollView>
    ) : (
        <View className={`flex-1 ${className}`}>
            {children}
        </View>
    );

    return (
        <View className="flex-1">
            {renderBackground()}
            <SafeAreaView edges={safeAreaEdges} className="flex-1">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    {content}
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}
