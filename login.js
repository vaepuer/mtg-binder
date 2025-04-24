import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { firebaseConfig } from "./firebaseConfig.js";

// Init Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);
const auth = getAuth(app);
console.log("Firebase initialized:", app);

// DOM elements
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const login = document.getElementById("login");
const signup = document.getElementById("signup");
const showSignup = document.getElementById("show-signup");
const showLogin = document.getElementById("show-login");
const errorMessage = document.getElementById("errorMessage");

// Hash-based toggle logic
function toggleFormsByHash() {
  const hash = window.location.hash;
  if (hash === "#signup") {
    loginForm.style.display = "none";
    signupForm.style.display = "block";
  } else {
    signupForm.style.display = "none";
    loginForm.style.display = "block";
  }
}

// On DOM load, check hash
document.addEventListener("DOMContentLoaded", () => {
  toggleFormsByHash(); // Check on page load
});

// On hash change (e.g., clicking links)
window.addEventListener("hashchange", toggleFormsByHash);

// Toggle via in-page links
showSignup.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.hash = "#signup";
});

showLogin.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.hash = "#login";
});

// Signup handler
signup?.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  createUserWithEmailAndPassword(auth, email, password)
    .then(() => {
      console.log("Account created!");
      window.location.href = "index.html";
    })
    .catch((error) => {
      console.error("Signup failed:", error);
      errorMessage.textContent = error.message;
    });
});

// Login handler
login?.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      console.log("Logged in!");
      window.location.href = "index.html";
    })
    .catch((error) => {
      console.error("Login failed:", error);
      errorMessage.textContent = error.message;
    });
});

// Auto-redirect if already logged in
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Already logged in, redirecting...");
    console.log("User is authenticated:", user.uid);
    window.location.href = "index.html";
  } else {
    console.log("No user authenticated, staying on login page.");
  }
});
