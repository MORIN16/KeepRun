import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAq9nIsbiVhDPD5XFfJRbcCfNQXla6Lrk8",
  authDomain: "keeprunapp.firebaseapp.com",
  projectId: "keeprunapp",
  storageBucket: "keeprunapp.firebasestorage.app",
  messagingSenderId: "94202227841",
  appId: "1:94202227841:web:04a28767019d1aa4d17180",
  measurementId: "G-GQ1SNB1LNC",
};

// Inisialisasi Firebase App
const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export const db = getFirestore(app);

export default app;
