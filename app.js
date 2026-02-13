import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Replace with your Firebase config
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "study-tracker.firebaseapp.com",
  projectId: "study-tracker",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// Login button
document.getElementById("login").onclick = async () => {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
};

// Load board
auth.onAuthStateChanged((user) => {
  if (!user) return;

  const q = query(collection(db, "tasks"), orderBy("createdAt"));

  onSnapshot(q, (snap) => {
    document.getElementById("board").innerHTML =
      snap.docs.map((d) => `<div>${d.data().title}</div>`).join("");
  });
});
``