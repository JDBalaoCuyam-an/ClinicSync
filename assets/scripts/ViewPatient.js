/* -----------------------------------------------
     🔹 FIREBASE IMPORTS & INITIAL SETUP
  ----------------------------------------------- */
import { db, auth, currentUserName } from "../../firebaseconfig.js";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  arrayUnion,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get("id");

function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function formatTimeFromString(timeStr) {
  // timeStr should be in "HH:MM" format (e.g., "08:45" or "15:30")
  const [hours, minutes] = timeStr.split(":");
  let hour = parseInt(hours, 10);
  const period = hour >= 12 ? "PM" : "AM";

  // Convert to 12-hour format
  if (hour === 0) {
    hour = 12; // Midnight
  } else if (hour > 12) {
    hour -= 12;
  }

  // Remove leading zero and format minutes (keep 2 digits)
  return `${hour}:${minutes} ${period}`;
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
  formatted = formatted.replace(/^(\w{3})/, "$1."); // Jan. Feb.
  formatted = formatted.replace(",", ""); // remove extra comma
  return formatted;
}
document.querySelectorAll(".name-only").forEach((input) => {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^a-zA-Z\s-]/g, "");
  });
});
const departmentSelect = document.getElementById("department");
const courseSelect = document.getElementById("course");

// Store department → courses
let departmentCourseMap = {};
async function loadDepartments() {
  try {
    const snap = await getDocs(collection(db, "Departments"));
    if (snap.empty) return;

    departmentSelect.innerHTML = `<option value="">Select Department</option>`;

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const deptName = data.name;
      const courses = data.courses || [];

      departmentCourseMap[deptName] = courses;

      const option = document.createElement("option");
      option.value = deptName;
      option.textContent = deptName;
      departmentSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Error loading departments:", err);
  }
}

function loadCoursesByDepartment(selectedCourse = "") {
  const selectedDept = departmentSelect.value;

  courseSelect.innerHTML = `
    <option value="">Select Course/Strand/Gen. Educ.</option>
  `;

  if (!selectedDept) return;

  const courses = departmentCourseMap[selectedDept] || [];

  courses.forEach((course) => {
    const option = document.createElement("option");
    option.value = course;
    option.textContent = course;
    courseSelect.appendChild(option);
  });

  // ✅ Set course AFTER options exist
  if (selectedCourse) {
    courseSelect.value = selectedCourse;
  }
}

// Event listener
departmentSelect.addEventListener("change", () => {
  loadCoursesByDepartment();
});

/* -----------------------------------------------
     🔹 LOAD PATIENT DATA (with medicalHistory subcollection)
  ----------------------------------------------- */
async function loadPatient() {
  if (!patientId) return;

  try {
    const patientRef = doc(db, "users", patientId);
    const patientSnap = await getDoc(patientRef);

    if (!patientSnap.exists()) {
      alert("Patient not found!");
      return;
    }

    const data = patientSnap.data();

    /* 🧾 Header Name */
    document.querySelector(".view-patient-controls h2").textContent = `${
      data.lastName ? data.lastName + "," : ""
    } ${data.firstName || ""}`.trim();

    /* 🧩 Contact Details */
    document.getElementById("phone-number").value = data.phoneNumber || "";
    document.getElementById("email-address").value = data.email || "";
    document.getElementById("home-address").value = data.address || "";
    document.getElementById("guardian-name").value = data.guardianName || "";
    document.getElementById("guardian-phone").value = data.guardianPhone || "";

    /* 🧩 Basic Info */
    const infoFields = {
      lastName: data.lastName || "",
      firstName: data.firstName || "",
      middleName: data.middleName || "",
      extName: data.extName || "",
      gender: data.gender || "",
      birthdate: data.birthdate || "",
      civilStatus: data.civilStatus || "",
      nationality: data.nationality || "",
      religion: data.religion || "",
      schoolId: data.schoolId || "",
    };

    Object.keys(infoFields).forEach((key) => {
      const input = document.getElementById(key);
      if (input) input.value = infoFields[key];
    });

    // Auto-calculate age from birthdate
    const birthdateInput = document.getElementById("birthdate");
    const ageInput = document.getElementById("age");

    function calculateAge(dateStr) {
      if (!dateStr) return "";
      const today = new Date();
      const birthDate = new Date(dateStr);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }

    ageInput.value = calculateAge(birthdateInput.value);

    // Recalculate age whenever birthdate changes
    birthdateInput.addEventListener("input", () => {
      ageInput.value = calculateAge(birthdateInput.value);
    });

    /* 🧩 Select fields */
    // Set department first
    departmentSelect.value = data.department || "";

    // Load courses AFTER department is set
    loadCoursesByDepartment(data.course || "");

    // Year level is independent
    document.getElementById("yearLevel").value = data.yearLevel || "";

    document.getElementById("yearLevel").value = data.yearLevel || "";

    /* 🧩 Parent Info */
    const parentFields = {
      fatherName: data.fatherName || "",
      fatherAge: data.fatherAge || "",
      fatherOccupation: data.fatherOccupation || "",
      fatherHealth: data.fatherHealth || "",
      motherName: data.motherName || "",
      motherAge: data.motherAge || "",
      motherOccupation: data.motherOccupation || "",
      motherHealth: data.motherHealth || "",
    };

    const parentInputs = document.querySelectorAll("#parent-info-grid input");
    Object.values(parentFields).forEach((val, i) => {
      if (parentInputs[i]) parentInputs[i].value = val;
    });

    /* 🩺 LOAD MEDICAL HISTORY SUBCOLLECTION */
    const historyRef = collection(db, "users", patientId, "medicalHistory");
    const historySnap = await getDocs(
      query(historyRef, orderBy("updatedAt", "desc"), limit(1))
    );

    if (!historySnap.empty) {
      const latestHistory = historySnap.docs[0].data();

      // 🧩 Textareas
      const medTextareas = document.querySelectorAll(
        ".medical-history-content textarea"
      );
      const medFields = [
        latestHistory.pastMedicalHistory || "",
        latestHistory.familyHistory || "",
        latestHistory.pastSurgicalHistory || "",
        latestHistory.supplements || "",
        latestHistory.allergies || "",
      ];
      medTextareas.forEach((ta, i) => (ta.value = medFields[i]));

      // 🧩 Immunization Fields
      const immunizationFields = [
        "bcg",
        "dpt",
        "opv",
        "hepb",
        "mmr",
        "measles",
        "others",
      ];
      immunizationFields.forEach((key) => {
        const input = document.querySelector(
          `.immunization-form input[name='${key}']`
        );
        if (input) input.value = latestHistory[key] || "";
      });

      // 🧩 OB-GYNE Fields
      const obgyneFields = [
        "menarcheAge",
        "durationDays",
        "napkinsPerDay",
        "interval",
        "lastMenstrual",
      ];
      obgyneFields.forEach((key) => {
        const input = document.querySelector(
          `.obgyne-form input[name='${key}']`
        );
        if (input) input.value = latestHistory[key] || "";
      });

      // 🧩 Dysmenorrhea
      if (latestHistory.dysmenorrhea) {
        const radio = document.querySelector(
          `.obgyne-form input[type='radio'][value='${latestHistory.dysmenorrhea}']`
        );
        if (radio) radio.checked = true;
      }
    } else {
      console.log("No medical history found for this patient.");
    }
  } catch (err) {
    console.error("Error fetching patient:", err);
  }
}
(async () => {
  await loadDepartments(); // ✅ wait for departments
  await loadPatient(); // ✅ now patient can safely set values
})();

/* -----------------------------------------------
     🔹 EDIT/SAVE CONTACT DETAILS
  ----------------------------------------------- */
const editBtn = document.getElementById("edit-contacts");
const cancelContactEditBtn = document.getElementById("cancel-contact-edit-btn");

let isEditingContacts = false;
let originalContactData = {};

editBtn.addEventListener("click", async () => {
  const inputs = document.querySelectorAll(".patient-contacts input");

  if (!isEditingContacts) {
    // 🔹 Store original values
    originalContactData = {
      phoneNumber: document.getElementById("phone-number").value,
      email: document.getElementById("email-address").value,
      address: document.getElementById("home-address").value,
      guardianName: document.getElementById("guardian-name").value,
      guardianPhone: document.getElementById("guardian-phone").value,
    };

    inputs.forEach((inp) => inp.removeAttribute("disabled"));
    editBtn.textContent = "💾 Save";
    cancelContactEditBtn.style.display = "inline-block";
    isEditingContacts = true;
    return;
  }

  // 🔹 Save updated contact info
  const updatedData = {
    phoneNumber: document.getElementById("phone-number").value,
    email: document.getElementById("email-address").value,
    address: document.getElementById("home-address").value,
    guardianName: document.getElementById("guardian-name").value,
    guardianPhone: document.getElementById("guardian-phone").value,
  };

  // 🔹 Detect changed fields
  const changedFields = [];
  Object.keys(updatedData).forEach((key) => {
    if ((updatedData[key] || "") !== (originalContactData[key] || "")) {
      changedFields.push(key);
    }
  });

  try {
    // 🔹 Update Firestore
    await updateDoc(doc(db, "users", patientId), updatedData);

    // 🔹 Audit Log (only if changes exist)
    if (changedFields.length > 0) {
      const userSnap = await getDoc(doc(db, "users", patientId));
      const userData = userSnap.data();

      const fullName = `${userData.firstName} ${userData.middleName || ""} ${
        userData.lastName
      }`.trim();

      const schoolId = userData.schoolId || "N/A";
      const clinicStaff = currentUserName;

      const message = `${clinicStaff} updated ${changedFields.join(", ")} ${
        changedFields.length > 1 ? "fields" : "field"
      } of ${fullName}'s (${schoolId}) Contact Information`;

      await addDoc(collection(db, "AdminAuditTrail"), {
        message,
        dateTime: formatAuditDate(), // for UI
        timestamp: new Date(), // for sorting
        section: "UserChanges",
      });
    }

    alert("Contact details updated!");
    inputs.forEach((inp) => inp.setAttribute("disabled", "true"));
    editBtn.textContent = "✏️ Edit";
    cancelContactEditBtn.style.display = "none";
    isEditingContacts = false;
  } catch (err) {
    console.error("Error updating contact details:", err);
    alert("Failed to update contact details.");
  }
});

cancelContactEditBtn.addEventListener("click", () => {
  // Restore original values
  document.getElementById("phone-number").value =
    originalContactData.phoneNumber;
  document.getElementById("email-address").value = originalContactData.email;
  document.getElementById("home-address").value = originalContactData.address;
  document.getElementById("guardian-name").value =
    originalContactData.guardianName;
  document.getElementById("guardian-phone").value =
    originalContactData.guardianPhone;

  // Disable inputs
  document
    .querySelectorAll(".patient-contacts input")
    .forEach((inp) => inp.setAttribute("disabled", "true"));

  // Reset buttons
  editBtn.textContent = "✏️ Edit";
  cancelContactEditBtn.style.display = "none";
  isEditingContacts = false;
});

