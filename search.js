import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

const firebaseConfig = {
    apiKey: "AIzaSyAia2iO0Qx7AmJxXlbG5BK60VRJSZ2Srh8",
    authDomain: "tgbinder-8e3c6.firebaseapp.com",
    databaseURL: "https://tgbinder-8e3c6-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "tgbinder-8e3c6",
    storageBucket: "tgbinder-8e3c6.appspot.com",
    messagingSenderId: "903450561301",
    appId: "1:903450561301:web:df2407af369db0895bb71c",
  };

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

document.getElementById("searchBtn").addEventListener("click", () => {
  const username = document.getElementById("usernameSearch").value.trim();
  const usersRef = ref(db, "users");

  get(usersRef).then(snapshot => {
    let foundUid = null;
    snapshot.forEach(child => {
      const data = child.val();
      if (data.username?.toLowerCase() === username.toLowerCase() && data.public) {
        foundUid = child.key;
      }
    });

    if (foundUid) {
      // ✅ Load their binder
      window.location.href = `view.html?uid=${foundUid}`;
    } else {
      document.getElementById("searchResults").textContent = "❌ No public user found by that name.";
    }
  });
});
