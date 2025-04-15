import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  initializeApp,
  getApps
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  remove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { firebaseConfig } from "./firebaseConfig.js";

// Init Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getDatabase(app);

// ✅ LOGOUT BUTTON FUNCTIONALITY
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      signOut(auth)
        .then(() => {
          console.log("User signed out.");
          window.location.href = "login.html";
        })
        .catch((error) => {
          console.error("Logout error:", error);
        });
    });
  } else {
    console.warn("Logout button not found.");
  }
});
