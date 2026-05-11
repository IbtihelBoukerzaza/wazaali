import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAmPeFHNP97nWdgIP7BHadalAngQqtj31M",
  authDomain: "waze3li.firebaseapp.com",
  projectId: "waze3li",
  storageBucket: "waze3li.firebasestorage.app",
  messagingSenderId: "552654986809",
  appId: "1:552654986809:web:40e803ff110d8e8f4cf7e8",
  measurementId: "G-6ZC8MM3F90"
};

const app = initializeApp(firebaseConfig);

// Initialize auth with AsyncStorage persistence FIRST
// Must use initializeAuth before getAuth to set persistence
let auth;
try {
  const persistence = getReactNativePersistence(AsyncStorage);
  auth = initializeAuth(app, { persistence });
} catch (e) {
  // If already initialized (hot reload), get existing instance
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
