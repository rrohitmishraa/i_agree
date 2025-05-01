import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCJcWXMZnecglLxKNRSHCS0yELNEY7ZZ1k",
  authDomain: "i-agree1.firebaseapp.com",
  projectId: "i-agree1",
  storageBucket: "i-agree1.appspot.com",
  messagingSenderId: "664633244779",
  appId: "1:664633244779:web:433782175cdff3dd6c452e",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider, signInWithPopup };
