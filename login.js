import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
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

// Utility functions
function formatPatchNoteBody(body) {
  const formattedBody = body
    .split('\n')
    .map(line => {
      if (line.startsWith('-')) {
        return `<li>${line.slice(1).trim()}</li>`;
      }
      return line.trim() ? `<p>${line}</p>` : '';
    })
    .join('<br>');
  return formattedBody;
}

function formatDate(epoch) {
  if (epoch.toString().length === 10) {
    epoch = epoch * 1000;
  }
  const date = new Date(epoch);
  if (isNaN(date)) {
    return 'Invalid Date';
  }
  return date.toLocaleDateString('en-GB');
}

// Load Patch Notes
async function loadPatchNotes() {
  try {
    const notesRef = ref(db, "patchnotes");
    const snapshot = await get(notesRef);

    if (snapshot.exists()) {
      const notes = snapshot.val();
      const sorted = Object.entries(notes).sort((a, b) => b[0].localeCompare(a[0]));

      for (const [epochTime, { title, body }] of sorted) {
        const li = document.createElement("li");
        const formattedDate = formatDate(Number(epochTime));
        const formattedBody = formatPatchNoteBody(body);
        li.innerHTML = `
          <strong>${formattedDate} - ${title}</strong><br>
          ${formattedBody}
        `;
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

// Call the function to load patch notes
loadPatchNotes();

// Toggle Login/Signup forms
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
    .then((userCredential) => {
      console.log("Account created!");

      // Send verification email
      sendEmailVerification(userCredential.user)
        .then(() => {
          console.log("Verification email sent.");
          alert("Signup successful! Please check your email to verify your account before logging in.");
          window.location.href = "login.html"; // Send them back to login screen
        })
        .catch((error) => {
          console.error("Error sending verification email:", error);
          errorMessage.textContent = "Error sending verification email. Please contact support.";
        });
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
    .then((userCredential) => {
      const user = userCredential.user;
      if (user.emailVerified) {
        console.log("Logged in and verified!");
        window.location.href = "index.html";
      } else {
        console.warn("Email not verified.");
        errorMessage.textContent = "Please verify your email before logging in.";
        auth.signOut(); // Sign out unverified users immediately
      }
    })
    .catch((error) => {
      console.error("Login failed:", error);
      errorMessage.textContent = error.message;
    });
});

// Redirect if already logged in and verified
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (user.emailVerified) {
      console.log("Already logged in and verified, redirecting...");
      window.location.href = "index.html";
    } else {
      console.warn("Logged in but email not verified. Signing out...");
      auth.signOut(); // Don't let unverified users linger
    }
  } else {
    console.log("No user authenticated, staying on login page.");
  }
});
