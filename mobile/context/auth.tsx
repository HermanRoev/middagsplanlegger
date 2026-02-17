import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signOut: async () => {}
});

export function useAuth() {
  return useContext(AuthContext);
}

function useProtectedRoute(user: User | null, loading: boolean) {
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  // Stabilize dependencies: extract primitive values so useEffect doesn't fire
  // on every render due to new array/object references from useSegments/useRootNavigationState
  const segment = segments[0];
  const navigationReady = !!rootNavigationState?.key;

  useEffect(() => {
    if (loading || !navigationReady) return;

    const inAuthGroup = segment === '(tabs)';

    if (!user && inAuthGroup) {
      router.replace('/login');
    } else if (user && segment === 'login') {
      router.replace('/(tabs)/');
    }
  }, [user, segment, navigationReady, loading]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Update: Pass the loading state to the hook
  useProtectedRoute(user, loading);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  // Memoize context value to prevent unnecessary re-renders in all consumers.
  // Without this, every component using useAuth() re-renders whenever AuthProvider re-renders,
  // even if user/loading haven't changed — because a new object reference is created each time.
  const value = useMemo(() => ({ user, loading, signOut }), [user, loading, signOut]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