/* -----------------------------------------------
     🔹 EDIT / CANCEL MEDICAL HISTORY
----------------------------------------------- */
const editHistoryBtn = document.getElementById("editHistoryBtn");
const cancelHistoryBtn = document.getElementById("cancelHistoryBtn");

let isEditingHistory = false;
let originalHistoryData = {}; // Stores Firestore-loaded values
let currentHistoryId = null; // Latest medicalHistory doc ID

// --------------------------
// Store original values after loading from Firestore
// Call this after populating the form in loadPatient()
function storeOriginalHistoryData() {
  const editableFields = document.querySelectorAll(
    ".medical-history-content textarea, .medical-history-content input"
  );

  editableFields.forEach((el) => {
    if (el.type === "radio") {
      originalHistoryData[el.name] =
        document.querySelector(`.obgyne-form input[name="${el.name}"]:checked`)
          ?.value || "";
    } else {
      originalHistoryData[el.name] = el.value;
    }
  });
}

// --------------------------
// Enable Edit Mode
editHistoryBtn.addEventListener("click", async () => {
  const editableFields = document.querySelectorAll(
    ".medical-history-content textarea, .medical-history-content input"
  );

  if (!isEditingHistory) {
    // Enable editing
    editableFields.forEach((el) => el.removeAttribute("disabled"));
    editHistoryBtn.textContent = "💾 Save";
    cancelHistoryBtn.style.display = "inline-block";
    isEditingHistory = true;

    // Get latest doc ID for update
    const historyRef = collection(db, "users", patientId, "medicalHistory");
    const historySnap = await getDocs(
      query(historyRef, orderBy("updatedAt", "desc"), limit(1))
    );
    currentHistoryId = !historySnap.empty ? historySnap.docs[0].id : null;
  } else {
    // Collect updated values
    const [pastMedical, familyHistory, pastSurgical, supplements, allergies] =
      Array.from(
        document.querySelectorAll(".medical-history-content textarea")
      ).map((ta) => ta.value.trim());

    const immunizationInputs = ["bcg","dpt","opv","hepb","mmr","measles","others"];
    const immunizationData = {};
    immunizationInputs.forEach((name) => {
      const input = document.querySelector(`input[name="${name}"]`);
      if (input) immunizationData[name] = input.value.trim();
    });

    const obgyneInputs = ["menarcheAge","durationDays","napkinsPerDay","interval","lastMenstrual"];
    const obgyneData = {};
    obgyneInputs.forEach((name) => {
      const input = document.querySelector(`input[name="${name}"]`);
      if (input) obgyneData[name] = input.value.trim();
    });

    const dysmenorrhea = document.querySelector('input[name="dysmenorrhea"]:checked')?.value || "";

    const historyData = {
      pastMedicalHistory: pastMedical,
      familyHistory,
      pastSurgicalHistory: pastSurgical,
      supplements,
      allergies,
      ...immunizationData,
      ...obgyneData,
      dysmenorrhea,
      updatedAt: new Date(),
    };

    try {
      const historyRef = collection(db, "users", patientId, "medicalHistory");

      if (currentHistoryId) {
        await updateDoc(doc(historyRef, currentHistoryId), historyData);
      } else {
        await addDoc(historyRef, historyData);
      }

      // -----------------------
      // Fetch patient info for audit
      let patientInfo = { name: patientId, schoolId: "N/A" };
      try {
        const patientDoc = await getDoc(doc(db, "users", patientId));
        if (patientDoc.exists()) {
          const data = patientDoc.data();
          patientInfo = {
            name: `${data.lastName}, ${data.firstName}`,
            schoolId: data.schoolId || "N/A",
          };
        }
      } catch (patientError) {
        console.error("Failed to fetch patient info for audit:", patientError);
      }

      // -----------------------
      // Add centralized Admin Audit Trail
      const auditMessage = `${currentUserName || "Unknown User"} updated medical history for patient "${patientInfo.name}" (School ID: ${patientInfo.schoolId})`;

      await addDoc(collection(db, "AdminAuditTrail"), {
        message: auditMessage,
        userId: currentUserName || null,
        timestamp: new Date(),
        section: "ClinicStaffActions",
      });

      // -----------------------
      // Add patient-specific edit log
      const editLogRef = collection(db, "users", patientId, "editLogs");
      await addDoc(editLogRef, {
        message: `Edited by ${currentUserName} · ${new Date().toLocaleString("en-US", {
          month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true
        })}`,
        timestamp: new Date(),
        editor: currentUserName,
        section: "Medical History",
      });

      alert("Medical History saved successfully!");

      // Disable all fields
      editableFields.forEach((el) => el.setAttribute("disabled", "true"));
      editHistoryBtn.textContent = "✏️ Edit";
      cancelHistoryBtn.style.display = "none";
      isEditingHistory = false;

      storeOriginalHistoryData();
    } catch (err) {
      console.error("Error saving medical history:", err);
      alert("Failed to save medical history.");
    }
  }
});


// --------------------------
// Cancel edits
cancelHistoryBtn.addEventListener("click", () => {
  const editableFields = document.querySelectorAll(
    ".medical-history-content textarea, .medical-history-content input"
  );

  editableFields.forEach((el) => {
    if (el.type === "radio") {
      el.checked = el.value === originalHistoryData[el.name];
    } else if (originalHistoryData.hasOwnProperty(el.name)) {
      el.value = originalHistoryData[el.name];
    }
    el.setAttribute("disabled", "true");
  });

  editHistoryBtn.textContent = "✏️ Edit";
  cancelHistoryBtn.style.display = "none";
  isEditingHistory = false;
});

/* -----------------------------------------------
     🔹 EDIT/SAVE PATIENT INFORMATION WITH CANCEL
  ----------------------------------------------- */
const editPatientInfoBtn = document.getElementById("editPatientInfoBtn");
const cancelPatientInfoBtn = document.getElementById("cancelPatientInfoBtn");

let isEditingPatientInfo = false;
let originalPatientInfoData = {};

// Helper: get all editable inputs & selects
function getPatientInfoFields() {
  return document.querySelectorAll(
    ".patient-info-content input, .patient-info-content select"
  );
}

// Store original values
function storeOriginalPatientInfo(fields) {
  originalPatientInfoData = {};
  fields.forEach(
    (el) => (originalPatientInfoData[el.id || el.name] = el.value)
  );
}

// Restore original values
function restoreOriginalPatientInfo(fields) {
  fields.forEach((el) => {
    const key = el.id || el.name;
    if (originalPatientInfoData[key] !== undefined)
      el.value = originalPatientInfoData[key];
  });
}

// Enable editing
function enablePatientInfoEditing(fields) {
  fields.forEach((el) => {
    el.removeAttribute("disabled");
   
  });
  editPatientInfoBtn.textContent = "💾 Save";
  cancelPatientInfoBtn.style.display = "inline-block";
  isEditingPatientInfo = true;
}

// Disable editing
function disablePatientInfoEditing(fields) {
  fields.forEach((el) => {
    el.setAttribute("disabled", "true");
  });
  editPatientInfoBtn.textContent = "✏️ Edit";
  cancelPatientInfoBtn.style.display = "none";
  isEditingPatientInfo = false;
}

// Edit/Save button click
editPatientInfoBtn.addEventListener("click", async () => {
  const fields = getPatientInfoFields();

  if (!isEditingPatientInfo) {
    storeOriginalPatientInfo(fields);
    enablePatientInfoEditing(fields);
    return;
  }

  const updatedData = {};
  const changedFields = [];

  fields.forEach((f) => {
    updatedData[f.id] = f.value;

    if (f.value !== (originalPatientInfoData[f.id] || "")) {
      changedFields.push(f.id);
    }
  });

  try {
    // 🔹 Update patient record
    await updateDoc(doc(db, "users", patientId), updatedData);

    // 🔹 Audit log (only if something changed)
    if (changedFields.length > 0) {
      const userSnap = await getDoc(doc(db, "users", patientId));
      const userData = userSnap.data();

      const fullName = `${userData.firstName} ${userData.middleName || ""} ${
        userData.lastName
      }`.trim();

      const schoolId = userData.schoolId || "N/A";
      const clinicStaff = currentUserName;

      const message = `${clinicStaff} updated ${changedFields.join(", ")} ${
        changedFields.length > 1 ? "fields" : "field"
      } of ${fullName}'s (${schoolId}) Personal Information`;

      await addDoc(collection(db, "AdminAuditTrail"), {
        message,
        dateTime: formatAuditDate(), // for UI
        timestamp: new Date(), // for sorting
        section: "UserChanges",
      });
    }

    alert("Patient information updated!");
    disablePatientInfoEditing(fields);
  } catch (err) {
    console.error(err);
    alert("Failed to update patient information.");
  }
});

// Cancel button click
cancelPatientInfoBtn.addEventListener("click", () => {
  const fields = getPatientInfoFields();
  restoreOriginalPatientInfo(fields);
  disablePatientInfoEditing(fields);
});

/* -----------------------------------------------
     🔹 CONSULTATION FORM SUBMIT
  ----------------------------------------------- */
const medsContainers = document.querySelectorAll(".meds-list");
const addMedBtns = document.querySelectorAll(".add-med-btn");
let medicinesData = [];

// Load medicines once
async function loadMedicineOptions() {
  const querySnapshot = await getDocs(collection(db, "MedicineInventory"));
  medicinesData = querySnapshot.docs.map((doc) => ({
    name: doc.data().name,
    availableQty: doc.data().stock || 0,
  }));
}
loadMedicineOptions();

// Add medicine to each container
addMedBtns.forEach((btn, index) => {
  const containerDiv = medsContainers[index];

  btn.addEventListener("click", () => {
    const container = document.createElement("div");
    container.classList.add(
      "med-row",
      "d-flex",
      "flex-wrap",
      "gap-2",
      "align-items-center",
      "p-2",
      "border",
      "rounded"
    );

    const optionsHTML = medicinesData
      .map(
        (m) =>
          `<option value="${m.name}" data-qty="${m.availableQty}">${m.name} (Available: ${m.availableQty})</option>`
      )
      .join("");

    container.innerHTML = `
      <select class="form-select form-select-sm med-name" required style="min-width: 200px;">
        <option value="" disabled selected>Select Medicine</option>
        ${optionsHTML}
      </select>

      <input type="number" class="form-control form-control-sm med-qty" min="1" placeholder="Qty" style="width: 80px;" />

      <select class="form-select form-select-sm med-type" required style="width: 140px;">
        <option value="" disabled selected>Type</option>
        <option value="Administered">Administered</option>
        <option value="Dispensed">Dispensed</option>
      </select>

      <input type="text" class="form-control form-control-sm med-remarks" placeholder="Remarks" style="flex: 1;" />

      <button type="button" class="btn btn-sm btn-danger remove-med">X</button>
    `;

    // Remove button
    container.querySelector(".remove-med").addEventListener("click", () => {
      container.remove();
    });

    containerDiv.appendChild(container);
  });
});

// ============================================================
// Loading Doctors For Consultation Form
// ============================================================
async function loadDoctors() {
  const doctorSelect = document.getElementById("consult-doctor");
  const doctorSelectOvervewiew = document.getElementById("ovr-doctor");
  doctorSelect.innerHTML = `<option value="">Loading...</option>`;
  doctorSelectOvervewiew.innerHTML = `<option value="">Loading...</option>`;
  const q = query(collection(db, "users"), where("user_type", "==", "doctor"));

  const snap = await getDocs(q);

  doctorSelect.innerHTML = `<option value="">Select Doctor</option>`;
  doctorSelectOvervewiew.innerHTML = `<option value="">Select Doctor</option>`;

  snap.forEach((doc) => {
    const data = doc.data();

    const lastName = data.lastName || "";
    const firstName = data.firstName || "";
    const middleName = data.middleName || "";

    const displayName = `${lastName}, ${firstName} ${middleName}`.trim();

    // Option for consult-doctor
    const option1 = document.createElement("option");
    option1.value = doc.id;
    option1.textContent = displayName;

    // Option for overview-doctor
    const option2 = document.createElement("option");
    option2.value = doc.id;
    option2.textContent = displayName;

    doctorSelect.appendChild(option1);
    doctorSelectOvervewiew.appendChild(option2);
  });
}
loadDoctors();
// ============================================================
// Loading Complaints For Consultation Form
// ============================================================
async function loadComplaints() {
  const select = document.getElementById("consult-complaint");

  // Reset dropdown
  select.innerHTML = `
    <option value="">Select Complaint</option>
    <option value="__add_new__">➕ Add New Complaint</option>
  `;

  const snap = await getDocs(collection(db, "complaints"));

  snap.forEach((doc) => {
    const data = doc.data();
    const option = document.createElement("option");
    option.value = data.name;
    option.textContent = data.name;
    select.appendChild(option);
  });
}
document.getElementById("consult-complaint").addEventListener("change", () => {
  const select = document.getElementById("consult-complaint");
  const newInput = document.getElementById("new-complaint-input");

  if (select.value === "__add_new__") {
    newInput.style.display = "block";
    newInput.focus();
  } else {
    newInput.style.display = "none";
    newInput.value = "";
  }
});
loadComplaints();
// ============================================================
// Loading Diagnoses For Consultation Form
// ============================================================
async function loadDiagnoses() {
  const select = document.getElementById("consult-diagnosis");

  select.innerHTML = `
    <option value="">Select Diagnosis</option>
    <option value="__add_new__">➕ Add New Diagnosis</option>
  `;

  const snap = await getDocs(collection(db, "diagnoses"));

  snap.forEach((doc) => {
    const data = doc.data();
    const option = document.createElement("option");
    option.value = data.name;
    option.textContent = data.name;
    select.appendChild(option);
  });
}
document.getElementById("consult-diagnosis").addEventListener("change", () => {
  const select = document.getElementById("consult-diagnosis");
  const newInput = document.getElementById("new-diagnosis-input");

  if (select.value === "__add_new__") {
    newInput.style.display = "block";
    newInput.focus();
  } else {
    newInput.style.display = "none";
    newInput.value = "";
  }
});
loadDiagnoses();
// ============================================================
// Set Default Time/Date Helper
// ============================================================
function setToCurrentDate() {
  const now = new Date();

  // Format date (YYYY-MM-DD)
  const date = now.toLocaleDateString("en-CA");

  // Format time (HH:MM 24-hour)
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  document.getElementById("consult-date").value = date;
  document.getElementById("consult-time").value = time;
  document.getElementById("exam-date").value = date;
}
setToCurrentDate();
// ============================================================
// Consultation Form Submission
// ============================================================
// Bootstrap modal instance
const addConsultationModalEl = document.getElementById("addConsultationModal");
const addConsultationModal = new bootstrap.Modal(addConsultationModalEl);

