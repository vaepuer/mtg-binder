import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { firebaseConfig } from "./firebaseConfig.js";

// Initialize Firebase
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
const patchList = document.getElementById("patchList");

// Load Patch Notes
async function loadPatchNotes() {
  try {
    const notesRef = ref(db, "patchnotes");
    const snapshot = await get(notesRef);
    if (snapshot.exists()) {
      const notes = snapshot.val();
      const sorted = Object.entries(notes).sort((a, b) => b[0].localeCompare(a[0]));

      patchList.innerHTML = ""; // Clear list before appending
      for (const [id, note] of sorted) {
        const { title, body, date } = note;
        const displayDate = date || new Date(parseInt(id)).toISOString().split("T")[0];

        const li = document.createElement("li");
        li.innerHTML = `<strong>${displayDate} - ${title}</strong><br>${body}`;
        patchList.appendChild(li);
      }
    } else {
      patchList.innerHTML = "<li>No patch notes yet.</li>";
    }
  } catch (err) {
    console.error("Error loading patch notes:", err);
    patchList.innerHTML = "<li>Error loading patch notes.</li>";
  }
}

loadPatchNotes();

// Toggle Login/Signup forms based on hash
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

document.addEventListener("DOMContentLoaded", toggleFormsByHash);
window.addEventListener("hashchange", toggleFormsByHash);

showSignup.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.hash = "#signup";
});

showLogin.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.hash = "#login";
});

// Signup Handler
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

// Login Handler
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

// Redirect if already logged in
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Already logged in, redirecting...");
    window.location.href = "index.html";
  } else {
    console.log("No user authenticated, staying on login page.");
  }
});
