import { db, auth } from "../../firebaseconfig.js";
import {
  getDocs,
  collection,
  doc,
  updateDoc,
  getDoc,
  setDoc,

} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import {
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

  const userTypeSelect = document.getElementById("user_type");
  const doctorTypeSelect = document.getElementById("doctor_type");
  const doctorTypeLabel = document.getElementById("doctor_type_label");
  userTypeSelect.addEventListener("change", () => {
    if (userTypeSelect.value === "doctor") {
      doctorTypeSelect.hidden = false; // show dropdown
      doctorTypeSelect.required = true; // make it required
      doctorTypeLabel.hidden = false; // show label
    } else {
      doctorTypeLabel.hidden = true; // hide label
      doctorTypeSelect.hidden = true; // hide dropdown
      doctorTypeSelect.required = false; // remove required
      doctorTypeSelect.value = ""; // reset selection
    }
  });
document
  .getElementById("createUserForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    // ✅ Basic info
    const firstName = document.getElementById("first_name").value.trim();
    const middleName = document.getElementById("middle_name").value.trim();
    const lastName = document.getElementById("last_name").value.trim();
    const extName = document.getElementById("ext_name").value.trim();
    const schoolId = document.getElementById("school_id").value.trim();
    const userType = document.getElementById("user_type").value;
    const doctorType = document.getElementById("doctor_type").value;
    const gender = document.getElementById("gender")?.value || "";
    const birthdate = document.getElementById("birthdate")?.value || "";
    const age = document.getElementById("age")?.value || "";
    const department = document.getElementById("department")?.value || "";
    const courseStrandGenEduc = document.getElementById("courseStrandGenEduc")?.value || "";
    const yearLevel = document.getElementById("yearLevel")?.value || "";
    const civilStatus = document.getElementById("civil-status")?.value || "";
    const nationality = document.getElementById("nationality")?.value || "";
    const religion = document.getElementById("religion")?.value || "";
    // ✅ Contacts
    const email = document.getElementById("reg_email").value.trim();
    const phoneNumber = document.getElementById("phoneNumber")?.value || "";
    const homeAddress = document.getElementById("homeAddress")?.value || "";
    const guardianName = document.getElementById("guardianName")?.value || "";
    const guardianPhone = document.getElementById("guardianPhone")?.value || "";
    // ✅ Parents Info
    const fatherName = document.getElementById("fatherName")?.value || "";
    const fatherAge = document.getElementById("fatherAge")?.value || "";
    const fatherOccupation = document.getElementById("fatherOccupation")?.value || "";
    const fatherHealth = document.getElementById("fatherHealthStatus")?.value || "";
    const motherName = document.getElementById("motherName")?.value || "";
    const motherAge = document.getElementById("motherAge")?.value || "";
    const motherOccupation = document.getElementById("motherOccupation")?.value || "";
    const motherHealth = document.getElementById("motherHealthStatus")?.value || "";
    
    if (!firstName || !lastName || !schoolId || !email || !userType) {
      alert("Please fill in all required fields!");
      return;
    }

    try {
      // Create user with Firebase Auth
      const password = schoolId; // default password = school ID
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Save user info to Firestore
      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        firstName,
        middleName,
        lastName,
        extName,
        schoolId,
        user_type: userType,
        doctor_type: doctorType || "",
        gender,
        birthdate,
        age,
        department,
        civilStatus,
        nationality,
        religion,
        courseStrandGenEduc,
        yearLevel,
        email,
        phoneNumber,
        homeAddress,
        guardianName,
        guardianPhone,
        fatherName,
        fatherAge,
        fatherOccupation,
        fatherHealth,
        motherName,
        motherAge,
        motherOccupation,
        motherHealth,
        createdAt: new Date(),
      });

      alert("✅ User Created Successfully!");
      document.getElementById("createUserForm").reset();
    } catch (error) {
      console.error("Error creating user:", error);
      alert("❌ Failed: " + error.message);
    }
  });

// TABLE BODY
const usersTableBody = document.querySelector("#usersTable tbody");
// MODAL INSTANCES
const createNewUserModal = new bootstrap.Modal(
  document.getElementById("createNewUserModal")
);
const overviewModalInstance = new bootstrap.Modal(
  document.getElementById("overviewModal")
);

