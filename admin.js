import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, remove, update, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your Firebase config object (replace with your actual config)
const firebaseConfig = {
    apiKey: "AIzaSyAia2iO0Qx7AmJxXlbG5BK60VRJSZ2Srh8",
    authDomain: "tgbinder-8e3c6.firebaseapp.com",
    databaseURL: "https://tgbinder-8e3c6-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "tgbinder-8e3c6",
    storageBucket: "tgbinder-8e3c6.appspot.com",
    messagingSenderId: "903450561301",
    appId: "1:903450561301:web:df2407af369db0895bb71c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// DOM Elements
const adminPatchList = document.getElementById("adminPatchList");
const newPatchForm = document.getElementById("newPatchForm");
const patchTitle = document.getElementById("patchTitle");
const patchBody = document.getElementById("patchBody");
const errorMessage = document.getElementById("errorMessage");

// Firebase database reference
const db = getDatabase();
const auth = getAuth();

// Load and display patch notes
function loadAdminPatchNotes() {
  const patchRef = ref(db, "patchnotes");
  onValue(patchRef, (snapshot) => {
    adminPatchList.innerHTML = "";  // Clear previous list
    if (snapshot.exists()) {
      const notes = snapshot.val();
      const sorted = Object.entries(notes).sort((a, b) => b[0].localeCompare(a[0]));
      for (const [id, { title, body, date }] of sorted) {
        const li = document.createElement("li");
        li.innerHTML = `
          <strong>${date || id} - ${title}</strong><br>${body}<br>
          <button onclick="deleteNote('${id}')">Delete</button>
          <button onclick="editNotePrompt('${id}', '${title.replace(/'/g, "\\'")}', \`${body.replace(/`/g, "\\`")}\`)">Edit</button>
          <hr>
        `;
        adminPatchList.appendChild(li);
      }
    } else {
      adminPatchList.innerHTML = "<li>No patch notes found.</li>";
    }
  });
}

// Add new patch note
newPatchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = patchTitle.value;
  const body = patchBody.value;

  if (!title || !body) {
    errorMessage.textContent = "Both title and body are required!";
    return;
  }

    const newPatchId = Date.now(); // Always unique
    const readableDate = new Date().toISOString().split("T")[0];
    set(ref(db, `patchnotes/${newPatchId}`), {
        title,
        body,
        date: readableDate
    })

    .then(() => {
      patchTitle.value = "";
      patchBody.value = "";
      errorMessage.textContent = "";
      loadAdminPatchNotes();  // Reload list after adding
    })
    .catch((error) => {
      console.error("Error adding patch note:", error);
      errorMessage.textContent = "Error adding patch note!";
    });
});

// Delete patch note
window.deleteNote = function (id) {
  if (confirm("Are you sure you want to delete this patch note?")) {
    remove(ref(db, `patchnotes/${id}`))
      .then(() => {
        console.log("Deleted");
        loadAdminPatchNotes();  // Reload list after deletion
      })
      .catch((err) => console.error("Error deleting:", err));
  }
};

// Edit patch note
window.editNotePrompt = function (id, currentTitle, currentBody) {
  const newTitle = prompt("Edit Title:", currentTitle);
  if (!newTitle) return;
  const newBody = prompt("Edit Body:", currentBody);
  if (!newBody) return;

  update(ref(db, `patchnotes/${id}`), {
    title: newTitle,
    body: newBody
  })
    .then(() => {
      console.log("Updated");
      loadAdminPatchNotes();  // Reload list after update
    })
    .catch((err) => console.error("Error updating:", err));
};

// Check if the user is an admin
onAuthStateChanged(auth, (user) => {
  if (user) {
    const userRef = ref(db, `users/${user.uid}`);
    get(userRef).then((snapshot) => {
      if (snapshot.exists() && snapshot.val().role === "admin") {
        loadAdminPatchNotes();
      } else {
        alert("You must be an admin to access this page.");
        window.location.href = "login.html";
      }
    });
  } else {
    alert("You must be logged in as admin to view this page.");
    window.location.href = "login.html";
  }
});
