import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAB64yG_TBCEbqbarm3INXlLApLDOIHScI",
  authDomain: "amir-finance-b4624.firebaseapp.com",
  projectId: "amir-finance-b4624",
  storageBucket: "amir-finance-b4624.firebasestorage.app",
  messagingSenderId: "139112619519",
  appId: "1:139112619519:web:787377725c81c6c0d1dbca",
  measurementId: "G-9EGRWLBC1P",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const DOC_REF = doc(db, 'finance', 'amir');

export async function loadData(fallback) {
  try {
    const snap = await getDoc(DOC_REF);
    if (snap.exists()) {
      return { ...fallback, ...snap.data() };
    }
  } catch (e) {
    console.error('Firestore load error:', e);
  }
  return fallback;
}

export async function saveData(data) {
  try {
    await setDoc(DOC_REF, data);
    return true;
  } catch (e) {
    console.error('Firestore save error:', e);
    return false;
  }
}
