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
  where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get("id");
let isEditingContacts = false;

/* -----------------------------------------------
     🔹 LOAD PATIENT DATA
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

    // 🧾 Header Name
    document.querySelector(".patient-contacts h2").textContent = `${
      data.lastName + "," || ""
    } ${data.firstName || ""}`.trim();

    // 🧩 Contact Details
    document.getElementById("phone-number").value = data.contact || "";
    document.getElementById("email-address").value = data.email || "";
    document.getElementById("home-address").value = data.address || "";
    document.getElementById("guardian-name").value = data.guardianName || "";
    document.getElementById("guardian-phone").value = data.guardianPhone || "";

    // 🧩 Basic Info
    const infoFields = {
      lastName: data.lastName,
      firstName: data.firstName,
      middleName: data.middleName || "",
      extName: data.extName || "",
      gender: data.gender,
      birthdate: data.birthdate,
      age: data.age,
      civilStatus: data.civilStatus || "",
      nationality: data.nationality || "",
      religion: data.religion || "",
      schoolId: data.schoolId,
      role: data.role,
      department: data.department || "",
      course: data.course || "",
      year: data.year || "",
    };
    const infoInputs = document.querySelectorAll(
      ".patient-info-content .info-grid input"
    );
    Object.values(infoFields).forEach((val, i) => {
      if (infoInputs[i]) infoInputs[i].value = val;
    });

    // 🧩 Parent Info
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

    // 🧩 Medical History + Additional Info
    const medFields = {
      pastMedicalHistory: data.pastMedicalHistory || "",
      familyHistory: data.familyHistory || "",
      pastSurgicalHistory: data.pastSurgicalHistory || "",
      supplements: data.supplements || "",
      allergies: data.allergies || "",
    };

    // set textareas (first 5)
    const medTextareas = document.querySelectorAll(
      ".medical-history-content textarea"
    );
    Object.values(medFields).forEach((val, i) => {
      if (medTextareas[i]) medTextareas[i].value = val;
    });

    // set immunization fields
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
      if (input) input.value = data[key] || "";
    });

    // set OB-GYNE fields
    const obgyneFields = [
      "menarcheAge",
      "durationDays",
      "napkinsPerDay",
      "interval",
      "lastMenstrual",
    ];
    obgyneFields.forEach((key) => {
      const input = document.querySelector(`.obgyne-form input[name='${key}']`);
      if (input) input.value = data[key] || "";
    });

    // set Dysmenorrhea radio
    if (data.dysmenorrhea) {
      const radio = document.querySelector(
        `.obgyne-form input[type='radio'][value='${data.dysmenorrhea}']`
      );
      if (radio) radio.checked = true;
    }
  } catch (err) {
    console.error("Error fetching patient:", err);
  }
}

/* -----------------------------------------------
     🔹 EDIT/SAVE CONTACT DETAILS
  ----------------------------------------------- */
document.getElementById("edit-contacts").addEventListener("click", async () => {
  const inputs = document.querySelectorAll(".patient-contacts input");

  if (!isEditingContacts) {
    // Enable editing
    inputs.forEach((inp) => inp.removeAttribute("disabled"));
    document.getElementById("edit-contacts").textContent = "💾 Save";
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
      document.getElementById("edit-contacts").textContent = "✏️ Edit";
      isEditingContacts = false;
    } catch (err) {
      console.error("Error updating contact details:", err);
      alert("Failed to update contact details.");
    }
  }
});

/* -----------------------------------------------
     🔹 EDIT/SAVE MEDICAL HISTORY
  ----------------------------------------------- */
