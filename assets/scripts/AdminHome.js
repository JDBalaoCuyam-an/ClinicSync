import { db, auth } from "../../firebaseconfig.js";
import {
  getDocs,
  collection,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  addDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import {
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  getAuth,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { firebaseConfig } from "../../firebaseconfig.js";

let currentUserId = null;
let currentAdmin = "";
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  currentUserId = user.uid;

  try {
    // Reference to the user's document in 'users' collection
    const docRef = doc(db, "users", currentUserId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const fullName = `${data.firstName} ${data.lastName}`;
      currentAdmin = fullName;
    } else {
      console.warn("Admin document not found in users collection");
      return "Unknown Admin";
    }
  } catch (err) {
    console.error("Error fetching admin info:", err);
    return "Unknown Admin";
  }
});
function parseAuditDate(dateStr) {
  // Example: "Dec. 20 2025, 12:07 PM"

  // Remove dot after month: "Dec."
  const cleaned = dateStr.replace(".", "");

  // Convert to Date object
  return new Date(cleaned);
}

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
    const courseStrandGenEduc =
      document.getElementById("courseStrandGenEduc")?.value || "";
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
    const fatherOccupation =
      document.getElementById("fatherOccupation")?.value || "";
    const fatherHealth =
      document.getElementById("fatherHealthStatus")?.value || "";
    const motherName = document.getElementById("motherName")?.value || "";
    const motherAge = document.getElementById("motherAge")?.value || "";
    const motherOccupation =
      document.getElementById("motherOccupation")?.value || "";
    const motherHealth =
      document.getElementById("motherHealthStatus")?.value || "";

    if (!firstName || !lastName || !schoolId || !email || !userType) {
      alert("Please fill in all required fields!");
      return;
    }

    try {
      // Create user with Firebase Auth
      // --- Secondary app to create user without replacing admin session ---
      const secondaryApp = initializeApp(firebaseConfig, "Secondary");
      const secondaryAuth = getAuth(secondaryApp);

      const password = schoolId; // default password = school ID
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );
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
      // Local timestamp
      const timestamp = new Date();

      const options = {
        year: "numeric", // must be "numeric" or "2-digit"
        month: "short", // "short" gives "Dec", "Jan", etc.
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true, // 12-hour format with AM/PM
      };

      // Get locale string
      let formattedDate = timestamp.toLocaleString("en-US", options);

      // Add dot after month
      formattedDate = formattedDate.replace(/^(\w{3})/, "$1.");

      // Remove extra comma if needed
      formattedDate = formattedDate.replace(",", "");

      await addDoc(collection(db, "UserAccountTrail"), {
        message: `${currentAdmin} added 1 new User`,
        dateTime: formattedDate,
      });
      alert("✅ User Created Successfully!");
      document.getElementById("createUserForm").reset();
    } catch (error) {
      console.error("Error creating user:", error);
      alert("❌ Failed: " + error.message);
    }
  });
document.querySelectorAll(".name-only").forEach((input) => {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^a-zA-Z\s-]/g, "");
  });
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
let allUsers = [];
async function loadUsers() {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    usersTableBody.innerHTML = "";
    allUsers = []; // reset

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      allUsers.push({ id: docSnap.id, ...data });
    });

    renderUsers(allUsers);
  } catch (error) {
    console.error("Error loading users:", error);
  }
}
function renderUsers(users) {
  usersTableBody.innerHTML = "";

  if (users.length === 0) {
    usersTableBody.innerHTML =
      "<tr><td colspan='6' class='text-center'>No users found.</td></tr>";
    return;
  }

  users.forEach((data) => {
    const fullName = `${data.lastName || ""}, ${data.firstName || ""} ${
      data.extName || ""
    }`.trim();

    const statusBadge = data.disabled
      ? '<span class="badge bg-danger status-badge">Disabled</span>'
      : '<span class="badge bg-success status-badge">Active</span>';

    const row = `
      <tr>
        <td>${fullName}</td>
        <td>${data.schoolId || ""}</td>
        <td>${data.email || ""}</td>
        <td>
          <span class="badge ${
            data.user_type === "admin"
              ? "bg-primary"
              : data.user_type === "doctor" || data.user_type === "nurse"
              ? "bg-success"
              : "bg-secondary"
          }">
            ${data.user_type || "user"}
          </span>
        </td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary"
            onclick="openOverview('${data.uid}')">
            <i class="bi bi-eye"></i> View
          </button>
        </td>
      </tr>
    `;

    usersTableBody.insertAdjacentHTML("beforeend", row);
  });
}
const searchInput = document.getElementById("searchUserInput");

searchInput.addEventListener("input", () => {
  const searchTerm = searchInput.value.toLowerCase().trim();

  if (!searchTerm) {
    renderUsers(allUsers);
    return;
  }

  const filteredUsers = allUsers.filter((user) => {
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase();
    const schoolId = (user.schoolId || "").toLowerCase();
    const email = (user.email || "").toLowerCase();

    return (
      fullName.includes(searchTerm) ||
      schoolId.includes(searchTerm) ||
      email.includes(searchTerm)
    );
  });

  renderUsers(filteredUsers);
});


