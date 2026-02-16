// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCg8y5huPb-KiuqWWFZlbQqQq0HOubJhr0",
  authDomain: "screen-golf-hq-central.firebaseapp.com",
  projectId: "screen-golf-hq-central",
  storageBucket: "screen-golf-hq-central.firebasestorage.app",
  messagingSenderId: "824852063284",
  appId: "1:824852063284:web:f92661e3a19c7d83d39661"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
