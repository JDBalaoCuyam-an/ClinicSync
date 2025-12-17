import { db } from "../../firebaseconfig.js";
import {
  collection,
  getDocs,
  getDoc,
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

          <div class="availability-container">${availabilityHtml}</div>
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
const repeatUntilInput = document.getElementById("repeatUntilDate");
const instancesContainer = document.getElementById("repeatInstancesContainer");
const instancesList = document.getElementById("repeatInstancesList");

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

function handleDateClick(year, month, day) {
  selectedDate = new Date(year, month, day);
  timeSlots = []; // reset slots

  document.getElementById("selectedDateText").textContent =
    selectedDate.toLocaleDateString("en-US", {
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

  // Set default repeat until 30 days from selected date
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
function renderTimeSlots() {
  const container = document.getElementById("timeSlotsContainer");
  container.innerHTML = "";

  timeSlots.forEach((slot, index) => {
    const row = document.createElement("div");
    row.className = "time-slot";

    row.innerHTML = `
      <input type="time" value="${slot.start}">
      <span>to</span>
      <input type="time" value="${slot.end}">
      <button class="btn btn-sm btn-outline-danger">✕</button>
    `;

    const [startInput, endInput, removeBtn] =
      row.querySelectorAll("input, button");

    startInput.onchange = (e) => (timeSlots[index].start = e.target.value);
    endInput.onchange = (e) => (timeSlots[index].end = e.target.value);

    removeBtn.onclick = () => {
      timeSlots.splice(index, 1);
      renderTimeSlots();
    };

    container.appendChild(row);
  });
}

const repeatType = document.getElementById("repeatType");
const repeatUntilContainer = document.getElementById("repeatUntilContainer");

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

  while (current <= endDate) {
    if (repeat === "daily") {
      // daily: add every day
      const li = document.createElement("li");
      li.className = "list-group-item py-1";
      li.textContent = current.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      instancesList.appendChild(li);
      current.setDate(current.getDate() + 1);
    } else if (repeat === "weekly") {
      // weekly: only same weekday
      if (current.getDay() === startDate.getDay()) {
        const li = document.createElement("li");
        li.className = "list-group-item py-1";
        li.textContent = current.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        instancesList.appendChild(li);
      }
      current.setDate(current.getDate() + 1);
    }
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
        current.setDate(current.getDate() + 1);
      } else if (repeat === "weekly") {
        if (current.getDay() === selectedDate.getDay()) {
          datesToSave.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }
    }
  }

  try {
    const staffRef = doc(db, "users", staffId);

    // Map dates to availability objects (use en-PH for weekday)
    const newAvailability = datesToSave.map((date) => ({
      // Use local year/month/day to prevent UTC shift
      date: `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`,
      weekday: date.toLocaleDateString("en-PH", { weekday: "long" }), // PH weekday
      slots: slots,
      repeat: repeat,
      repeatUntil: repeatUntil
        ? `${repeatUntil.getFullYear()}-${(repeatUntil.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${repeatUntil
            .getDate()
            .toString()
            .padStart(2, "0")}`
        : null,
    }));

    // Add new availability using arrayUnion
    await updateDoc(staffRef, {
      availability: arrayUnion(...newAvailability),
      lastUpdated: serverTimestamp(), // timestamp separately
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

    const snap = await getDocs(collection(db, "appointments"));

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
