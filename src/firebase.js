// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ✅ Správná konfigurace (můžeš ji později přesunout do .env)
const firebaseConfig = {
  apiKey: "AIzaSyDqg9OwqoY7rYSF2V30Fo46Tb1PbksCoKw",
  authDomain: "footballmanagerproject.firebaseapp.com",
  projectId: "footballmanagerproject",
  storageBucket: "footballmanagerproject.appspot.com", // 🔹 Oprava tady
  messagingSenderId: "1026110695953",
  appId: "1:1026110695953:web:8d6530def95c3d40345fb0",
};

// Inicializace Firebase aplikace
const app = initializeApp(firebaseConfig);

// Export Auth a Firestore, ať je můžeš používat kdekoliv
export const auth = getAuth(app);
export const db = getFirestore(app);
