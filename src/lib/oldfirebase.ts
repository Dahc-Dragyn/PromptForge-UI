// lib/firebase.js

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAbVS9JiCsDTbhmmq2zJL2QR8SrStblg90", // Replace with your actual keys from .env
  authDomain: "promptforge-c27e8.firebaseapp.com",
  projectId: "promptforge-c27e8",
  storageBucket: "promptforge-c27e8.firebasestorage.app",
  messagingSenderId: "1098334131721",
  appId: "1:1098334131721:web:4090937731a3f92505cad8",
  measurementId: "G-H5PJCVW4V3"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };