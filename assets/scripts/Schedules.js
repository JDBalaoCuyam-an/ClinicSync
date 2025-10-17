import { db } from "../../firebaseconfig.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const calendar = document.getElementById("calendar");
const title = document.getElementById("month-year");
const prevBtn = document.getElementById("prev-month");
const nextBtn = document.getElementById("next-month");

const modal = document.getElementById("appointment-modal");
const selectedDateInput = document.getElementById("selected-date");
const saveBtn = document.getElementById("save-appointment");
const cancelBtn = document.getElementById("cancel-appointment");

const upcomingList = document.getElementById("upcoming-list");
const missedList = document.getElementById("missed-list");
const finishedList = document.getElementById("finished-list");

let currentDate = new Date();
let selectedDate = null;

// 🗓 Render Calendar
function renderCalendar(date) {
  calendar.innerHTML = "";
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  title.textContent = `${date.toLocaleString("default", {
    month: "long",
  })} ${year}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0); // ignore time when comparing

  // Days from previous month
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const div = document.createElement("div");
    div.classList.add("calendar-day", "inactive");
    div.textContent = day;
    calendar.appendChild(div);
  }

  // Days in current month
  for (let day = 1; day <= daysInMonth; day++) {
    const div = document.createElement("div");
    div.classList.add("calendar-day");
    div.textContent = day;

    const formattedMonth = String(month + 1).padStart(2, "0");
    const formattedDay = String(day).padStart(2, "0");
    const dateString = `${year}-${formattedMonth}-${formattedDay}`;

    const thisDate = new Date(`${year}-${formattedMonth}-${formattedDay}`);
    thisDate.setHours(0, 0, 0, 0);

    // Highlight today
    if (
      thisDate.getDate() === today.getDate() &&
      thisDate.getMonth() === today.getMonth() &&
      thisDate.getFullYear() === today.getFullYear()
    ) {
      div.classList.add("today");
    }

    // Disable past dates
    if (thisDate < today) {
      div.classList.add("past-day");
    } else {
      div.addEventListener("click", () => openModal(dateString));
    }

    calendar.appendChild(div);
  }

  // Fill empty spaces at the end
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

// Modal
function openModal(date) {
  selectedDate = date;
  selectedDateInput.value = date;
  modal.classList.remove("hidden");
}
cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));

// Save appointment
saveBtn.addEventListener("click", async () => {
  const time = document.getElementById("appointment-time").value;
  const person = document.getElementById("appointment-person").value.trim();
  const doctor = document.getElementById("appointment-doctor").value.trim();
  const details = document.getElementById("appointment-details").value.trim();

  if (!time || !person || !doctor || !details) {
    alert("Please fill out all fields.");
    return;
  }

  try {
    await addDoc(collection(db, "schedules"), {
      date: selectedDate,
      time,
      person,
      doctor,
      details,
      status: "upcoming",
      createdAt: serverTimestamp(),
    });
    alert("Appointment Saved!");
    modal.classList.add("hidden");
    loadAppointments();
  } catch (error) {
    console.error("Error adding appointment:", error);
  }
});

// Load appointments
async function loadAppointments() {
  upcomingList.innerHTML = "";
  missedList.innerHTML = "";
  finishedList.innerHTML = "";

  const q = query(collection(db, "schedules"), orderBy("date"));
  const snapshot = await getDocs(q);
  const now = new Date();

  let upcomingCount = 0,
    missedCount = 0,
    finishedCount = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${data.person}</strong> (${data.doctor})<br>
        ${data.date} - ${data.time}<br>
        ${data.details}
      </div>
    `;

    const appointmentDate = new Date(`${data.date}T${data.time}`);
    if (data.status === "finished") {
      finishedList.appendChild(li);
      finishedCount++;
    } else if (appointmentDate < now) {
      missedList.appendChild(li);
      missedCount++;
    } else {
      const doneBtn = document.createElement("button");
      doneBtn.textContent = "✅ Done";
      doneBtn.addEventListener("click", () => markFinished(docSnap.id));
      li.appendChild(doneBtn);
      upcomingList.appendChild(li);
      upcomingCount++;
    }
  });

  // 🧮 Update Counts
  document.getElementById("upcoming-count").textContent = upcomingCount;
  document.getElementById("missed-count").textContent = missedCount;
  document.getElementById("finished-count").textContent = finishedCount;
}

// 🔽 Collapsible Category Headers
document.querySelectorAll(".category-header").forEach((header) => {
  header.addEventListener("click", () => {
    const targetList = document.getElementById(header.dataset.target);
    targetList.classList.toggle("collapsed");
  });
});

async function markFinished(id) {
  const ref = doc(db, "schedules", id);
  await updateDoc(ref, { status: "finished" });
  loadAppointments();
}

// Auto-refresh
setInterval(loadAppointments, 30000);

renderCalendar(currentDate);
loadAppointments();
