// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyApDZ5ddxJUqhJdvX8SiM3glJjeHE7g43U",
  authDomain: "clinicsync-62b40.firebaseapp.com",
  projectId: "clinicsync-62b40",
  storageBucket: "clinicsync-62b40.firebasestorage.app",
  messagingSenderId: "371279618180",
  appId: "1:371279618180:web:2dc76b34a5aa1a2b42a2d1",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);



//Registeration functionality
const register = document.getElementById("create-account");
if(register){
  register.addEventListener("click", function (event) {
  event.preventDefault();

  const email = document.getElementById("reg_email").value;
  const password = document.getElementById("reg_password").value;
  const isAdmin = document.getElementById("regAsAdmin").checked;
  const role = isAdmin ? "admin" : "DoctorNurse";

  createUserWithEmailAndPassword(getAuth(app), email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      var userData = {
        email: user.email,
        uid: user.uid,
        role: role
      }
      const docRef = doc(db, "users", user.uid);
      setDoc(docRef, userData)
        .then(() => {
          console.log("User data written to Firestore successfully");
          
        })
        .catch((error) => {
          console.error("Error writing user data to Firestore:", error);
        });
      alert("User registered successfully: UID : " + user.uid + " Email: " + user.email + " Role: " + userData.role);
      
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.error("Error registering user:", errorCode, errorMessage);
    });
});
}

//Login functionality
const login = document.getElementById("login-button");

if (login) {
  login.addEventListener("click", function (event) {
    event.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    signInWithEmailAndPassword(getAuth(app), email, password)
      .then((userCredential) => {
        const user = userCredential.user;

        // Get user role from Firestore
        const db = getFirestore(app);
        const userDocRef = doc(db, "users", user.uid);

        getDoc(userDocRef)
          .then((docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data();
              alert("User logged in successfully: " + user.email);

              if (userData.role === "admin") {
                window.location.href = "../Pages/Admin/AdminHome.html";
              } else {
                window.location.href = "../Pages/DoctorNurse/DoctorNurseDashboard.html";
              }
            } else {
              console.error("No user data found in Firestore.");
              alert("Login failed: user data not found.");
            }
          })
          .catch((error) => {
            console.error("Error fetching user data from Firestore:", error);
            alert("Login failed: could not get user data.");
          });
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error("Error logging in user:", errorCode, errorMessage);
        alert("Login failed: " + errorMessage);
      });
  });
}


//Log Out functionality
const logoutButton = document.getElementById("logout-button");
if(logoutButton){
  logoutButton.addEventListener("click", function (event) {
    event.preventDefault();
    signOut(getAuth(app))
      .then(() => {
        alert("User logged out successfully");
        window.location.href = "../../Login.html"; // Redirect to login page
        console.log("User logged out successfully" + user.email);
      })
      .catch((error) => {
        console.error("Error logging out user:", error);
      });
  });
}

// Only run this code on protected pages
if (!window.location.pathname.includes("Login.html") && !window.location.pathname.includes("Register.html")) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "../../Login.html";
    } else {
      console.log("User is logged in:", user.email);
    }
  });
}


export { db, auth};