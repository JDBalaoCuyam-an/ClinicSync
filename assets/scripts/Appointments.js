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
  arrayRemove
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

(function () {
  emailjs.init("e30TrJHG9V9Mp1D-_");
})();


function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "long",
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
          slotsHtml = a.slots.map(slot => `${slot.start} - ${slot.end}`).join("<br>");
        } else {
          // single slot → just show inline
          slotsHtml = a.slots.map(slot => `${slot.start} - ${slot.end}`).join("");
        }
        return `<span class="badge bg-success me-1 mb-1 d-block">${formatDateLabel(a.date)} (${a.weekday}): ${slotsHtml}</span>`;
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

          <p class="text-secondary mb-1">${role === "doctor" ? "Doctor" : "Nurse"}</p>

          ${
            role === "doctor"
              ? `<p class="text-primary mb-2">Specialization: ${doctorType ?? "(none yet)"}</p>`
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

  document.getElementById("calendarTitle").textContent =
    `Availability — ${fullName}`;

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
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  label.textContent = `${months[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(d => {
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
    getDoc(doc(db, "users", selectedStaffId)).then(docSnap => {
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
  const dateStr = `${year}-${(month + 1).toString().padStart(2,"0")}-${d.toString().padStart(2,"0")}`;
  const dayDate = new Date(year, month, d);

  // Disable past days
  const today = new Date();
  today.setHours(0,0,0,0); // normalize to midnight
  if (dayDate < today) {
    day.classList.add("disabled-day");
  } else {
    day.onclick = () => handleDateClick(year, month, d);
  }

  // Check if this date has availability and add badge
  const hasAvailability = staffAvailability.some(a => a.date === dateStr);
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
    days.forEach(dayDiv => {
      const dayNum = parseInt(dayDiv.textContent);
      const dateStr = `${year}-${(month + 1).toString().padStart(2,"0")}-${dayNum.toString().padStart(2,"0")}`;
      const hasAvailability = staffAvailability.some(a => a.date === dateStr);

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
  new bootstrap.Modal(
    document.getElementById("availabilityModal")
  ).show();
};

function handleDateClick(year, month, day) {
  selectedDate = new Date(year, month, day);
timeSlots = []; // reset slots

document.getElementById("selectedDateText").textContent =
  selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

// Close calendar modal
bootstrap.Modal.getInstance(document.getElementById("availabilityModal")).hide();

// Open step 2
new bootstrap.Modal(document.getElementById("availabilityStep2")).show();

// Set default repeat until 30 days from selected date
setDefaultRepeatUntil();

}
function renderModalAvailability(staffId) {
  const staffRef = doc(db, "users", staffId);
  getDoc(staffRef).then(docSnap => {
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

    availability.forEach((a, index) => {
      const slotsHtml = a.slots.map(slot => `${slot.start} - ${slot.end}`).join("<br>");
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-start flex-column";
      li.innerHTML = `
        <div>${formatDateLabel(a.date)} (${a.weekday}):<br>${slotsHtml}</div>
        <button class="btn btn-sm btn-outline-danger mt-2 remove-btn">Remove</button>
      `;

      // Remove availability
      li.querySelector(".remove-btn").onclick = async () => {
        try {
          await updateDoc(staffRef, {
            availability: arrayRemove(a)
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

    const [startInput, endInput, removeBtn] = row.querySelectorAll("input, button");

    startInput.onchange = (e) => timeSlots[index].start = e.target.value;
    endInput.onchange = (e) => timeSlots[index].end = e.target.value;

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

  const slots = timeSlots.map(slot => ({
    start: slot.start,
    end: slot.end
  }));

  const weekday = selectedDate.toLocaleDateString("en-US", { weekday: "long" });

  return {
    date: selectedDate.toISOString().split("T")[0],
    weekday: weekday,
    slots: slots,
    repeat: repeat,
    repeatUntil: repeatUntil
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
  const repeatUntilDate = new Date(selectedDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  repeatUntilInput.value = repeatUntilDate.toISOString().split("T")[0];
  repeatUntilInput.min = new Date(selectedDate.getTime() + 1 * 24 * 60 * 60 * 1000)
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

  const slots = timeSlots.filter(s => s.start && s.end);
  if (!slots.length) return alert("Add at least one time slot!");

  const repeat = repeatType.value;
  const repeatUntil = repeatUntilInput.value ? new Date(repeatUntilInput.value) : null;

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
    const newAvailability = datesToSave.map(date => ({
  // Use local year/month/day to prevent UTC shift
  date: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2,"0")}-${date.getDate().toString().padStart(2,"0")}`,
  weekday: date.toLocaleDateString("en-PH", { weekday: "long" }), // PH weekday
  slots: slots,
  repeat: repeat,
  repeatUntil: repeatUntil 
    ? `${repeatUntil.getFullYear()}-${(repeatUntil.getMonth() + 1).toString().padStart(2,"0")}-${repeatUntil.getDate().toString().padStart(2,"0")}`
    : null
}));


    // Add new availability using arrayUnion
    await updateDoc(staffRef, {
      availability: arrayUnion(...newAvailability),
      lastUpdated: serverTimestamp() // timestamp separately
    });

    alert("Availability saved successfully!");
    bootstrap.Modal.getInstance(document.getElementById("availabilityStep2")).hide();

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
async function loadPatientAppointments() {
  const container = document.getElementById("appointments-container");
  container.innerHTML = `<p class="text-center text-muted my-3">Loading...</p>`;

  const q = query(
    collection(db, "appointments"),
    where("status", "==", "in queue")
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    container.innerHTML = `<p class="text-center text-muted my-3">No appointments found.</p>`;
    return;
  }

  const days = {};
  snap.forEach((docSnap) => {
    const appt = docSnap.data();
    const dayKey = `${appt.day} (${appt.weekday})` || "UNKNOWN DATE";
    if (!days[dayKey]) days[dayKey] = [];
    days[dayKey].push({ ...appt, id: docSnap.id });
  });

  container.innerHTML = "";

  const sortedDays = Object.keys(days).sort((a, b) => {
    const dateA = new Date(a.split(" ")[0]);
    const dateB = new Date(b.split(" ")[0]);
    return dateA - dateB;
  });

  sortedDays.forEach((day, index) => {
    const events = days[day];
    const collapseId = `collapse-${index}`;

    const daySection = document.createElement("div");
    daySection.className = "mb-3";

    daySection.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-success text-white rounded shadow-sm"
           style="cursor:pointer;"
           data-bs-toggle="collapse"
           data-bs-target="#${collapseId}"
           aria-expanded="true"
           aria-controls="${collapseId}">
        <h4 class="fw-bold mb-0">${day}</h4>
        <div class="d-flex align-items-center">
          <span class="badge bg-secondary me-2">${events.length} Event${
      events.length > 1 ? "s" : ""
    }</span>
          <i class="bi bi-chevron-down rotate-icon"></i>
        </div>
      </div>

      <div class="collapse show" id="${collapseId}">
        <div class="row gx-3 gy-3 day-row mt-2"></div>
      </div>
    `;

    const row = daySection.querySelector(".day-row");

    events.forEach((appt) => {
  const col = document.createElement("div");
  col.className = "col-12 col-md-6 col-lg-4";

  const card = document.createElement("div");
  card.className = "card h-100 shadow-sm";

  card.innerHTML = `
    <div class="card-body d-flex flex-column">
      <h5 class="card-title">${appt.patientName}</h5>
      <p class="card-text mb-1"><i class="bi bi-clock"></i> ${appt.slot}</p>
      <p class="card-text mb-1"><strong>With:</strong> ${appt.staffName}</p>
      <p class="card-text mb-0"><strong>Reason:</strong> ${appt.reason}</p>
      <div class="mt-auto d-flex justify-content-between pt-2">
        <button class="btn btn-success btn-sm accept-btn">Accept</button>
        <button class="btn btn-warning btn-sm reschedule-btn" data-bs-toggle="modal" data-bs-target="#rescheduleModal">Reschedule</button>
      </div>
    </div>
  `;

  const acceptBtn = card.querySelector(".accept-btn");
acceptBtn.addEventListener("click", async () => {
  const confirmAccept = confirm(`Are you sure you want to accept the appointment for ${appt.patientName}?`);
  if (!confirmAccept) return;

  try {
    // 1️⃣ Update Firestore
    const ref = doc(db, "appointments", appt.id);
    await updateDoc(ref, { status: "accepted" });

    // 2️⃣ Get patient's email from users collection
    const userRef = doc(db, "users", appt.patientId);
    const userSnap = await getDoc(userRef);
    const patientEmail = userSnap.exists() ? userSnap.data().email : null;

    if (!patientEmail) {
      alert("Patient email not found. Email notification will not be sent.");
    } else {
      // 3️⃣ Send Email via EmailJS
      emailjs.send(
        "service_rfw77oo",       // Your EmailJS Service ID
        "template_n37ttab",      // Your EmailJS Template ID
        {
          to_email: patientEmail,
          patient_name: appt.patientName,
          day: appt.day,
          weekday: appt.weekday,
          slot: appt.slot,
          status: "accepted",
          message: `Your appointment has been accepted! See you on ${appt.day} (${appt.weekday}) at ${appt.slot}. Please arrive 10 minutes early.`
        }
      )
      .then(() => console.log("Appointment email sent successfully"))
      .catch(err => console.error("Email sending failed:", err));
    }

    alert("Appointment accepted successfully!");

    // 4️⃣ Remove the card immediately
    col.remove();

  } catch (err) {
    console.error("Error updating appointment:", err);
    alert("Failed to accept appointment. Try again.");
  }
});


  const rescheduleBtn = card.querySelector(".reschedule-btn");
  rescheduleBtn.addEventListener("click", () => {
    document.getElementById("rescheduleApptId").value = appt.id;
    document.getElementById("newDate").value = appt.day; // default to current date
    document.getElementById("newSlot").value = appt.slot; // default to current slot
  });

  col.appendChild(card);
  row.appendChild(col);
});



    container.appendChild(daySection);
  });
}

document.getElementById("rescheduleForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const apptId = document.getElementById("rescheduleApptId").value;
  const newDate = document.getElementById("newDate").value; // YYYY-MM-DD
  const newSlot = document.getElementById("newSlot").value;

  // Calculate weekday
  const dateObj = new Date(newDate);
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const newWeekday = weekdays[dateObj.getDay()];

  try {
    const ref = doc(db, "appointments", apptId);
    await updateDoc(ref, {
      day: newDate,
      slot: newSlot,
      weekday: newWeekday,
      status: "accepted" // optional: keep it in queue
    });

    // ✅ Get patient email from users collection
    const apptSnap = await getDoc(ref);
    const patientId = apptSnap.data().patientId;
    const userRef = doc(db, "users", patientId);
    const userSnap = await getDoc(userRef);
    const patientEmail = userSnap.exists() ? userSnap.data().email : null;
    const patientFullName = userSnap.exists() ? `${userSnap.data().firstName} ${userSnap.data().middleName || ""} ${userSnap.data().lastName}`.trim() : "";

    if (patientEmail) {
      // ✅ Send reschedule email via EmailJS
      emailjs.send(
        "service_rfw77oo",      // Your EmailJS Service ID
        "template_tpgmqni",     // Your EmailJS Template ID
        {
          to_email: patientEmail,
          patient_name: patientFullName,
          day: newDate,
          weekday: newWeekday,
          slot: newSlot,
          status: "rescheduled",
          message: `Your appointment has been rescheduled to ${newDate} (${newWeekday}) at ${newSlot}. Please be on time.`
        }
      )
      .then(() => console.log("Reschedule email sent successfully"))
      .catch(err => console.error("Email sending failed:", err));
    } else {
      console.warn("Patient email not found. Email notification not sent.");
    }

    alert("Appointment rescheduled successfully!");

    // Close the modal
    const modalEl = document.getElementById("rescheduleModal");
    const modal = bootstrap.Modal.getInstance(modalEl);
    modal.hide();

    // Reload appointments
    loadPatientAppointments();

  } catch (error) {
    console.error(error);
    alert("Error rescheduling appointment.");
  }
});




async function loadAcceptedAppointments() {
  const container = document.getElementById("accepted-appointments-container");
  container.innerHTML = `<p class="text-center text-muted">Loading...</p>`;

  const q = query(
    collection(db, "appointments"),
    where("status", "==", "accepted")
  );
  const snap = await getDocs(q);

  container.innerHTML = "";

  if (snap.empty) {
    container.innerHTML = `<p class="text-center text-muted">No accepted appointments yet</p>`;
    return;
  }

  snap.forEach((docSnap) => {
    const appt = docSnap.data();
    const acceptedCol = document.createElement("div");
    acceptedCol.className = "col-12 col-md-6 col-lg-4";

    const acceptedCard = document.createElement("div");
    acceptedCard.className = "card p-3 border-primary shadow-sm h-100";

    acceptedCard.innerHTML = `
      <div class="card-body d-flex flex-column">
        <h5 class="card-title">${appt.patientName}</h5>
        <p class="card-text mb-1"><i class="bi bi-calendar"></i> ${appt.day} (${appt.weekday})</p>
        <p class="card-text mb-1"><i class="bi bi-clock"></i> ${appt.slot}</p>
        <p class="card-text mb-1"><strong>With:</strong> ${appt.staffName}</p>
        <p class="card-text mb-1"><strong>Reason:</strong> ${appt.reason}</p>
        <div class="mt-auto d-flex justify-content-end gap-2 pt-2">
          <button class="btn btn-success btn-sm done-btn">Done</button>
          <button class="btn btn-warning btn-sm no-show-btn">No Show</button>
        </div>
      </div>
    `;

    acceptedCol.appendChild(acceptedCard);
    container.appendChild(acceptedCol);

    // Done button
    const doneBtn = acceptedCard.querySelector(".done-btn");
    doneBtn.addEventListener("click", async () => {
      try {
        const confirmDone = confirm(
          `Mark ${appt.patientName}'s appointment as finished?`
        );
        if (!confirmDone) return;

        const ref = doc(db, "appointments", docSnap.id);
        await updateDoc(ref, { status: "finished" });

        acceptedCol.remove();
        loadFinishedAppointments();
      } catch (error) {
        console.error(error);
        alert("Error marking appointment as done.");
      }
    });

    // No Show button
    const noShowBtn = acceptedCard.querySelector(".no-show-btn");
    noShowBtn.addEventListener("click", async () => {
      try {
        const confirmNoShow = confirm(
          `Mark ${appt.patientName}'s appointment as No Show?`
        );
        if (!confirmNoShow) return;

        const ref = doc(db, "appointments", docSnap.id);
        await updateDoc(ref, { status: "no show" });

        acceptedCol.remove();
        loadNoShowAppointments(); // Reload No Show appointments table
      } catch (error) {
        console.error(error);
        alert("Error marking appointment as no show.");
      }
    });
  });
}