// =============================================================
// 📌 OPEN OVERVIEW MODAL & HANDLE USER ACTIONS
// =============================================================
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
        // Local timestamp
      const timestamp = new Date();

      const options = {
        year: "numeric", // must be "numeric" or "2-digit"
        month: "short", // "short" gives "Dec", "Jan", etc.
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true, // 12-hour format with AM/PM
      };

      // Get locale string
      let formattedDate = timestamp.toLocaleString("en-US", options);

      // Add dot after month
      formattedDate = formattedDate.replace(/^(\w{3})/, "$1.");

      // Remove extra comma if needed
      formattedDate = formattedDate.replace(",", "");

      await addDoc(collection(db, "UserAccountTrail"), {
        message: `${currentAdmin} Enabled User Account for ${data.firstName} ${data.lastName}(${data.schoolId})`,
        dateTime: formattedDate,
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
        // Local timestamp
      const timestamp = new Date();

      const options = {
        year: "numeric", // must be "numeric" or "2-digit"
        month: "short", // "short" gives "Dec", "Jan", etc.
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true, // 12-hour format with AM/PM
      };

      // Get locale string
      let formattedDate = timestamp.toLocaleString("en-US", options);

      // Add dot after month
      formattedDate = formattedDate.replace(/^(\w{3})/, "$1.");

      // Remove extra comma if needed
      formattedDate = formattedDate.replace(",", "");

      await addDoc(collection(db, "UserAccountTrail"), {
        message: `${currentAdmin} Disabled User Account for ${data.firstName} ${data.lastName} (${data.schoolId})`,
        dateTime: formattedDate,
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

/* ============================================================
   📌 CSV PARSER (same as before)
============================================================ */
function parseCSV(text) {
  return text
    .trim()
    .split("\n")
    .map((line) => line.split(",").map((value) => value.trim()));
}

/* ============================================================
   📌 PREVIEW USERS CSV
============================================================ */
document.getElementById("user-preview-btn").onclick = () => {
  const file = document.getElementById("user-bulk-file").files[0];
  if (!file) return alert("⚠ Please choose a CSV file!");

  const reader = new FileReader();
  reader.onload = (e) => {
    let rows = parseCSV(e.target.result);

    // ✅ Skip header row
    if (rows.length > 0) rows = rows.slice(1);

    const table = document.getElementById("user-bulk-preview");
    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";

    rows.forEach((row) => {
      const [firstName, middleName, lastName, extName, schoolId, email] = row;

      // Skip empty rows
      if (!firstName && !lastName && !schoolId && !email) return;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${firstName}</td>
        <td>${middleName}</td>
        <td>${lastName}</td>
        <td>${extName}</td>
        <td>${schoolId}</td>
        <td>${email}</td>
      `;
      tbody.appendChild(tr);
    });

    table.classList.remove("d-none");
    document.getElementById("user-upload-btn").classList.remove("d-none");
  };

  reader.readAsText(file);
};

/* ============================================================
   📌 Download CSV TEMPLATE
============================================================ */
document.getElementById("download-csv-template").onclick = (e) => {
  e.preventDefault(); // Prevent default link behavior

  const headers = [
    "First Name",
    "Middle",
    "Last Name",
    "Ext",
    "School ID",
    "Email",
  ];
  const csvContent = headers.join(",") + "\n"; // Single row for template

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "user_template.csv";
  link.click();

  URL.revokeObjectURL(url); // Clean up
};

/* ============================================================
   📌 UPLOAD USERS TO FIREBASE
============================================================ */
const skippedUsers = []; // <-- collect skipped emails
document.getElementById("user-upload-btn").onclick = async () => {
  const file = document.getElementById("user-bulk-file").files[0];
  if (!file) return alert("⚠ Please choose a CSV file!");

  const reader = new FileReader();

  reader.onload = async (e) => {
    let rows = parseCSV(e.target.result);

    // Skip header
    if (rows.length > 0) rows = rows.slice(1);

    try {
      // Get current admin's name from users collection
      const currentAdmin = auth.currentUser;
      let adminName = "Unknown Admin";
      if (currentAdmin) {
        const adminDoc = await getDoc(doc(db, "users", currentAdmin.uid));
        if (adminDoc.exists()) {
          const data = adminDoc.data();
          adminName = `${data.firstName} ${data.lastName}`;
        }
      }

      // Secondary app to avoid replacing admin session
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryBulk");
      const secondaryAuth = getAuth(secondaryApp);

      let addedCount = 0;

      for (const row of rows) {
        const [firstName, middleName, lastName, extName, schoolId, email] = row;

        // Skip empty rows
        if (!firstName && !lastName && !schoolId && !email) continue;

        const password = schoolId; // default password

        try {
          // Create Firebase Auth account
          const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth,
            email,
            password
          );
          const newUser = userCredential.user;

          // Save user info in Firestore
          await setDoc(doc(db, "users", newUser.uid), {
            uid: newUser.uid,
            firstName,
            middleName,
            lastName,
            extName,
            schoolId,
            user_type: "student",
            email,
            createdAt: new Date(),
          });

          addedCount++;
        } catch (err) {
          skippedUsers.push(email); // <-- store skipped email
          continue;
        }
      }

      // Log bulk upload in UserAccountTrail
      if (addedCount > 0) {
        const timestamp = new Date();
        const options = {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        };
        let formattedDate = timestamp.toLocaleString("en-US", options);
        formattedDate = formattedDate.replace(/^(\w{3})/, "$1.");
        formattedDate = formattedDate.replace(",", "");

        await addDoc(collection(db, "UserAccountTrail"), {
          message: `${adminName} added ${addedCount} new user(s) via bulk upload`,
          dateTime: formattedDate,
        });
      }

      // --- After processing all rows ---
      let message = `✅ Bulk User Upload Complete! ${addedCount} user(s) added.`;

      if (skippedUsers.length > 0) {
        message += `\n⚠ Skipped ${
          skippedUsers.length
        } user(s):\n${skippedUsers.join(", ")}`;
      }

      alert(message);
    } catch (err) {
      console.error(err);
      alert("❌ Error uploading users: " + err.message);
    }
  };

  reader.readAsText(file);
};

async function loadLoginHistory() {
  const tableBody = document
    .getElementById("loginHistoryTable")
    .querySelector("tbody");

  tableBody.innerHTML = "";

  // Assuming you have a collection "loginHistory" with userId, timestamp, ip
  const q = query(collection(db, "loginHistory"), orderBy("timestamp", "desc"));
  const snapshot = await getDocs(q);

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const userId = data.userId;

    // Fetch user details
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) continue;

    const userData = userDoc.data();
    const firstName = userData.firstName || "";
    const middleName = userData.middleName || "";
    const lastName = userData.lastName || "";
    const email = userData.email || data.email || "";

    // Format name: FirstName M. LastName
    const middleInitial = middleName ? middleName[0].toUpperCase() + "." : "";
    const fullName = `${firstName} ${middleInitial} ${lastName}`;

    // Format timestamp to local format (not US)
    const loginTime = data.timestamp?.toDate
      ? data.timestamp.toDate()
      : new Date();
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };
    const formattedTime = loginTime.toLocaleString(undefined, options);

    // IP address (if stored)
    const ipAddress = data.ip || "N/A";

    const row = `
      <tr>
        <td>${formattedTime}</td>
        <td>${fullName}</td>
        <td>${email}</td>
        <td>${data.user_type || "N/A"}</td>
        <td>${ipAddress}</td>
      </tr>
    `;

    tableBody.innerHTML += row;
  }
}

// Call the function to populate table
loadLoginHistory();
const userChangesTab = document.getElementById("user-changes");

async function loadUserChanges() {
  userChangesTab.innerHTML = "<p>Loading...</p>";

  try {
    const snapshot = await getDocs(collection(db, "userChanges"));

    if (snapshot.empty) {
      userChangesTab.innerHTML = "<p>No changes recorded.</p>";
      return;
    }

    // 🔹 Collect data first
    const changes = [];
    snapshot.forEach((doc) => {
      changes.push(doc.data());
    });

    // 🔹 Sort by dateTime (newest first)
    changes.sort((a, b) => {
      return parseAuditDate(b.dateTime) - parseAuditDate(a.dateTime);
    });

    // 🔹 Render
    const list = document.createElement("ul");
    list.classList.add("list-group", "list-group-flush");

    changes.forEach((data) => {
      const item = document.createElement("li");
      item.classList.add("list-group-item");
      item.textContent = `${data.dateTime} — ${data.message}`;
      list.appendChild(item);
    });

    userChangesTab.innerHTML = "";
    userChangesTab.appendChild(list);
  } catch (err) {
    console.error(err);
    userChangesTab.innerHTML = "<p>Failed to load user changes.</p>";
  }
}

// Load immediately
loadUserChanges();

// Load when the tab is shown
const userAccountTabButton = document.getElementById(
  "user-account-management-tab"
);

userAccountTabButton.addEventListener("shown.bs.tab", async () => {
  const userAccountTab = document.getElementById("user-account-management");
  const userAccountList = userAccountTab.querySelector("ul");
  userAccountList.innerHTML = "<li>Loading...</li>";

  try {
    const querySnapshot = await getDocs(collection(db, "UserAccountTrail"));

    if (querySnapshot.empty) {
      userAccountList.innerHTML =
        "<li>No user account actions recorded.</li>";
      return;
    }

    // 🔹 Collect docs into array
    const logs = [];
    querySnapshot.forEach((doc) => {
      logs.push(doc.data());
    });

    // 🔹 Sort by dateTime (newest first)
    logs.sort((a, b) => {
      return parseAuditDate(b.dateTime) - parseAuditDate(a.dateTime);
    });

    // 🔹 Render
    userAccountList.innerHTML = "";
    logs.forEach((data) => {
      const li = document.createElement("li");
      li.textContent = `${data.dateTime} — ${data.message}`;
      userAccountList.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    userAccountList.innerHTML = "<li>Failed to load logs.</li>";
  }
});
