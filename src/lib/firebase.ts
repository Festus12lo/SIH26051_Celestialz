import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, browserSessionPersistence, setPersistence, type Auth } from "firebase/auth";

// Your web app's Firebase configuration
// Ensure you have these environment variables set in your .env.local file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
let app;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

try {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    // Use session persistence - user is signed out when browser tab closes
    setPersistence(auth, browserSessionPersistence).catch((err) => {
      console.warn("Could not set browser session persistence:", err);
    });
    googleProvider = new GoogleAuthProvider();
  } else {
    console.warn("Firebase API Key is missing. Authentication will not work until you configure your .env.local file.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
}

export { auth, googleProvider };