async function loadFinishedAppointments() {
  const tbody = document.getElementById("finished-appointments-body");
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center text-muted p-3">Loading...</td>
    </tr>
  `;

  try {
    const q = query(
      collection(db, "appointments"),
      where("status", "==", "finished")
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted p-3">
            No finished appointments yet
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = ""; // Clear loading

    snap.forEach((docSnap) => {
      const appt = docSnap.data();

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${appt.patientName}</td>
        <td>${appt.staffName}</td>
        <td>${appt.day} (${appt.weekday})</td>
        <td>${appt.slot}</td>
        <td>${appt.reason}</td>
      `;

      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger p-3">
          Error loading finished appointments
        </td>
      </tr>
    `;
  }
}

// 🔹 Load Canceled Appointments
async function loadCanceledAppointments() {
  const tbody = document.getElementById("canceled-appointments-body");
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center text-muted p-3">Loading...</td>
    </tr>
  `;

  try {
    const q = query(
      collection(db, "appointments"),
      where("status", "==", "canceled")
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted p-3">
            No canceled appointments yet
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = ""; // Clear loading

    snap.forEach((docSnap) => {
      const appt = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${appt.patientName}</td>
        <td>${appt.staffName}</td>
        <td>${appt.day} (${appt.weekday})</td>
        <td>${appt.slot}</td>
        <td>${appt.reason}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger p-3">
          Error loading canceled appointments
        </td>
      </tr>
    `;
  }
}

// 🔹 Load No-Show Appointments
async function loadNoShowAppointments() {
  const tbody = document.getElementById("no-show-appointments-body");
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center text-muted p-3">Loading...</td>
    </tr>
  `;

  try {
    const q = query(
      collection(db, "appointments"),
      where("status", "==", "no show")
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted p-3">
            No no-show appointments yet
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = ""; // Clear loading

    snap.forEach((docSnap) => {
      const appt = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${appt.patientName}</td>
        <td>${appt.staffName}</td>
        <td>${appt.day} (${appt.weekday})</td>
        <td>${appt.slot}</td>
        <td>${appt.reason}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger p-3">
          Error loading no-show appointments
        </td>
      </tr>
    `;
  }
}

// 🔹 Call them all at once
loadFinishedAppointments();
loadCanceledAppointments();
loadNoShowAppointments();
loadAcceptedAppointments();
loadPatientAppointments();
