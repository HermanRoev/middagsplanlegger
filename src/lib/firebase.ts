// src/lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// TODO: Move to env file
const firebaseConfig = {
    apiKey: "AIzaSyAzvsxM4uwU7VLzd94_GDHujSKmuTR4wzM",
    authDomain: "middagsplanlegger-72a97.firebaseapp.com",
    projectId: "middagsplanlegger-72a97",
    storageBucket: "middagsplanlegger-72a97.firebasestorage.app",
    messagingSenderId: "791365714849",
    appId: "1:791365714849:web:cf22360d9811fe965141e0",
    measurementId: "G-BTVKLNRN1Z"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };