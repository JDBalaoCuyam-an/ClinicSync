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
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get("id");

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
      age: data.age || "",
      civilStatus: data.civilStatus || "",
      nationality: data.nationality || "",
      religion: data.religion || "",
      schoolId: data.schoolId || "",
    };

    Object.keys(infoFields).forEach((key) => {
      const input = document.getElementById(key);
      if (input) input.value = infoFields[key];
    });

    /* 🧩 Select fields */
    document.getElementById("department").value = data.department || "";
    document.getElementById("course").value = data.course || "";
    document.getElementById("year").value = data.yearLevel || "";

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

      // 🧩 Textareas (Past Medical, Family, Surgical, Supplements, Allergies)
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
    // Store original values
    originalContactData = {
      phoneNumber: document.getElementById("phone-number").value,
      email: document.getElementById("email-address").value,
      address: document.getElementById("home-address").value,
      guardianName: document.getElementById("guardian-name").value,
      guardianPhone: document.getElementById("guardian-phone").value,
    };

    // Enable editing
    inputs.forEach((inp) => inp.removeAttribute("disabled"));
    editBtn.textContent = "💾 Save";
    cancelContactEditBtn.style.display = "inline-block";
    isEditingContacts = true;
  } else {
    // Save updated contact info
    const updatedData = {
      phoneNumber: document.getElementById("phone-number").value,
      email: document.getElementById("email-address").value,
      address: document.getElementById("home-address").value,
      guardianName: document.getElementById("guardian-name").value,
      guardianPhone: document.getElementById("guardian-phone").value,
    };

    try {
      await updateDoc(doc(db, "users", patientId), updatedData);
      alert("Contact details updated!");
      inputs.forEach((inp) => inp.setAttribute("disabled", "true"));
      editBtn.textContent = "✏️ Edit";
      cancelContactEditBtn.style.display = "none";
      isEditingContacts = false;
    } catch (err) {
      console.error("Error updating contact details:", err);
      alert("Failed to update contact details.");
    }
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
     🔹 EDIT/SAVE MEDICAL HISTORY (Update or Create)
  ----------------------------------------------- */

const editHistoryBtn = document.querySelector(
  ".medical-history-content .edit-btn"
);

// Create Cancel button dynamically below the Edit/Save button
let cancelHistoryBtn = document.createElement("button");
cancelHistoryBtn.textContent = "❌ Cancel";
cancelHistoryBtn.style.display = "none";
cancelHistoryBtn.style.marginTop = "10px";
editHistoryBtn.insertAdjacentElement("afterend", cancelHistoryBtn);

let isEditingHistory = false;
let originalHistoryData = {};
let currentHistoryId = null; // 🆔 keep track of the latest doc

editHistoryBtn.addEventListener("click", async () => {
  const editableFields = document.querySelectorAll(
    ".medical-history-content textarea, .medical-history-content input"
  );

  if (!isEditingHistory) {
    // Store original values
    originalHistoryData = {};
    editableFields.forEach((el) => {
      if (el.type === "radio") {
        originalHistoryData[el.name] =
          document.querySelector(
            `.obgyne-form input[name="${el.name}"]:checked`
          )?.value || "";
      } else {
        originalHistoryData[el.name] = el.value;
      }
    });

    // Enable editing
    editableFields.forEach((el) => el.removeAttribute("disabled"));
    editHistoryBtn.textContent = "💾 Save";
    cancelHistoryBtn.style.display = "block";
    isEditingHistory = true;

    // 🩺 Get latest medicalHistory document ID for updating later
    const historyRef = collection(db, "users", patientId, "medicalHistory");
    const historySnap = await getDocs(
      query(historyRef, orderBy("updatedAt", "desc"), limit(1))
    );
    if (!historySnap.empty) {
      currentHistoryId = historySnap.docs[0].id;
    } else {
      currentHistoryId = null; // none yet
    }
  } else {
    // Gather updated values
    const [pastMedical, familyHistory, pastSurgical, supplements, allergies] =
      Array.from(
        document.querySelectorAll(".medical-history-content textarea")
      ).map((ta) => ta.value.trim());

    // Immunization
    const immunizationData = {};
    document
      .querySelectorAll(".immunization-form input")
      .forEach((input) => (immunizationData[input.name] = input.value.trim()));

    // OB-GYNE
    const obgyneData = {};
    document
      .querySelectorAll(
        ".obgyne-form input[type='text'], .obgyne-form input[type='date']"
      )
      .forEach((input) => (obgyneData[input.name] = input.value.trim()));

    const dysmenorrhea =
      document.querySelector(".obgyne-form input[type='radio']:checked")
        ?.value || "";

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
        // ✅ Update existing document
        const historyDocRef = doc(historyRef, currentHistoryId);
        await updateDoc(historyDocRef, historyData);
        console.log("Existing medical history updated.");
      } else {
        // 🆕 No record yet — create one
        await addDoc(historyRef, historyData);
        console.log("New medical history created.");
      }

      alert("Medical History saved successfully!");
      editableFields.forEach((el) => el.setAttribute("disabled", "true"));
      editHistoryBtn.textContent = "✏️ Edit";
      cancelHistoryBtn.style.display = "none";
      isEditingHistory = false;
    } catch (err) {
      console.error("Error saving medical history:", err);
      alert("Failed to save medical history.");
    }
  }
});

