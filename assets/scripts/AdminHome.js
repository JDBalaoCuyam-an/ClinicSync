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
  deleteDoc,
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
function formatAuditDate(date = new Date()) {
  const options = {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };

  let formatted = date.toLocaleString("en-US", options);
  formatted = formatted.replace(/^(\w{3})/, "$1.");
  formatted = formatted.replace(",", "");
  return formatted;
}

// Elements
const addCourseBtn = document.getElementById("add-course-btn");
const coursesContainer = document.getElementById("courses-container");
const manageDepartmentForm = document.getElementById("manage-department-form");

const departmentSection = document.getElementById("departmentSection");
const editDepartmentForm = document.getElementById("edit-department-form");
const modalDepartmentName = document.getElementById("modal-department-name");
const modalCoursesContainer = document.getElementById(
  "modal-courses-container"
);
const modalAddCourseBtn = document.getElementById("modal-add-course-btn");
const modalDeleteDepartmentBtn = document.getElementById(
  "modal-delete-department-btn"
);

let editDepartmentId = null;
let isEditMode = false;

// === Add Department Modal ===

// Add course row
addCourseBtn.addEventListener("click", () => {
  createCourseInput(coursesContainer);
});

// Remove course (delegated)
coursesContainer.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-course-btn")) {
    e.target.closest(".course-input").remove();
  }
});

// Submit new department - WITH DUPLICATE CHECK
manageDepartmentForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const departmentName = document
    .getElementById("department-name")
    .value.trim();

  const courseInputs = coursesContainer.querySelectorAll(".course-name");
  const courses = Array.from(courseInputs)
    .map((input) => input.value.trim())
    .filter(Boolean);

  if (!departmentName) {
    return alert("⚠️ Department name is required.");
  }

  if (courses.length === 0) {
    return alert("⚠️ Please add at least one course.");
  }

  try {
    // === CHECK FOR DUPLICATE DEPARTMENT NAME ===
    const q = query(
      collection(db, "Departments"),
      where("name", "==", departmentName)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return alert(`⚠️ A department named "${departmentName}" already exists.`);
    }

    // === NO DUPLICATE → PROCEED TO SAVE ===
    await addDoc(collection(db, "Departments"), {
      name: departmentName,
      courses,
      createdAt: new Date(),
    });
    await addDoc(collection(db, "AdminAuditTrail"), {
      section: "DepartmentChanges",
      message: `${currentAdmin} added department "${departmentName}" with courses: ${courses.join(
        ", "
      )}`,
      dateTime: formatAuditDate(),
      timestamp: new Date(),
    });

    alert("✅ Department saved successfully!");
    manageDepartmentForm.reset();

    // Reset courses container to one empty input
    coursesContainer.innerHTML = `
      <div class="input-group mb-2 course-input">
        <input type="text" class="form-control course-name" placeholder="Course name" required />
        <button type="button" class="btn btn-outline-danger remove-course-btn">&times;</button>
      </div>
    `;

    // Close the modal
    const modalEl = document.getElementById("manageDepartmentModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();

    // Reload department list
    loadDepartments();
  } catch (error) {
    console.error("Error saving department:", error);
    alert("⚠️ Failed to save department. Please try again.");
  }
});
// === Shared function to create a course input row ===
function createCourseInput(container, value = "") {
  const div = document.createElement("div");
  div.className = "input-group mb-2 course-input";
  div.innerHTML = `
    <input
      type="text"
      class="form-control course-name"
      placeholder="Course name"
      value="${value.replace(/"/g, "&quot;")}"
      required
    />
    <button type="button" class="btn btn-outline-danger remove-course-btn">&times;</button>
  `;
  container.appendChild(div);
}

// === Edit Modal Functionality ===

// Add course in edit modal
modalAddCourseBtn.addEventListener("click", () => {
  createCourseInput(modalCoursesContainer);
});

// Remove course in Edit modal - WITH CONFIRMATION
modalCoursesContainer.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-course-btn")) {
    const courseRow = e.target.closest(".course-input");
    const currentCourseCount =
      modalCoursesContainer.querySelectorAll(".course-input").length;

    // Prevent removing the last course (you need at least one)
    if (currentCourseCount === 1) {
      return alert("⚠️ You must keep at least one course in the department.");
    }

    // Ask for confirmation before deleting
    if (
      confirm(
        "⚠️ Are you sure you want to remove this course from the department?"
      )
    ) {
      courseRow.remove();
    }
  }
});

// Delete department
modalDeleteDepartmentBtn.addEventListener("click", async () => {
  if (!editDepartmentId) return;

  const name = modalDepartmentName.value.trim();
  if (
    !name ||
    !confirm(`⚠️ Are you sure you want to delete the department "${name}"?`)
  )
    return;

  try {
    await deleteDoc(doc(db, "Departments", editDepartmentId));
    await addDoc(collection(db, "AdminAuditTrail"), {
      section: "DepartmentChanges",
      message: `${currentAdmin} deleted department "${name}"`,
      dateTime: formatAuditDate(),
      timestamp: new Date(),
    });

    alert(`✅ Department "${name}" deleted.`);

    closeEditModal();
    loadDepartments();
  } catch (err) {
    console.error(err);
    alert("⚠️ Failed to delete department.");
  }
});

editDepartmentForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = modalDepartmentName.value.trim();

  const courseInputs = modalCoursesContainer.querySelectorAll(".course-name");
  const courses = Array.from(courseInputs)
    .map((input) => input.value.trim())
    .filter(Boolean);

  // === VALIDATION 1: Department name required ===
  if (!name) {
    return alert("⚠️ Department name is required.");
  }

  // === VALIDATION 2: At least one course ===
  if (courses.length === 0) {
    return alert("⚠️ Please add at least one course.");
  }

  // === VALIDATION 3: No duplicate courses (case-insensitive) ===
  const lowerCaseCourses = courses.map((c) => c.toLowerCase());
  if (new Set(lowerCaseCourses).size !== courses.length) {
    return alert(
      "⚠️ Duplicate courses detected. Each course name must be unique."
    );
  }

  try {
    // === VALIDATION 4: Duplicate department name check ===
    const q = query(collection(db, "Departments"), where("name", "==", name));

    const querySnapshot = await getDocs(q);
    let nameExists = false;

    querySnapshot.forEach((d) => {
      if (d.id !== editDepartmentId) nameExists = true;
    });

    if (nameExists) {
      return alert(`⚠️ Another department named "${name}" already exists.`);
    }

    // === EDIT MODE ===
    if (isEditMode && editDepartmentId) {
      // 🔹 Get old data for audit
      const oldSnap = await getDoc(doc(db, "Departments", editDepartmentId));
      if (!oldSnap.exists()) {
        return alert("Department no longer exists.");
      }

      const oldData = oldSnap.data();
      const oldName = oldData.name;
      const oldCourses = oldData.courses || [];

      // 🔹 Save update
      await updateDoc(doc(db, "Departments", editDepartmentId), {
        name,
        courses,
      });

      // 🔹 Detect changes
      const changes = [];

      if (oldName !== name) {
        changes.push(`renamed from "${oldName}" to "${name}"`);
      }

      const addedCourses = courses.filter((c) => !oldCourses.includes(c));
      const removedCourses = oldCourses.filter((c) => !courses.includes(c));

      if (addedCourses.length) {
        changes.push(`added courses: ${addedCourses.join(", ")}`);
      }

      if (removedCourses.length) {
        changes.push(`removed courses: ${removedCourses.join(", ")}`);
      }

      // 🔹 Audit log
      if (changes.length > 0) {
        await addDoc(collection(db, "AdminAuditTrail"), {
          section: "DepartmentChanges",
          message: `${currentAdmin} updated department "${name}" — ${changes.join(
            "; "
          )}`,
          dateTime: formatAuditDate(),
          timestamp: new Date(),
        });
      }

      alert("✅ Department updated successfully!");
    }

    // === ADD MODE ===
    else {
      await addDoc(collection(db, "Departments"), {
        name,
        courses,
        createdAt: new Date(),
      });

      // 🔹 Audit log
      await addDoc(collection(db, "AdminAuditTrail"), {
        section: "DepartmentChanges",
        message: `${currentAdmin} added department "${name}" with courses: ${courses.join(
          ", "
        )}`,
        dateTime: formatAuditDate(),
        timestamp: new Date(),
      });

      alert("✅ Department added successfully!");
    }

    // Close modal and refresh list
    closeEditModal();
    loadDepartments();
  } catch (err) {
    console.error("Error saving department:", err);
    alert("⚠️ Failed to save department. Please try again.");
  }
});

