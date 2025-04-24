import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { firebaseConfig } from "./firebaseConfig.js";

// Init Firebase app
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const input = document.getElementById("usernameInput");
const saveBtn = document.getElementById("saveUsernameBtn");
const msg = document.getElementById("settingsMessage");
const greeting = document.getElementById("greeting");
const spinner = document.getElementById("spinner");

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      location.href = "login.html";
      return;
    }

    const usernameRef = ref(db, `users/${user.uid}/username`);
    try {
      const snapshot = await get(usernameRef);
      if (snapshot.exists()) {
        const username = snapshot.val();
        greeting.textContent = `Hello, ${username}!`;
      } else {
        greeting.textContent = `Hello, friend!`;
      }
    } catch (error) {
      console.error("Error fetching username:", error);
      greeting.textContent = `Hello, user!`;
    }
  });
});

// Handle save button
saveBtn.addEventListener("click", async () => {
    const username = input.value.trim();
    msg.textContent = "";
  
    if (!/^[A-Za-z0-9_]{3,}$/.test(username)) {
      msg.textContent = "Username must be 3+ chars (letters, numbers, underscore).";
      return;
    }
  
    const unameRef = ref(db, `usernames/${username}`);
    const snap = await get(unameRef);
  
    if (snap.exists()) {
      msg.textContent = "That username’s already taken.";
      return;
    }
  
    const uid = auth.currentUser?.uid;
    if (!uid) {
      msg.textContent = "You must be logged in.";
      return;
    }
  
    try {
      const userRef = ref(db, `users/${uid}/username`);
      const oldSnap = await get(userRef);
  
      // If the username is the same as the previous one, no need to update
      if (oldSnap.exists() && oldSnap.val() === username) {
        msg.textContent = "You already have that username!";
        return;
      }
  
      // 🔁 Remove old username if one existed
      if (oldSnap.exists()) {
        const oldUsername = oldSnap.val();
        await set(ref(db, `usernames/${oldUsername}`), null); // Remove old username from usernames node
      }
  
      // ✅ Save new username in both spots
      await set(unameRef, uid);
      await set(userRef, username);
  
      msg.textContent = "✅ Username saved!";
      
      // Show spinner while waiting
      const spinner = document.getElementById("spinner");
      if (spinner) spinner.classList.remove("hidden");
  
      // Reload page after 1 second to show changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error("Error saving username:", err);
      msg.textContent = "❌ Failed to save. Try again.";
    }
  });
  
  
  
