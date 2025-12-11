import { db, auth } from "../../firebaseconfig.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  setDoc,
  addDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

/* -----------------------------------------------
   Patient Info Display
  ----------------------------------------------- */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const patientRef = doc(db, "users", user.uid);
    const patientSnap = await getDoc(patientRef);

    if (patientSnap.exists()) {
      const data = patientSnap.data();

      document.getElementById("lastName").value = data.lastName || "";
      document.getElementById("firstName").value = data.firstName || "";
      document.getElementById("middleName").value = data.middleName || "";
      document.getElementById("extName").value = data.extName || "";
      document.getElementById("gender").value = data.gender || "";
      document.getElementById("birthdate").value = data.birthdate || "";
      document.getElementById("age").value = data.age || "";
      document.getElementById("civilStatus").value = data.civilStatus || "";
      document.getElementById("nationality").value = data.nationality || "";
      document.getElementById("religion").value = data.religion || "";

      document.getElementById("schoolId").value = data.schoolId || "";
      document.getElementById("department").value = data.department || "";
      document.getElementById("course").value = data.course || "";
      document.getElementById("yearLevel").value = data.yearLevel || "";

      document.getElementById("fatherName").value = data.fatherName || "";
      document.getElementById("fatherAge").value = data.fatherAge || "";
      document.getElementById("fatherOccupation").value =
        data.fatherOccupation || "";
      document.getElementById("fatherHealth").value = data.fatherHealth || "";
      document.getElementById("motherName").value = data.motherName || "";
      document.getElementById("motherAge").value = data.motherAge || "";
      document.getElementById("motherOccupation").value =
        data.motherOccupation || "";
      document.getElementById("motherHealth").value = data.motherHealth || "";

      document.getElementById("phoneNumber").value = data.phoneNumber || "";
      document.getElementById("email").value = data.email || "";
      document.getElementById("address").value = data.address || "";
      document.getElementById("guardianName").value = data.guardianName || "";
      document.getElementById("guardianPhone").value = data.guardianPhone || "";
    }
  }

  loadStaff();
});

/* -----------------------------------------------
   Patient Info Edit Logic
----------------------------------------------- */
const editBtn = document.getElementById("edit-info-btn");
const cancelBtn = document.getElementById("cancel-info-btn");
const saveBtn = document.getElementById("save-info-btn");
const infoFields = document.querySelectorAll(".info-field");

let originalData = {};
let currentUserId = "";

cancelBtn.style.display = "none";
saveBtn.style.display = "none";

function setFieldsEditable(editable) {
  infoFields.forEach((field) => (field.disabled = !editable));
}

function storeOriginalData() {
  originalData = {};
  infoFields.forEach((field) => (originalData[field.id] = field.value));
}

function restoreOriginalData() {
  infoFields.forEach((field) => (field.value = originalData[field.id]));
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  currentUserId = user.uid;

  const docRef = doc(db, "users", currentUserId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    infoFields.forEach((field) => (field.value = data[field.id] || ""));
  }
});

editBtn.addEventListener("click", () => {
  setFieldsEditable(true);
  storeOriginalData();
  editBtn.style.display = "none";
  cancelBtn.style.display = "inline-block";
  saveBtn.style.display = "inline-block";
});

cancelBtn.addEventListener("click", () => {
  restoreOriginalData();
  setFieldsEditable(false);
  editBtn.style.display = "inline-block";
  cancelBtn.style.display = "none";
  saveBtn.style.display = "none";
});

saveBtn.addEventListener("click", async () => {
  const updatedData = {};
  infoFields.forEach((field) => (updatedData[field.id] = field.value));

  try {
    const docRef = doc(db, "users", currentUserId);
    await updateDoc(docRef, updatedData);
    alert("Information saved successfully!");
  } catch (err) {
    alert("Failed to save info.");
  }

  setFieldsEditable(false);
  editBtn.style.display = "inline-block";
  cancelBtn.style.display = "none";
  saveBtn.style.display = "none";
});

/* -----------------------------------------------
   Appointment Functions (FULLY FIXED VERSION)
----------------------------------------------- */

const staffList = document.getElementById("staffs");

let selectedStaffId = null;
let selectedStaffName = "";

/* Load Current User for "Booked By" Info */
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserId = user.uid;

    getDoc(doc(db, "users", user.uid)).then((docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
      }
    });
  }
});

/* Load Staff */
async function loadStaff() {
  try {
    const q = query(
      collection(db, "users"),
      where("user_type", "in", ["doctor", "nurse"])
    );

    const snap = await getDocs(q);
    staffList.innerHTML = "";

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;
      const fullName = `${data.lastName}, ${data.firstName}`;

      const availabilityHtml = (data.availability || []).length
        ? `<ul class="m-0 mt-2 p-0" style="list-style:none;">
            ${data.availability
              .map((a) => `<li>${a.day}: ${a.start} - ${a.end}</li>`)
              .join("")}
           </ul>`
        : '<p class="m-0 mt-2 text-muted">(No availability set)</p>';

      const colDiv = document.createElement("div");
      colDiv.className = "col-12 col-md-6 col-lg-4 d-flex";

      colDiv.innerHTML = `
        <div class="staff-card p-3 mb-3 shadow-sm rounded flex-fill" style="cursor:pointer;">
          <p class="mb-1 fw-bold">${fullName}</p>
          <p class="m-0 text-secondary">${
            data.user_type === "doctor" ? "Doctor" : "Nurse"
          }</p>
          ${
            data.user_type === "doctor"
              ? `<p class="m-0 text-primary">Specialization: ${
                  data.doctor_type ?? "(none yet)"
                }</p>`
              : ""
          }
          ${availabilityHtml}
        </div>
      `;

      colDiv
        .querySelector(".staff-card")
        .addEventListener("click", () => openAppointmentModal(id, fullName));

      staffList.appendChild(colDiv);
    });
  } catch (err) {
    console.error("Error loading staff:", err);
  }
}

loadStaff();

/* Open Appointment Modal */
async function openAppointmentModal(id, fullName) {
  selectedStaffId = id;
  selectedStaffName = fullName;

  const apptDay = document.getElementById("apptDay");
  const apptSlot = document.getElementById("apptSlot");

  apptDay.innerHTML = "";
  apptSlot.innerHTML = "";

  // Fetch staff availability
  const staffRef = doc(db, "users", id);
  const staffSnap = await getDoc(staffRef);

  if (!staffSnap.exists()) {
    alert("No staff data found.");
    return;
  }

  const availability = staffSnap.data().availability || [];

  // 🔥 Load all appointments for this staff
  const q = query(collection(db, "appointments"), where("staffId", "==", id));
  const snap = await getDocs(q);

  const bookedAppointments = [];
  snap.forEach(doc => bookedAppointments.push(doc.data()));

  // Generate next 5 upcoming dates for each available weekday
  availability.forEach((a) => {
    const weekday = a.day; // e.g., "Monday"
    const nextFive = getNextFiveDays(weekday);

    nextFive.forEach(dateObj => {
      const opt = document.createElement("option");
      opt.value = dateObj.full;       // "2025-12-08 (Monday)"
      opt.textContent = dateObj.label; // "December 8, 2025 (Monday)"
      opt.dataset.availDay = weekday; // Used later to find correct slot rules
      apptDay.appendChild(opt);
    });
  });

  // When day changes → regenerate slots
  apptDay.addEventListener("change", () => {
    const selected = apptDay.value; // "YYYY-MM-DD (Weekday)"
    const weekday = apptDay.selectedOptions[0].dataset.availDay;
    const avail = availability.find((a) => a.day === weekday);

    generateTimeSlots(avail.start, avail.end, bookedAppointments, selected);
  });

  // Auto-load first day’s slots
  if (apptDay.options.length > 0) {
    const firstOption = apptDay.options[0];
    apptDay.value = firstOption.value;
    const avail = availability.find(a => a.day === firstOption.dataset.availDay);
    generateTimeSlots(avail.start, avail.end, bookedAppointments, firstOption.value);
  }

  new bootstrap.Modal(document.getElementById("appointmentModal")).show();
}

/* Generate Available Time Slots (filters taken slots) */
function generateTimeSlots(startTime, endTime, booked, selectedDay) {
  const slotSelect = document.getElementById("apptSlot");
  slotSelect.innerHTML = "";

  let start = new Date(`1970-01-01T${startTime}:00`);
  const end = new Date(`1970-01-01T${endTime}:00`);

  while (start < end) {
    const next = new Date(start.getTime() + 30 * 60 * 1000);
    if (next > end) break;

    const slotText = `${formatTime(start)} - ${formatTime(next)}`;

    // ✅ Check if this slot is already booked
    const isTaken = booked.some(
      (b) => b.day === selectedDay && b.slot === slotText
    );

    if (!isTaken) {
      const opt = document.createElement("option");
      opt.value = slotText;
      opt.textContent = slotText;
      slotSelect.appendChild(opt);
    }

    start = next;
  }

  if (slotSelect.options.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No available slots";
    opt.disabled = true;
    slotSelect.appendChild(opt);
  }
}

/* Utilities */
const weekdayMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getNextFiveDays(weekdayName) {
  const target = weekdayMap[weekdayName];
  const results = [];

  let date = new Date();
  date.setHours(0, 0, 0, 0);

  while (date.getDay() !== target) {
    date.setDate(date.getDate() + 1);
  }

  for (let i = 0; i < 5; i++) {
    const d = new Date(date);
    d.setDate(date.getDate() + (i * 7));

    results.push({
      full: `${formatLocalDate(d)} (${weekdayName})`,
      label: d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) + ` (${weekdayName})`,
      date: d
    });
  }

  return results;
}

function formatTime(date) {
  return date.toTimeString().slice(0, 5);
}


document.getElementById("saveAppointment").addEventListener("click", async () => {
  const rawDay = document.getElementById("apptDay").value; 
  const [day, weekdayWithParen] = rawDay.split(" ");
  const weekday = weekdayWithParen.replace("(", "").replace(")", "");

  const slot = document.getElementById("apptSlot").value;
  const reason = document.getElementById("apptReason").value;

  if (!day || !slot || !reason) {
    alert("Please fill all fields.");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("Not logged in.");
    return;
  }

  const patientRef = doc(db, "users", user.uid);
  const patientSnap = await getDoc(patientRef);
  const patient = patientSnap.data();
  const patientName = `${patient.lastName}, ${patient.firstName}`;

  try {
    await addDoc(collection(db, "appointments"), {
      day,               // "2025-12-08"
      weekday,           // "Monday"
      slot,
      reason,
      staffId: selectedStaffId,
      staffName: selectedStaffName,
      patientId: user.uid,
      patientName: patientName,
      status: "in queue",
      createdAt: new Date().toISOString()
    });

    alert("Appointment saved!");
    bootstrap.Modal.getInstance(document.getElementById("appointmentModal")).hide();

    loadPatientAppointments();

  } catch (err) {
    console.error(err);
  }
});


function loadPatientAppointments() {
  const list = document.getElementById("appointments-list");
  list.innerHTML = "<p class='text-center text-muted'>Loading...</p>";

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      list.innerHTML = `<p class="text-center text-muted">You are not logged in.</p>`;
      return;
    }

    const q = query(
      collection(db, "appointments"),
      where("patientId", "==", user.uid)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      list.innerHTML = `<p class="text-center text-muted">No appointments found.</p>`;
      return;
    }

    list.innerHTML = "";

    snap.forEach((docSnap) => {
      const appt = docSnap.data();

      const div = document.createElement("div");
      div.className = "col-12 mb-3";

      // Combine day and weekday for display
      const dayWithWeekday = `${appt.day} (${appt.weekday})`;

      div.innerHTML = `
        <div class="p-3 border rounded shadow-sm">
          <h5 class="mb-1 text-primary">${dayWithWeekday}</h5>
          <p class="m-0"><strong>Time:</strong> ${appt.slot}</p>
          <p class="m-0"><strong>Doc./Nurse:</strong> ${appt.staffName}</p>
          <p class="m-0"><strong>Reason:</strong> ${appt.reason}</p>
          <pclass="m-0"><strong>Status:</strong>In Queue</pclass=>
        </div>
      `;

      list.appendChild(div);
    });
  });
}


// Call the function once at page load
loadPatientAppointments();