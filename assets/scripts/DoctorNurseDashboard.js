// ✅ Import Firebase tools
import { auth, db } from "../../firebaseconfig.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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
       const fullName = `${data.lastName}, ${data.firstName} ${data.middleName || ""} ${data.extName || ""}`.trim();

      nameDisplay.textContent = fullName; // ✅ Update sidebar with name
    } else {
      nameDisplay.textContent = user.email; // Fallback to email
    }
  } else {
    nameDisplay.textContent = "Not Logged In";
  }
});
