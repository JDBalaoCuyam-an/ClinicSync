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

function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

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
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  loadMedicalRecords(user.uid);
});

/* -----------------------------------------------
   Load Medical Records
----------------------------------------------- */
async function loadMedicalRecords(patientId) {
  const tableBody = document.getElementById("records-table-body");

  tableBody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center text-muted">Loading records...</td>
    </tr>
  `;

  try {
    const recordsRef = collection(db, "users", patientId, "consultations");
    const snapshot = await getDocs(recordsRef);

    if (snapshot.empty) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted">
            No medical records found
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      let prescription = "No Prescriptions";
      if (Array.isArray(data.meds) && data.meds.length > 0) {
        prescription = data.meds
          .map((m) => `${m.name} (${m.quantity})`)
          .join(", ");
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${formatDateLabel(data.date) || "-"}</td>
        <td>${data.consultingDoctor || "-"}</td>
        <td>${data.NurseOnDuty || "-"}</td>
        <td>${data.complaint || "-"}</td>
        <td>${data.diagnosis || "Not Diagnosed"}</td>
        <td>${prescription}</td>
      `;

      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading medical records:", err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-danger">
          Failed to load records
        </td>
      </tr>
    `;
  }
}

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
        <div class="staff-card p-3 mb-3 border shadow-md rounded flex-fill">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <p class="mb-1 fw-bold">${fullName}</p>
              <p class="m-0 text-secondary">
                ${data.user_type === "doctor" ? "Doctor" : "Nurse"}
              </p>
              ${
                data.user_type === "doctor"
                  ? `<p class="m-0 text-primary">
                      Specialization: ${data.doctor_type ?? "(none yet)"}
                    </p>`
                  : ""
              }
            </div>

            <button
              type="button"
              class="btn btn-sm btn-primary book-appt-btn"
            >
              Book
            </button>
          </div>

          ${availabilityHtml}
        </div>
      `;

      // ✅ BUTTON CLICK (THIS IS THE IMPORTANT PART)
      colDiv
        .querySelector(".book-appt-btn")
        .addEventListener("click", () => {
          console.log("Opening appointment modal for:", fullName);
          openAppointmentModal(id, fullName);
        });

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

  // ✅ Check last appointment date
  const apptQuery = query(
    collection(db, "appointments"),
    where("patientId", "==", user.uid)
  );
  const apptSnap = await getDocs(apptQuery);

  // Find latest appointment
  let latestApptDate = null;
  apptSnap.forEach(doc => {
    const apptDate = new Date(doc.data().day);
    if (!latestApptDate || apptDate > latestApptDate) {
      latestApptDate = apptDate;
    }
  });

  const selectedDate = new Date(day);

  if (latestApptDate) {
    const diffTime = selectedDate - latestApptDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const showBookingError = (message) => {
  document.getElementById("bookingErrorMessage").textContent = message;
  new bootstrap.Modal(document.getElementById("bookingErrorModal")).show();
};

    if (diffDays < 3) {
  showBookingError("You cannot book an appointment within 3 days of your latest appointment.");
  return;
}

  }

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



function getStatusBadge(status) {
  switch (status) {
    case "in Queue":
      return `<span class="badge bg-warning text-dark">In Queue</span>`;
    case "accepted":
      return `<span class="badge bg-primary">Accepted</span>`;
    case "finished":
      return `<span class="badge bg-success">Finished</span>`;
    case "canceled":
      return `<span class="badge bg-danger">Canceled</span>`;
    case "no Show":
      return `<span class="badge bg-secondary">No Show</span>`;
    default:
      return `<span class="badge bg-light text-dark">${status}</span>`;
  }
}
const STATUS_PRIORITY = {
  "accepted": 1,
  "in queue": 2,
  "finished": 3,
  "no show": 4,
  "canceled": 5,
};

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

    // 🔹 Convert snapshot to array
    const appointments = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    // 🔹 SORT BY STATUS PRIORITY
    appointments.sort((a, b) => {
      return (
        (STATUS_PRIORITY[a.status] || 99) -
        (STATUS_PRIORITY[b.status] || 99)
      );
    });
const countBadge = document.getElementById("appointments-count");
countBadge.textContent = appointments.length;
    list.innerHTML = "";

    appointments.forEach((appt) => {
      const div = document.createElement("div");
      div.className = "col-12 mb-3";

      const dayWithWeekday = `${appt.day} (${appt.weekday})`;
      const canCancel = ["in queue", "accepted"].includes(appt.status);

      div.innerHTML = `
        <div class="p-3 border rounded shadow-sm d-flex flex-column gap-1 ">
          <h5 class="mb-1 text-primary">${dayWithWeekday}</h5>

          <p class="m-0"><strong>Time:</strong> ${appt.slot}</p>
          <p class="m-0"><strong>Doc./Nurse:</strong> ${appt.staffName}</p>
          <p class="m-0"><strong>Reason:</strong> ${appt.reason}</p>

          <p class="m-0">
            <strong>Status:</strong> ${getStatusBadge(appt.status)}
          </p>

          ${
            canCancel
              ? `
                <button
                  class="btn btn-sm btn-outline-danger mt-2 cancel-appt-btn"
                  data-id="${appt.id}"
                >
                  ❌ Cancel Appointment
                </button>
              `
              : ""
          }
        </div>
      `;

      list.appendChild(div);
    });
  });
}

// Call the function once at page load
loadPatientAppointments();

document
  .getElementById("appointments-list")
  .addEventListener("click", async (e) => {
    const btn = e.target.closest(".cancel-appt-btn");
    if (!btn) return;

    const apptId = btn.dataset.id;

    const confirmed = confirm(
      "Are you sure you want to cancel this appointment?\nThis action cannot be undone."
    );

    if (!confirmed) return;

    try {
      await updateDoc(doc(db, "appointments", apptId), {
        status: "canceled",
        canceledAt: new Date(),
      });

      alert("✅ Appointment successfully canceled");
      loadPatientAppointments();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to cancel appointment");
    }
  });
