import { View, Platform, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassSurfaceProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}

export function GlassSurface({ children, style, intensity = 25 }: GlassSurfaceProps) {
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} tint="systemMaterial" style={style}>
        {children}
      </BlurView>
    );
  }

  return <View style={style}>{children}</View>;
}
