import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyApDZ5ddxJUqhJdvX8SiM3glJjeHE7g43U",
  authDomain: "clinicsync-62b40.firebaseapp.com",
  projectId: "clinicsync-62b40",
  storageBucket: "clinicsync-62b40.firebasestorage.app",
  messagingSenderId: "371279618180",
  appId: "1:371279618180:web:2dc76b34a5aa1a2b42a2d1",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ===================================== */
// Calendar Functionality
/* ===================================== */
const calendar = document.getElementById("calendar");
const title = document.getElementById("month-year");
const prevBtn = document.getElementById("prev-month");
const nextBtn = document.getElementById("next-month");

let currentDate = new Date();
let unavailableDays = new Set();
let selectedDate = null; // clicked date

async function loadUnavailableDays() {
  unavailableDays.clear();
  const snapshot = await getDocs(collection(db, "unavailableDays"));
  snapshot.forEach((docSnap) => {
    unavailableDays.add(docSnap.id);
  });
  renderCalendar(currentDate);
}

function renderCalendar(date) {
  calendar.innerHTML = "";
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  title.textContent = `${date.toLocaleString("default", { month: "long" })} ${year}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const div = document.createElement("div");
    div.classList.add("calendar-day", "inactive");
    div.textContent = daysInPrevMonth - i;
    calendar.appendChild(div);
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const div = document.createElement("div");
    div.classList.add("calendar-day");
    div.textContent = day;

    const formattedMonth = String(month + 1).padStart(2, "0");
    const formattedDay = String(day).padStart(2, "0");
    const dateString = `${year}-${formattedMonth}-${formattedDay}`;

    const thisDate = new Date(dateString);
    thisDate.setHours(0, 0, 0, 0);

    if (thisDate.getTime() === today.getTime()) div.classList.add("today");
    if (thisDate < today) div.classList.add("past-day");
    if (unavailableDays.has(dateString)) div.classList.add("unavailable");

    if (!div.classList.contains("past-day") &&
        !div.classList.contains("inactive") &&
        !div.classList.contains("unavailable")) {
      div.addEventListener("click", () => selectDate(dateString));
    }

    calendar.appendChild(div);
  }

  // Trailing empty cells
  const totalCells = firstDayOfMonth + daysInMonth;
  const remaining = 7 - (totalCells % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const div = document.createElement("div");
      div.classList.add("calendar-day", "inactive");
      div.textContent = i;
      calendar.appendChild(div);
    }
  }
}

// Navigation buttons
prevBtn.addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar(currentDate);
});
nextBtn.addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar(currentDate);
});

// Initial load
loadUnavailableDays();

/* ===================================== */
// Appointment Form
/* ===================================== */
const addAppointmentFormOverlay = document.getElementById("add-new-appointment-form");
const cancelBtn = addAppointmentFormOverlay.querySelector(".cancel-btn");
const patientForm = document.getElementById("patient-form");

// Create Time Select
const timeSelect = document.createElement("select");
timeSelect.name = "appointmentTime";
timeSelect.id = "appointment-time";
timeSelect.required = true;

// Add time select before submit buttons
const formButtons = patientForm.querySelector(".form-buttons");
formButtons.parentNode.insertBefore(timeSelect, formButtons);

function openAppointmentForm() {
  addAppointmentFormOverlay.style.display = "block";
}

function closeAppointmentForm() {
  addAppointmentFormOverlay.style.display = "none";
}

cancelBtn.addEventListener("click", closeAppointmentForm);

// Generate 30-min time slot ranges
function generateTimeSlots() {
  const slots = [];
  
  // Morning 08:00-12:00
  for (let hour = 8; hour < 12; hour++) {
    slots.push(`${hour.toString().padStart(2,'0')}:00 - ${hour.toString().padStart(2,'0')}:30`);
    slots.push(`${hour.toString().padStart(2,'0')}:30 - ${(hour+1).toString().padStart(2,'0')}:00`);
  }
  
  // Afternoon 13:00-17:00
  for (let hour = 13; hour < 17; hour++) {
    slots.push(`${hour.toString().padStart(2,'0')}:00 - ${hour.toString().padStart(2,'0')}:30`);
    slots.push(`${hour.toString().padStart(2,'0')}:30 - ${(hour+1).toString().padStart(2,'0')}:00`);
  }

  return slots;
}

// Populate time select for selected date
async function populateTimeSlots(date) {
  const slots = generateTimeSlots();

  // Fetch already booked times for this date
  const bookedSnapshot = await getDocs(
    query(
      collection(db, "PendingAppointments"),
      where("appointmentDate", "==", date)
    )
  );

  const bookedTimes = bookedSnapshot.docs.map(doc => doc.data().appointmentTime || "");

  // Clear previous options
  timeSelect.innerHTML = '<option value="">Select Time</option>';

  slots.forEach(slot => {
    const option = document.createElement("option");
    option.value = slot; // save the range as the value
    option.textContent = slot;

    if (bookedTimes.includes(slot)) {
      option.disabled = true; // disable if already booked
      option.textContent += " (Taken)";
    }

    timeSelect.appendChild(option);
  });
}


// Handle calendar day selection
function selectDate(dateString) {
  selectedDate = dateString;
  populateTimeSlots(dateString);
  openAppointmentForm();
}

// Submit Appointment Form
patientForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!selectedDate) {
    alert("Please select a date from the calendar first.");
    return;
  }

  if (!timeSelect.value) {
    alert("Please select an available time.");
    return;
  }

  try {
    const formData = new FormData(patientForm);
    const patientData = {};

    formData.forEach((value, key) => {
      patientData[key] = value;
    });

    patientData.appointmentDate = selectedDate;

    await addDoc(collection(db, "PendingAppointments"), patientData);

    alert("Patient added successfully!");
    patientForm.reset();
    closeAppointmentForm();
    selectedDate = null;
  } catch (error) {
    console.error("Error adding patient:", error);
    alert("Failed to add patient. Please try again.");
  }
});
