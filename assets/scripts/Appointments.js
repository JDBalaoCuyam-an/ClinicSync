import { db, currentUserName } from "../../firebaseconfig.js";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  writeBatch,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

(function () {
  emailjs.init("e30TrJHG9V9Mp1D-_");
})();

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

function formatTimeRange(timeRange) {
  const [start, end] = timeRange.split(" - ");
  return `${formatTo12Hour(start)} – ${formatTo12Hour(end)}`;
}

function formatTo12Hour(time) {
  let [hours, minutes] = time.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12; // convert 0 → 12
  return `${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short", // This gives the abbreviated month name (Jan, Feb, etc.)
    day: "numeric",
    year: "numeric",
  });
}

function formatTime12(date) {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12; // convert 0 -> 12
  return `${hours}:${minutes} ${ampm}`;
}
/* ===================================== */
/*            STAFF LIST                 */
/* ===================================== */
let selectedStaffId = null;

async function loadStaff() {
  try {
    const staffList = document.getElementById("staffList");
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
      const role = data.user_type;
      const doctorType = data.doctor_type ?? null;
      const availability = data.availability || [];

      // Availability badges - only date, weekday, and slots
      const availabilityHtml = availability.length
        ? availability
            .map((a) => {
              let slotsHtml;
              if (a.slots.length > 1) {
                // multiple slots → line break for each
                slotsHtml = a.slots
                  .map(
                    (slot) =>
                      `${formatTimeFromString(
                        slot.start
                      )} - ${formatTimeFromString(slot.end)}`
                  )
                  .join("<br>");
              } else {
                // single slot → just show inline
                slotsHtml = a.slots
                  .map(
                    (slot) =>
                      `${formatTimeFromString(
                        slot.start
                      )} - ${formatTimeFromString(slot.end)}`
                  )
                  .join("");
              }
              return `<span class="badge bg-success me-1 mb-1 d-block">${formatDateLabel(
                a.date
              )} (${a.weekday}): ${slotsHtml}</span>`;
            })
            .join("")
        : '<p class="m-0 mt-2 text-muted">(No availability set)</p>';

      const card = document.createElement("div");
      card.className = "card mb-3 shadow-sm staff-card w-100";

      card.innerHTML = `
        <div class="card-body p-3 d-flex flex-column">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <p class="fw-bold mb-0">${fullName}</p>
            <button class="btn btn-sm btn-primary open-modal-btn">Manage Availability</button>
          </div>

          <p class="text-secondary mb-1">${
            role === "doctor" ? "Doctor" : "Nurse"
          }</p>

          ${
            role === "doctor"
              ? `<p class="text-primary mb-2">Specialization: ${
                  doctorType ?? "(none yet)"
                }</p>`
              : ""
          }

          <!--<div class="availability-container">${availabilityHtml}</div> -->
        </div>
      `;

      // Button triggers the modal
      card.querySelector(".open-modal-btn").addEventListener("click", () => {
        manageAvailability(id, fullName);
      });

      staffList.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading staff:", err);
  }
}

loadStaff();

/* ===================================== */
/*        AVAILABILITY MODAL LOGIC       */
/* ===================================== */
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();
let selectedDate = null;

function manageAvailability(id, fullName) {
  selectedStaffId = id;

  document.getElementById(
    "calendarTitle"
  ).textContent = `Availability — ${fullName}`;

  renderCalendar(calYear, calMonth);

  new bootstrap.Modal(document.getElementById("availabilityModal")).show();

  // Load current availability into the modal list
  renderModalAvailability(id);
}

function renderCalendar(year, month) {
  const grid = document.getElementById("calendarGrid");
  const label = document.getElementById("monthLabel");

  grid.innerHTML = "";

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  label.textContent = `${months[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((d) => {
    const h = document.createElement("div");
    h.className = "calendar-header";
    h.textContent = d;
    grid.appendChild(h);
  });

  // Empty slots for first day offset
  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(document.createElement("div"));
  }

  // Load staff availability for highlighting
  let staffAvailability = [];
  if (selectedStaffId) {
    getDoc(doc(db, "users", selectedStaffId)).then((docSnap) => {
      if (docSnap.exists()) {
        staffAvailability = docSnap.data().availability || [];
        highlightCalendarDates(); // call after availability is loaded
      }
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const day = document.createElement("div");
    day.className = "calendar-day";
    day.textContent = d;

    // Build local YYYY-MM-DD string
    const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${d
      .toString()
      .padStart(2, "0")}`;
    const dayDate = new Date(year, month, d);

    // Disable past days
    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize to midnight
    if (dayDate < today) {
      day.classList.add("disabled-day");
    } else {
      day.onclick = () => handleDateClick(year, month, d);
    }

    // Check if this date has availability and add badge
    const hasAvailability = staffAvailability.some((a) => a.date === dateStr);
    if (hasAvailability) {
      const badge = document.createElement("span");
      badge.className = "availability-badge";
      badge.title = "Has availability";
      day.appendChild(badge);
    }

    grid.appendChild(day);
  }

  // Highlight function for future dynamic updates
  function highlightCalendarDates() {
    const days = grid.querySelectorAll(".calendar-day");
    days.forEach((dayDiv) => {
      const dayNum = parseInt(dayDiv.textContent);
      const dateStr = `${year}-${(month + 1)
        .toString()
        .padStart(2, "0")}-${dayNum.toString().padStart(2, "0")}`;
      const hasAvailability = staffAvailability.some((a) => a.date === dateStr);

      // Remove existing badge if any
      const existingBadge = dayDiv.querySelector(".availability-badge");
      if (existingBadge) existingBadge.remove();

      if (hasAvailability) {
        const badge = document.createElement("span");
        badge.className = "availability-badge";
        badge.title = "Has availability";
        dayDiv.appendChild(badge);
      }
    });
  }
}

document.getElementById("prevMonth").onclick = () => {
  calMonth--;
  if (calMonth < 0) {
    calMonth = 11;
    calYear--;
  }
  renderCalendar(calYear, calMonth);
};

document.getElementById("nextMonth").onclick = () => {
  calMonth++;
  if (calMonth > 11) {
    calMonth = 0;
    calYear++;
  }
  renderCalendar(calYear, calMonth);
};
document.getElementById("backToCalendar").onclick = () => {
  // Close step 2
  bootstrap.Modal.getInstance(
    document.getElementById("availabilityStep2")
  ).hide();

  // Reopen calendar
  new bootstrap.Modal(document.getElementById("availabilityModal")).show();
};

async function handleDateClick(year, month, day) {
  selectedDate = new Date(year, month, day);

  const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;

  // 🔁 Load existing availability (if any)
  timeSlots = [];

  const staffRef = doc(db, "users", selectedStaffId);
  const docSnap = await getDoc(staffRef);

  if (docSnap.exists()) {
    const availability = docSnap.data().availability || [];
    const existing = availability.find((a) => a.date === dateStr);

    if (existing) {
      // 👇 Load existing slots so we ADD, not duplicate
      timeSlots = existing.slots.map((s) => ({
        start: s.start,
        end: s.end,
      }));
    }
  }

  // Update selected date text
  document.getElementById("selectedDateText").textContent =
    selectedDate.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // Close calendar modal
  bootstrap.Modal.getInstance(
    document.getElementById("availabilityModal")
  ).hide();

  // Open step 2
  new bootstrap.Modal(document.getElementById("availabilityStep2")).show();

  // 🔄 Re-render existing slots (important)
  renderTimeSlots();

  setDefaultRepeatUntil();
}

function renderModalAvailability(staffId) {
  const staffRef = doc(db, "users", staffId);
  getDoc(staffRef).then((docSnap) => {
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    const availability = data.availability || [];
    const list = document.getElementById("modalAvailabilityList");
    list.innerHTML = "";

    if (!availability.length) {
      const li = document.createElement("li");
      li.className = "list-group-item text-muted text-center";
      li.textContent = "No availability set";
      list.appendChild(li);
      return;
    }

    availability.forEach((a) => {
      const slotsHtml = a.slots
        .map(
          (slot) =>
            `${formatTimeFromString(slot.start)} - ${formatTimeFromString(
              slot.end
            )}`
        )
        .join("<br>");
      const li = document.createElement("li");
      li.className =
        "list-group-item d-flex justify-content-between align-items-start flex-column";
      li.innerHTML = `
        <div><b>${formatDateLabel(a.date)} (${
        a.weekday
      })</b>:<br>${slotsHtml}</div>
        <button class="btn btn-sm btn-outline-danger mt-2 remove-btn">Remove</button>
      `;

      // Remove availability
      li.querySelector(".remove-btn").onclick = async () => {
        try {
          await updateDoc(staffRef, {
            availability: arrayRemove(a),
          });
          li.remove(); // remove from UI
          loadStaff(); // refresh staff cards
        } catch (err) {
          console.error("Error removing availability:", err);
          alert("Failed to remove availability. See console.");
        }
      };

      list.appendChild(li);
    });
  });
}

let timeSlots = [];

document.getElementById("addTimeSlot").onclick = () => {
  timeSlots.push({ start: "", end: "" });
  renderTimeSlots();
};

function addMinutes(time, mins) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m + mins, 0, 0);
  return d.toTimeString().slice(0, 5);
}

function toMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function isOverlapping(start, end, currentIndex) {
  const s = toMinutes(start);
  const e = toMinutes(end);

  return timeSlots.some((slot, i) => {
    if (i === currentIndex || !slot.start || !slot.end) return false;

    const ss = toMinutes(slot.start);
    const ee = toMinutes(slot.end);

    return s < ee && e > ss; // overlap check
  });
}

function renderTimeSlots() {
  const container = document.getElementById("timeSlotsContainer");
  container.innerHTML = "";

  timeSlots.forEach((slot, index) => {
    const row = document.createElement("div");
    row.className = "time-slot";

    row.innerHTML = `
      <input type="time" value="${slot.start}">
      <span>to</span>
      <input type="time" value="${slot.end}" readonly>
      <button class="btn btn-sm btn-outline-danger">✕</button>
    `;

    const [startInput, endInput, removeBtn] =
      row.querySelectorAll("input, button");

    startInput.onchange = (e) => {
      const start = e.target.value;
      const end = addMinutes(start, 30);

      if (isOverlapping(start, end, index)) {
        alert("This time overlaps with an existing slot.");
        e.target.value = "";
        return;
      }

      timeSlots[index].start = start;
      timeSlots[index].end = end;
      endInput.value = end;
    };

    removeBtn.onclick = () => {
      timeSlots.splice(index, 1);
      renderTimeSlots();
    };

    container.appendChild(row);
  });
}

const repeatType = document.getElementById("repeatType");
const repeatUntilContainer = document.getElementById("repeatUntilContainer");
const repeatUntilInput = document.getElementById("repeatUntilDate");
const instancesContainer = document.getElementById("repeatInstancesContainer");
const instancesList = document.getElementById("repeatInstancesList");
repeatType.onchange = () => {
  if (repeatType.value === "none") {
    repeatUntilContainer.style.display = "none";
  } else {
    repeatUntilContainer.style.display = "block";
    setDefaultRepeatUntil(); // ensures default 30 days
  }
};

function getAvailabilityData() {
  const repeat = repeatType.value; // none, daily, weekly
  const repeatUntil = document.getElementById("repeatUntilDate").value || null;

  const slots = timeSlots.map((slot) => ({
    start: slot.start,
    end: slot.end,
  }));

  const weekday = selectedDate.toLocaleDateString("en-US", { weekday: "long" });

  return {
    date: selectedDate.toISOString().split("T")[0],
    weekday: weekday,
    slots: slots,
    repeat: repeat,
    repeatUntil: repeatUntil,
  };
}

document.getElementById("saveAvailabilityBtn").onclick = () => {
  const availabilityData = getAvailabilityData();
  console.log(availabilityData);

  // Now you can save it to Firestore
};

function updateRepeatInstances() {
  const repeat = repeatType.value;
  const repeatUntil = repeatUntilInput.value;

  instancesList.innerHTML = "";

  if (repeat === "none" || !repeatUntil) {
    instancesContainer.style.display = "none";
    return;
  }

  instancesContainer.style.display = "block";

  const startDate = new Date(selectedDate); // selectedDate must be set
  const endDate = new Date(repeatUntil);

  let current = new Date(startDate);
  const generatedDates = []; // track the instances

  while (current <= endDate) {
    let addInstance = false;

    if (repeat === "daily") {
      addInstance = true;
    } else if (repeat === "weekly" && current.getDay() === startDate.getDay()) {
      addInstance = true;
    }

    if (addInstance) {
      const li = document.createElement("li");
      li.className =
        "list-group-item d-flex justify-content-between align-items-center py-1";

      const dateText = document.createElement("span");
      dateText.textContent = current.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const removeBtn = document.createElement("button");
      removeBtn.className = "btn btn-sm btn-outline-danger";
      removeBtn.textContent = "Remove";

      removeBtn.onclick = () => {
        li.remove();
        // Remove from generatedDates array
        const idx = generatedDates.indexOf(current.toISOString().split("T")[0]);
        if (idx > -1) generatedDates.splice(idx, 1);
      };

      li.appendChild(dateText);
      li.appendChild(removeBtn);

      instancesList.appendChild(li);

      generatedDates.push(current.toISOString().split("T")[0]);
    }

    // Move to next day
    current.setDate(current.getDate() + 1);
  }
}

function setDefaultRepeatUntil() {
  if (!selectedDate) return;

  // 30 days from selected date
  const repeatUntilDate = new Date(
    selectedDate.getTime() + 30 * 24 * 60 * 60 * 1000
  );

  repeatUntilInput.value = repeatUntilDate.toISOString().split("T")[0];
  repeatUntilInput.min = new Date(
    selectedDate.getTime() + 1 * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .split("T")[0];

  updateRepeatInstances();
}

// Update when Repeat or Repeat Until changes
repeatType.onchange = () => {
  if (repeatType.value === "none") {
    repeatUntilContainer.style.display = "none";
  } else {
    repeatUntilContainer.style.display = "block";
    const minDate = new Date(selectedDate.getTime() + 86400000);
    repeatUntilInput.min = minDate.toISOString().split("T")[0];
  }
  updateRepeatInstances();
};

repeatUntilInput.onchange = () => {
  updateRepeatInstances();
};
async function saveAvailability(staffId) {
  if (!selectedDate) return alert("Select a date first!");

  const slots = timeSlots.filter((s) => s.start && s.end);
  if (!slots.length) return alert("Add at least one time slot!");

  const repeat = repeatType.value;
  const repeatUntil = repeatUntilInput.value
    ? new Date(repeatUntilInput.value)
    : null;

  let datesToSave = [];

  if (repeat === "none" || !repeatUntil) {
    datesToSave.push(new Date(selectedDate));
  } else {
    let current = new Date(selectedDate);
    while (current <= repeatUntil) {
      if (repeat === "daily") {
        datesToSave.push(new Date(current));
      }
      if (repeat === "weekly" && current.getDay() === selectedDate.getDay()) {
        datesToSave.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
  }

  try {
    const staffRef = doc(db, "users", staffId);
    const docSnap = await getDoc(staffRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    const availability = data.availability || [];

    let newAvailabilitiesCount = 0;

    datesToSave.forEach((date) => {
      const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
      const weekday = date.toLocaleDateString("en-PH", { weekday: "long" });

      const existingIndex = availability.findIndex((a) => a.date === dateStr);

      if (existingIndex !== -1) {
        availability[existingIndex].slots.push(...slots);
        newAvailabilitiesCount += slots.length;
      } else {
        availability.push({
          date: dateStr,
          weekday,
          slots: [...slots],
          repeat,
          repeatUntil: repeatUntil
            ? `${repeatUntil.getFullYear()}-${(repeatUntil.getMonth() + 1)
                .toString()
                .padStart(2, "0")}-${repeatUntil
                .getDate()
                .toString()
                .padStart(2, "0")}`
            : null,
        });
        newAvailabilitiesCount += slots.length;
      }
    });

    await updateDoc(staffRef, {
      availability,
      lastUpdated: serverTimestamp(),
    });

    // 🔹 Audit trail for saving availability
    await addDoc(collection(db, "AdminAuditTrail"), {
      message: `${
        currentUserName || "Unknown User"
      } added ${newAvailabilitiesCount} new availabilities for ${
        data.lastName
      }, ${data.firstName}`,
      userId: currentUserName || null,
      timestamp: new Date(),
      section: "ClinicStaffActions",
    });

    alert("Availability saved successfully!");
    bootstrap.Modal.getInstance(
      document.getElementById("availabilityStep2")
    ).hide();
  } catch (err) {
    console.error("Error saving availability:", err);
    alert("Failed to save availability. See console.");
  }
}

// Save button
document.getElementById("saveAvailabilityBtn").onclick = () => {
  saveAvailability(selectedStaffId);
  loadStaff(); // refresh staff cards
};

/* ===================================== */
/*        APPOINTMENTS LOGIC            */
/* ===================================== */
async function loadClinicAppointments() {
  try {
    const container = document.getElementById("appointments-container");
    container.innerHTML = `<p class="text-muted text-center">Loading appointments...</p>`;

    const q = query(
      collection(db, "appointments"),
      where("status", "==", "Pending")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      container.innerHTML = `<p class="text-muted text-center">No appointments found.</p>`;
      return;
    }

    // Collect + sort by date
    let appointments = [];
    snap.forEach((docSnap) => {
      appointments.push({ id: docSnap.id, ...docSnap.data() });
    });

    appointments.sort((a, b) => a.date.localeCompare(b.date));

    // Group by date
    const grouped = {};
    appointments.forEach((appt) => {
      if (!grouped[appt.date]) grouped[appt.date] = [];
      grouped[appt.date].push(appt);
    });

    container.innerHTML = "";

    const todayStr = new Date().toISOString().slice(0, 10);

    Object.keys(grouped).forEach((date) => {
      const isPast = date < todayStr;

      const daySection = document.createElement("div");
      daySection.className = "mb-4";

      daySection.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h5 class="fw-bold mb-0">
            ${formatDateLabel(date)}
          </h5>
          <span class="badge ${isPast ? "bg-secondary" : "bg-success"}">
            ${isPast ? "Past" : "Upcoming"}
          </span>
        </div>

        <div class="list-group"></div>
      `;

      const listGroup = daySection.querySelector(".list-group");

      grouped[date].forEach((appt) => {
        const item = document.createElement("div");
        item.className = "card mb-3 shadow-sm";

        item.innerHTML = `
  <div class="card-body d-flex flex-column">
    <div class="d-flex justify-content-between align-items-start mb-2">
      <h5 class="card-title mb-0">${appt.patientName}</h5>
      <span class="badge bg-primary">
        ${appt.status ?? "scheduled"}
      </span>
    </div>

    <p class="mb-1">
      <i class="bi bi-clock"></i> ${appt.slot}
    </p>

    <p class="mb-1">
      <strong>Staff:</strong> ${appt.staffName}
    </p>

    <p class="mb-3 text-muted">
      <small><strong>Reason:</strong> ${appt.reason}</small>
    </p>

    <div class="mt-auto d-flex justify-content-end gap-2">
      <button class="btn btn-success btn-sm accept-btn">
        Accept
      </button>
      <button class="btn btn-warning btn-sm reschedule-btn">
        Reschedule
      </button>
    </div>
  </div>
`;
        const acceptBtn = item.querySelector(".accept-btn");

        acceptBtn.addEventListener("click", async () => {
          const confirmed = confirm(
            `Are you sure you want to ACCEPT this appointment for ${
              appt.patientName || "the patient"
            }?\n\n` +
              `Date: ${formatDateLabel(appt.date)}\n` +
              `Time: ${formatTimeRange(appt.slot)}\n\n` +
              `This will notify the patient via email.`
          );
          if (!confirmed) return;

          acceptBtn.disabled = true;
          acceptBtn.innerText = "Accepting...";

          try {
            // 1️⃣ Update appointment status
            await updateDoc(doc(db, "appointments", appt.id), {
              status: "Accepted",
            });

            // 2️⃣ Refresh UI
            loadClinicAppointments();
            item.remove();

            // 3️⃣ Fetch patient info
            const userDoc = await getDoc(doc(db, "users", appt.patientId));
            if (!userDoc.exists()) throw new Error("Patient user not found");
            const userData = userDoc.data();
            const patientEmail = userData.email;
            const patientName = `${userData.lastName}, ${userData.firstName}`;

            // 4️⃣ Send EmailJS notification
            const emailParams = {
              patient_name: patientName,
              date: formatDateLabel(appt.date),
              slot: formatTimeRange(appt.slot),
              status: "Accepted",
              to_email: patientEmail,
              name: "KCP ClinicSync",
            };
            await emailjs.send(
              "service_rfw77oo",
              "template_n37ttab",
              emailParams
            );

            // 5️⃣ Audit trail
            await addDoc(collection(db, "AdminAuditTrail"), {
              message: `${
                currentUserName || "Unknown User"
              } accepted appointment for ${patientName} on ${formatDateLabel(
                appt.date
              )} at ${formatTimeRange(appt.slot)}`,
              userId: currentUserName || null,
              timestamp: new Date(),
              section: "ClinicStaffActions",
            });

            console.log("Appointment accepted");
          } catch (err) {
            console.error("Failed to accept appointment:", err);
            alert("Failed to accept appointment. Please try again.");
          } finally {
            acceptBtn.disabled = false;
            acceptBtn.innerText = "Accept";
            loadAcceptedAppointments();
          }
        });

        // ✅ Reschedule Button
        const rescheduleBtn = item.querySelector(".reschedule-btn");
        rescheduleBtn.addEventListener("click", () => {
          // Bind the appointment object to the modal
          openRescheduleModal(appt);
        });
        listGroup.appendChild(item);
      });

      container.appendChild(daySection);
    });
  } catch (err) {
    console.error("Error loading clinic appointments:", err);
    document.getElementById(
      "appointments-container"
    ).innerHTML = `<p class="text-danger text-center">Failed to load appointments.</p>`;
  }
}
loadClinicAppointments();

let rescheduleSelectedSlot = null;

async function openRescheduleModal(appt) {
  const staffId = appt.staffId;
  const apptId = appt.id;

  document.getElementById("rescheduleApptId").value = apptId;
  document.getElementById("rescheduleStaffId").value = staffId;

  const daySelect = document.getElementById("rescheduleDay");
  const slotContainer = document.getElementById("rescheduleSlot");

  daySelect.innerHTML = "";
  slotContainer.innerHTML = "";
  rescheduleSelectedSlot = null;

  // Fetch staff availability
  const staffSnap = await getDoc(doc(db, "users", staffId));
  if (!staffSnap.exists()) return alert("Staff not found");

  const availability = staffSnap.data().availability || [];

  // Fetch existing appointments for this staff
  const snap = await getDocs(
    query(collection(db, "appointments"), where("staffId", "==", staffId))
  );
  const bookedAppointments = [];
  snap.forEach((d) => bookedAppointments.push(d.data()));

  const today = new Date();
  const futureAvailability = availability.filter(
    (a) => new Date(a.date) >= today
  );

  // Populate date dropdown
  futureAvailability.forEach((a) => {
    if (a.slots && a.slots.length) {
      const opt = document.createElement("option");
      opt.value = a.date;
      opt.textContent = `${formatDateLabel(a.date)} (${a.weekday})`;
      daySelect.appendChild(opt);
    }
  });
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
  function generateSlotsForDate(selectedDate) {
    slotContainer.innerHTML = "";
    rescheduleSelectedSlot = null;

    const avail = futureAvailability.find((a) => a.date === selectedDate);
    if (!avail || !avail.slots?.length) {
      slotContainer.innerHTML =
        "<p class='text-muted'>No slots for this date.</p>";
      return;
    }

    avail.slots.forEach((slot) => {
      let startTime = parseTime(slot.start);
      const endTime = parseTime(slot.end);

      while (startTime < endTime) {
        const nextTime = new Date(startTime.getTime() + 30 * 60000);

        // Display label (AM/PM)
        const displayLabel = `${formatTime12(startTime)} - ${formatTime12(
          nextTime
        )}`;

        // Value for comparison and saving (24-hour)
        const valueLabel = `${formatTime(startTime)} - ${formatTime(nextTime)}`;

        // Check if this slot is already booked (compare using 24-hour format)
        const isBooked = bookedAppointments.some(
          (a) => a.date === selectedDate && a.slot === valueLabel
        );

        const btn = document.createElement("button");
        btn.className = "btn btn-sm me-2 mb-2";
        btn.textContent = displayLabel;

        if (isBooked) {
          btn.disabled = true;
          btn.classList.add("btn-secondary");
        } else {
          btn.classList.add("btn-outline-primary");
          btn.addEventListener("click", () => {
            rescheduleSelectedSlot = valueLabel; // save 24-hour value for Firestore

            // Highlight selected button
            slotContainer.querySelectorAll("button").forEach((b) => {
              b.classList.remove("btn-primary", "text-white");
              if (!b.disabled) b.classList.add("btn-outline-primary");
            });
            btn.classList.remove("btn-outline-primary");
            btn.classList.add("btn-primary", "text-white");
          });
        }

        slotContainer.appendChild(btn);
        startTime = nextTime;
      }
    });

    if (!slotContainer.querySelector("button:not(:disabled)")) {
      slotContainer.innerHTML =
        "<p class='text-muted'>All slots for this date are booked.</p>";
    }
  }

  // On date change
  daySelect.addEventListener("change", () =>
    generateSlotsForDate(daySelect.value)
  );

  // Load first date's slots
  if (daySelect.options.length > 0) {
    daySelect.value = daySelect.options[0].value;
    generateSlotsForDate(daySelect.value);
  }

  new bootstrap.Modal(document.getElementById("rescheduleModal")).show();
}

document
  .getElementById("rescheduleSaveBtn")
  .addEventListener("click", async () => {
    const apptId = document.getElementById("rescheduleApptId").value;
    const daySelect = document.getElementById("rescheduleDay");
    const newDate = daySelect.value;
    const newSlot = rescheduleSelectedSlot;

    if (!newDate || !newSlot) {
      return alert("Please select a date and slot");
    }

    const confirmed = confirm(
      `Are you sure you want to RESCHEDULE this appointment?\n\n` +
        `New Date: ${formatDateLabel(newDate)}\n` +
        `New Time: ${formatTimeRange(newSlot)}\n\n` +
        `The appointment status will be set to "Accepted",\n` +
        `and the patient will be notified via email.`
    );
    if (!confirmed) return;

    const saveBtn = document.getElementById("rescheduleSaveBtn");
    saveBtn.disabled = true;
    saveBtn.innerText = "Saving...";

    try {
      // 1️⃣ Update appointment
      await updateDoc(doc(db, "appointments", apptId), {
        date: newDate,
        slot: newSlot,
        status: "Accepted",
      });

      // 2️⃣ Fetch appointment & patient info
      const apptSnap = await getDoc(doc(db, "appointments", apptId));
      if (!apptSnap.exists()) throw new Error("Appointment not found");
      const apptData = apptSnap.data();

      const userSnap = await getDoc(doc(db, "users", apptData.patientId));
      if (!userSnap.exists()) throw new Error("Patient not found");
      const userData = userSnap.data();
      const patientEmail = userData.email;
      const patientName = `${userData.lastName}, ${userData.firstName}`;

      // 3️⃣ Send EmailJS notification
      const emailParams = {
        patient_name: patientName,
        date: formatDateLabel(newDate),
        slot: formatTimeRange(newSlot),
        status: "Accepted (Rescheduled)",
        to_email: patientEmail,
        name: "KCP ClinicSync",
      };
      await emailjs.send("service_rfw77oo", "template_tpgmqni", emailParams);

      // 4️⃣ Audit trail
      await addDoc(collection(db, "AdminAuditTrail"), {
        message: `${
          currentUserName || "Unknown User"
        } rescheduled appointment for ${patientName} to ${formatDateLabel(
          newDate
        )} at ${formatTimeRange(newSlot)}`,
        userId: currentUserName || null,
        timestamp: new Date(),
        section: "ClinicStaffActions",
      });

      // 5️⃣ Close modal & refresh
      bootstrap.Modal.getInstance(
        document.getElementById("rescheduleModal")
      ).hide();
      loadClinicAppointments();
      loadAcceptedAppointments();

      alert("Appointment successfully rescheduled and patient notified!");
    } catch (err) {
      console.error("Failed to reschedule:", err);
      alert("Failed to reschedule appointment. Please try again.");
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerText = "Save Changes";
    }
  });

async function loadAcceptedAppointments() {
  try {
    const container = document.getElementById(
      "accepted-appointments-container"
    );

    container.innerHTML = `
      <p class="text-center text-muted">Loading accepted appointments...</p>
    `;

    const q = query(
      collection(db, "appointments"),
      where("status", "==", "Accepted")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      container.innerHTML = `
        <p class="text-center text-muted">No accepted appointments yet</p>
      `;
      return;
    }

    container.innerHTML = "";

    snap.forEach((docSnap) => {
      const appt = { id: docSnap.id, ...docSnap.data() };

      const col = document.createElement("div");
      col.className = "col-12 col-md-6";

      col.innerHTML = `
  <div class="card shadow-sm h-100 border-primary">
    <div class="card-body d-flex flex-column">
      <div class="d-flex justify-content-between mb-2">
        <h5 class="mb-0">${appt.patientName}</h5>
        <span class="badge bg-success">Accepted</span>
      </div>

      <p class="mb-1">
        <i class="bi bi-calendar-event"></i>
        ${formatDateLabel(appt.date)}
      </p>

      <p class="mb-1">
        <i class="bi bi-clock"></i>
        ${appt.slot}
      </p>

      <p class="mb-2">
        <strong>Staff:</strong> ${appt.staffName}
      </p>

      <p class="text-muted mb-3">
        <small><strong>Reason:</strong> ${appt.reason}</small>
      </p>

      <div class="mt-auto d-flex gap-2">
        <button class="btn btn-success btn-sm done-btn w-100">
          Done
        </button>
        <button class="btn btn-warning btn-sm no-show-btn w-100">
          No Show
        </button>
      </div>
    </div>
  </div>
`;
      const doneBtn = col.querySelector(".done-btn");
      const noShowBtn = col.querySelector(".no-show-btn");

      doneBtn.addEventListener("click", async () => {
        const confirmed = confirm(
          `Are you sure you want to mark this appointment as FINISHED?\n\n` +
            `Patient: ${appt.patientName || "Unknown"}\n` +
            `Date: ${formatDateLabel(appt.date)}\n` +
            `Time: ${formatTimeRange(appt.slot)}\n\n` +
            `This action cannot be undone easily.`
        );
        if (!confirmed) return;

        try {
          doneBtn.disabled = true;
          doneBtn.innerText = "Saving...";

          await updateDoc(doc(db, "appointments", appt.id), {
            status: "Finished",
          });

          // 🔹 Audit log
          await addDoc(collection(db, "AdminAuditTrail"), {
            message: `${
              currentUserName || "Unknown User"
            } marked appointment for ${
              appt.patientName || "Unknown"
            } on ${formatDateLabel(appt.date)} at ${formatTimeRange(
              appt.slot
            )} as FINISHED`,
            userId: currentUserName || null,
            timestamp: new Date(),
            section: "ClinicStaffActions",
          });

          loadFinishedAppointments();
          col.remove();

          alert("Appointment marked as Finished.");
        } catch (err) {
          console.error("Failed to mark as Finished:", err);
          alert("Failed to mark appointment as Finished. Please try again.");
        } finally {
          doneBtn.disabled = false;
          doneBtn.innerText = "Done";
        }
      });

      noShowBtn.addEventListener("click", async () => {
        const confirmed = confirm(
          `Are you sure you want to mark this appointment as NO SHOW?\n\n` +
            `Patient: ${appt.patientName || "Unknown"}\n` +
            `Date: ${formatDateLabel(appt.date)}\n` +
            `Time: ${formatTimeRange(appt.slot)}\n\n` +
            `This action cannot be undone easily.`
        );
        if (!confirmed) return;

        try {
          noShowBtn.disabled = true;
          noShowBtn.innerText = "Saving...";

          await updateDoc(doc(db, "appointments", appt.id), {
            status: "No Show",
          });

          // 🔹 Audit log
          await addDoc(collection(db, "AdminAuditTrail"), {
            message: `${
              currentUserName || "Unknown User"
            } marked appointment for ${
              appt.patientName || "Unknown"
            } on ${formatDateLabel(appt.date)} at ${formatTimeRange(
              appt.slot
            )} as NO SHOW`,
            userId: currentUserName || null,
            timestamp: new Date(),
            section: "ClinicStaffActions",
          });

          loadNoShowAppointments();
          col.remove();

          alert("Appointment marked as No Show.");
        } catch (err) {
          console.error("Failed to mark as No Show:", err);
          alert("Failed to mark appointment as No Show. Please try again.");
        } finally {
          noShowBtn.disabled = false;
          noShowBtn.innerText = "No Show";
        }
      });

      container.appendChild(col);
    });
  } catch (err) {
    console.error("Error loading accepted appointments:", err);
    document.getElementById("accepted-appointments-container").innerHTML = `
      <p class="text-danger text-center">
        Failed to load accepted appointments.
      </p>
    `;
  }
}
loadAcceptedAppointments();

async function loadFinishedAppointments() {
  try {
    const tbody = document.getElementById("finished-appointments-body");
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted p-3">
          Loading...
        </td>
      </tr>
    `;

    const q = query(
      collection(db, "appointments"),
      where("status", "==", "Finished")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted p-3">
            No finished appointments found.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = "";

    snap.forEach((docSnap) => {
      const appt = { id: docSnap.id, ...docSnap.data() };

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${appt.patientName}</td>
        <td>${appt.staffName}</td>
        <td>${formatDateLabel(appt.date)}</td>
        <td>${appt.slot}</td>
        <td>${appt.reason}</td>
      `;

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading finished appointments:", err);
    document.getElementById("finished-appointments-body").innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger p-3">
          Failed to load finished appointments.
        </td>
      </tr>
    `;
  }
}

loadFinishedAppointments();

async function loadNoShowAppointments() {
  try {
    const tbody = document.getElementById("no-show-appointments-body");
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted p-3">
          Loading...
        </td>
      </tr>
    `;

    const q = query(
      collection(db, "appointments"),
      where("status", "==", "No Show")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted p-3">
            No no-show appointments found.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = "";

    snap.forEach((docSnap) => {
      const appt = { id: docSnap.id, ...docSnap.data() };

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${appt.patientName}</td>
        <td>${appt.staffName}</td>
        <td>${formatDateLabel(appt.date)}</td>
        <td>${appt.slot}</td>
        <td>${appt.reason}</td>
      `;

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading no-show appointments:", err);
    document.getElementById("no-show-appointments-body").innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger p-3">
          Failed to load no-show appointments.
        </td>
      </tr>
    `;
  }
}

loadNoShowAppointments();
async function loadCancelledAppointments() {
  try {
    const tbody = document.getElementById("canceled-appointments-body");
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted p-3">
          Loading...
        </td>
      </tr>
    `;

    const q = query(
      collection(db, "appointments"),
      where("status", "==", "Cancelled")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted p-3">
            No cancelled appointments found.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = "";

    snap.forEach((docSnap) => {
      const appt = { id: docSnap.id, ...docSnap.data() };

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${appt.patientName}</td>
        <td>${appt.staffName}</td>
        <td>${formatDateLabel(appt.date)}</td>
        <td>${appt.slot}</td>
        <td>${appt.reason}</td>
      `;

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading cancelled appointments:", err);
    document.getElementById("canceled-appointments-body").innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger p-3">
          Failed to load cancelled appointments.
        </td>
      </tr>
    `;
  }
}
loadCancelledAppointments();
