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

    // ✅ Set <input> fields only
    Object.keys(infoFields).forEach((key) => {
      const input = document.getElementById(key);
      if (input) input.value = infoFields[key];
    });

    // ✅ Set <select> fields properly
    document.getElementById("department").value = data.department || "";
    document.getElementById("course").value = data.course || "";
    document.getElementById("year").value = data.year || "";
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
    ".patient-info-content .info-grid input, .patient-info-content .info-grid select"
  );

  if (editPatientInfoBtn.textContent.includes("✏️")) {
    infoInputs.forEach((input) => input.removeAttribute("disabled"));
    editPatientInfoBtn.textContent = "💾 Save";
  } else {
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

    try {
      // ✅ Save Consultation Record
      const consultRef = collection(db, "patients", patientId, "consultations");
      await addDoc(consultRef, consultData);

      // ✅ Deduct Medicine Stock
      for (const med of medsDispensed) {
        if (med.name && med.quantity > 0) {
          const invRef = collection(db, "MedicineInventory");
          const q = query(invRef, where("name", "==", med.name));
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const medDoc = snapshot.docs[0];
            const data = medDoc.data();

            const currentStock = data.stock || 0;
            const currentDispensed = data.dispensed || 0;

            const newStock = Math.max(currentStock - med.quantity, 0);
            const newDispensed = currentDispensed + med.quantity;

            await updateDoc(medDoc.ref, {
              stock: newStock,
              dispensed: newDispensed,
            });

            console.log(
              `✅ ${med.name} stock updated: ${currentStock} → ${newStock}, dispensed: ${currentDispensed} → ${newDispensed}`
            );
          } else {
            console.warn(`⚠️ Medicine not found in inventory: ${med.name}`);
          }
        }
      }

      alert("✅ Consultation Record Saved & Medicine Deducted!");
      closeButtonOverlay();
      loadConsultations();
      loadComplaints();
      loadMedicineOptions(); // 🔁 Refresh available stocks in dropdown
    } catch (err) {
      console.error("❌ Error adding consultation:", err);
      alert("Failed to save consultation record.");
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
const cancelBtn = document.querySelector(".modal-buttons button[style*='display: none']"); // Cancel button
const closeBtn = document.querySelector(".modal-buttons button:last-child"); // Close button

let pendingMeds = [];
let pendingVitals = [];
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

    // Reset pending arrays
    pendingMeds = [];
    pendingVitals = [];

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

  if (pendingMeds.length > 0) updatedData.meds = arrayUnion(...pendingMeds);
  if (pendingVitals.length > 0) updatedData.vitals = arrayUnion(...pendingVitals);

  try {
    const consultRef = doc(
      db,
      "patients",
      patientId,
      "consultations",
      currentConsultationId
    );

    await updateDoc(consultRef, updatedData);

    if (pendingMeds.length > 0) {
      for (let m of pendingMeds) {
        const medRef = doc(db, "MedicineInventory", m.id);
        const medSnap = await getDoc(medRef);

        if (medSnap.exists()) {
          const data = medSnap.data();
          const newStock = Math.max((data.stock || 0) - m.quantity, 0);
          const newDispensed = (data.dispensed || 0) + m.quantity;

          await updateDoc(medRef, { stock: newStock, dispensed: newDispensed });
        }
      }
    }

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

  // Clear pending arrays
  pendingMeds = [];
  pendingVitals = [];
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
   SAVE MED DETAILS → PENDING ONLY
============================================================ */
saveMedDetailsBtn.addEventListener("click", async () => {
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
    alert("Please enter at least one valid medicine with type and quantity");
    return;
  }

  // ✅ Store temporarily — not DB yet
  pendingMeds.push(...medsToAdd);

  alert("✅ Medication(s) added! (Pending Save)");
  closeMedDetailsModal();
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
saveVitalsBtn.addEventListener("click", (e) => {
  // Fetch all inputs safely
  const bp   = document.getElementById("new-vital-bp").value;
  const temp = document.getElementById("new-vital-temp").value;
  const spo2 = document.getElementById("new-vital-spo2").value;
  const pr   = document.getElementById("new-vital-pr").value;
  const lmp  = document.getElementById("new-vital-lmp").value;

  console.log("Vitals entered:", { bp, temp, spo2, pr, lmp }); // 🩺 Debug log

  // Validate: at least one value should be filled
  // const hasAny = bp || temp || spo2 || pr || lmp;
  // if (!hasAny) {
  //   alert("Please enter at least one vital sign.");
  //   return;
  // }

  const now = new Date();
  const newVital = {
    bp,
    temp,
    spo2,
    pr,
    lmp,
    takenBy: currentUserName || "Unknown",
    recordedDate: now.toISOString().split("T")[0],
    recordedTime: now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
console
  // ✅ Temporarily store vitals (not yet in DB)
  pendingVitals.push(newVital);
  console.log("✅ Added vitals (pending):", pendingVitals);

  alert("✅ Vitals added! (Pending Save)");
  closeVitalsModal();
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
