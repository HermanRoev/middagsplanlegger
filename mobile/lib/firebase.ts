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

class ReactNativePersistence implements Persistence {
  static type: 'LOCAL' = 'LOCAL';
  type: 'LOCAL' = 'LOCAL';

  constructor(private storage: typeof AsyncStorage) {}

  async _isAvailable() {
    return true;
  }

  async _set(key: string, value: unknown) {
    try {
      await this.storage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  async _get(key: string) {
    try {
      const json = await this.storage.getItem(key);
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  }

  async _remove(key: string) {
    try {
      await this.storage.removeItem(key);
    } catch {}
  }

  _addListener(_key: string, _listener: (value: unknown) => void) {
    // Listener implementation if needed, but usually not for local storage persistence in this context
  }

  _removeListener(_key: string, _listener: (value: unknown) => void) {
    // Listener implementation if needed
  }
}

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: new ReactNativePersistence(AsyncStorage),
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
