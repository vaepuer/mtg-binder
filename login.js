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

// Utility function to convert newlines to <br> tags and handle paragraphs and lists
function formatPatchNoteBody(body) {
  const formattedBody = body
    .split('\n')  // Split content by newline characters
    .map(line => {
      if (line.startsWith('-')) {
        // Convert lines starting with "-" into list items
        return `<li>${line.slice(1).trim()}</li>`;
      }
      return line.trim() ? `<p>${line}</p>` : ''; // Wrap non-empty lines in <p> tags
    })
    .join('<br>');  // Join all pieces back together with <br> tags

  return formattedBody;
}

function formatDate(epoch) {
  // Check if the epoch time is in seconds (Firebase default), multiply by 1000 to convert to milliseconds
  if (epoch.toString().length === 10) {
    epoch = epoch * 1000;
  }

  const date = new Date(epoch);  // Convert epoch time to a Date object

  // Check if the date is valid
  if (isNaN(date)) {
    return 'Invalid Date';
  }

  return date.toLocaleDateString('en-GB');  // Format to YYYY-MM-DD
}

// Load Patch Notes
async function loadPatchNotes() {
  try {
    const notesRef = ref(db, "patchnotes"); // Reference to the patchnotes data in Firebase
    const snapshot = await get(notesRef);  // Get data from the Firebase reference

    if (snapshot.exists()) {
      const notes = snapshot.val();  // If data exists, get the notes
      const sorted = Object.entries(notes).sort((a, b) => b[0].localeCompare(a[0]));  // Sort notes by date (descending)

      // Loop through each note and render it on the page
      for (const [epochTime, { title, body }] of sorted) {
        const li = document.createElement("li");
      
        const formattedDate = formatDate(Number(epochTime));  // Convert string key to number
        const formattedBody = formatPatchNoteBody(body);
      
        li.innerHTML = `
          <strong>${formattedDate} - ${title}</strong><br>
          ${formattedBody}
        `;
      
        patchList.appendChild(li);
      }
    } else {
      patchList.innerHTML = "<li>No patch notes yet.</li>";  // If no patch notes exist, show a message
    }
  } catch (err) {
    console.error("Error loading patch notes:", err);  // Catch and log any errors
    patchList.innerHTML = "<li>Error loading patch notes.</li>";  // Show error message if there is a problem
  }
}

// Call the function to load patch notes when the page loads
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