// Handle form submission
document
  .getElementById("consultation-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const doctorSelect = document.getElementById("consult-doctor");
    const doctorName =
      doctorSelect.options[doctorSelect.selectedIndex]?.textContent || "";

    const submitBtn = document.querySelector(
      '#addConsultationModal button[type="submit"]'
    );
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Saving...";

    const now = new Date();
    const medDate = now.toISOString().split("T")[0];
    const medTime = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Collect medicines
    const medsDispensed = Array.from(document.querySelectorAll(".med-row"))
      .map((row) => ({
        name: row.querySelector(".med-name").value,
        quantity: parseInt(row.querySelector(".med-qty").value) || 0,
        type: row.querySelector(".med-type")?.value || "",
        remarks: row.querySelector(".med-remarks")?.value || "",
        NurseOnDuty: currentUserName,
        date: medDate,
        time: medTime,
      }))
      .filter((med) => med.name !== "");

    // Capitalize helper
    function capitalizeFirstLetter(text) {
      if (!text) return "";
      return text.charAt(0).toUpperCase() + text.slice(1);
    }

    // Handle Complaint
    let complaintValue = document.getElementById("consult-complaint").value;
    let newComplaintText = document
      .getElementById("new-complaint-input")
      .value.trim();
    let finalComplaint =
      complaintValue === "__add_new__"
        ? capitalizeFirstLetter(newComplaintText)
        : capitalizeFirstLetter(complaintValue);

    if (complaintValue === "__add_new__" && finalComplaint === "") {
      alert("Please enter a new complaint.");
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    // Save new complaint if needed
    if (complaintValue === "__add_new__") {
      const complaintsRef = collection(db, "complaints");
      const snap = await getDocs(
        query(complaintsRef, where("name", "==", finalComplaint))
      );
      if (snap.empty) {
        await addDoc(complaintsRef, {
          name: finalComplaint,
          createdAt: new Date(),
        });
      }
    }

    // Handle Diagnosis
    let diagnosisValue = document.getElementById("consult-diagnosis").value;
    let newDiagnosisText = document
      .getElementById("new-diagnosis-input")
      .value.trim();
    let finalDiagnosis =
      diagnosisValue === "__add_new__"
        ? capitalizeFirstLetter(newDiagnosisText)
        : capitalizeFirstLetter(diagnosisValue);

    if (diagnosisValue === "__add_new__" && finalDiagnosis === "") {
      alert("Please enter a new diagnosis.");
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    // Save new diagnosis if needed
    if (diagnosisValue === "__add_new__") {
      const diagRef = collection(db, "diagnoses");
      const snap = await getDocs(
        query(diagRef, where("name", "==", finalDiagnosis))
      );
      if (snap.empty) {
        await addDoc(diagRef, { name: finalDiagnosis, createdAt: new Date() });
      }
    }

    // Prepare consultation data
    const consultData = {
      consultingDoctor: doctorName,
      date: document.getElementById("consult-date").value,
      time: document.getElementById("consult-time").value,
      complaint: finalComplaint,
      diagnosis: finalDiagnosis,
      meds: medsDispensed,
      notes: document.getElementById("consult-notes").value,
      NurseOnDuty: currentUserName,
      createdAt: new Date(),
    };

    try {
      // Save consultation record
      const consultRef = collection(db, "users", patientId, "consultations");
      const newConsultDoc = await addDoc(consultRef, consultData);
      const consultationId = newConsultDoc.id;

      // Save complaint record
      await addDoc(collection(db, "complaintRecords"), {
        patientId,
        complaint: consultData.complaint,
        consultationId,
        date: consultData.date,
      });

      // Deduct medicines
      for (const med of medsDispensed) {
        if (med.name && med.quantity > 0) {
          const invRef = collection(db, "MedicineInventory");
          const snap = await getDocs(
            query(invRef, where("name", "==", med.name))
          );
          if (!snap.empty) {
            const medDoc = snap.docs[0];
            const data = medDoc.data();
            const newStock = Math.max((data.stock || 0) - med.quantity, 0);
            const newDispensed = (data.dispensed || 0) + med.quantity;
            await updateDoc(medDoc.ref, {
              stock: newStock,
              dispensed: newDispensed,
            });
          }
        }
      }

      // Save edit log
      const editLogRef = collection(db, "users", patientId, "editLogs");
      await addDoc(editLogRef, {
        message: `Edited by ${currentUserName} · ${new Date().toLocaleString(
          "en-US",
          {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }
        )}`,
        timestamp: new Date(),
        editor: currentUserName,
        section: "Medical Consultation Record",
      });

      alert("✅ Consultation Record Saved + Visit Logged + Medicine Deducted!");

      addConsultationModal.hide();
      // Reload data
      loadConsultations();
      loadComplaints();
      loadMedicineOptions();
    } catch (err) {
      console.error("❌ Error adding consultation:", err);
      alert("Failed to save consultation record.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

/* -----------------------------------------------
   🔹 LOAD CONSULTATION RECORDS INTO TABLE
------------------------------------------------ */
let currentConsultationId = null;

async function loadConsultations() {
  const tableBody = document.querySelector(
    ".medical-consultation-content tbody"
  );
  tableBody.innerHTML = "";

  try {
    const consultRef = collection(db, "users", patientId, "consultations");
    const snapshot = await getDocs(consultRef);

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const consultId = docSnap.id; // ✅ get consultation ID

      let medsDisplay = "No Prescriptions";
      if (Array.isArray(data.meds) && data.meds.length > 0) {
        medsDisplay = data.meds
          .map((m) => `${m.name} (${m.quantity})`)
          .join(", ");
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${data.consultingDoctor || "Not Assigned"}</td>
        <td>${data.NurseOnDuty}</td>
        <td>${formatDateLabel(data.date)}</td>
        <td>${formatTimeFromString(data.time)}</td>
        <td>${data.complaint}</td>
        <td>${data.diagnosis || "Not Diagnosed"}</td>
        <td>${medsDisplay}</td>
        
      `;
      // ✅ Pass both data and ID
      tr.addEventListener("click", () =>
        showConsultationDetails(data, consultId)
      );
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading consultations:", err);
  }
}

/* -----------------------------------------------
   🔹 SHOW CONSULTATION DETAILS IN MODAL
------------------------------------------------ */
window.showConsultationDetails = async function (data, consultId) {
  currentConsultationId = consultId;

  // Fill basic info
  document.getElementById("ovr-doctor").value = data.consultingDoctor || "";
  document.getElementById("ovr-date").value = data.date || "";
  document.getElementById("ovr-time").value = data.time || "";
  document.getElementById("ovr-complaint").value = data.complaint || "";
  document.getElementById("ovr-diagnosis").value = data.diagnosis || "";
  document.getElementById("ovr-notes").value = data.notes || "";

  // Fill meds
  const meds = Array.isArray(data.meds) ? data.meds : [];
  const medsContainer = document.getElementById("cons-meds-list");
  medsContainer.innerHTML = "";

  if (!meds.length) {
    medsContainer.innerHTML = `<tr><td colspan="7">No medications dispensed.</td></tr>`;
  } else {
    meds.forEach((m, i) => {
      medsContainer.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td>${m.name || "-"}</td>
          <td>${m.quantity || "-"}</td>
          <td>${formatDateLabel(m.date) || "-"} ${m.time || "-"}</td>
          <td>${m.NurseOnDuty || "-"}</td>
          <td>${m.type || "-"}</td>
          <td>${m.remarks || "-"}</td>
        </tr>
      `;
    });
  }

  // Show Bootstrap modal
  const consultModalEl = document.getElementById("consultationOverviewModal");
  const consultModal = new bootstrap.Modal(consultModalEl);
  consultModal.show();
};

/* -----------------------------------------------
   🔹 EDIT, SAVE CONSULTATION DETAILS
------------------------------------------------ */
const editOverviewBtn = document.getElementById("editOverviewBtn");
const consultationModalEl = document.getElementById(
  "consultationOverviewModal"
);
const consultModal = bootstrap.Modal.getOrCreateInstance(consultationModalEl);

// ENTER EDIT / SAVE MODE
editOverviewBtn.addEventListener("click", async () => {
  const editableInputs = document.querySelectorAll(
    "#ovr-doctor, #ovr-date, #ovr-time, #ovr-complaint, #ovr-diagnosis, #ovr-notes"
  );

  // ✅ ENTER EDIT MODE
  if (editOverviewBtn.textContent.includes("✏️")) {
    editableInputs.forEach((input) => input.removeAttribute("disabled"));

    // Change Edit button text to Save
    editOverviewBtn.textContent = "💾 Save";
    return;
  }

  // ✅ SAVE MODE
  if (!currentConsultationId) return alert("No consultation selected!");

  const updatedData = {
    consultingDoctor: document.getElementById("ovr-doctor").value,
    date: document.getElementById("ovr-date").value,
    time: document.getElementById("ovr-time").value,
    complaint: document.getElementById("ovr-complaint").value.trim(),
    diagnosis: document.getElementById("ovr-diagnosis").value,
    notes: document.getElementById("ovr-notes").value,
    updatedAt: new Date(),
  };

  try {
    const consultRef = doc(
      db,
      "users",
      patientId,
      "consultations",
      currentConsultationId
    );

    await updateDoc(consultRef, updatedData);

    // ✅ Save edit log in subcollection
    const editLogRef = collection(db, "users", patientId, "editLogs");
    await addDoc(editLogRef, {
      message: `Edited by ${currentUserName} · ${new Date().toLocaleString(
        "en-US",
        {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }
      )}`,
      timestamp: new Date(),
      editor: currentUserName,
      section: "Medical Consultation Record",
    });

    // ✅ Exit edit mode before hiding
    exitEditMode();

    // ✅ Hide modal
    consultModal.hide();

    // ✅ Reload table
    loadConsultations();

    // ✅ Show success message after modal is hidden
    setTimeout(() => {
      alert("✅ Consultation updated!");
    }, 200);
  } catch (err) {
    console.error(err);
    alert("Failed to update consultation.");
  }
});

// When modal is hidden, exit edit mode automatically
consultationModalEl.addEventListener("hidden.bs.modal", () => {
  exitEditMode();
});

// ✅ Helper function to exit edit mode
function exitEditMode() {
  const editableInputs = document.querySelectorAll(
    "#ovr-doctor, #ovr-date, #ovr-time, #ovr-complaint, #ovr-diagnosis, #ovr-notes"
  );

  // Disable all inputs
  editableInputs.forEach((input) => input.setAttribute("disabled", true));

  // Hide add buttons

  // Reset Edit button text
  editOverviewBtn.textContent = "✏️ Edit";
}

/* -----------------------------------------------
 🔹 SAVE PHYSICAL EXAMINATION RECORD
----------------------------------------------- */
document
  .getElementById("physical-exam-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const physicalData = {
      date: document.getElementById("exam-date").value,
      bp: document.getElementById("exam-bp").value,
      pr: document.getElementById("exam-pr").value,
      weight: Number(document.getElementById("exam-weight").value),
      height: Number(document.getElementById("exam-height").value),
      bmi: Number(document.getElementById("exam-bmi").value),
      visualAcuity: {
        os: document.getElementById("exam-visual-os").value,
        od: document.getElementById("exam-visual-od").value,
        glasses: document.getElementById("exam-glasses").checked,
      },
      findings: {
        heent: document.getElementById("exam-heent").value,
        teeth: document.getElementById("exam-teeth").value,
        neck: document.getElementById("exam-neck").value,
        chest: document.getElementById("exam-chest").value,
        lungs: document.getElementById("exam-lungs").value,
        heart: document.getElementById("exam-heart").value,
        breast: document.getElementById("exam-breast").value,
        skin: document.getElementById("exam-skin").value,
        abdomen: document.getElementById("exam-abdomen").value,
        back: document.getElementById("exam-back").value,
        anus: document.getElementById("exam-anus").value,
        genitalia: document.getElementById("exam-genitalia").value,
        extremities: document.getElementById("exam-extremities").value,
        cleanliness: document.getElementById("exam-cleanliness").value,
        posture: document.getElementById("exam-posture").value,
        nutrition: document.getElementById("exam-nutrition").value,
        deformity: document.getElementById("exam-deformity").value,
        others: document.getElementById("exam-others").value,
      },
      labPresent: document.getElementById("exam-lab-present").value,
      recommendations: document.getElementById("exam-recommendations").value,
      createdAt: new Date(),
    };

    try {
      const examRef = collection(
        db,
        "users",
        patientId,
        "physicalExaminations"
      );
      await addDoc(examRef, physicalData);

      // ✅ Save edit log in subcollection
      const editLogRef = collection(db, "users", patientId, "editLogs");
      await addDoc(editLogRef, {
        message: `Edited by ${currentUserName} · ${new Date().toLocaleString(
          "en-US",
          {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }
        )}`,
        timestamp: new Date(),
        editor: currentUserName,
        section: "Physical Examination",
      });

      alert("Physical Examination Record Saved!");
      loadPhysicalExaminations();

      // ✅ Close Bootstrap modal programmatically
      const modalEl = document.getElementById("addPhysicalExamModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) {
        modal.hide();
      }

      // Reset form after closing
      e.target.reset();

      // Reset BMI field if needed
      const bmiInput = document.getElementById("exam-bmi");
      if (bmiInput) bmiInput.value = "";
    } catch (err) {
      console.error("Error saving physical examination:", err);
      alert("Failed to save Physical Examination.");
    }
  });

// ===== AUTO COMPUTE BMI ON TYPING =====
const weightInput = document.getElementById("exam-weight");
const heightInput = document.getElementById("exam-height");
const bmiInput = document.getElementById("exam-bmi");

const MIN_HEIGHT = 50;
const MAX_HEIGHT = 250;
const MIN_WEIGHT = 10;
const MAX_WEIGHT = 300;

function computeBMI() {
  const weight = parseFloat(weightInput.value);
  const heightCm = parseFloat(heightInput.value);

  let isValid = true;

  // Validate weight
  if (!weight || weight < MIN_WEIGHT || weight > MAX_WEIGHT) {
    weightInput.classList.add("is-invalid");
    isValid = false;
  } else {
    weightInput.classList.remove("is-invalid");
  }

  // Validate height
  if (!heightCm || heightCm < MIN_HEIGHT || heightCm > MAX_HEIGHT) {
    heightInput.classList.add("is-invalid");
    isValid = false;
  } else {
    heightInput.classList.remove("is-invalid");
  }

  // Compute BMI if valid
  if (isValid) {
    const heightM = heightCm / 100;
    const bmi = weight / (heightM * heightM);
    bmiInput.value = bmi.toFixed(1);
  } else {
    bmiInput.value = "Out of range";
  }
}

weightInput.addEventListener("input", computeBMI);
heightInput.addEventListener("input", computeBMI);
/* -----------------------------------------------
 🔹 LOAD PHYSICAL EXAMINATION RECORDS
----------------------------------------------- */
async function loadPhysicalExaminations() {
  const tableBody = document.getElementById("physical-exam-list");
  tableBody.innerHTML = "";

  try {
    const examRef = collection(db, "users", patientId, "physicalExaminations");
    const snapshot = await getDocs(examRef);
    function getBMICategory(bmi) {
      if (!bmi || isNaN(bmi)) return "-";

      if (bmi < 18.5) return "Underweight";
      if (bmi < 25) return "Healthy";
      if (bmi < 30) return "Overweight";
      return "Obesity";
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const tr = document.createElement("tr");

      tr.innerHTML = `
    <td>${formatDateLabel(data.date) || "-"}</td>
    <td>${data.bp || "-"}</td>
    <td>${data.pr || "-"}</td>
    <td>${data.weight || "-"}</td>
    <td>${data.height || "-"}</td>
    <td>${data.bmi || "-"}</td>
    <!-- // <td>${data.findings?.others || "Normal physical findings"}</td> --> 
    <td>${getBMICategory(data.bmi)}</td>
  `;

      // 👇 Add click event to show overview
      tr.addEventListener("click", () =>
        showExamOverview(patientId, docSnap.id)
      );
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading physical examinations:", err);
  }
}
/* -----------------------------------------------
   🔹 SHOW EXAM OVERVIEW (FIXED)
------------------------------------------------ */
let currentExamId = null;
let currentPatientId = null;
window.showExamOverview = async function (patientId, examId) {
  try {
    currentExamId = examId;
    currentPatientId = patientId;

    const examRef = doc(db, "users", patientId, "physicalExaminations", examId);
    const examSnap = await getDoc(examRef);

    if (!examSnap.exists()) {
      alert("Exam record not found!");
      return;
    }

    const data = examSnap.data();

    // Fill Vital Signs
    document.getElementById("ovr-exam-date").value = data.date || "";
    document.getElementById("ovr-exam-bp").value = data.bp || "";
    document.getElementById("ovr-exam-pr").value = data.pr || "";
    document.getElementById("ovr-exam-weight").value = data.weight || "";
    document.getElementById("ovr-exam-height").value = data.height || "";
    document.getElementById("ovr-exam-bmi").value = data.bmi || "";

    // Visual Acuity
    document.getElementById("ovr-exam-os").value = data.visualAcuity?.os || "";
    document.getElementById("ovr-exam-od").value = data.visualAcuity?.od || "";
    document.getElementById("ovr-exam-glasses").value = String(
      data.visualAcuity?.glasses || false
    );

    // Physical Findings
    const findingFields = [
      "heent",
      "teeth",
      "neck",
      "chest",
      "lungs",
      "heart",
      "breast",
      "skin",
      "abdomen",
      "back",
      "anus",
      "genitalia",
      "extremities",
      "cleanliness",
      "posture",
      "nutrition",
      "deformity",
      "others",
    ];
    findingFields.forEach((field) => {
      const el = document.getElementById(`ovr-exam-${field}`);
      if (el) el.value = data.findings?.[field] || "";
    });

    // Lab & Recommendations
    document.getElementById("ovr-exam-lab").value = data.labPresent || "";
    document.getElementById("ovr-exam-recommendations").value =
      data.recommendations || "";

    // Show Bootstrap modal
    const modalEl = document.getElementById("exam-overview-modal");
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  } catch (err) {
    console.error("❌ Error showing exam overview:", err);
    alert("Failed to load examination details.");
  }
};
function computeOverviewBMI() {
  const weightInput = document.getElementById("ovr-exam-weight");
  const heightInput = document.getElementById("ovr-exam-height");
  const bmiInput = document.getElementById("ovr-exam-bmi");

  const weight = parseFloat(weightInput.value);
  const heightCm = parseFloat(heightInput.value);

  let isValid = true;

  // Validate weight
  if (!weight || weight < MIN_WEIGHT || weight > MAX_WEIGHT) {
    weightInput.classList.add("is-invalid");
    isValid = false;
  } else {
    weightInput.classList.remove("is-invalid");
  }

  // Validate height
  if (!heightCm || heightCm < MIN_HEIGHT || heightCm > MAX_HEIGHT) {
    heightInput.classList.add("is-invalid");
    isValid = false;
  } else {
    heightInput.classList.remove("is-invalid");
  }

  // Compute BMI
  if (isValid) {
    const heightM = heightCm / 100;
    const bmi = weight / (heightM * heightM);
    bmiInput.value = bmi.toFixed(1);
  } else {
    bmiInput.value = "";
  }
}

/* -----------------------------------------------
   🔹 EDIT & SAVE EXAM DETAILS (UPDATED – STRUCTURED)
------------------------------------------------ */
const editExamBtn = document.getElementById("editExamBtn");

editExamBtn.addEventListener("click", async () => {
  const modal = document.getElementById("exam-overview-modal");

  const inputs = modal.querySelectorAll("input, textarea, select");

  /* ===============================
     ✏️ ENABLE EDIT MODE
  =============================== */
  if (editExamBtn.textContent.includes("✏️")) {
    inputs.forEach((el) => el.removeAttribute("disabled"));

    // 🔥 Enable BMI auto-compute in overview
    document
      .getElementById("ovr-exam-weight")
      .addEventListener("input", computeOverviewBMI);

    document
      .getElementById("ovr-exam-height")
      .addEventListener("input", computeOverviewBMI);

    editExamBtn.textContent = "💾 Save";
    return;
  }

  /* ===============================
     💾 SAVE MODE
  =============================== */
  if (!currentExamId || !currentPatientId) {
    alert("No exam record selected!");
    return;
  }

  /* ---------- DATE FIX ---------- */
  let dateValue = document.getElementById("ovr-exam-date").value || "";

  // MM-DD-YYYY → YYYY-MM-DD (fallback safety)
  if (dateValue.includes("-")) {
    const parts = dateValue.split("-");
    if (parts[0].length === 2) {
      const [mm, dd, yyyy] = parts;
      dateValue = `${yyyy}-${mm}-${dd}`;
    }
  }

  /* ---------- STRUCTURED FINDINGS ---------- */
  const findingFields = [
    "heent",
    "teeth",
    "neck",
    "chest",
    "lungs",
    "heart",
    "breast",
    "skin",
    "abdomen",
    "back",
    "anus",
    "genitalia",
    "extremities",
    "cleanliness",
    "posture",
    "nutrition",
    "deformity",
    "others",
  ];

  const findingsObj = {};
  findingFields.forEach((field) => {
    const el = document.getElementById(`ovr-exam-${field}`);
    if (el && el.value.trim() !== "") {
      findingsObj[field] = el.value.trim();
    }
  });

  /* ---------- BUILD FINAL OBJECT ---------- */
  const updatedExam = {
    date: dateValue,
    bp: document.getElementById("ovr-exam-bp").value || "",
    pr: document.getElementById("ovr-exam-pr").value || "",
    weight: Number(document.getElementById("ovr-exam-weight").value || 0),
    height: Number(document.getElementById("ovr-exam-height").value || 0),
    bmi: Number(document.getElementById("ovr-exam-bmi").value || 0),

    visualAcuity: {
      os: document.getElementById("ovr-exam-os").value || "",
      od: document.getElementById("ovr-exam-od").value || "",
      glasses: document.getElementById("ovr-exam-glasses").value === "true",
    },

    findings: findingsObj,

    labPresent: document.getElementById("ovr-exam-lab").value || "",

    recommendations:
      document.getElementById("ovr-exam-recommendations").value || "",

    updatedAt: new Date(),
  };

  try {
    const examRef = doc(
      db,
      "users",
      currentPatientId,
      "physicalExaminations",
      currentExamId
    );
    if (
      document
        .getElementById("ovr-exam-weight")
        .classList.contains("is-invalid") ||
      document
        .getElementById("ovr-exam-height")
        .classList.contains("is-invalid")
    ) {
      alert("⚠️ Please fix invalid weight or height.");
      return;
    }

    await updateDoc(examRef, updatedExam);

    /* ---------- EDIT LOG ---------- */
    const editLogRef = collection(db, "users", currentPatientId, "editLogs");

    await addDoc(editLogRef, {
      message: `Edited by ${currentUserName} · ${new Date().toLocaleString(
        "en-US",
        {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }
      )}`,
      timestamp: new Date(),
      editor: currentUserName,
      section: "Physical Examination",
    });

    alert("✅ Physical examination updated successfully!");

    /* ---------- LOCK BACK ---------- */
    inputs.forEach((el) => el.setAttribute("disabled", "true"));
    editExamBtn.textContent = "✏️ Edit";

    if (typeof loadPhysicalExaminations === "function") {
      loadPhysicalExaminations();
    }
  } catch (err) {
    console.error("❌ Error updating exam:", err);
    alert("Failed to update physical examination record.");
  }
});

/* -----------------------------------------------
   🔹 Vitals
------------------------------------------------ */
document
  .getElementById("addVitalsForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      date: document.getElementById("v-date").value,
      time: document.getElementById("v-time").value,
      takenBy: currentUserName,
      temp: document.getElementById("v-temp").value,
      bp: document.getElementById("v-bp").value,
      pr: document.getElementById("v-pr").value,
      spo2: document.getElementById("v-spo2").value,
      lmp: document.getElementById("v-lmp").value || null,
    };

    try {
      await addDoc(collection(db, "users", patientId, "vitals"), data);

      const editLogRef = collection(db, "users", patientId, "editLogs");
      await addDoc(editLogRef, {
        message: `Edited by ${currentUserName} · ${new Date().toLocaleString(
          "en-US",
          {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }
        )}`,
        timestamp: new Date(),
        editor: currentUserName,
        section: "Vitals",
      });

      alert("✅ Vitals Saved!");

      // ✅ Close modal
      const modalEl = document.getElementById("vitalsModal");
      bootstrap.Modal.getInstance(modalEl).hide();

      // ✅ Reset form
      e.target.reset();

      loadVitals();
    } catch (err) {
      console.error(err);
      alert("Failed to save vitals");
    }
  });

/* -----------------------------------------------
   Load Vitals
------------------------------------------------ */

async function loadVitals() {
  console.log("Patient ID:", patientId);

  const tbody = document.getElementById("vitals-list");
  if (!tbody) return;

  // Clear table
  tbody.innerHTML = "";

  try {
    const vitalsRef = collection(db, "users", patientId, "vitals");
    const snapshot = await getDocs(vitalsRef);

    if (snapshot.empty) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td colspan="8" class="text-center text-muted">No vitals recorded</td>
      `;
      tbody.appendChild(tr);
      return;
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${formatDateLabel(data.date) || "-"}</td>
        <td>${formatTimeFromString(data.time) || "-"}</td>
        <td>${data.takenBy || "-"}</td>
        <td>${data.temp ? data.temp + " °C" : "N"}</td>
        <td>${data.bp || "N"}</td>
        <td>${data.pr || "N/A"}</td>
        <td>${data.spo2 ? data.spo2 + " %" : "N/A"}</td>
        <td>${data.lmp || "-"}</td>
      `;

      // Optional: Add click event to show a detailed overview
      tr.addEventListener("click", () =>
        showVitalsOverview(patientId, docSnap.id)
      );

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading vitals:", err);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td colspan="8" class="text-center text-danger">Failed to load vitals</td>
    `;
    tbody.appendChild(tr);
  }
}

loadVitals();

/* -----------------------------------------------
     Doctor's Notes
  ----------------------------------------------- */
document
  .getElementById("addDoctorNoteForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      date: document.getElementById("dn-date").value,
      time: document.getElementById("dn-time").value,
      doctor: currentUserName,
      note: document.getElementById("dn-note").value,
      createdAt: new Date(),
    };

    try {
      await addDoc(collection(db, "users", patientId, "doctorNotes"), data);

      bootstrap.Modal.getInstance(
        document.getElementById("doctorNotesModal")
      ).hide();

      e.target.reset();
      loadDoctorNotes();
    } catch (err) {
      console.error("Failed to save doctor note:", err);
      alert("Failed to save note");
    }
  });

async function loadDoctorNotes() {
  const container = document.getElementById("doctor-notes-list");
  if (!container) return;

  container.innerHTML = "";

  try {
    const ref = collection(db, "users", patientId, "doctorNotes");
    const snapshot = await getDocs(ref);

    if (snapshot.empty) {
      container.innerHTML = `
        <div class="text-muted text-center">
          No doctor notes yet
        </div>
      `;
      return;
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id; // store document ID for editing

      const card = document.createElement("div");
      card.className = "card shadow-sm mb-2";

      card.innerHTML = `
        <div class="card-body">
          <div class="d-flex justify-content-between mb-2">
            <strong>${formatDateLabel(data.date) || "-"}</strong>
            <span class="text-muted">${formatTimeFromString(data.time) || "-"}</span>
          </div>

          <div class="mb-2">
            <span class="badge bg-primary">${data.doctor || "Doctor"}</span>
          </div>

          <p class="mb-2 note-text">${data.note || "-"}</p>
          
          <button class="btn btn-sm btn-warning edit-btn">Edit</button>
        </div>
      `;

      // Edit button click handler
      const editBtn = card.querySelector(".edit-btn");
      editBtn.addEventListener("click", () => {
        const noteParagraph = card.querySelector(".note-text");
        const currentNote = noteParagraph.textContent;

        const textarea = document.createElement("textarea");
        textarea.className = "form-control mb-2";
        textarea.value = currentNote;

        const saveBtn = document.createElement("button");
        saveBtn.className = "btn btn-sm btn-success me-2";
        saveBtn.textContent = "Save";

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "btn btn-sm btn-secondary";
        cancelBtn.textContent = "Cancel";

        // Replace note text with textarea and buttons
        noteParagraph.replaceWith(textarea);
        editBtn.replaceWith(saveBtn);
        saveBtn.after(cancelBtn);

        // Save updated note to Firestore
        saveBtn.addEventListener("click", async () => {
          try {
            await updateDoc(doc(db, "users", patientId, "doctorNotes", docId), {
              note: textarea.value
            });
            loadDoctorNotes(); // reload notes
          } catch (err) {
            console.error("Error updating note:", err);
          }
        });

        // Cancel editing
        cancelBtn.addEventListener("click", () => {
          loadDoctorNotes(); // reload notes
        });
      });

      container.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading doctor notes:", err);
    container.innerHTML = `
      <div class="text-danger text-center">
        Failed to load doctor notes
      </div>
    `;
  }
}

loadDoctorNotes();

/* -----------------------------------------------
     Nurse Notes
  ----------------------------------------------- */
document
  .getElementById("addNurseNoteForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const note = document.getElementById("nurse-note-text").value;

    try {
      const now = new Date();

      await addDoc(collection(db, "users", patientId, "nurseNotes"), {
        note,
        nurseName: currentUserName,
        date: now.toLocaleDateString(), // e.g. 9/16/2025
        time: now.toLocaleTimeString(), // e.g. 2:18 AM
      });

      bootstrap.Modal.getInstance(
        document.getElementById("nurseNoteModal")
      ).hide();

      e.target.reset();
      loadNurseNotes();
    } catch (err) {
      console.error(err);
      alert("Failed to save nurse note");
    }
  });
async function loadNurseNotes() {
  const container = document.getElementById("nurse-notes-container");
  if (!container) return;

  container.innerHTML = `
    <p class="text-muted text-center w-100">Loading nurse notes...</p>
  `;

  try {
    const notesRef = collection(db, "users", patientId, "nurseNotes");
    const snapshot = await getDocs(notesRef);

    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = `
        <p class="text-muted text-center w-100">
          No nurse notes recorded
        </p>
      `;
      return;
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;

      const card = document.createElement("div");
      card.className = "card shadow-sm mb-2";
      card.style.width = "320px";

      card.innerHTML = `
        <div class="card-body">
          <h6 class="card-subtitle mb-1 text-muted">${data.nurseName || "Nurse"}</h6>

          <small class="text-muted d-block mb-2">
            ${formatDateLabel(data.date) || "—"} ${formatTimeFromString(data.time) || ""}
          </small>

          <p class="card-text note-text">${data.note || "No note provided"}</p>

          <button class="btn btn-sm btn-warning edit-btn">Edit</button>
        </div>
      `;

      // Edit button functionality
      const editBtn = card.querySelector(".edit-btn");
      editBtn.addEventListener("click", () => {
        const noteParagraph = card.querySelector(".note-text");
        const currentNote = noteParagraph.textContent;

        const textarea = document.createElement("textarea");
        textarea.className = "form-control mb-2";
        textarea.value = currentNote;

        const saveBtn = document.createElement("button");
        saveBtn.className = "btn btn-sm btn-success me-2";
        saveBtn.textContent = "Save";

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "btn btn-sm btn-secondary";
        cancelBtn.textContent = "Cancel";

        // Replace note text with textarea and buttons
        noteParagraph.replaceWith(textarea);
        editBtn.replaceWith(saveBtn);
        saveBtn.after(cancelBtn);

        // Save updated note
        saveBtn.addEventListener("click", async () => {
          try {
            await updateDoc(doc(db, "users", patientId, "nurseNotes", docId), {
              note: textarea.value,
            });
            loadNurseNotes(); // reload notes
          } catch (err) {
            console.error("Error updating nurse note:", err);
            alert("Failed to update note");
          }
        });

        // Cancel editing
        cancelBtn.addEventListener("click", () => {
          loadNurseNotes(); // reload notes
        });
      });

      container.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading nurse notes:", err);
    container.innerHTML = `
      <p class="text-danger text-center w-100">
        Failed to load nurse notes
      </p>
    `;
  }
}


loadNurseNotes();
/* -----------------------------------------------
   🔹 Dental Records
------------------------------------------------ */
document
  .getElementById("addDentalForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = document
      .getElementById("addDentalForm")
      .querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Saving...";

    const teeth = Array.from(
      document.getElementById("d-teeth").selectedOptions
    ).map((opt) => Number(opt.value));

    const medications = Array.from(document.querySelectorAll(".med-row"))
      .map((row) => ({
        name: row.querySelector(".med-name").value,
        quantity: parseInt(row.querySelector(".med-qty").value) || 0,
        type: row.querySelector(".med-type").value,
        remarks: row.querySelector(".med-remarks").value || "",
        NurseOnDuty: currentUserName,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }))
      .filter((med) => med.name !== "");

    const procedure = document.getElementById("d-procedure").value;
    const notes = document.getElementById("d-notes").value || null;

    try {
      // 1️⃣ Save Dental Record
      const dentalRef = collection(db, "users", patientId, "dentalRecords");
      const now = new Date();

      const date = now.toLocaleDateString("en-CA"); // YYYY-MM-DD (local)
      const time = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }); //

      await addDoc(dentalRef, {
        procedure,
        teeth,
        notes,
        dentist: currentUserName,
        medications,
        date,
        time,
      });

      // 2️⃣ Deduct medicine stock
      for (const med of medications) {
        if (med.name && med.quantity > 0) {
          const invRef = collection(db, "MedicineInventory");
          const q = query(invRef, where("name", "==", med.name));
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const medDoc = snapshot.docs[0];
            const data = medDoc.data();
            const newStock = Math.max((data.stock || 0) - med.quantity, 0);
            const newDispensed = (data.dispensed || 0) + med.quantity;

            await updateDoc(medDoc.ref, {
              stock: newStock,
              dispensed: newDispensed,
            });

            console.log(
              `✅ ${med.name} stock updated: ${
                data.stock || 0
              } → ${newStock}, dispensed: ${
                data.dispensed || 0
              } → ${newDispensed}`
            );
          } else {
            console.warn(`⚠️ Medicine not found in inventory: ${med.name}`);
          }
        }
      }

      // 3️⃣ Log edit action
      const editLogRef = collection(db, "users", patientId, "editLogs");
      await addDoc(editLogRef, {
        message: `Edited by ${currentUserName} · ${new Date().toLocaleString(
          "en-US",
          {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }
        )}`,
        timestamp: new Date(),
        editor: currentUserName,
        section: "Dental Records",
      });

      // 4️⃣ Close modal & reset
      bootstrap.Modal.getInstance(
        document.getElementById("dentalModal")
      ).hide();
      e.target.reset();

      // 5️⃣ Reload records & medicine options
      loadDentalRecords();
      loadMedicineOptions();

      alert("✅ Dental record saved and medicines updated!");
    } catch (err) {
      console.error(err);
      alert("Failed to save dental record");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

// Load dental records with Edit button
async function loadDentalRecords() {
  const container = document.getElementById("dental-records-container");
  if (!container) return;

  container.innerHTML = "";
  container.className = "d-flex flex-wrap gap-3";

  try {
    const ref = collection(db, "users", patientId, "dentalRecords");
    const snap = await getDocs(ref);

    if (snap.empty) {
      container.innerHTML = `<div class="text-muted">No dental records found</div>`;
      return;
    }

    // Sort by date + time (latest first)
    const records = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`));

    records.forEach((d) => {
      const medsHTML = d.medications?.length
        ? d.medications
            .map(
              (m, i) => `
              <li>
                <strong>${m.name}</strong> (${m.quantity}) – ${m.type}
                <br />
                <small class="text-muted">${m.remarks || "No remarks"}</small>
              </li>`
            )
            .join("")
        : "<li>No medications</li>";

      const card = document.createElement("div");
      card.className = "card shadow-sm p-2";
      card.style.width = "300px";

      card.innerHTML = `
        <div class="card-body">
          <h5 class="card-title">🦷 ${d.procedure}</h5>

          <p class="mb-1"><strong>Teeth:</strong> ${d.teeth?.join(", ") || "-"}</p>
          <p class="mb-1"><strong>Dentist:</strong> ${d.dentist || "Unassigned"}</p>
          <p class="mb-2">
            <strong>Date:</strong> ${formatDateLabel(d.date) || "-"}<br />
            <strong>Time:</strong> ${formatTimeFromString(d.time) || "-"}
          </p>

          <hr />
          <strong>Medications:</strong>
          <ul class="ps-3 mb-2">${medsHTML}</ul>

          <p class="card-text text-muted">${d.notes || "No notes"}</p>

          <button class="btn btn-sm btn-warning edit-btn">Edit</button>
        </div>
      `;

      // Edit button opens modal
      const editBtn = card.querySelector(".edit-btn");
      editBtn.addEventListener("click", () => openEditDentalModal(d));

      container.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading dental records:", err);
    container.innerHTML = `<div class="text-danger">Failed to load records</div>`;
  }
}

// Function to open a modal for editing dental record
function openEditDentalModal(record) {
  // Create modal HTML if it doesn't exist
  let modal = document.getElementById("editDentalModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "modal fade";
    modal.id = "editDentalModal";
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <form id="editDentalForm">
            <div class="modal-header">
              <h5 class="modal-title">Edit Dental Record</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Procedure</label>
                <select
                              class="form-select"
                              id="editProcedure"
                              required
                            >
                              <option value="">Select Procedure</option>
                              <option>Dental Filling</option>
                              <option>Tooth Extraction</option>
                              <option>Oral Prophylaxis</option>
                            </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Teeth (comma separated)</label>
                <input type="text" class="form-control" id="editTeeth">
              </div>
              <div class="mb-3">
                <label class="form-label">Dentist</label>
                <input type="text" class="form-control" id="editDentist">
              </div>
              <div class="mb-3">
                <label class="form-label">Date</label>
                <input type="date" class="form-control" id="editDate">
              </div>
              <div class="mb-3">
                <label class="form-label">Time</label>
                <input type="time" class="form-control" id="editTime">
              </div>
              <div class="mb-3">
                <label class="form-label">Notes</label>
                <textarea class="form-control" id="editNotes"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-success">Save</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Prefill form with record data
  document.getElementById("editProcedure").value = record.procedure || "";
  document.getElementById("editTeeth").value = record.teeth?.join(", ") || "";
  document.getElementById("editDentist").value = record.dentist || "";
  document.getElementById("editDate").value = record.date || "";
  document.getElementById("editTime").value = record.time || "";
  document.getElementById("editNotes").value = record.notes || "";

  // Show modal
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();

  // Handle form submit
  const form = document.getElementById("editDentalForm");
  form.onsubmit = async (e) => {
    e.preventDefault();

    const updatedRecord = {
      procedure: document.getElementById("editProcedure").value,
      teeth: document.getElementById("editTeeth").value.split(",").map((t) => t.trim()),
      dentist: document.getElementById("editDentist").value,
      date: document.getElementById("editDate").value,
      time: document.getElementById("editTime").value,
      notes: document.getElementById("editNotes").value,
    };

    try {
      await updateDoc(doc(db, "users", patientId, "dentalRecords", record.id), updatedRecord);
      bsModal.hide();
      loadDentalRecords(); // reload records
    } catch (err) {
      console.error("Error updating dental record:", err);
      alert("Failed to update record");
    }
  };
}


loadDentalRecords();

/* -----------------------------------------------
     🔹 INITIAL LOAD
  ----------------------------------------------- */
const SUPABASE_URL = "https://oiskavcbaczvewywuana.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pc2thdmNiYWN6dmV3eXd1YW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjMxODIsImV4cCI6MjA3NjE5OTE4Mn0.ZsDy-ZGwy1ZE3wwydCOgxz5NsI2RyrmUXzDXq1oCegs";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const uploadBtn = document.getElementById("upload-btn");
const fileInput = document.getElementById("file-input");
const categorySelect = document.getElementById("document-category");
const confirmBtn = document.getElementById("confirm-upload-btn");
const filePreview = document.getElementById("file-preview");

let selectedFile = null;

// Bootstrap modal instance
const categoryModalEl = document.getElementById("categoryModal");
const bsCategoryModal = new bootstrap.Modal(categoryModalEl, {
  backdrop: "static",
  keyboard: false,
});

// 1️⃣ Open file picker
uploadBtn.addEventListener("click", () => fileInput.click());

// 2️⃣ Show modal and preview on file select
fileInput.addEventListener("change", (e) => {
  selectedFile = e.target.files[0];
  if (!selectedFile) return;

  // Show file preview
  const reader = new FileReader();
  reader.onload = (event) => {
    const url = event.target.result;
    if (selectedFile.type.startsWith("image/")) {
      filePreview.innerHTML = `<img src="${url}" class="img-fluid" style="max-height:200px;">`;
    } else if (selectedFile.type === "application/pdf") {
      filePreview.innerHTML = `<embed src="${url}" type="application/pdf" width="100%" height="200px">`;
    } else {
      filePreview.innerHTML = `<p class="text-muted mb-0">Selected file: ${selectedFile.name}</p>`;
    }
  };
  reader.readAsDataURL(selectedFile);

  bsCategoryModal.show();
});

// 3️⃣ Upload file
confirmBtn.addEventListener("click", async () => {
  if (!selectedFile || !patientId) return;

  confirmBtn.disabled = true;
  confirmBtn.textContent = "Uploading...";

  const folder = categorySelect.value;
  const fileName = `${Date.now()}_${selectedFile.name}`;
  const filePath = `${patientId}/${folder}/${fileName}`;

  try {
    const { error } = await supabaseClient.storage
      .from("patient-documents")
      .upload(filePath, selectedFile);

    if (error) {
      alert("Upload failed: " + error.message);
      return;
    }

    // 🔹 Fetch patient info for audit trail
    let patientInfo = { name: patientId, schoolId: "N/A" }; // fallback
    try {
      const patientDoc = await getDoc(doc(db, "users", patientId));
      if (patientDoc.exists()) {
        const data = patientDoc.data();
        patientInfo = {
          name: `${data.lastName}, ${data.firstName}`,
          schoolId: data.schoolId || "N/A",
        };
      }
    } catch (patientError) {
      console.error("Failed to fetch patient info:", patientError);
    }

    // 🔹 Add audit trail
    try {
      const auditMessage = `${currentUserName || "Unknown User"} uploaded a file "${selectedFile.name}" for patient "${patientInfo.name}" (School ID: ${patientInfo.schoolId}) under category "${folder}"`;

      await addDoc(collection(db, "AdminAuditTrail"), {
        message: auditMessage,
        userId: currentUserName || null,
        timestamp: new Date(),
        section: "ClinicStaffActions",
      });

      console.log("Audit trail for file upload added ✅");
    } catch (auditError) {
      console.error("Failed to log upload audit trail:", auditError);
    }

    // Refresh file list in accordion
    await loadDocumentsFiles();

    // Hide modal
    bsCategoryModal.hide();
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Upload";
    fileInput.value = "";
    selectedFile = null;
    filePreview.innerHTML = `<p class="text-muted mb-0">No file selected</p>`;
  }
});



const cancelFileUploadBtn = document.getElementById("cancel-upload-btn");

// Cancel button resets everything
cancelFileUploadBtn.addEventListener("click", () => {
  selectedFile = null;
  fileInput.value = "";
  categoryModal.style.display = "none";
});

// Load categorized files into Bootstrap accordion
async function loadDocumentsFiles() {
  if (!patientId) return;

  const categories = ["Laboratory", "Radiology", "Others"];
  const listIds = {
    Laboratory: "lab-list",
    Radiology: "rad-list",
    Others: "others-list",
  };

  for (const cat of categories) {
    const ul = document.getElementById(listIds[cat]);
    ul.innerHTML = ""; // clear existing

    try {
      // Fetch files from Supabase
      const { data, error } = await supabaseClient.storage
        .from("patient-documents")
        .list(`${patientId}/${cat}/`, { limit: 100 });

      // Get the accordion button to update count
      const button = document.querySelector(
        `[data-bs-target="#${ul.id.replace("-list", "Collapse")}"]`
      );

      if (error || !data) {
        button.textContent = `${cat} (0)`;
        continue;
      }

      // Update file count
      const count = data.length;
      button.textContent = `${cat} (${count})`;

      // Add files to the list
      for (const item of data) {
        const { data: publicUrlObj } = supabaseClient.storage
          .from("patient-documents")
          .getPublicUrl(`${patientId}/${cat}/${item.name}`);

        const li = document.createElement("li");
        li.className = "list-group-item";
        li.innerHTML = `<a href="${publicUrlObj.publicUrl}" target="_blank">${item.name}</a>`;
        ul.appendChild(li);
      }
    } catch (err) {
      console.error(`Failed to load ${cat} files:`, err);
    }
  }
}

// Call it once
loadDocumentsFiles();

loadPatient();
await loadConsultations();
await loadPhysicalExaminations();

document
  .getElementById("exportPDF")
  .addEventListener("click", exportPatientPDF);

// Convert local image to Base64
function getImageBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = (err) => reject(err);
  });
}