// === Load Departments ===
async function loadDepartments() {
  departmentSection.innerHTML = `<div class="text-muted">Loading departments...</div>`;
  try {
    const snap = await getDocs(collection(db, "Departments"));
    if (snap.empty) {
      departmentSection.innerHTML = `<div class="text-muted">No departments added yet.</div>`;
      return;
    }

    departmentSection.innerHTML = "";
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const courses = data.courses || [];
      const item = document.createElement("div");
      item.className = "list-group-item";

      item.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${data.name}</div>
            <div class="text-muted small">Courses: ${
              courses.length ? courses.join(", ") : "None"
            }</div>
          </div>
          <button class="btn btn-sm btn-outline-primary edit-department-btn" data-id="${
            docSnap.id
          }">
            Edit
          </button>
        </div>
      `;
      departmentSection.appendChild(item);
    });

    attachEditListeners();
  } catch (err) {
    console.error("Error loading departments:", err);
    departmentSection.innerHTML = `<div class="text-danger">Failed to load departments.</div>`;
  }
}

function attachEditListeners() {
  document.querySelectorAll(".edit-department-btn").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      try {
        const docSnap = await getDoc(doc(db, "Departments", id));
        if (!docSnap.exists()) {
          alert("Department not found!");
          return;
        }

        const data = docSnap.data();

        // Populate modal
        modalDepartmentName.value = data.name || "";
        modalCoursesContainer.innerHTML = ""; // Clear first

        (data.courses || []).forEach((course) => {
          createCourseInput(modalCoursesContainer, course);
        });

        // If no courses, add one empty
        if (!(data.courses || []).length) {
          createCourseInput(modalCoursesContainer);
        }

        // Set edit mode
        editDepartmentId = id;
        isEditMode = true;

        // Show modal (Bootstrap handles via data attributes, but ensure it's shown)
        const modalEl = document.getElementById("editDepartmentModal");
        const modalInstance = new bootstrap.Modal(modalEl);
        modalInstance.show();
      } catch (err) {
        console.error(err);
        alert("Failed to load department data.");
      }
    };
  });
}
function closeEditModal() {
  editDepartmentForm.reset();
  modalCoursesContainer.innerHTML = "";
  isEditMode = false;
  editDepartmentId = null;
  const modalEl = document.getElementById("editDepartmentModal");
  const modalInstance = bootstrap.Modal.getInstance(modalEl);
  if (modalInstance) modalInstance.hide();
}
// Initial load
loadDepartments();

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
    const fullName = `${user.firstName || ""} ${
      user.lastName || ""
    }`.toLowerCase();
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

  const q = query(
    collection(db, "AdminAuditTrail"),
    where("section", "==", "LoginHistory"),
    orderBy("timestamp", "desc")
  );

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
    const email = data.email || userData.email || "";

    // FirstName M. LastName
    const middleInitial = middleName ? middleName[0].toUpperCase() + "." : "";
    const fullName = `${firstName} ${middleInitial} ${lastName}`;

    // Timestamp formatting
    const loginTime = data.timestamp?.toDate
      ? data.timestamp.toDate()
      : new Date();

    const formattedTime = loginTime.toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    const ipAddress = data.ip || "N/A";

    tableBody.innerHTML += `
      <tr>
        <td>${formattedTime}</td>
        <td>${fullName}</td>
        <td>${email}</td>
        <td>${data.user_type || "N/A"}</td>
        <td>${ipAddress}</td>
      </tr>
    `;
  }
}

// Call the function to populate table
loadLoginHistory();
const userChangesTab = document.getElementById("user-changes");

async function loadUserChanges() {
  userChangesTab.innerHTML = "<p>Loading...</p>";

  try {
    const q = query(
      collection(db, "AdminAuditTrail"),
      where("section", "==", "UserChanges"),
      orderBy("timestamp", "desc")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      userChangesTab.innerHTML = "<p>No changes recorded.</p>";
      return;
    }

    const list = document.createElement("ul");
    list.classList.add("list-group", "list-group-flush");

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const changeTime = data.timestamp?.toDate
        ? data.timestamp.toDate()
        : new Date();

      const formattedTime = changeTime.toLocaleString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });

      const message = data.message || "No details provided";

      const item = document.createElement("li");
      item.classList.add("list-group-item");
      item.textContent = `${formattedTime} — ${message}`;

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

  // Clear previous content and show loading
  userAccountTab.innerHTML = `<div class="text-muted">Loading user account logs...</div>`;

  try {
    const querySnapshot = await getDocs(collection(db, "UserAccountTrail"));

    if (querySnapshot.empty) {
      userAccountTab.innerHTML = `<div class="text-muted">No user account actions recorded.</div>`;
      return;
    }

    // Collect docs into array
    const logs = [];
    querySnapshot.forEach((doc) => {
      logs.push(doc.data());
    });

    // Sort by dateTime descending
    logs.sort((a, b) => parseAuditDate(b.dateTime) - parseAuditDate(a.dateTime));

    // Create a Bootstrap list group
    const list = document.createElement("ul");
    list.classList.add("list-group", "list-group-flush");

    logs.forEach((data) => {
      const li = document.createElement("li");
      li.classList.add("list-group-item");

      // Parse timestamp
      let logTime;
      if (data.timestamp?.toDate) {
        logTime = data.timestamp.toDate();
      } else if (data.dateTime) {
        logTime = new Date(data.dateTime);
      } else {
        logTime = new Date();
      }

      const formattedTime = logTime.toLocaleString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });

      li.textContent = `${formattedTime} — ${data.message || "No details provided"}`;
      list.appendChild(li);
    });

    // Render the list
    userAccountTab.innerHTML = "";
    userAccountTab.appendChild(list);
  } catch (err) {
    console.error(err);
    userAccountTab.innerHTML = `<div class="text-danger">Failed to load logs.</div>`;
  }
});


const departmentsTabButton = document.getElementById(
  "departments-and-courses-tab"
);

departmentsTabButton.addEventListener("shown.bs.tab", async () => {
  const departmentsTab = document.getElementById("departments-and-courses");

  // Clear previous content and show loading
  departmentsTab.innerHTML = `<div class="text-muted">Loading department audit logs...</div>`;

  try {
    // Query AdminAuditTrail for department changes
    const q = query(
      collection(db, "AdminAuditTrail"),
      where("section", "==", "DepartmentChanges"),
      orderBy("timestamp", "desc")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      departmentsTab.innerHTML = `<div class="text-muted">No department actions recorded.</div>`;
      return;
    }

    // Create list
    const list = document.createElement("ul");
    list.classList.add("list-group", "list-group-flush");

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const logTime = data.timestamp?.toDate
        ? data.timestamp.toDate()
        : new Date();
      const formattedTime = logTime.toLocaleString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });

      const li = document.createElement("li");
      li.classList.add("list-group-item");
      li.textContent = `${formattedTime} — ${data.message}`;

      list.appendChild(li);
    });

    // Render list
    departmentsTab.innerHTML = "";
    departmentsTab.appendChild(list);
  } catch (err) {
    console.error("Error loading department audit logs:", err);
    departmentsTab.innerHTML = `<div class="text-danger">Failed to load department audit logs.</div>`;
  }
});

const clinicStaffTabButton = document.getElementById("clinic-staff-actions-tab");

clinicStaffTabButton.addEventListener("shown.bs.tab", async () => {
  const clinicStaffTab = document.getElementById("clinic-staff-actions");
  const logList = clinicStaffTab.querySelector("ul");

  // Show loading
  logList.innerHTML = `<li class="list-group-item text-muted">Loading clinic staff actions...</li>`;

  try {
    // Query Firestore for AdminAuditTrail with section "ClinicStaffActions"
    const q = query(
      collection(db, "AdminAuditTrail"),
      where("section", "==", "ClinicStaffActions"),
      orderBy("timestamp", "desc")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      logList.innerHTML = `<li class="list-group-item text-muted">No clinic staff actions recorded.</li>`;
      return;
    }

    // Collect logs into array for sorting
    const logs = [];
    snapshot.forEach((doc) => logs.push(doc.data()));

    // Sort by timestamp descending
    logs.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

    // Render logs
    logList.innerHTML = ""; // clear loading
    logs.forEach((data) => {
      const li = document.createElement("li");
      li.classList.add("list-group-item");

      // Format timestamp
      const logTime = data.timestamp?.toDate ? data.timestamp.toDate() : new Date();
      const formattedTime = logTime.toLocaleString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });

      li.textContent = `${formattedTime} — ${data.message || "No details provided"}`;
      logList.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    logList.innerHTML = `<li class="list-group-item text-danger">Failed to load clinic staff actions.</li>`;
  }
});

