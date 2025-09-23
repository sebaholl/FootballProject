
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyDqg9OwqoY7rYSF2V30Fo46Tb1PbksCoKw",
  authDomain: "footballmanagerproject.firebaseapp.com",
  projectId: "footballmanagerproject",
  storageBucket: "footballmanagerproject.firebasestorage.app",
  messagingSenderId: "1026110695953",
  appId: "1:1026110695953:web:8d6530def95c3d40345fb0"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

