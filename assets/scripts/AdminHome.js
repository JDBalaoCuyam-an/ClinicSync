import { db, auth } from "../../firebaseconfig.js";
import {
  getDocs,
  collection,
  doc,
  updateDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// TABLE BODY
const usersTableBody = document.querySelector("#usersTable tbody");

// LOAD USERS FROM FIRESTORE
async function loadUsers() {
  const querySnapshot = await getDocs(collection(db, "users"));
  usersTableBody.innerHTML = "";

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const fullName = `${data.lastName}, ${data.firstName} ${data.extName}`;

    const row = `
      <tr>
        <td>${fullName}</td>
        <td>${data.email}</td>
        <td>${data.user_type}</td>
        <td>${data.contact}</td>
        <td><button onclick="openOverview('${docSnap.id}')">View</button></td>
      </tr>
    `;

    usersTableBody.innerHTML += row;
  });
}

window.openOverview = openOverview;
loadUsers();

const overviewModal = document.getElementById("overviewModal");
let selectedUserId = null;

// OPEN OVERVIEW
async function openOverview(uid) {
  selectedUserId = uid;

  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  const data = snap.data();

  // Fill fields
  document.getElementById("ov_firstName").value = data.firstName;
  document.getElementById("ov_middleName").value = data.middleName;
  document.getElementById("ov_lastName").value = data.lastName;
  document.getElementById("ov_extName").value = data.extName;
  document.getElementById("ov_contact").value = data.contact;
  document.getElementById("ov_email").value = data.email;
  document.getElementById("ov_userType").value = data.user_type;

  // Show correct buttons
  const disableBtn = document.getElementById("disableUserBtn");
  const updateBtn = document.getElementById("updateUserBtn");

  if (data.disabled === true) {
    disableBtn.textContent = "Enable Account";
    disableBtn.classList.remove("dangerBtn");
    disableBtn.classList.add("safeBtn");
  } else {
    disableBtn.textContent = "Disable Account";
    disableBtn.classList.remove("safeBtn");
    disableBtn.classList.add("dangerBtn");
  }

  overviewModal.style.display = "block";
}

// CLOSE MODAL
document.getElementById("closeOverview").addEventListener("click", () => {
  overviewModal.style.display = "none";
});

// UPDATE USER INFO
document.getElementById("updateUserBtn").addEventListener("click", async () => {
  if (!selectedUserId) return;

  const updatedData = {
    firstName: document.getElementById("ov_firstName").value,
    middleName: document.getElementById("ov_middleName").value,
    lastName: document.getElementById("ov_lastName").value,
    extName: document.getElementById("ov_extName").value,
    contact: document.getElementById("ov_contact").value,
  };

  await updateDoc(doc(db, "users", selectedUserId), updatedData);

  alert("✅ User updated successfully!");
  overviewModal.style.display = "none";
  loadUsers();
});

// DISABLE / ENABLE USER
document
  .getElementById("disableUserBtn")
  .addEventListener("click", async () => {
    if (!selectedUserId) return;

    const userRef = doc(db, "users", selectedUserId);
    const snap = await getDoc(userRef);
    const data = snap.data();

    // ENABLE USER
    if (data.disabled === true) {
      const confirmEnable = confirm("Enable this user account?");
      if (!confirmEnable) return;

      await updateDoc(userRef, {
        disabled: false,
        disabledAt: null,
      });

      alert("✅ Account enabled.");
    }

    // DISABLE USER
    else {
      const confirmDisable = confirm(
        "Disable this account? It will be deleted if not logged in for 30 days."
      );
      if (!confirmDisable) return;

      await updateDoc(userRef, {
        disabled: true,
        disabledAt: new Date(),
      });

      alert("⚠️ Account disabled.");
    }

    overviewModal.style.display = "none";
    loadUsers();
  });

// RESET PASSWORD
document
  .getElementById("resetPasswordBtn")
  .addEventListener("click", async () => {
    const email = document.getElementById("ov_email").value;

    try {
      await sendPasswordResetEmail(auth, email);
      alert("📨 Password reset email sent!");
    } catch (error) {
      alert("❌ Failed: " + error.message);
    }
  });

document
  .getElementById("createNewUserBtn")
  .addEventListener("click", async () => {
    document.querySelector(".newUserModal").style.display = "block";
  });

  document.getElementById("cancelAddUserBtn").addEventListener("click", () => {
  document.querySelector(".newUserModal").style.display = "none";
  input.value = "";
});