// LOAD USERS FROM FIRESTORE
async function loadUsers() {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    usersTableBody.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const fullName = `${data.lastName || ""}, ${data.firstName || ""} ${
        data.extName || ""
      }`.trim();

      // Create status badge based on disabled status
      const statusBadge = data.disabled
        ? '<span class="badge bg-danger status-badge">Disabled</span>'
        : '<span class="badge bg-success status-badge">Active</span>';

      const row = `
              <tr>
                <td>
                  <div class="d-flex align-items-center">
                    <!--<div class="user-avatar">${
                      (data.firstName?.[0] || "") + (data.lastName?.[0] || "")
                    }</div> -->
                    <div>${fullName}</div>
                  </div>
                </td>
                <td>${data.schoolId}</td>
                <td>${data.email || ""}</td>
                <td>
                  <span class="badge ${
                    data.user_type === "admin"
                      ? "bg-primary"
                      : data.user_type === "doctor" ||
                        data.user_type === "nurse"
                      ? "bg-success"
                      : "bg-secondary"
                  }">
                    ${data.user_type || "user"}
                  </span>
                </td>
                <td>${statusBadge}</td>
                <td>
                  <button class="btn btn-sm btn-outline-primary btn-action" onclick="openOverview('${
                    docSnap.id
                  }')">
                    <i class="bi bi-eye"></i> View
                  </button>
                </td>
              </tr>
            `;

      usersTableBody.innerHTML += row;
    });
  } catch (error) {
    console.error("Error loading users:", error);
  }
}

// Make function globally available
window.openOverview = openOverview;

let selectedUserId = null;

// OPEN OVERVIEW
async function openOverview(uid) {
  selectedUserId = uid;

  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      alert("User not found!");
      return;
    }

    const data = snap.data();

    // Fill fields
    document.getElementById("ov_firstName").value = data.firstName || "";
    document.getElementById("ov_middleName").value = data.middleName || "";
    document.getElementById("ov_lastName").value = data.lastName || "";
    document.getElementById("ov_extName").value = data.extName || "";
    document.getElementById("ov_schoolId").value = data.schoolId || "";
    document.getElementById("ov_email").value = data.email || "";
    document.getElementById("ov_userType").value = data.user_type || "user";

    // Show correct buttons
    const disableBtn = document.getElementById("disableUserBtn");

    if (data.disabled === true) {
      disableBtn.textContent = "Enable Account";
      disableBtn.classList.remove("btn-danger");
      disableBtn.classList.add("safeBtn");
    } else {
      disableBtn.textContent = "Disable Account";
      disableBtn.classList.remove("safeBtn");
      disableBtn.classList.add("btn-danger");
    }

    overviewModalInstance.show();
  } catch (error) {
    console.error("Error opening overview:", error);
    alert("Error loading user data");
  }
}

// UPDATE USER INFO
document.getElementById("updateUserBtn").addEventListener("click", async () => {
  if (!selectedUserId) return;

  try {
    const updatedData = {
      firstName: document.getElementById("ov_firstName").value,
      middleName: document.getElementById("ov_middleName").value,
      lastName: document.getElementById("ov_lastName").value,
      extName: document.getElementById("ov_extName").value,
      contact: document.getElementById("ov_schoolId").value,
    };

    await updateDoc(doc(db, "users", selectedUserId), updatedData);

    alert("✅ User updated successfully!");
    overviewModalInstance.hide();
    loadUsers();
  } catch (error) {
    console.error("Error updating user:", error);
    alert("Error updating user");
  }
});

// DISABLE / ENABLE USER
document
  .getElementById("disableUserBtn")
  .addEventListener("click", async () => {
    if (!selectedUserId) return;

    try {
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

      overviewModalInstance.hide();
      loadUsers();
    } catch (error) {
      console.error("Error updating user status:", error);
      alert("Error updating user status");
    }
  });

// RESET PASSWORD
document
  .getElementById("resetPasswordBtn")
  .addEventListener("click", async () => {
    const email = document.getElementById("ov_email").value;

    if (!email) {
      alert("No email found for this user");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("📨 Password reset email sent!");
    } catch (error) {
      console.error("Error sending password reset:", error);
      alert("❌ Failed: " + error.message);
    }
  });

// CREATE NEW USER MODAL HANDLING
document.getElementById("createNewUserBtn").addEventListener("click", () => {
  createNewUserModal.show();
});

document.getElementById("cancelAddUserBtn").addEventListener("click", () => {
  document.getElementById("createUserForm").reset();
});

// CREATE USER FORM SUBMISSION
document
  .getElementById("createUserForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    // Add your user creation logic here
    // alert("User creation functionality would go here");
    createNewUserModal.hide();
    document.getElementById("createUserForm").reset();
  });

// Initial load
document.addEventListener("DOMContentLoaded", loadUsers);