// Cancel button handler
cancelHistoryBtn.addEventListener("click", () => {
  const editableFields = document.querySelectorAll(
    ".medical-history-content textarea, .medical-history-content input"
  );

  // Restore original values
  editableFields.forEach((el) => {
    if (el.type === "radio") {
      el.checked = el.value === originalHistoryData[el.name];
    } else {
      el.value = originalHistoryData[el.name];
    }
    el.setAttribute("disabled", "true");
  });

  // Reset buttons
  editHistoryBtn.textContent = "✏️ Edit";
  cancelHistoryBtn.style.display = "none";
  isEditingHistory = false;
});

/* -----------------------------------------------
     🔹 EDIT/SAVE PATIENT INFORMATION WITH CANCEL
  ----------------------------------------------- */
const editPatientInfoBtn = document.querySelector(
  ".patient-info-content .edit-btn"
);
// Create Cancel button dynamically below the Edit/Save button
let cancelPatientInfoBtn = document.createElement("button");
cancelPatientInfoBtn.textContent = "❌ Cancel";
cancelPatientInfoBtn.style.display = "none";
cancelPatientInfoBtn.style.marginTop = "10px";
editPatientInfoBtn.insertAdjacentElement("afterend", cancelPatientInfoBtn);

let isEditingPatientInfo = false;
let originalPatientInfoData = {};

// Helper: get all editable inputs & selects
function getPatientInfoFields() {
  return document.querySelectorAll(
    ".patient-info-content .info-grid input, .patient-info-content .info-grid select"
  );
}

// Store original values
function storeOriginalPatientInfo(fields) {
  originalPatientInfoData = {};
  fields.forEach((el) => {
    originalPatientInfoData[el.id || el.name] = el.value;
  });
}

// Restore original values
function restoreOriginalPatientInfo(fields) {
  fields.forEach((el) => {
    const key = el.id || el.name;
    if (originalPatientInfoData[key] !== undefined) {
      el.value = originalPatientInfoData[key];
    }
  });
}

// Enable editing
function enablePatientInfoEditing(fields) {
  fields.forEach((el) => el.removeAttribute("disabled"));
  editPatientInfoBtn.textContent = "💾 Save";
  cancelPatientInfoBtn.style.display = "block";
}

