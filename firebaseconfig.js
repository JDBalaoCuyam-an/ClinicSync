// Import Firebase SDKs
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
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ Create Account WITHOUT Logging Out Admin
const register = document.getElementById("create-account");
if (register) {
  register.addEventListener("click", async function (event) {
    event.preventDefault();

    // Get Current Admin Session
    const admin = auth.currentUser;
    const adminEmail = admin.email;
    const adminPassword = prompt("Enter your Admin password:");

    // Get new user data
    const email = document.getElementById("reg_email").value;
    const password = document.getElementById("reg_password").value;
    const isAdmin = document.getElementById("regAsAdmin").checked;
    const role = isAdmin ? "admin" : "DoctorNurse";

    const firstName = document.getElementById("first_name").value;
    const middleName = document.getElementById("middle_name").value;
    const lastName = document.getElementById("last_name").value;
    const extName = document.getElementById("ext_name").value;
    const contact = document.getElementById("contact_number").value;

    try {
      // ✅ Create new Firebase Auth user (This logs in NEW user)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // ✅ Save user info in Firestore
      await setDoc(doc(db, "users", newUser.uid), {
        email: newUser.email,
        uid: newUser.uid,
        role: role,
        firstName,
        middleName: middleName || "",
        lastName,
        extName: extName || "",
        contact,
        createdAt: new Date(),
      });

      alert("✅ User Created Successfully!");

      // ✅ IMPORTANT: SIGN BACK IN THE ADMIN
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      console.log("✅ Admin session restored!");

    } catch (error) {
      console.error("Error creating account:", error);
      alert("❌ Failed: " + error.message);
    }
  });
}

// ✅ Login Functionality
const login = document.getElementById("login-button");
if (login) {
  login.addEventListener("click", function (event) {
    event.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    signInWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;

        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          alert("✅ Logged in as " + user.email);
          window.location.href =
            userData.role === "admin"
              ? "Pages/Admin/AdminHome.html"
              : "Pages/DoctorNurse/DoctorNurseDashboard.html";
        } else {
          alert("❌ No user data found!");
        }
      })
      .catch((error) => {
        alert("❌ Login error: " + error.message);
      });
  });
}

// ✅ Logout
const logoutButton = document.getElementById("logout-button");
if (logoutButton) {
  logoutButton.addEventListener("click", function (e) {
    e.preventDefault();
    signOut(auth).then(() => {
      alert("Logged out!");
      window.location.href = "../../Login.html";
    });
  });
}

// ✅ Prevent access without login
if (!window.location.pathname.includes("Login.html")) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "../../Login.html";
    }else{
      console.log("User is logged in:", user.email);
    }
  });
}

export { db, auth };
