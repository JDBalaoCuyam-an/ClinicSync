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
  serverTimestamp,
  query,
  where,
  arrayUnion,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get("id");

/* -----------------------------------------------
     🔹 LOAD PATIENT DATA (with medicalHistory subcollection)
  ----------------------------------------------- */
async function loadPatient() {
  if (!patientId) return;

  try {
    const patientRef = doc(db, "patients", patientId);
    const patientSnap = await getDoc(patientRef);

    if (!patientSnap.exists()) {
      alert("Patient not found!");
      return;
    }

    const data = patientSnap.data();

    /* 🧾 Header Name */
    document.querySelector(".patient-contacts h2").textContent = `${
      data.lastName ? data.lastName + "," : ""
    } ${data.firstName || ""}`.trim();

    /* 🧩 Contact Details */
    document.getElementById("phone-number").value = data.contact || "";
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
      role: data.role || "",
    };

    Object.keys(infoFields).forEach((key) => {
      const input = document.getElementById(key);
      if (input) input.value = infoFields[key];
    });

    /* 🧩 Select fields */
    document.getElementById("department").value = data.department || "";
    document.getElementById("course").value = data.course || "";
    document.getElementById("year").value = data.year || "";

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
    const historyRef = collection(db, "patients", patientId, "medicalHistory");
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
      contact: document.getElementById("phone-number").value,
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
      contact: document.getElementById("phone-number").value,
      email: document.getElementById("email-address").value,
      address: document.getElementById("home-address").value,
      guardianName: document.getElementById("guardian-name").value,
      guardianPhone: document.getElementById("guardian-phone").value,
    };

    try {
      await updateDoc(doc(db, "patients", patientId), updatedData);
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
  document.getElementById("phone-number").value = originalContactData.contact;
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
    const historyRef = collection(db, "patients", patientId, "medicalHistory");
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
      const historyRef = collection(
        db,
        "patients",
        patientId,
        "medicalHistory"
      );

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
      role: document.getElementById("role").value,
      department: document.getElementById("department").value,
      course: document.getElementById("course").value,
      year: Number(document.getElementById("year").value),

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
      await updateDoc(doc(db, "patients", patientId), updatedData);
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

// ======================================================
// ✅ DYNAMIC DEPARTMENT → COURSE FOR VIEW PATIENT / FORM
// ======================================================

// Grab selects
const roleSelectForm = document.getElementById("role");
const deptSelectForm = document.getElementById("department");
const courseSelectForm = document.getElementById("course");

// Store original options
const allDeptOptionsForm = Array.from(deptSelectForm.options);
const allCourseOptionsForm = Array.from(courseSelectForm.options);

// Department → allowed courses mapping
const departmentCoursesForm = {
  BasicEd: [
    "Kindergarten",
    "Elementary",
    "Junior Highschool",
    "Accountancy and Business Management",
    "Science, Technology, Engineering, and Mathematics",
    "Humanities and Sciences",
  ],
  CABM: [
    "Bachelor of Science in Accountancy",
    "Bachelor of Science in Office Administration",
    "Bachelor of Science in Hospitality Management",
    "Bachelor of Science in Business Administration",
  ],
  CTE: [
    "Bachelor of Elementary Education",
    "Bachelor of Science in Psychology",
    "Bachelor of Science in Social Work",
    "Bachelor of Secondary Education",
    "Technical Vocational Teacher Education",
  ],
  CIT: ["Bachelor of Science in Information Technology"],
  TTED: ["NC1 NC2 NC3"],
  COT: ["Bachelor of Theology"],
  CCJE: ["Bachelor of Science in Criminology"],
  Visitor: ["Visitor"],
};

// Function to update Department & Course dynamically
function updateDeptCourseForm() {
  const selectedRole = roleSelectForm.value;
  const selectedDept = deptSelectForm.value;

  // --- VISITOR RULE ---
  if (selectedRole === "Visitor") {
    // Only show Visitor in Department
    deptSelectForm.innerHTML = "";
    const visitorDept = allDeptOptionsForm.find(
      (opt) => opt.value === "Visitor"
    );
    if (visitorDept) deptSelectForm.appendChild(visitorDept.cloneNode(true));

    // Only show Visitor in Course
    courseSelectForm.innerHTML = "";
    const visitorCourse = allCourseOptionsForm.find(
      (opt) => opt.value === "Visitor"
    );
    if (visitorCourse)
      courseSelectForm.appendChild(visitorCourse.cloneNode(true));

    return;
  }

  // Restore all departments if needed
  if (deptSelectForm.options.length < allDeptOptionsForm.length) {
    deptSelectForm.innerHTML = "";
    allDeptOptionsForm.forEach((opt) =>
      deptSelectForm.appendChild(opt.cloneNode(true))
    );
  }

  // --- COURSE FILTER BASED ON DEPARTMENT ---
  courseSelectForm.innerHTML = "";
  const defaultCourse = allCourseOptionsForm.find((opt) => opt.value === "");
  if (defaultCourse)
    courseSelectForm.appendChild(defaultCourse.cloneNode(true));

  if (selectedDept === "" || !departmentCoursesForm[selectedDept]) {
    // Show all courses
    allCourseOptionsForm.forEach((opt) => {
      if (opt.value !== "") courseSelectForm.appendChild(opt.cloneNode(true));
    });
  } else {
    // Show only department-specific courses
    departmentCoursesForm[selectedDept].forEach((courseName) => {
      const match = allCourseOptionsForm.find((opt) =>
        opt.textContent.includes(courseName)
      );
      if (match) courseSelectForm.appendChild(match.cloneNode(true));
    });
  }

  // Reset course to default
  courseSelectForm.value = "";
}

// --- Event Listeners ---
roleSelectForm.addEventListener("change", updateDeptCourseForm);
deptSelectForm.addEventListener("change", updateDeptCourseForm);

// ✅ Initial call in case Role is pre-selected
updateDeptCourseForm();

/* -----------------------------------------------
     🔹 CONSULTATION FORM SUBMIT
  ----------------------------------------------- */
// Load medicine options into the dropdown
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

// ✅ Load complaints into datalist
async function loadComplaints() {
  const complaintList = document.getElementById("complaint-list");
  complaintList.innerHTML = ""; // Clear old options

  const querySnapshot = await getDocs(collection(db, "complaints"));
  querySnapshot.forEach((doc) => {
    const option = document.createElement("option");
    option.value = doc.data().name;
    complaintList.appendChild(option);
  });
}

// ✅ Call this once when page loads
loadComplaints();

document
  .getElementById("consultation-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

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

    // ✅ Create vitals record
    const newVitalEntry = {
      bp: document.getElementById("vital-bp").value,
      temp: document.getElementById("vital-temp").value,
      spo2: document.getElementById("vital-spo2").value,
      pr: document.getElementById("vital-pr").value,
      lmp: document.getElementById("vital-lmp").value,
      takenBy: currentUserName,
      recordedDate: new Date().toISOString().split("T")[0],
      recordedTime: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const consultData = {
      consultingDoctor: document.getElementById("consult-doctor").value,
      date: document.getElementById("consult-date").value,
      time: document.getElementById("consult-time").value,
      complaint: document.getElementById("consult-complaint").value.trim(),
      diagnosis: document.getElementById("consult-diagnosis").value,
      meds: medsDispensed,
      vitals: [newVitalEntry],
      notes: document.getElementById("consult-notes").value,
      NurseOnDuty: currentUserName,
      createdAt: new Date(),
    };

    try {
      // ✅ Save new complaint if not existing
      const complaintValue = consultData.complaint;
      if (complaintValue !== "") {
        const complaintsRef = collection(db, "complaints");
        const q = query(complaintsRef, where("name", "==", complaintValue));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          await addDoc(complaintsRef, {
            name: complaintValue,
            createdAt: new Date(),
          });
          console.log("✅ New complaint saved:", complaintValue);
        }
      }

      // ✅ Save Consultation Record
      const consultRef = collection(db, "patients", patientId, "consultations");
      const newConsultDoc = await addDoc(consultRef, consultData);
      const consultationId = newConsultDoc.id;
      console.log("✅ New Consultation ID:", consultationId);

      // ✅ Save Patient Visit
      const patientRef = doc(db, "patients", patientId);
      await addDoc(collection(db, "PatientVisits"), {
        patientId,
        consultationId,
        timestamp: serverTimestamp(),
      });
      console.log("✅ PatientVisits logged.");

      await addDoc(collection(db, "complaintRecords"), {
        patientId,
        complaint: consultData.complaint,
        timestamp: serverTimestamp(),
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
    const consultRef = collection(db, "patients", patientId, "consultations");
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
     🩺 VITALS
  ============================ */
  const vitals = Array.isArray(data.vitals) ? data.vitals : [];
  const vitalsContainer = document.getElementById("cons-vitals-list");
  vitalsContainer.innerHTML = "";

  if (!vitals.length) {
    vitalsContainer.innerHTML = `
      <tr><td colspan="8">No vitals recorded.</td></tr>
    `;
  } else {
    vitals.forEach((v, i) => {
      vitalsContainer.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td>${v.recordedDate || "-"} ${v.recordedTime || "-"}</td>
          <td>${v.bp || "-"}</td>
          <td>${v.temp || "-"}</td>
          <td>${v.spo2 || "-"}</td>
          <td>${v.pr || "-"}</td>
          <td>${v.lmp || "-"}</td>
          <td>${v.takenBy || "-"}</td>
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
    document.getElementById("addVitalsBtn").style.display = "inline-block";
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
      "patients",
      patientId,
      "consultations",
      currentConsultationId
    );

    await updateDoc(consultRef, updatedData);

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
  document.getElementById("addVitalsBtn").style.display = "none";
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
  if (isSavingMeds) return; // ⛔ Ignore double-click
  isSavingMeds = true;
  saveMedDetailsBtn.disabled = true; // lock button

  try {
    const qtyInputs = medDetailsContainer.querySelectorAll(".qty-input");
    const typeInputs = medDetailsContainer.querySelectorAll(".type-input");
    const remarksInputs = medDetailsContainer.querySelectorAll(".remarks-input");

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
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    });

    if (medsToAdd.length === 0) {
      alert("Please enter valid medicine info");
      return;
    }

    const consultRef = doc(
      db,
      "patients",
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

/* ============================================================
   ADD VITALS (arrayUnion pending) — same logic as meds
============================================================ */
const vitalsModal = document.getElementById("vitalsModal");
const saveVitalsBtn = document.getElementById("saveVitalsBtn");
const cancelVitalsBtn = document.getElementById("cancelVitalsBtn");

function openVitalsModal() {
  vitalsModal.style.display = "flex";
}

function closeVitalsModal() {
  vitalsModal.style.display = "none";
  // Clear fields after closing
  document.getElementById("vital-bp").value = "";
  document.getElementById("vital-temp").value = "";
  document.getElementById("vital-spo2").value = "";
  document.getElementById("vital-pr").value = "";
  document.getElementById("vital-lmp").value = "";
}

/* ✅ Make accessible to window for inline calls */
window.openVitalsModal = openVitalsModal;
window.closeVitalsModal = closeVitalsModal;

/* ============================================================
   ADD VITALS BUTTON CLICK → OPEN MODAL
============================================================ */
document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "addVitalsBtn") {
    if (!currentConsultationId) {
      alert("No consultation selected!");
      return;
    }
    openVitalsModal();
  }
});

/* ============================================================
   SAVE VITALS → PENDING ONLY
============================================================ */
let isSavingVitals = false; // 🚫 Prevent double-click submissions

saveVitalsBtn.addEventListener("click", async () => {
  if (isSavingVitals) return; // ⛔ STOP if already saving
  isSavingVitals = true;
  saveVitalsBtn.disabled = true; // disable button during save

  try {
    const bp = document.getElementById("new-vital-bp").value;
    const temp = document.getElementById("new-vital-temp").value;
    const spo2 = document.getElementById("new-vital-spo2").value;
    const pr = document.getElementById("new-vital-pr").value;
    const lmp = document.getElementById("new-vital-lmp").value;

    const now = new Date();
    const newVital = {
      bp,
      temp,
      spo2,
      pr,
      lmp,
      takenBy: currentUserName,
      recordedDate: now.toISOString().split("T")[0],
      recordedTime: now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const consultRef = doc(
      db,
      "patients",
      patientId,
      "consultations",
      currentConsultationId
    );

    // 🔥 Add directly to Firestore
    await updateDoc(consultRef, {
      vitals: arrayUnion(newVital),
    });

    alert("✅ Vitals saved!");

    closeVitalsModal();

    // 🔥 Refresh table
    await loadConsultations();

    // 🔥 Reload updated consultation info in modal
    const updatedSnap = await getDoc(consultRef);

    if (updatedSnap.exists()) {
      showConsultationDetails(updatedSnap.data(), currentConsultationId);
    }

  } catch (err) {
    console.error(err);
    alert("❌ Failed to save vitals.");
  } finally {
    // 🔓 Re-enable button after operation completes
    isSavingVitals = false;
    saveVitalsBtn.disabled = false;
  }
});

/* ============================================================
   CANCEL BUTTON
============================================================ */
cancelVitalsBtn.addEventListener("click", (e) => {
  e.preventDefault();
  closeVitalsModal();
});

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
        "patients",
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

/* -----------------------------------------------
 🔹 LOAD PHYSICAL EXAMINATION RECORDS
----------------------------------------------- */
async function loadPhysicalExaminations() {
  const tableBody = document.getElementById("physical-exam-list");
  tableBody.innerHTML = "";

  try {
    const examRef = collection(
      db,
      "patients",
      patientId,
      "physicalExaminations"
    );
    const snapshot = await getDocs(examRef);

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
    <td>${data.findings?.others || "Normal physical findings"}</td>
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
    const examRef = doc(
      db,
      "patients",
      patientId,
      "physicalExaminations",
      examId
    );
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
    inputs.forEach((input) => input.removeAttribute("disabled"));
    editExamBtn.textContent = "💾 Save";
    return;
  }

  // 💾 Save mode
  if (!currentExamId || !currentPatientId) {
    alert("No exam record selected!");
    return;
  }

  // 🧠 Build updated data from modal fields
  const updatedExam = {
    date: document.getElementById("ovr-exam-date").value,
    bp: document.getElementById("ovr-exam-bp").value,
    pr: document.getElementById("ovr-exam-pr").value,
    weight: Number(document.getElementById("ovr-exam-weight").value),
    height: Number(document.getElementById("ovr-exam-height").value),
    bmi: Number(document.getElementById("ovr-exam-bmi").value),
    visualAcuity: {
      os: document.getElementById("ovr-exam-os").value,
      od: document.getElementById("ovr-exam-od").value,
      glasses: document.getElementById("ovr-exam-glasses").value === "true", // dropdown fix
    },
    findings: Object.fromEntries(
      document
        .getElementById("ovr-exam-findings")
        .value.split("\n")
        .map((line) => {
          const [key, ...rest] = line.split(":");
          return [key.trim().toLowerCase(), rest.join(":").trim()];
        })
        .filter(([key, val]) => key && val)
    ),
    labPresent: document.getElementById("ovr-exam-lab").value,
    recommendations: document.getElementById("ovr-exam-recommendations").value,
    updatedAt: new Date(),
  };

  try {
    const examRef = doc(
      db,
      "patients",
      currentPatientId,
      "physicalExaminations",
      currentExamId
    );

    await updateDoc(examRef, updatedExam);

    alert("✅ Physical examination updated successfully!");

    // 🔒 Disable all fields again
    inputs.forEach((input) => input.setAttribute("disabled", "true"));
    editExamBtn.textContent = "✏️ Edit";

    // 🔄 Reload updated table data if available
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
const documentsList = document.getElementById("documents-list");

uploadBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file || !patientId) return;

  const fileName = `${Date.now()}_${file.name}`;
  const filePath = `${patientId}/${fileName}`; // ✅ folder = patientId

  // ✅ Upload file inside that patient’s folder
  const { data, error } = await supabaseClient.storage
    .from("patient-documents")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Upload failed:", error);
    alert("❌ Upload failed: " + error.message);
    return;
  }

  // ✅ Get public URL for this file
  const { data: publicData } = supabaseClient.storage
    .from("patient-documents")
    .getPublicUrl(filePath);

  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
  const listItem = document.createElement("li");
  listItem.innerHTML = `<a href="${publicData.publicUrl}" target="_blank">${file.name}</a> (${fileSizeMB} MB)`;
  documentsList.appendChild(listItem);

  alert("✅ Upload successful!");
});

// ✅ Load only this patient's files
async function loadDocuments() {
  if (!patientId) return;

  const { data, error } = await supabaseClient.storage
    .from("patient-documents")
    .list(patientId + "/", { limit: 100 }); // only inside this folder

  if (error) {
    console.error("Error loading files:", error);
    return;
  }

  documentsList.innerHTML = "";
  for (const item of data) {
    const { data: publicData } = supabaseClient.storage
      .from("patient-documents")
      .getPublicUrl(`${patientId}/${item.name}`);

    const listItem = document.createElement("li");
    listItem.innerHTML = `<a href="${publicData.publicUrl}" target="_blank">${item.name}</a>`;
    documentsList.appendChild(listItem);
  }
}

loadDocuments();
loadPatient();
await loadConsultations();
await loadPhysicalExaminations();