// Disable editing
function disablePatientInfoEditing(fields) {
  fields.forEach((el) => el.setAttribute("disabled", "true"));
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
    isEditingPatientInfo = true;
  } else {
    // Collect updated data
    const updatedData = {
      lastName: document.getElementById("lastName").value,
      firstName: document.getElementById("firstName").value,
      middleName: document.getElementById("middleName").value,
      extName: document.getElementById("extName").value,
      gender: document.getElementById("gender").value,
      birthdate: document.getElementById("birthdate").value,
      age: Number(document.getElementById("age").value),
      civilStatus: document.getElementById("civilStatus").value,
      nationality: document.getElementById("nationality").value,
      religion: document.getElementById("religion").value,
      schoolId: document.getElementById("schoolId").value,
      department: document.getElementById("department").value,
      course: document.getElementById("course").value,
      yearLevel: Number(document.getElementById("year").value),

      fatherName: document.getElementById("fatherName")?.value,
      fatherAge: Number(document.getElementById("fatherAge")?.value || 0),
      fatherOccupation: document.getElementById("fatherOccupation")?.value,
      fatherHealth: document.getElementById("fatherHealth")?.value,
      motherName: document.getElementById("motherName")?.value,
      motherAge: Number(document.getElementById("motherAge")?.value || 0),
      motherOccupation: document.getElementById("motherOccupation")?.value,
      motherHealth: document.getElementById("motherHealth")?.value,
    };

    try {
      await updateDoc(doc(db, "users", patientId), updatedData);
      alert("Patient information updated!");
      disablePatientInfoEditing(fields);
    } catch (err) {
      console.error("Error updating patient information:", err);
      alert("Failed to update patient information.");
    }
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
const medsListDiv = document.getElementById("meds-list");
const addMedBtn = document.getElementById("add-med-btn");
let medicinesData = []; // stores all medicine objects from inventory

/* ============================================================
   FETCH MEDICINES (with stock)
============================================================ */
async function loadMedicineOptions() {
  const querySnapshot = await getDocs(collection(db, "MedicineInventory"));
  medicinesData = querySnapshot.docs.map((doc) => ({
    name: doc.data().name,
    availableQty: doc.data().stock || 0, // ✅ Use 'stock' instead of 'quantity'
  }));
}

/* ✅ Load medicines on page load */
loadMedicineOptions();

/* ============================================================
   ADD NEW MEDICINE ROW
============================================================ */
addMedBtn.addEventListener("click", () => {
  const container = document.createElement("div");
  container.classList.add("med-row");

  // Build dropdown options with available stock
  const optionsHTML = medicinesData
    .map(
      (m) =>
        `<option value="${m.name}" data-qty="${m.availableQty}">
          ${m.name} (Available: ${m.availableQty})
        </option>`
    )
    .join("");

  container.innerHTML = `
    <select class="med-name" required>
      <option value="" disabled selected>Select Medicine</option>
      ${optionsHTML}
    </select>

    <input type="number" class="med-qty" min="1" placeholder="Qty" />

    <select class="med-type" required>
      <option value="" disabled selected>Type</option>
      <option value="Administered">Administered</option>
      <option value="Dispensed">Dispensed</option>
    </select>

    <input type="text" class="med-remarks" placeholder="Remarks" />

    <button type="button" class="remove-med">X</button>
  `;

  // 🧹 Remove row handler
  container.querySelector(".remove-med").addEventListener("click", () => {
    container.remove();
  });

  medsListDiv.appendChild(container);
});
// ============================================================
// Loading Doctors For Consultation Form
// ============================================================
async function loadDoctors() {
  const doctorSelect = document.getElementById("consult-doctor");
  doctorSelect.innerHTML = `<option value="">Loading...</option>`;

  const q = query(collection(db, "users"), where("user_type", "==", "doctor"));

  const snap = await getDocs(q);

  doctorSelect.innerHTML = `<option value="">Select Doctor</option>`;

  snap.forEach((doc) => {
    const data = doc.data();

    const lastName = data.lastName || "";
    const firstName = data.firstName || "";
    const middleName = data.middleName || "";

    // Format: LastName, FirstName MiddleName
    const displayName = `${lastName}, ${firstName} ${middleName}`.trim();

    const option = document.createElement("option");
    option.value = doc.id; // store doctor UID
    option.textContent = displayName;

    doctorSelect.appendChild(option);
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
// Set Default Time/Date For Consultation Form
// ============================================================
function setCurrentConsultDateTime() {
  const now = new Date();

  // Format date (YYYY-MM-DD)
  const date = now.toISOString().split("T")[0];

  // Format time (HH:MM 24-hour)
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  document.getElementById("consult-date").value = date;
  document.getElementById("consult-time").value = time;
}
setCurrentConsultDateTime();
// ============================================================
// Consultation Form Submission
// ============================================================
document
  .getElementById("consultation-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const doctorSelect = document.getElementById("consult-doctor");
    const doctorName =
      doctorSelect.options[doctorSelect.selectedIndex]?.textContent || "";
    const submitBtn = document
      .getElementById("consultation-form")
      .querySelector('button[type="submit"]');
    submitBtn.disabled = true; // prevent double click
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Saving..."; // optional loading text

    const now = new Date();
    const medDate = now.toISOString().split("T")[0];
    const medTime = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // ✅ Collect medicines
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

    // Capitalize first letter helper
    function capitalizeFirstLetter(text) {
      if (!text) return "";
      return text.charAt(0).toUpperCase() + text.slice(1);
    }

    // Apply capitalization to complaint
    let complaintValue = document.getElementById("consult-complaint").value;
    let newComplaintText = document
      .getElementById("new-complaint-input")
      .value.trim();

    // Capitalize helper
    function capitalizeFirstLetter(text) {
      if (!text) return "";
      return text.charAt(0).toUpperCase() + text.slice(1);
    }

    // Determine final complaint
    let finalComplaint = "";

    // If user selected Add New
    if (complaintValue === "__add_new__") {
      finalComplaint = capitalizeFirstLetter(newComplaintText);

      if (finalComplaint === "") {
        alert("Please enter a new complaint.");
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }

      // Save new complaint to Firestore
      const complaintsRef = collection(db, "complaints");
      const q = query(complaintsRef, where("name", "==", finalComplaint));
      const snap = await getDocs(q);

      if (snap.empty) {
        await addDoc(complaintsRef, {
          name: finalComplaint,
          createdAt: new Date(),
        });
      }
    } else {
      finalComplaint = capitalizeFirstLetter(complaintValue);
    }
    let diagnosisValue = document.getElementById("consult-diagnosis").value;
    let newDiagnosisText = document
      .getElementById("new-diagnosis-input")
      .value.trim();

    let finalDiagnosis = "";

    // If user selected Add New
    if (diagnosisValue === "__add_new__") {
      finalDiagnosis = capitalizeFirstLetter(newDiagnosisText);

      if (finalDiagnosis === "") {
        alert("Please enter a new diagnosis.");
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }

      // Save new diagnosis to Firestore
      const diagRef = collection(db, "diagnoses");
      const q = query(diagRef, where("name", "==", finalDiagnosis));
      const snap = await getDocs(q);

      if (snap.empty) {
        await addDoc(diagRef, {
          name: finalDiagnosis,
          createdAt: new Date(),
        });
      }
    } else {
      finalDiagnosis = capitalizeFirstLetter(diagnosisValue);
    }
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
      // ✅ Save Consultation Record
      const consultRef = collection(db, "users", patientId, "consultations");
      const newConsultDoc = await addDoc(consultRef, consultData);
      const consultationId = newConsultDoc.id;
      console.log("✅ New Consultation ID:", consultationId);

      console.log("✅ PatientVisits logged.");

      await addDoc(collection(db, "complaintRecords"), {
        patientId,
        complaint: consultData.complaint,
        consultationId: consultationId,
      });

      // ✅ Deduct medicine stock
      for (const med of medsDispensed) {
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

      // ✅ Save edit log in subcollection
      const editLogRef = collection(
        db,
        "users",
        patientId,
        "editLogs"
      );
      await addDoc(editLogRef, {
        message: `Edited by ${currentUserName} at ${new Date().toLocaleString(
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
      closeButtonOverlay();
      loadConsultations();
      loadComplaints();
      loadMedicineOptions();
    } catch (err) {
      console.error("❌ Error adding consultation:", err);
      alert("Failed to save consultation record.");
    } finally {
      submitBtn.disabled = false; // Re-enable button
      submitBtn.textContent = originalText; // Restore original text
    }
  });

/* -----------------------------------------------
   🔹 LOAD CONSULTATION RECORDS INTO TABLE
------------------------------------------------ */
let currentConsultationId = null; // 🔹 Store current consultation ID globally

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

      let medsDisplay = "-";
      if (Array.isArray(data.meds) && data.meds.length > 0) {
        medsDisplay = data.meds
          .map((m) => `${m.name} (${m.quantity})`)
          .join(", ");
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${data.consultingDoctor}</td>
        <td>${data.NurseOnDuty}</td>
        <td>${data.date}</td>
        <td>${data.time}</td>
        <td>${data.complaint}</td>
        <td>${data.diagnosis || "-"}</td>
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

  /* ============================
     BASIC INFO
  ============================ */
  document.getElementById("ovr-doctor").value = data.consultingDoctor || "";
  document.getElementById("ovr-date").value = data.date || "";
  document.getElementById("ovr-time").value = data.time || "";
  document.getElementById("ovr-complaint").value = data.complaint || "";
  document.getElementById("ovr-diagnosis").value = data.diagnosis || "";
  document.getElementById("ovr-notes").value = data.notes || "";

  /* ============================
     🧾 MEDICATIONS
  ============================ */
  const meds = Array.isArray(data.meds) ? data.meds : [];
  const medsContainer = document.getElementById("cons-meds-list");
  medsContainer.innerHTML = "";

  if (!meds.length) {
    medsContainer.innerHTML = `
      <tr><td colspan="7">No medications dispensed.</td></tr>
    `;
  } else {
    meds.forEach((m, i) => {
      medsContainer.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td>${m.name || "-"}</td>
          <td>${m.quantity || "-"}</td>
          <td>${m.date || "-"} ${m.time || "-"}</td>
          <td>${m.NurseOnDuty || "-"}</td>
          <td>${m.type || "-"}</td>
          <td>${m.remarks || "-"}</td>
        </tr>
      `;
    });
  }
  /* ============================
     ✅ SHOW MODAL
  ============================ */
  document.getElementById("consultation-overview").classList.add("show");
  document.getElementById("overlay").classList.add("show");
};

/* -----------------------------------------------
   🔹 EDIT, SAVE CONSULTATION DETAILS
------------------------------------------------ */
const editOverviewBtn = document.getElementById("editOverviewBtn");
const cancelBtn = document.querySelector(
  ".modal-buttons button[style*='display: none']"
); // Cancel button
const closeBtn = document.querySelector(".modal-buttons button:last-child"); // Close button

let global_medsInventory = [];

// ENTER EDIT / SAVE MODE
editOverviewBtn.addEventListener("click", async () => {
  const editableInputs = document.querySelectorAll(
    "#ovr-doctor, #ovr-date, #ovr-time, #ovr-complaint, #ovr-diagnosis, #ovr-notes"
  );

  // ✅ ENTER EDIT MODE
  if (editOverviewBtn.textContent.includes("✏️")) {
    editableInputs.forEach((input) => input.removeAttribute("disabled"));

    // Show add buttons
    // document.getElementById("addVitalsBtn").style.display = "inline-block";
    document.getElementById("addMedBtn").style.display = "inline-block";

    // Show Cancel button
    cancelBtn.style.display = "inline-block";

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
      const editLogRef = collection(
        db,
        "users",
        patientId,
        "editLogs"
      );
      await addDoc(editLogRef, {
        message: `Edited by ${currentUserName} at ${new Date().toLocaleString(
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
    alert("✅ Consultation updated!");

    exitEditMode();
    loadConsultations();
  } catch (err) {
    console.error(err);
    alert("Failed to update consultation.");
  }
});

// CANCEL BUTTON - EXIT EDIT MODE
cancelBtn.addEventListener("click", () => {
  exitEditMode();
});

// CLOSE BUTTON - EXIT EDIT MODE
closeBtn.addEventListener("click", () => {
  exitEditMode();
  closeButtonOverlay(); // keep your original close logic
});

// ✅ Helper function to exit edit mode
function exitEditMode() {
  const editableInputs = document.querySelectorAll(
    "#ovr-doctor, #ovr-date, #ovr-time, #ovr-complaint, #ovr-diagnosis, #ovr-notes"
  );

  // Disable all inputs
  editableInputs.forEach((input) => input.setAttribute("disabled", true));

  // Hide add buttons
  // document.getElementById("addVitalsBtn").style.display = "none";
  document.getElementById("addMedBtn").style.display = "none";

  // Hide Cancel button
  cancelBtn.style.display = "none";

  // Reset Edit button text
  editOverviewBtn.textContent = "✏️ Edit";
}

/* -----------------------------------------------
   🔹 ADD Meds (arrayUnion)
------------------------------------------------ */

/* ============================================================
   MED SELECTION MODAL
============================================================ */
const selectMedModal = document.getElementById("selectMedModal");
const medSelect = document.getElementById("medSelect");
const nextBtn = document.getElementById("selectMedNextBtn");

function openSelectMedModal() {
  selectMedModal.style.display = "flex";
}
function closeSelectMedModal() {
  selectMedModal.style.display = "none";
}

/* ✅ MAKE FUNCTIONS ACCESSIBLE TO HTML */
window.openSelectMedModal = openSelectMedModal;
window.closeSelectMedModal = closeSelectMedModal;

/* ============================================================
   FETCH MED INVENTORY
============================================================ */
async function loadMedInventoryList() {
  medSelect.innerHTML = "";

  const medSnap = await getDocs(collection(db, "MedicineInventory"));
  let meds = [];

  medSnap.forEach((docu) => {
    const data = docu.data();
    const stock = data.stock ?? 0;
    meds.push({ id: docu.id, ...data, stock });
  });

  meds.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = `${m.name} (Available: ${m.stock})`;
    medSelect.appendChild(opt);
  });

  return meds;
}

/* ============================================================
   ADD MED CLICK → OPEN SELECT
============================================================ */
document.addEventListener("click", async (e) => {
  if (e.target && e.target.id === "addMedBtn") {
    if (!currentConsultationId) return alert("No consultation selected!");

    global_medsInventory = await loadMedInventoryList();
    openSelectMedModal();
  }
});

/* ============================================================
   NEXT → DETAIL MODAL
============================================================ */
const medDetailsModal = document.getElementById("medDetailsModal");
const medDetailsContainer = document.getElementById("medDetailsContainer");
const saveMedDetailsBtn = document.getElementById("saveMedDetailsBtn");

function openMedDetailsModal() {
  medDetailsModal.style.display = "flex";
}
function closeMedDetailsModal() {
  medDetailsModal.style.display = "none";
}

nextBtn.addEventListener("click", async () => {
  const selectedIds = Array.from(medSelect.selectedOptions).map((o) => o.value);
  if (selectedIds.length === 0) return alert("Select at least 1 item");

  closeSelectMedModal();
  medDetailsContainer.innerHTML = "";

  selectedIds.forEach((id) => {
    const med = global_medsInventory.find((m) => m.id === id);
    if (!med) return;

    const available = med.stock ?? 0;

    const div = document.createElement("div");
    div.className = "med-entry";
    div.style.marginBottom = "10px";

    div.innerHTML = `
      <div><strong>${med.name}</strong> <small style="color:gray;">(Available: ${available})</small></div>

      <label>Quantity:
        <input type="number" min="1" class="qty-input" data-id="${id}" style="width: 80px" required placeholder="Max: ${available}">
      </label>

      <label style="margin-left:10px;">Type:
        <select class="type-input" data-id="${id}" required>
          <option value="" disabled selected>Select</option>
          <option value="Administered">Administered</option>
          <option value="Dispensed">Dispensed</option>
        </select>
      </label>

      <br>
      <label>Remarks:</label><br>
      <textarea class="remarks-input" data-id="${id}" rows="2" style="width:100%"></textarea>
      <hr>
    `;

    medDetailsContainer.appendChild(div);
  });

  openMedDetailsModal();
});

/* ============================================================
   SAVE MED DETAILS
============================================================ */
let isSavingMeds = false; // 🚫 Prevent double submissions

saveMedDetailsBtn.addEventListener("click", async () => {
  if (isSavingMeds) return;
  isSavingMeds = true;
  saveMedDetailsBtn.disabled = true;

  try {
    const qtyInputs = medDetailsContainer.querySelectorAll(".qty-input");
    const typeInputs = medDetailsContainer.querySelectorAll(".type-input");
    const remarksInputs =
      medDetailsContainer.querySelectorAll(".remarks-input");

    let medsToAdd = [];
    const now = new Date();

    qtyInputs.forEach((input) => {
      const id = input.dataset.id;
      const med = global_medsInventory.find((m) => m.id === id);
      if (!med) return;

      const qty = Number(input.value);
      if (isNaN(qty) || qty <= 0) return;

      const typeEl = Array.from(typeInputs).find((t) => t.dataset.id === id);
      const type = typeEl ? typeEl.value : "";
      if (type === "") return;

      const remarksEl = Array.from(remarksInputs).find(
        (r) => r.dataset.id === id
      );
      const remarks = remarksEl ? remarksEl.value : "";

      medsToAdd.push({
        id,
        name: med.name,
        quantity: qty,
        type,
        remarks,
        NurseOnDuty: currentUserName,
        date: now.toISOString().split("T")[0],
        time: now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    });

    if (medsToAdd.length === 0) {
      alert("Please enter valid medicine info");
      return;
    }

    const consultRef = doc(
      db,
      "users",
      patientId,
      "consultations",
      currentConsultationId
    );

    // 🔥 Save to Firestore
    await updateDoc(consultRef, {
      meds: arrayUnion(...medsToAdd),
    });

    // 🔥 Update inventory immediately
    for (let m of medsToAdd) {
      const medRef = doc(db, "MedicineInventory", m.id);
      const medSnap = await getDoc(medRef);

      if (medSnap.exists()) {
        const data = medSnap.data();
        const newStock = Math.max((data.stock || 0) - m.quantity, 0);
        const newDispensed = (data.dispensed || 0) + m.quantity;

        await updateDoc(medRef, { stock: newStock, dispensed: newDispensed });
      }
    }

    alert("✅ Medication saved!");

    closeMedDetailsModal();

    // 🔥 Refresh table
    await loadConsultations();

    // 🔥 Reload updated consultation details
    const updatedSnap = await getDoc(consultRef);
    if (updatedSnap.exists()) {
      showConsultationDetails(updatedSnap.data(), currentConsultationId);
    }
  } catch (err) {
    console.error(err);
    alert("❌ Failed to save medication.");
  } finally {
    // 🔓 Always unlock button
    isSavingMeds = false;
    saveMedDetailsBtn.disabled = false;
  }
});

window.openMedDetailsModal = openMedDetailsModal;
window.closeMedDetailsModal = closeMedDetailsModal;

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
      alert("Physical Examination Record Saved!");
      loadPhysicalExaminations();
      closeButtonOverlay();
      e.target.reset();
    } catch (err) {
      console.error("Error saving physical examination:", err);
      alert("Failed to save Physical Examination.");
    }
  });
// ===== AUTO COMPUTE BMI ON TYPING =====
const weightInput = document.getElementById("exam-weight");
const heightInput = document.getElementById("exam-height");
const bmiInput = document.getElementById("exam-bmi");

// Auto compute BMI when weight or height changes
function computeBMI() {
  const weight = parseFloat(weightInput.value);
  const heightCm = parseFloat(heightInput.value);

  if (!weight || !heightCm) {
    bmiInput.value = "";
    return;
  }

  const heightM = heightCm / 100; // Convert cm → meters
  const bmi = weight / (heightM * heightM);

  if (!isNaN(bmi)) {
    bmiInput.value = bmi.toFixed(1); // 1 decimal place
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
    <td>${data.date || "-"}</td>
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

    // ✅ Fetch latest data directly from Firestore
    const examRef = doc(db, "users", patientId, "physicalExaminations", examId);
    const examSnap = await getDoc(examRef);

    if (!examSnap.exists()) {
      alert("Exam record not found!");
      return;
    }

    const data = examSnap.data();
    console.log("✅ Exam overview loaded:", data);

    // ✅ Fill overview fields
    document.getElementById("ovr-exam-date").value = data.date || "";
    document.getElementById("ovr-exam-bp").value = data.bp || "";
    document.getElementById("ovr-exam-pr").value = data.pr || "";
    document.getElementById("ovr-exam-weight").value = data.weight || "";
    document.getElementById("ovr-exam-height").value = data.height || "";
    document.getElementById("ovr-exam-bmi").value = data.bmi || "";

    document.getElementById("ovr-exam-os").value = data.visualAcuity?.os || "";
    document.getElementById("ovr-exam-od").value = data.visualAcuity?.od || "";
    document.getElementById("ovr-exam-glasses").value = String(
      data.visualAcuity?.glasses || false
    );

    document.getElementById("ovr-exam-findings").value = Object.entries(
      data.findings || {}
    )
      .map(([key, val]) => `${key.toUpperCase()}: ${val}`)
      .join("\n");

    document.getElementById("ovr-exam-lab").value = data.labPresent || "";
    document.getElementById("ovr-exam-recommendations").value =
      data.recommendations || "";

    // ✅ Show modal and overlay
    document.getElementById("exam-overview-modal").classList.add("show");
    document.getElementById("overlay").classList.add("show");
  } catch (err) {
    console.error("❌ Error showing exam overview:", err);
    alert("Failed to load examination details.");
  }
};

/* -----------------------------------------------
   🔹 CLOSE MODAL (FIXED)
------------------------------------------------ */
window.closeExamOverview = function () {
  document.getElementById("exam-overview-modal").classList.remove("show");
  document.getElementById("overlay").classList.remove("show");
};

/* -----------------------------------------------
   🔹 EDIT & SAVE EXAM DETAILS (FIXED & UPDATED)
------------------------------------------------ */
const editExamBtn = document.getElementById("editExamBtn");

editExamBtn.addEventListener("click", async () => {
  const inputs = document.querySelectorAll(
    "#exam-overview-modal input, #exam-overview-modal textarea, #exam-overview-modal select"
  );

  // ✏️ Enable edit mode
  if (editExamBtn.textContent.includes("✏️")) {
    inputs.forEach((el) => el.removeAttribute("disabled"));
    editExamBtn.textContent = "💾 Save";
    return;
  }

  // 💾 Save mode
  if (!currentExamId || !currentPatientId) {
    alert("No exam record selected!");
    return;
  }

  // --- FIX DATE FORMAT ---
  let dateValue = document.getElementById("ovr-exam-date").value || "";

  // Convert MM-DD-YYYY → YYYY-MM-DD if needed
  if (dateValue.includes("-")) {
    const parts = dateValue.split("-");
    if (parts[0].length === 2) {
      const [mm, dd, yyyy] = parts;
      dateValue = `${yyyy}-${mm}-${dd}`;
    }
  }

  // --- FIX FINDINGS PARSE SAFELY ---
  const findingsText = document
    .getElementById("ovr-exam-findings")
    .value.trim();

  let findingsObj = {};

  if (findingsText !== "") {
    findingsObj = Object.fromEntries(
      findingsText
        .split("\n")
        .map((line) => {
          if (!line.includes(":")) return null; // skip invalid rows
          const [key, ...rest] = line.split(":");
          return [key.trim().toLowerCase(), rest.join(":").trim()];
        })
        .filter((row) => row && row[0] && row[1])
    );
  }

  // --- BUILD FINAL OBJECT ---
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

    await updateDoc(examRef, updatedExam);

    alert("✅ Physical examination updated successfully!");

    // 🔒 Disable again
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

// Category Modal Elements
const categoryModal = document.querySelector(".upload-select-category");
const categorySelect = document.getElementById("document-category");
const confirmBtn = document.getElementById("confirm-upload-btn");
const cancelFileUploadBtn = document.getElementById("cancel-upload-btn");

let selectedFile = null;

// Open file picker
uploadBtn.addEventListener("click", () => fileInput.click());

// When file is chosen, show category selector modal
fileInput.addEventListener("change", (e) => {
  selectedFile = e.target.files[0];
  if (!selectedFile) return;

  categoryModal.style.display = "block"; // show modal
});

// Confirm category and start upload
confirmBtn.addEventListener("click", async () => {
  if (!selectedFile || !patientId) return;

  // Disable the button to prevent double submission
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

    alert("File Uploaded Successfully!");
    await loadDocumentsFiles(); // refresh list after upload
  } finally {
    // Re-enable button and reset
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Confirm";
    categoryModal.style.display = "none"; // hide modal
    fileInput.value = ""; // reset file input
    selectedFile = null;
  }
});

// Cancel button resets everything
cancelFileUploadBtn.addEventListener("click", () => {
  selectedFile = null;
  fileInput.value = "";
  categoryModal.style.display = "none";
});

// Load categorized files
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
    ul.innerHTML = "";

    // Get the button inside the same category section
    const button = ul
      .closest(".category-section")
      .querySelector(".category-toggle");

    const { data, error } = await supabaseClient.storage
      .from("patient-documents")
      .list(`${patientId}/${cat}/`, { limit: 100 });

    if (error || !data) {
      button.textContent = `${cat} (0) ▼`; // still show 0
      continue;
    }

    // Update file count on the button
    const count = data.length;
    button.textContent = `${cat} (${count}) ▼`;

    for (const item of data) {
      const { data: publicUrlObj } = supabaseClient.storage
        .from("patient-documents")
        .getPublicUrl(`${patientId}/${cat}/${item.name}`);

      const li = document.createElement("li");
      li.innerHTML = `<a href="${publicUrlObj.publicUrl}" target="_blank">${item.name}</a>`;
      ul.appendChild(li);
    }
  }
}

loadDocumentsFiles();

// Dropdown toggles
document.querySelectorAll(".category-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const list = btn.nextElementSibling;
    list.style.display = list.style.display === "none" ? "block" : "none";
  });
});

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
        vitals: Array.isArray(d.vitals) ? d.vitals : [],
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


 // Load and listen to user-level edit logs in real-time
  // Load and listen to user-level edit logs in real-time
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


  // Example call after page load or after creating a new log
  loadMedicalConsultationLogs(patientId);