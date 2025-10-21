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
// ✅ Create Account WITHOUT Logging Out Admin
const register = document.getElementById("create-account");
if (register) {
  register.addEventListener("click", async function (event) {
    event.preventDefault();

    const admin = auth.currentUser;
    const adminEmail = admin.email;
    const adminPassword = prompt("Enter your Admin password:");

    const email = document.getElementById("reg_email").value;
    const password = document.getElementById("reg_password").value;

    // ✅ Change "role" → "user_type"
    const isAdmin = document.getElementById("regAsAdmin").checked;
    const userType = isAdmin ? "admin" : "staff"; // "DoctorNurse" → "staff"

    const firstName = document.getElementById("first_name").value;
    const middleName = document.getElementById("middle_name").value;
    const lastName = document.getElementById("last_name").value;
    const extName = document.getElementById("ext_name").value;
    const contact = document.getElementById("contact_number").value;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const newUser = userCredential.user;

      // ✅ Save user with `user_type`
      await setDoc(doc(db, "users", newUser.uid), {
        email: newUser.email,
        uid: newUser.uid,
        user_type: userType, // ✅ Renamed here
        firstName,
        middleName: middleName || "",
        lastName,
        extName: extName || "",
        contact,
        createdAt: new Date(),
      });

      alert("✅ User Created Successfully!");

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
            userData.user_type === "admin"
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
    } else {
      console.log("User is logged in:", user.email);
    }
  });
}

// SideBar name Display
// ✅ Select the HTML element where name will be displayed
const nameDisplay = document.getElementById("displayName");

// ✅ Listen for logged-in user
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Get additional user details from Firestore
    const userRef = doc(db, "users", user.uid);
    const userData = await getDoc(userRef);

    if (userData.exists()) {
      const data = userData.data();

      // Combine full name correctly
      const fullName = `${data.lastName}, ${data.firstName} ${
        data.middleName || ""
      } ${data.extName || ""}`.trim();

      nameDisplay.textContent = fullName; // ✅ Update sidebar with name
    } else {
      nameDisplay.textContent = user.email; // Fallback to email
    }
  } else {
    nameDisplay.textContent = "Not Logged In";
  }
});

export { db, auth };