async function exportPatientPDF() {
  if (!patientId) return alert("No patient selected!");

  try {
    const headerImageBase64 = await getImageBase64(
      "../../assets/images/KCP header.png"
    );

    const patientRef = doc(db, "users", patientId);
    const patientSnap = await getDoc(patientRef);

    if (!patientSnap.exists()) {
      alert("Patient not found!");
      return;
    }

    const data = patientSnap.data();
    const fullName = `${data.lastName || ""}, ${data.firstName || ""} ${
      data.middleName || ""
    }`.trim();

    const historyRef = collection(db, "users", patientId, "medicalHistory");
    const historySnap = await getDocs(historyRef);

    let pastMedicalHistory = "";
    let familyHistory = "";
    let pastSurgicalHistory = "";

    historySnap.forEach((doc) => {
      const h = doc.data();
      pastMedicalHistory = h.pastMedicalHistory || "";
      familyHistory = h.familyHistory || "";
      pastSurgicalHistory = h.pastSurgicalHistory || "";
    });

    const consultRef = collection(db, "users", patientId, "consultations");
    const consultSnap = await getDocs(consultRef);

    let consultations = [];

    consultSnap.forEach((c) => {
      const d = c.data();
      consultations.push({
        date: d.date || "",
        time: d.time || "",
        complaint: d.complaint || "",
        diagnosis: d.diagnosis || "",
        notes: d.notes || "",
        meds: Array.isArray(d.meds) ? d.meds : [],
        // vitals: Array.isArray(d.vitals) ? d.vitals : [],
      });
    });

    const createField = (label, value, autoHeight = false) => ({
      table: {
        widths: ["*"],
        body: [
          [
            {
              text: label,
              bold: true,
              fontSize: 8,
              fillColor: "#E0EFFF",
              margin: [1, 1, 1, 0],
            },
          ],
          [{ text: value || "", fontSize: 8, margin: [1, 1, 1, 0] }],
        ],
        heights: autoHeight ? (row) => (row === 0 ? 13 : "auto") : [13, 13],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => "#999",
        vLineColor: () => "#999",
        paddingLeft: () => 2,
        paddingRight: () => 2,
      },
      width: "*",
    });

    const createRows = (fields) => {
      const rows = [];
      for (let i = 0; i < fields.length; i += 3) {
        rows.push({
          columns: [
            createField(fields[i][0], fields[i][1]),
            fields[i + 1]
              ? createField(fields[i + 1][0], fields[i + 1][1])
              : createField("", ""),
            fields[i + 2]
              ? createField(fields[i + 2][0], fields[i + 2][1])
              : createField("", ""),
          ],
        });
      }
      return rows;
    };

    const createBorderedSection = (title, fieldsOrContent) => ({
      table: {
        widths: ["*"],
        body: [
          [
            {
              stack: [
                {
                  text: title,
                  style: "sectionHeader",
                  margin: [0, 2, 0, 4],
                  alignment: "center",
                },
                ...fieldsOrContent,
              ],
              margin: [2, 2, 2, 2],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => "#999",
        vLineColor: () => "#999",
      },
      margin: [0, 5, 0, 5],
    });

    function buildConsultationRecord(item) {
      const vitalsRows = item.vitals.length
        ? item.vitals.map((v) => [
            {
              stack: [
                { text: v.recordedDate || "", fontSize: 8 },
                { text: v.recordedTime || "", fontSize: 8 },
              ],
            },
            { text: v.bp || "", fontSize: 8 },
            { text: v.temp || "", fontSize: 8 },
            { text: v.spo2 || "", fontSize: 8 },
            { text: v.pr || "", fontSize: 8 },
            { text: v.lmp || "", fontSize: 8 },
          ])
        : [["", "", "", "", "", ""]];

      const medsRows = item.meds.length
        ? item.meds.map((m) => [
            {
              stack: [
                { text: m.date || "", fontSize: 8 },
                { text: m.time || "", fontSize: 8 }, // assuming you have a separate time field
              ],
            },
            { text: m.name || "", fontSize: 8 },
            { text: m.quantity || "", fontSize: 8 },
          ])
        : [["", "", ""]];

      return {
        table: {
          widths: [
            "auto",
            "auto",
            "auto",
            "auto",
            "auto",
            "auto",
            "*",
            "*",
            "*",
            "auto",
            "*",
            "auto",
          ],
          body: [
            [
              {
                text: "Vitals",
                bold: true,
                fillColor: "#E0EFFF",
                colSpan: 6,
                alignment: "center",
                fontSize: 8,
              },
              {},
              {},
              {},
              {},
              {},
              {
                text: "Chief Complaint",
                bold: true,
                fillColor: "#E0EFFF",
                fontSize: 8,
              },
              {
                text: "Diagnosis",
                bold: true,
                fillColor: "#E0EFFF",
                fontSize: 8,
              },
              {
                text: "Notes/Intervention",
                bold: true,
                fillColor: "#E0EFFF",
                fontSize: 8,
              },
              {
                text: "Medications",
                bold: true,
                fillColor: "#E0EFFF",
                colSpan: 3,
                alignment: "center",
                fontSize: 8,
              },
              {},
              {},
            ],
            [
              {
                colSpan: 6,
                table: {
                  widths: ["auto", "auto", "auto", "auto", "auto", "auto"],
                  body: [
                    [
                      {
                        text: "Date/Time",
                        bold: true,
                        fillColor: "#E0EFFF",
                        fontSize: 8,
                      },
                      {
                        text: "BP",
                        bold: true,
                        fillColor: "#E0EFFF",
                        fontSize: 8,
                      },
                      {
                        text: "T",
                        bold: true,
                        fillColor: "#E0EFFF",
                        fontSize: 8,
                      },
                      {
                        text: "Spo2",
                        bold: true,
                        fillColor: "#E0EFFF",
                        fontSize: 8,
                      },
                      {
                        text: "PR",
                        bold: true,
                        fillColor: "#E0EFFF",
                        fontSize: 8,
                      },
                      {
                        text: "LMP",
                        bold: true,
                        fillColor: "#E0EFFF",
                        fontSize: 8,
                      },
                    ],
                    ...vitalsRows,
                  ],
                },
                layout: "lightHorizontalLines",
              },
              {},
              {},
              {},
              {},
              {},
              { text: item.complaint || "", fontSize: 8 },
              { text: item.diagnosis || "", fontSize: 8 },
              { text: item.notes || "", fontSize: 8 },
              {
                colSpan: 3,
                table: {
                  widths: ["auto", "*", "auto"],
                  body: [
                    [
                      {
                        text: "Date/Time",
                        bold: true,
                        fillColor: "#E0EFFF",
                        fontSize: 8,
                      },
                      {
                        text: "Name",
                        bold: true,
                        fillColor: "#E0EFFF",
                        fontSize: 8,
                      },
                      {
                        text: "qty",
                        bold: true,
                        fillColor: "#E0EFFF",
                        fontSize: 8,
                      },
                    ],
                    ...medsRows,
                  ],
                },
                layout: "lightHorizontalLines",
              },
              {},
              {},
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#999",
          vLineColor: () => "#999",
        },
        margin: [0, 2, 0, 2],
      };
    }

    const personalFields = [
      ["Last Name", data.lastName],
      ["First Name", data.firstName],
      ["Middle Name", data.middleName],
      ["Extension Name", data.extName],
      ["Gender", data.gender],
      ["Birthdate", data.birthdate],
      ["Age", data.age],
      ["Civil Status", data.civilStatus],
      ["Nationality", data.nationality],
      ["Religion", data.religion],
      ["School ID", data.schoolId],
      ["Role", data.role],
      ["Department", data.department],
      ["Course/Strand/Gen. Educ.", data.course],
      ["Year Level", data.year],
    ];

    const medicalFields = [
      ["Past Medical History", pastMedicalHistory],
      ["Family History", familyHistory],
      ["Past Surgical History", pastSurgicalHistory],
    ];

    // Prepare consultation content
    const consultationContent =
      consultations.length === 0
        ? [{ text: "No consultation records found.", italics: true }]
        : consultations.map((c) => buildConsultationRecord(c));

    const content = [
      { image: headerImageBase64, width: 515, alignment: "center" },
      { text: fullName, style: "subheader", margin: [0, 5, 0, 10] },

      createBorderedSection("Personal Information", createRows(personalFields)),

      {
        table: {
          widths: ["*"],
          body: [
            [
              {
                stack: [
                  {
                    text: "Contact Information",
                    style: "sectionHeader",
                    margin: [0, 2, 0, 4],
                    alignment: "center",
                  },
                  {
                    columns: [
                      createField("Phone", data.phoneNumber),
                      createField("Email", data.email),
                    ],
                  },
                  { columns: [createField("Address", data.address)] },
                  {
                    columns: [
                      createField("Guardian Name", data.guardianName),
                      createField("Guardian Phone", data.guardianPhone),
                    ],
                  },
                ],
                margin: [2, 2, 2, 2],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#999",
          vLineColor: () => "#999",
        },
        margin: [0, 5, 0, 5],
      },

      createBorderedSection("Medical History", createRows(medicalFields)),

      createBorderedSection(
        "Medical Consultation Records",
        consultationContent
      ),
    ];

    const docDefinition = {
      pageSize: "A4",
      pageMargins: [40, 10, 40, 10],
      content,
      styles: {
        subheader: { fontSize: 14, bold: true, alignment: "center" },
        sectionHeader: { fontSize: 10, bold: true },
      },
      defaultStyle: { fontSize: 9 },
    };

    pdfMake.createPdf(docDefinition).open();
  } catch (err) {
    console.error("PDF export error:", err);
  }
}

/* -----------------------------------------------
   Logs Loading Functions
------------------------------------------------ */
// Load and listen to user-level edit logs for Medical History
function loadMedicalHistoryLogs(patientId) {
  const logsRef = collection(db, "users", patientId, "editLogs");

  const logsList = document.getElementById("medical-history-logs");
  const countBadge = document.getElementById("medical-history-logs-count");

  onSnapshot(logsRef, (snapshot) => {
    logsList.innerHTML = ""; // Clear previous list

    if (snapshot.empty) {
      logsList.innerHTML = `<li class="list-group-item text-muted">No actions yet</li>`;
      countBadge.textContent = 0;
      return;
    }

    let logs = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // ✅ Only include logs with section "Medical History"
      if (data.section === "Medical History") {
        logs.push(data);
      }
    });

    if (logs.length === 0) {
      logsList.innerHTML = `<li class="list-group-item text-muted">No actions yet</li>`;
      countBadge.textContent = 0;
      return;
    }

    // Sort by timestamp descending (latest first)
    logs.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

    // Populate the list
    logs.forEach((log) => {
      const li = document.createElement("li");
      li.classList.add("list-group-item");
      li.textContent = log.message;
      logsList.appendChild(li);
    });

    // Update badge count
    countBadge.textContent = logs.length;
  });
}

function loadMedicalConsultationLogs(patientId) {
  const logsRef = collection(db, "users", patientId, "editLogs");

  const logsList = document.getElementById("action-history");
  const countBadge = document.getElementById("medical-consultation-logs-count");

  onSnapshot(logsRef, (snapshot) => {
    logsList.innerHTML = ""; // Clear previous list

    if (snapshot.empty) {
      logsList.innerHTML = `<li class="list-group-item text-muted">No actions yet</li>`;
      countBadge.textContent = 0;
      return;
    }

    let logs = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // ✅ Only include logs with section "Medical Consultation Record"
      if (data.section === "Medical Consultation Record") {
        logs.push(data);
      }
    });

    if (logs.length === 0) {
      logsList.innerHTML = `<li class="list-group-item text-muted">No actions yet</li>`;
      countBadge.textContent = 0;
      return;
    }

    // Sort by timestamp descending (latest first)
    logs.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

    // Populate the list
    logs.forEach((log) => {
      const li = document.createElement("li");
      li.classList.add("list-group-item");
      li.textContent = log.message;
      logsList.appendChild(li);
    });

    // Update badge count
    countBadge.textContent = logs.length;
  });
}

function loadPhysicalExaminationLogs(patientId) {
  const logsRef = collection(db, "users", patientId, "editLogs");

  const logsList = document.getElementById("physical-examination-history");
  const countBadge = document.getElementById("physical-examination-logs-count");

  onSnapshot(logsRef, (snapshot) => {
    logsList.innerHTML = ""; // Clear previous list

    if (snapshot.empty) {
      logsList.innerHTML = `<li class="list-group-item text-muted">No actions yet</li>`;
      countBadge.textContent = 0;
      return;
    }

    let logs = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // ✅ Only include logs with section "Physical Examination"
      if (data.section === "Physical Examination") {
        logs.push(data);
      }
    });

    if (logs.length === 0) {
      logsList.innerHTML = `<li class="list-group-item text-muted">No actions yet</li>`;
      countBadge.textContent = 0;
      return;
    }

    // Sort by timestamp descending (latest first)
    logs.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

    // Populate the list
    logs.forEach((log) => {
      const li = document.createElement("li");
      li.classList.add("list-group-item");
      li.textContent = log.message;
      logsList.appendChild(li);
    });

    // Update badge count
    countBadge.textContent = logs.length;
  });
}
function loadVitalsLogs(patientId) {
  const logsRef = collection(db, "users", patientId, "editLogs");

  const logsList = document.getElementById("vitals-action-history");
  const countBadge = document.getElementById("vitals-logs-count");

  onSnapshot(logsRef, (snapshot) => {
    logsList.innerHTML = ""; // Clear previous list

    if (snapshot.empty) {
      logsList.innerHTML = `<li class="list-group-item text-muted">No actions yet</li>`;
      countBadge.textContent = 0;
      return;
    }

    let logs = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // ✅ Only include logs with section "Physical Examination"
      if (data.section === "Vitals") {
        logs.push(data);
      }
    });

    if (logs.length === 0) {
      logsList.innerHTML = `<li class="list-group-item text-muted">No actions yet</li>`;
      countBadge.textContent = 0;
      return;
    }

    // Sort by timestamp descending (latest first)
    logs.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

    // Populate the list
    logs.forEach((log) => {
      const li = document.createElement("li");
      li.classList.add("list-group-item");
      li.textContent = log.message;
      logsList.appendChild(li);
    });

    // Update badge count
    countBadge.textContent = logs.length;
  });
}
// Example call after page load or after adding a new Physical Exam log
loadPhysicalExaminationLogs(patientId);

// Example call after page load or after creating a new log
loadMedicalConsultationLogs(patientId);

// Example call after page load or after adding a new Medical History log
loadMedicalHistoryLogs(patientId);

loadVitalsLogs(patientId);
