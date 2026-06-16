import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDF7mM_TMjxI6QviBck5RxvT8y8cfF27nY",
  authDomain: "zona-radashi-app.firebaseapp.com",
  projectId: "zona-radashi-app",
  storageBucket: "zona-radashi-app.firebasestorage.app",
  messagingSenderId: "694078209257",
  appId: "1:694078209257:web:dabd65fa36a02f6a0e0478",
  measurementId: "G-BY2DK5HRYQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
