import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth, Persistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

// Manual implementation of React Native Persistence for Firebase v11+
// as getReactNativePersistence is no longer exported in the JS SDK.
const reactNativePersistence = (storage: typeof AsyncStorage): Persistence => {
  return {
    type: 'LOCAL',
    _isAvailable: async () => true,
    _set: async (key: string, value: any) => {
      try {
        await storage.setItem(key, JSON.stringify(value));
      } catch {}
    },
    _get: async (key: string) => {
      try {
        const json = await storage.getItem(key);
        return json ? JSON.parse(json) : null;
      } catch {
        return null;
      }
    },
    _remove: async (key: string) => {
      try {
        await storage.removeItem(key);
      } catch {}
    },
    _addListener: () => {},
    _removeListener: () => {},
  } as unknown as Persistence;
};

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: reactNativePersistence(AsyncStorage),
  });
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };
