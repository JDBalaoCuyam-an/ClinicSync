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
  addDoc,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

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
   Appointment Functions (UPDATED: Date-Based Availability)
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
        // You can use currentUser info if needed
      }
    });
  }
});

/* Load Staff with Date-Based Availability */
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

      // Prepare availability HTML
      let availabilityHtml = "";

      if (data.availability && data.availability.length) {
        availabilityHtml = `<ul class="m-0 mt-2 p-0" style="list-style:none;">`;

        data.availability.forEach((a) => {
          if (a.slots && a.slots.length) {
            availabilityHtml += `<li>
              <strong>${formatDateLabel(a.date)} (${a.weekday})</strong>:<br>
              ${a.slots
                .map(
                  (s) =>
                    `${formatTimeFromString(s.start)} - ${formatTimeFromString(
                      s.end
                    )}`
                )
                .join("<br>")}
            </li>`;
          }
        });

        availabilityHtml += `</ul>`;
      } else {
        availabilityHtml =
          '<p class="m-0 mt-2 text-muted">(No availability set)</p>';
      }

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

      // ✅ BUTTON CLICK
      colDiv.querySelector(".book-appt-btn").addEventListener("click", () => {
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
  document.getElementById("staffNameTitle").textContent = fullName;
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
  snap.forEach((doc) => bookedAppointments.push(doc.data()));

  // Filter future dates only
  const today = new Date();
  const futureAvailability = availability.filter(
    (a) => new Date(a.date) >= today
  );

  // Populate appointment day select
  futureAvailability.forEach((a) => {
    if (a.slots && a.slots.length) {
      const opt = document.createElement("option");
      opt.value = a.date; // "YYYY-MM-DD"
      opt.textContent = `${a.date} (${a.weekday})`;
      apptDay.appendChild(opt);
    }
  });

  // When day changes → regenerate slots
  apptDay.addEventListener("change", () => {
    const selectedDate = apptDay.value; // "YYYY-MM-DD"
    const avail = futureAvailability.find((a) => a.date === selectedDate);
    generateTimeSlots(avail?.slots || [], bookedAppointments, selectedDate);
  });

  // Auto-load first day’s slots
  if (apptDay.options.length > 0) {
    const firstOption = apptDay.options[0];
    apptDay.value = firstOption.value;
    const avail = futureAvailability.find((a) => a.date === firstOption.value);
    generateTimeSlots(
      avail?.slots || [],
      bookedAppointments,
      firstOption.value
    );
  }

  new bootstrap.Modal(document.getElementById("appointmentModal")).show();
}

/* Generate time slots (divided by 30 minutes) */
function generateTimeSlots(slots, bookedAppointments, date) {
  const apptSlot = document.getElementById("apptSlot");
  apptSlot.innerHTML = "";
  selectedSlot = null; // reset selection

  if (!slots.length) {
    apptSlot.innerHTML =
      "<p class='text-muted'>No available slots for this date.</p>";
    return;
  }

  slots.forEach((slot) => {
    let startTime = parseTime(slot.start);
    const endTime = parseTime(slot.end);

    while (startTime < endTime) {
      const nextTime = new Date(startTime.getTime() + 30 * 60000); // +30 minutes
      const slotLabel = `${formatTime(startTime)} - ${formatTime(nextTime)}`;

      // Check if this 30-min slot is already booked
      const isBooked = bookedAppointments.some(
        (a) => a.date === date && a.slot === slotLabel
      );

      const slotBtn = document.createElement("button");
      slotBtn.className = "btn btn-sm me-2 mb-2";
      slotBtn.textContent = slotLabel;

      if (isBooked) {
        slotBtn.disabled = true;
        slotBtn.classList.add("btn-secondary"); // disabled style
      } else {
        slotBtn.classList.add("btn-outline-primary");
        slotBtn.addEventListener("click", () => {
          selectedSlot = slotLabel;

          // Remove highlight from all buttons
          apptSlot.querySelectorAll("button").forEach((b) => {
            b.classList.remove("btn-primary", "text-white");
            if (!b.disabled) b.classList.add("btn-outline-primary");
          });

          // Highlight selected button with white text
          slotBtn.classList.remove("btn-outline-primary");
          slotBtn.classList.add("btn-primary", "text-white");
        });
      }

      apptSlot.appendChild(slotBtn);

      startTime = nextTime;
    }
  });

  // If no available slots at all
  if (!apptSlot.querySelector("button:not(:disabled)")) {
    apptSlot.innerHTML =
      "<p class='text-muted'>All slots for this date are already booked.</p>";
  }
}

/* Helper: parse "HH:MM" string → Date object (today's date) */
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/* Helper: format Date object → "HH:MM" */
function formatTime(date) {
  return date.toTimeString().slice(0, 5);
}

// Track selected 30-min slot
let selectedSlot = null;

// Confirm Booking Button
document.getElementById("confirmBookingBtn").onclick = async () => {
  if (!selectedSlot) return alert("Please select a time slot!");

  const selectedDate = document.getElementById("apptDay").value;
  if (!selectedDate) return alert("Please select a date!");

  const reason = document.getElementById("appointmentReason").value.trim();
  if (!reason) return alert("Please provide a reason for your appointment!");

  try {
    // Get current user info
    const userSnap = await getDoc(doc(db, "users", currentUserId));
    const userData = userSnap.data();

    // Save appointment
    await addDoc(collection(db, "appointments"), {
      staffId: selectedStaffId,
      staffName: selectedStaffName,
      patientId: currentUserId,
      patientName: `${userData.lastName}, ${userData.firstName}`,
      date: selectedDate,
      slot: selectedSlot,
      reason: reason, // <--- Save the reason
      status: "Pending",
      createdAt: new Date(), // client-side timestamp
    });

    alert(`Appointment booked: ${selectedDate} (${selectedSlot})`);
    bootstrap.Modal.getInstance(
      document.getElementById("appointmentModal")
    ).hide();

    // Clear reason for next booking
    document.getElementById("appointmentReason").value = "";

    // Refresh staff cards to reflect booked slots
    loadStaff();
  } catch (err) {
    console.error("Error booking appointment:", err);
    alert("Failed to book appointment. See console.");
  }
};
/* -----------------------------------------------
   Load Patient Appointments
----------------------------------------------- */
async function loadAppointments() {
  try {
    const appointmentsList = document.getElementById("appointments-list");
    const appointmentsCount = document.getElementById("appointments-count");

    appointmentsList.innerHTML = "";
    appointmentsCount.textContent = "0";

    if (!currentUserId) return;

    // Fetch appointments for this patient
    const q = query(
      collection(db, "appointments"),
      where("patientId", "==", currentUserId)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      appointmentsList.innerHTML = `<p class="text-muted">No appointments found.</p>`;
      return;
    }

    // Collect appointments and sort by date (client-side)
    let appointments = [];
    snap.forEach((docSnap) => appointments.push({ id: docSnap.id, ...docSnap.data() }));
    const statusPriority = {
      Accepted: 1,
      Pending: 2,
      Cancelled: 3,
      Finished: 3,
      "No Show": 3,
    };

    appointments.sort((a, b) => {
      const aPriority = statusPriority[a.status] ?? 4;
      const bPriority = statusPriority[b.status] ?? 4;

      if (aPriority !== bPriority) {
        return aPriority - bPriority; // sort by priority
      }

      // Same priority → sort by date
      return a.date.localeCompare(b.date);
    });

    let count = 0;
    const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

    appointments.forEach((appt) => {
      count++;

      const isPast = appt.date < todayStr;

      const colDiv = document.createElement("div");
      colDiv.className = "col-12 mb-2";

      colDiv.innerHTML = `
  <div class="card p-3 border shadow-sm position-relative">

    <!-- CANCEL BUTTON TOP RIGHT -->
    ${
      !isPast && (appt.status === "Pending" || appt.status === "Accepted")
        ? `<button class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 cancel-btn">
             Cancel
           </button>`
        : ``
    }

    <div class="row align-items-center g-2">
      <!-- DETAILS -->
      <div class="col-12">
        <strong class="d-block">${appt.staffName}</strong>

        <small class="text-secondary d-block">
          ${formatDateLabel(appt.date)} (${appt.slot})
        </small>

        <small class="text-muted d-block">
          Reason: ${appt.reason}
        </small>

        <span class="badge mt-2 ${
          appt.status === "Finished" ? "bg-success" :
          appt.status === "No Show" ? "bg-warning text-dark" :
          appt.status === "Accepted" ? "bg-primary" :
          appt.status === "Cancelled" ? "bg-danger" :
          "bg-secondary"
        }">
          ${appt.status ?? "Pending"}
        </span>
      </div>
    </div>
  </div>
`;


      const cancelBtn = colDiv.querySelector(".cancel-btn");

      if (cancelBtn) {
        cancelBtn.addEventListener("click", async () => {
          try {
            await updateDoc(doc(db, "appointments", appt.id), {
              status: "Cancelled",
            });
            loadAppointments(); // refresh list
          } catch (err) {
            console.error(err);
            alert("Failed to cancel appointment");
          }
        });
      }

      appointmentsList.appendChild(colDiv);
    });

    appointmentsCount.textContent = count;
  } catch (err) {
    console.error("Error loading appointments:", err);
    const appointmentsList = document.getElementById("appointments-list");
    appointmentsList.innerHTML = `<p class="text-danger">Failed to load appointments.</p>`;
  }
}

// Call this after user is loaded
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserId = user.uid;
    loadAppointments();
  }
});

// Also call loadAppointments() after a new appointment is booked
