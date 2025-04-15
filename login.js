import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
  } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
  import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
  
  // Firebase config
  const firebaseConfig = {
    apiKey: "AIzaSyAia2iO0Qx7AmJxXlbG5BK60VRJSZ2Srh8",
    authDomain: "tgbinder-8e3c6.firebaseapp.com",
    databaseURL: "https://tgbinder-8e3c6-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "tgbinder-8e3c6",
    storageBucket: "tgbinder-8e3c6.appspot.com",
    messagingSenderId: "903450561301",
    appId: "1:903450561301:web:df2407af369db0895bb71c",
  };
  
  // Init Firebase
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  const auth = getAuth(app);
  
  // DOM elements
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const login = document.getElementById("login");
  const signup = document.getElementById("signup");
  const showSignup = document.getElementById("show-signup");
  const showLogin = document.getElementById("show-login");
  const errorMessage = document.getElementById("errorMessage");
  
  // Show/hide forms
  showSignup.addEventListener("click", () => {
    loginForm.style.display = "none";
    signupForm.style.display = "block";
  });
  
  showLogin.addEventListener("click", () => {
    signupForm.style.display = "none";
    loginForm.style.display = "block";
  });
  
  // Signup
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
  
  // Login
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
    }
  });
  