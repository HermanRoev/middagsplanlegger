import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

interface AuthContextType {
  user: User | null;
  hasProfile: boolean;
  householdId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  hasProfile: false,
  householdId: null,
  loading: true,
  signOut: async () => { }
});

export function useAuth() {
  return useContext(AuthContext);
}

function useProtectedRoute(user: User | null, hasProfile: boolean, loading: boolean) {
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  const segment = segments[0];
  const navigationReady = !!rootNavigationState?.key;

  useEffect(() => {
    if (loading || !navigationReady) return;

    const inAuthGroup = segment === '(tabs)';
    const isLoginPage = segment === 'login';
    const isRegisterPage = segment === 'register';

    if (!user && inAuthGroup) {
      // Not logged in but trying to access tabs
      router.replace('/login');
    } else if (user && !hasProfile && !isRegisterPage) {
      // Logged in but missing profile, send to gatekeeper
      router.replace('/register');
    } else if (user && hasProfile && (isLoginPage || isRegisterPage)) {
      // Logged in and has profile, redirect to tabs
      router.replace('/(tabs)/');
    }
  }, [user, hasProfile, segment, navigationReady, loading]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useProtectedRoute(user, hasProfile, loading);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setHasProfile(true);
            setHouseholdId(userDoc.data().householdId || null);
          } else {
            setHasProfile(false);
            setHouseholdId(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setHasProfile(false);
          setHouseholdId(null);
        }
      } else {
        setUser(null);
        setHasProfile(false);
        setHouseholdId(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const value = useMemo(() => ({ user, hasProfile, householdId, loading, signOut }), [user, hasProfile, householdId, loading, signOut]);

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
