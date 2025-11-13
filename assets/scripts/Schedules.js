import { db } from "../../firebaseconfig.js";
import {
  collection,
  addDoc,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* ===================================== */
// Calendar Functionality
/* ===================================== */
const calendar = document.getElementById("calendar");
const title = document.getElementById("month-year");
const prevBtn = document.getElementById("prev-month");
const nextBtn = document.getElementById("next-month");

let currentDate = new Date();
let unavailableDays = new Set();

// Save unavailable day
async function saveUnavailableDay(dateString) {
  await setDoc(doc(db, "unavailableDays", dateString), { date: dateString });
}

// Remove unavailable day
async function removeUnavailableDay(dateString) {
  await deleteDoc(doc(db, "unavailableDays", dateString));
}

// Load all unavailable days
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

  // Previous month's trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const div = document.createElement("div");
    div.classList.add("calendar-day", "inactive");
    div.textContent = day;
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

    const thisDate = new Date(`${year}-${formattedMonth}-${formattedDay}`);
    thisDate.setHours(0, 0, 0, 0);

    if (thisDate.getTime() === today.getTime()) {
      div.classList.add("today");
    }

    // Disable past dates
    if (thisDate < today) {
      div.classList.add("past-day");
    } else {
      if (unavailableDays.has(dateString)) div.classList.add("unavailable");

      div.addEventListener("click", async () => {
        if (unavailableDays.has(dateString)) {
          if (confirm(`This date (${dateString}) is unavailable. Make it available?`)) {
            unavailableDays.delete(dateString);
            div.classList.remove("unavailable");
            await removeUnavailableDay(dateString);
          }
        } else {
          if (confirm(`Mark ${dateString} as unavailable?`)) {
            unavailableDays.add(dateString);
            div.classList.add("unavailable");
            await saveUnavailableDay(dateString);
          }
        }
      });
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

prevBtn.addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar(currentDate);
});

nextBtn.addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar(currentDate);
});

loadUnavailableDays();

/* ===================================== */
// Appointments Functionality (Summary Cards)
/* ===================================== */
const appointmentsContainer = document.getElementById("appointments-container");

async function acceptAppointment(data, docId) {
  try {
    // Check for duplicate patient using firstname, middlename, lastname, gender
    const q = query(
      collection(db, "patients"),
      where("firstName", "==", data.patientFirstName),
      where("middleName", "==", data.patientMiddleName || ""),
      where("lastName", "==", data.patientLastName),
      where("gender", "==", data.patientGender)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      alert("Patient already exists in the database.");
      return;
    }

    // Build patient object from pending appointment data
    const patientData = {
      age: data.patientAge || "",
      birthdate: data.patientBirthdate || "",
      civilStatus: data.patientCivilStatus || "",
      course: data.patientCourse || "",
      department: data.patientDepartment || "",
      extName: data.patientExtName || "",
      fatherAge: data.fatherAge || "",
      fatherHealth: data.fatherHealth || "",
      fatherName: data.fatherName || "",
      fatherOccupation: data.fatherOccupation || "",
      firstName: data.patientFirstName || "",
      gender: data.patientGender || "",
      lastName: data.patientLastName || "",
      middleName: data.patientMiddleName || "",
      motherAge: data.motherAge || "",
      motherHealth: data.motherHealth || "",
      motherName: data.motherName || "",
      motherOccupation: data.motherOccupation || "",
      nationality: data.patientNationality || "",
      religion: data.patientReligion || "",
      role: "patient",
      schoolId: data.patientSchoolId || "",
      year: data.patientYear || ""
    };

    // Add to patients collection
    await addDoc(collection(db, "patients"), patientData);

    // Remove from PendingAppointments
    await deleteDoc(doc(db, "PendingAppointments", docId));

    alert("Patient successfully added!");
    loadAppointments();

  } catch (error) {
    console.error("Error accepting appointment:", error);
    alert("Failed to accept appointment.");
  }
}

async function rejectAppointment(docId) {
  if (confirm("Are you sure you want to reject this appointment?")) {
    await deleteDoc(doc(db, "PendingAppointments", docId));
    loadAppointments();
  }
}

// Load pending appointments
async function loadAppointments() {
  appointmentsContainer.innerHTML = "";

  try {
    const q = query(collection(db, "PendingAppointments"), orderBy("appointmentDate", "asc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      appointmentsContainer.innerHTML = "<p>No upcoming appointments.</p>";
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const card = document.createElement("div");
      card.classList.add("appointment-card");

      let formattedDate = "N/A";
      if (data.appointmentDate) {
        const [year, month, day] = data.appointmentDate.split("-");
        formattedDate = new Date(year, month - 1, day).toLocaleDateString();
      }

      card.innerHTML = `
        <h3>${data.patientFirstName || ""} ${data.patientMiddleName || ""} ${data.patientLastName || ""}</h3>
        <p><strong>Patient Type:</strong> ${data.patientType || "N/A"}</p>
        <p><strong>Reason:</strong> ${data.appointmentReason || "N/A"}</p>
        <p><strong>Scheduled At:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${data.appointmentTime || "N/A"}</p>
        <button class="accept-btn">Accept</button>
        <button class="reject-btn">Reject</button>
      `;

      card.querySelector(".accept-btn").addEventListener("click", () => acceptAppointment(data, docSnap.id));
      card.querySelector(".reject-btn").addEventListener("click", () => rejectAppointment(docSnap.id));

      appointmentsContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading appointments:", error);
    appointmentsContainer.innerHTML = "<p>Failed to load appointments.</p>";
  }
}

// Initial load
loadAppointments();
