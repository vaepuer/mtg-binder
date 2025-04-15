import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

// Handle login
document.getElementById('login')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      window.location.href = "index.html";
    })
    .catch((error) => alert("Login failed: " + error.message));
});

// Handle signup
document.getElementById('signup')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('signup-username').value;
  const password = document.getElementById('signup-password').value;

  createUserWithEmailAndPassword(auth, email, password)
    .then(() => {
      window.location.href = "index.html";
    })
    .catch((error) => alert("Signup failed: " + error.message));
});

// Auth check (optional, could redirect if already logged in)
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Already logged in, redirecting...");
    window.location.href = "index.html";
  }
});