const editHistoryBtn = document.querySelector(
  ".medical-history-content .edit-btn"
);
editHistoryBtn.addEventListener("click", async () => {
  const editableFields = document.querySelectorAll(
    ".medical-history-content textarea, .medical-history-content input"
  );

  if (editHistoryBtn.textContent.includes("✏️")) {
    editableFields.forEach((el) => el.removeAttribute("disabled"));
    editHistoryBtn.textContent = "💾 Save";
  } else {
    const [pastMedical, familyHistory, pastSurgical, supplements, allergies] =
      Array.from(
        document.querySelectorAll(".medical-history-content textarea")
      ).map((ta) => ta.value.trim());

    // get immunization values
    const immunizationData = {};
    document
      .querySelectorAll(".immunization-form input")
      .forEach((input) => (immunizationData[input.name] = input.value.trim()));

    // get OB-GYNE values
    const obgyneData = {};
    document
      .querySelectorAll(
        ".obgyne-form input[type='text'], .obgyne-form input[type='date']"
      )
      .forEach((input) => (obgyneData[input.name] = input.value.trim()));

    const dysmenorrhea =
      document.querySelector(".obgyne-form input[type='radio']:checked")
        ?.value || "";

    try {
      await updateDoc(doc(db, "patients", patientId), {
        pastMedicalHistory: pastMedical,
        familyHistory,
        pastSurgicalHistory: pastSurgical,
        supplements,
        allergies,
        ...immunizationData,
        ...obgyneData,
        dysmenorrhea,
      });

      alert("Medical History updated!");
      editableFields.forEach((el) => el.setAttribute("disabled", "true"));
      editHistoryBtn.textContent = "✏️ Edit";
    } catch (err) {
      console.error("Error updating medical history:", err);
      alert("Failed to update medical history.");
    }
  }
});

/* -----------------------------------------------
     🔹 EDIT/SAVE PATIENT INFORMATION
  ----------------------------------------------- */
const editPatientInfoBtn = document.querySelector(
  ".patient-info-content .edit-btn"
);
editPatientInfoBtn.addEventListener("click", async () => {
  const infoInputs = document.querySelectorAll(
    ".patient-info-content .info-grid input"
  );

  if (editPatientInfoBtn.textContent.includes("✏️")) {
    infoInputs.forEach((input) => input.removeAttribute("disabled"));
    editPatientInfoBtn.textContent = "💾 Save";
  } else {
    const updatedData = {
      lastName: lastName.value,
      firstName: firstName.value,
      middleName: middleName.value,
      extName: extName.value,
      gender: gender.value,
      birthdate: birthdate.value,
      age: Number(age.value),
      civilStatus: civilStatus.value,
      nationality: nationality.value,
      religion: religion.value,
      schoolId: schoolId.value,
      role: role.value,
      department: department.value,
      course: course.value,
      year: Number(year.value),

      fatherName: fatherName.value,
      fatherAge: Number(fatherAge.value),
      fatherOccupation: fatherOccupation.value,
      fatherHealth: fatherHealth.value,
      motherName: motherName.value,
      motherAge: Number(motherAge.value),
      motherOccupation: motherOccupation.value,
      motherHealth: motherHealth.value,
    };

    try {
      await updateDoc(doc(db, "patients", patientId), updatedData);
      alert("Patient information updated!");
      infoInputs.forEach((input) => input.setAttribute("disabled", "true"));
      editPatientInfoBtn.textContent = "✏️ Edit";
    } catch (err) {
      console.error("Error updating patient information:", err);
      alert("Failed to update patient information.");
    }
  }
});

/* -----------------------------------------------
     🔹 CONSULTATION FORM SUBMIT
  ----------------------------------------------- */
// Load medicine options into the dropdown
const medsListDiv = document.getElementById("meds-list");
const addMedBtn = document.getElementById("add-med-btn");
let medicinesData = []; // stores all medicine names from inventory

// Load meds into array
async function loadMedicineOptions() {
  const querySnapshot = await getDocs(collection(db, "MedicineInventory"));
  medicinesData = querySnapshot.docs.map((doc) => doc.data().name);
}

loadMedicineOptions();

// Add a new medicine row (name + quantity)
addMedBtn.addEventListener("click", () => {
  const container = document.createElement("div");
  container.classList.add("med-row");

  container.innerHTML = `
    <select class="med-name">
      <option value="" disabled selected>Select Medicine</option>
      ${medicinesData
        .map((name) => `<option value="${name}">${name}</option>`)
        .join("")}
    </select>
    <input type="number" class="med-qty" min="1" placeholder="Qty" />
    <button type="button" class="remove-med">X</button>
  `;

  // Remove row
  container.querySelector(".remove-med").addEventListener("click", () => {
    container.remove();
  });

  medsListDiv.appendChild(container);
});
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

    // ✅ Get all meds in the table
    const medsDispensed = Array.from(document.querySelectorAll(".med-row"))
      .map((row) => {
        return {
          name: row.querySelector(".med-name").value,
          quantity: parseInt(row.querySelector(".med-qty").value) || 0,
        };
      })
      .filter((med) => med.name !== "");

    // ✅ Gather consultation data
    const consultData = {
      consultingDoctor: document.getElementById("consult-doctor").value,
      date: document.getElementById("consult-date").value,
      time: document.getElementById("consult-time").value,
      complaint: document.getElementById("consult-complaint").value.trim(),
      diagnosis: document.getElementById("consult-diagnosis").value,
      meds: medsDispensed,
      notes: document.getElementById("consult-notes").value,
      vitals: {
        bp: document.getElementById("vital-bp").value,
        temp: document.getElementById("vital-temp").value,
        spo2: document.getElementById("vital-spo2").value,
        pr: document.getElementById("vital-pr").value,
        lmp: document.getElementById("vital-lmp").value,
      },
      NurseOnDuty: currentUserName, // ✅ Logged-in user
      createdAt: new Date(),
    };

    // ✅ Save new complaint to Firestore if it's new
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

    try {
      // ✅ Save consultation record under patient
      const consultRef = collection(db, "patients", patientId, "consultations");
      await addDoc(consultRef, consultData);

      alert("Consultation Record Saved!");
      closeButtonOverlay();
      loadConsultations();
      loadComplaints(); // ✅ Refresh the dropdown with latest list
    } catch (err) {
      console.error("Error adding consultation:", err);
      alert("Failed to save consultation record.");
    }
  });

/* -----------------------------------------------
   🔹 LOAD CONSULTATION RECORDS INTO TABLE
------------------------------------------------ */
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

      // Convert meds array into a readable string safely
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

      // Click row → open overview modal
      tr.addEventListener("click", () => showConsultationDetails(data));
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading consultations:", err);
  }
}

/* -----------------------------------------------
   🔹 SHOW CONSULTATION DETAILS IN MODAL
------------------------------------------------ */
window.showConsultationDetails = function (data) {
  document.getElementById("ovr-doctor").textContent = data.consultingDoctor;
  document.getElementById("ovr-date").textContent = data.date;
  document.getElementById("ovr-time").textContent = data.time;
  document.getElementById("ovr-complaint").textContent = data.complaint;
  document.getElementById("ovr-diagnosis").textContent = data.diagnosis || "-";

  // Format meds list for display
  document.getElementById("ovr-meds").textContent =
    Array.isArray(data.meds) && data.meds.length > 0
      ? data.meds.map((m) => `${m.name} (${m.quantity})`).join(", ")
      : "-";

  document.getElementById("ovr-notes").textContent = data.notes || "-";

  // Vital Signs
  document.getElementById("ovr-bp").textContent = data.vitals.bp || "-";
  document.getElementById("ovr-temp").textContent = data.vitals.temp || "-";
  document.getElementById("ovr-spo2").textContent = data.vitals.spo2 || "-";
  document.getElementById("ovr-pr").textContent = data.vitals.pr || "-";
  document.getElementById("ovr-lmp").textContent = data.vitals.lmp || "-";

  // Show Modal + Overlay
  document.getElementById("consultation-overview").classList.add("show");
  document.getElementById("overlay").classList.add("show");
};

window.closeOverview = function () {
  document.getElementById("consultation-overview").classList.remove("show");
  document.getElementById("overlay").classList.remove("show");
};

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
      tr.addEventListener("click", () => showExamOverview(data));
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading physical examinations:", err);
  }
}
// Overview Modal for Physical Exam
window.showExamOverview = function (data) {
  const overviewDiv = document.getElementById("overview-details");

  overviewDiv.innerHTML = `
    <p><strong>Date:</strong> ${data.date || "-"}</p>
    <p><strong>BP:</strong> ${data.bp || "-"}</p>
    <p><strong>PR:</strong> ${data.pr || "-"}</p>
    <p><strong>Weight:</strong> ${data.weight || "-"} kg</p>
    <p><strong>Height:</strong> ${data.height || "-"} cm</p>
    <p><strong>BMI:</strong> ${data.bmi || "-"}</p>
    
    <h4>👁️ Visual Acuity</h4>
    <p><strong>OS:</strong> ${data.visualAcuity?.os || "-"}</p>
    <p><strong>OD:</strong> ${data.visualAcuity?.od || "-"}</p>
    <p><strong>Glasses:</strong> ${
      data.visualAcuity?.glasses ? "Yes" : "No"
    }</p>

    <h4>🩺 Physical Findings</h4>
    ${Object.entries(data.findings || {})
      .map(
        ([key, val]) =>
          `<p><strong>${key.toUpperCase()}:</strong> ${val || "-"}</p>`
      )
      .join("")}

    <h4>🧪 Laboratory & Recommendations</h4>
    <p><strong>Laboratory Procedure:</strong> ${data.labPresent || "-"}</p>
    <p><strong>Recommendations:</strong> ${data.recommendations || "-"}</p>
  `;

  document.getElementById("exam-overview-modal").style.display = "flex";
};

window.closeExamOverview = function () {
  document.getElementById("exam-overview-modal").style.display = "none";
};

// Schedule/Appointment
const appointmentModal = document.getElementById("appointment-modal");
const makeAppointmentBtn = document.getElementById("make-appointment");
const closeAppointmentBtn = document.getElementById("close-appointment");
const appointmentForm = document.getElementById("appointment-form");

// 🔹 Open Modal
makeAppointmentBtn.addEventListener("click", () => {
  appointmentModal.style.display = "flex";
});

// 🔹 Close Modal
closeAppointmentBtn.addEventListener("click", () => {
  appointmentModal.style.display = "none";
});

// 🔹 Save Appointment (with Full Name)
appointmentForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const selectedDate = document.getElementById("appt-date").value;
  const time = document.getElementById("appt-time").value;
  const doctor = document.getElementById("appt-doctor").value.trim();
  const details = document.getElementById("appt-purpose").value.trim();

  if (!selectedDate || !time || !doctor || !details) {
    alert("Please fill out all fields.");
    return;
  }

  try {
    // 🧠 Fetch patient document to get full name
    const patientRef = doc(db, "patients", patientId);
    const patientSnap = await getDoc(patientRef);

    if (!patientSnap.exists()) {
      alert("Patient record not found!");
      return;
    }

    const patientData = patientSnap.data();
    const fullName = `${patientData.lastName || ""}, ${
      patientData.firstName || ""
    }`.trim();

    // 💾 Save appointment with full name as "person"
    await addDoc(collection(db, "schedules"), {
      date: selectedDate,
      time,
      person: fullName,
      doctor,
      details,
      status: "upcoming",
      createdAt: serverTimestamp(),
    });

    alert("✅ Appointment Saved!");
    appointmentModal.style.display = "none";
    appointmentForm.reset();
  } catch (error) {
    console.error("Error adding appointment:", error);
    alert("❌ Failed to save appointment. Try again.");
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
