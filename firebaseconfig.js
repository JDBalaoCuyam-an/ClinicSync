// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
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

// ✅ Login Functionality with Loading State
const login = document.getElementById("login-button");
if (login) {
  login.addEventListener("click", async function (event) {
    event.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    // Disable button & show loading text
    login.disabled = true;
    const originalText = login.textContent;
    login.textContent = "Logging in... ⏳";

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const userDocRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();

        // Reactivate if disabled
        if (userData.disabled === true) {
          await setDoc(
            userDocRef,
            { disabled: false, disabledAt: null },
            { merge: true }
          );
        }

        // Update last login timestamp
        await setDoc(userDocRef, { lastLogin: new Date() }, { merge: true });

        // Redirect based on role
        window.location.href =
          userData.user_type === "admin"
            ? "Pages/Admin/AdminHome.html"
            : userData.user_type === "doctor" || userData.user_type === "nurse"
            ? "Pages/DoctorNurse/DoctorNurseDashboard.html"
            : "Pages/Patient/PatientPortal.html";
      }
    } catch (error) {
      alert("❌ Login error: " + error.message);
    } finally {
      // Restore button state
      login.disabled = false;
      login.textContent = originalText;
    }
  });
}

// ✅ Logout with confirmation
const logoutButton = document.getElementById("logout-button");
if (logoutButton) {
  logoutButton.addEventListener("click", function (e) {
    e.preventDefault();

    const confirmLogout = confirm("Are you sure you want to log out?");
    if (!confirmLogout) return; // User cancelled

    signOut(auth)
      .then(() => {
        window.location.href = "../../index.html";
      })
      .catch((error) => {
        console.error("Error logging out:", error);
        alert("Failed to log out. Please try again.");
      });
  });
}

// ✅ Prevent access without login
if (!window.location.pathname.includes("index.html")) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "../../index.html";
    } else {
      console.log("User is logged in:", user.email);
    }
  });
}

// SideBar name Display
// ✅ Select the HTML element where name will be displayed
const nameDisplay = document.getElementById("displayName");

let currentUserName = ""; // 🌟 will store the name of the logged-in user
let patientKey = ""; // 🌟 will store the patient key if needed
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userRef = doc(db, "users", user.uid);
    const userData = await getDoc(userRef);

    if (userData.exists()) {
      const data = userData.data();

      const fullName =
        `${data.lastName}, ${data.firstName} ${data.extName}`.trim();
      nameDisplay.textContent = fullName;
      patientKey = user.uid; // 🌟 <-- JUST THIS LINE ADDED
      currentUserName = fullName; // ✅ <-- JUST THIS LINE ADDED
    } else {
      nameDisplay.textContent = user.email;
      currentUserName = user.email; // fallback
    }
  } else {
    nameDisplay.textContent = "Not Logged In";
    currentUserName = "";
  }
});

export { db, auth, currentUserName, patientKey };
