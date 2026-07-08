import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// Configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyBdFuIVrTKDjPjcUHKzUk9cBXK3VwobItU",
  authDomain: "quanlylophoc-1fc26.firebaseapp.com",
  projectId: "quanlylophoc-1fc26",
  storageBucket: "quanlylophoc-1fc26.firebasestorage.app",
  messagingSenderId: "325807308272",
  appId: "1:325807308272:web:9d30a494ef44a25405b135"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Collection and Document paths to save the state
// We'll store under a unique document to prevent collision and allow simple full-state synchronization
export const STATE_DOC_REF = doc(db, "edu_track_ai", "app_state");

/**
 * Robust helper to load the state from Firestore.
 */
export async function loadStateFromFirestore(): Promise<any | null> {
  try {
    const docSnap = await getDoc(STATE_DOC_REF);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    console.warn("Could not load state from Firestore, using Express/local storage fallback:", error);
  }
  return null;
}

/**
 * Robust helper to save state to Firestore.
 */
export async function saveStateToFirestore(state: any): Promise<boolean> {
  try {
    await setDoc(STATE_DOC_REF, state);
    return true;
  } catch (error) {
    console.warn("Could not save state to Firestore:", error);
    return false;
  }
}
