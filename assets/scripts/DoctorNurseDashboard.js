// ✅ Import Firebase tools
import { auth, db } from "../../firebaseconfig.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs, // ✅ <-- added
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* ============================
   MOCK DATA (replace later)
============================ */
const mockData = {
  day: {
    labels: ["8 AM", "9 AM", "10 AM", "11 AM", "12 NN", "1 PM", "2 PM"],
    student: [4, 5, 6, 3, 2, 3, 4],
    employee: [2, 4, 3, 2, 3, 2, 3],
    visitor: [1, 1, 2, 1, 1, 2, 1],
  },
  week: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    student: [10, 15, 17, 12, 14, 9, 8],
    employee: [6, 7, 8, 9, 10, 6, 7],
    visitor: [3, 2, 4, 3, 2, 5, 4],
  },
  month: {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    student: [60, 50, 65, 55],
    employee: [30, 35, 40, 25],
    visitor: [15, 20, 18, 15],
  },
  year: {
    labels: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    student: [200, 250, 300, 280, 350, 270, 320, 300, 310, 330, 290, 340],
    employee: [120, 140, 160, 150, 170, 140, 150, 160, 170, 180, 160, 200],
    visitor: [80, 70, 90, 85, 100, 90, 95, 100, 110, 105, 90, 120],
  },
};

/* ============================
   CHART INITIALIZATION
============================ */
let visitsChart;
const visitsCtx = document.getElementById("visitsChart").getContext("2d");

function renderVisitsChart(filter = "week") {
  const d = mockData[filter];

  const data = {
    labels: d.labels,
    datasets: [
      {
        label: "Student",
        data: d.student,
        borderWidth: 2,
        tension: 0.3,
      },
      {
        label: "Employee",
        data: d.employee,
        borderWidth: 2,
        tension: 0.3,
      },
      {
        label: "Visitor",
        data: d.visitor,
        borderWidth: 2,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true },
    },
    interaction: {
      mode: "index",
      intersect: false,
    },
  };

  if (visitsChart) visitsChart.destroy();

  visitsChart = new Chart(visitsCtx, {
    type: "line",
    data,
    options,
  });
}

/* DEFAULT */
renderVisitsChart("week");
  //  FILTER CONTROLS
document.querySelectorAll(".filter-btn[data-chart='visits']").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-btn[data-chart='visits']")
      .forEach((b) => b.classList.remove("active"));

    btn.classList.add("active");

    const filter = btn.dataset.filter;
    renderVisitsChart(filter);
  });
});

/* ===========================================
Chief Complaints Chart
=========================================== */
let complaintsChart;
const complaintsCtx = document.getElementById("complaintsChart").getContext("2d");
  //  🕒 GET START + END DATE RANGE
function getDateRange(filter) {
  const now = new Date();
  let start = new Date();

  switch (filter) {
    case "day":
      start.setDate(now.getDate() - 1);
      break;
    case "week":
      start.setDate(now.getDate() - 7);
      break;
    case "month":
      start.setMonth(now.getMonth() - 1);
      break;
    case "year":
      start.setFullYear(now.getFullYear() - 1);
      break;
    case "all":
      start = new Date("1970-01-01");
      break;
  }

  return { start, end: now };
}

  //  📊 LOAD CHIEF COMPLAINTS
async function loadComplaints(filter = "week") {
  try {
    const { start, end } = getDateRange(filter);

    const patientsRef = collection(db, "patients");
    const patientsSnap = await getDocs(patientsRef);

    const complaintCounts = {};

    // 🔁 Iterate through all patients and consultations
    for (const p of patientsSnap.docs) {
      const consultRef = collection(db, "patients", p.id, "consultations");
      const consultSnap = await getDocs(consultRef);

      consultSnap.forEach((doc) => {
        const data = doc.data();
        const complaint = (data.complaint || "").trim();
        const recordDate = data.date ? new Date(data.date) : null;

        if (
          complaint &&
          recordDate &&
          recordDate >= start &&
          recordDate <= end
        ) {
          complaintCounts[complaint] = (complaintCounts[complaint] || 0) + 1;
        }
      });
    }

    const labels = Object.keys(complaintCounts);
    const values = Object.values(complaintCounts);

    renderComplaintsChart(labels, values);
  } catch (err) {
    console.error("❌ Error loading complaints:", err);
  }
}

  //  🎨 RENDER BAR CHART
function renderComplaintsChart(labels, values) {
  if (complaintsChart) complaintsChart.destroy();

  complaintsChart = new Chart(complaintsCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Number of Complaints",
          data: values,
          backgroundColor: "rgba(54, 162, 235, 0.7)",
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Count" } },
        x: { title: { display: true, text: "Complaint" } },
      },
      plugins: {
        title: {
          display: true,
          text: "Most Common Chief Complaints",
          font: { size: 16 },
        },
        legend: { display: false },
      },
    },
  });
}

// 🔄 FILTER SELECT CHANGE
document
  .getElementById("complaintChartFilter")
  .addEventListener("change", (e) => {
    const filter = e.target.value;
    loadComplaints(filter);
  });

/* ✅ Default Load */
loadComplaints("week");
/* ===========================================
   Medicine Chart
=========================================== */
let stockChartInstance = null;
let currentFilter = "expiry"; // default view

// 🧠 Fetch medicines from Firestore
async function fetchMedicines() {
  const medicines = [];
  const querySnapshot = await getDocs(collection(db, "MedicineInventory"));
  querySnapshot.forEach((docSnap) => {
    medicines.push({ id: docSnap.id, ...docSnap.data() });
  });
  return medicines;
}

// 🎨 Render chart based on selected mode
async function renderStockChart(filterType = "expiry") {
  const medicines = await fetchMedicines();
  const today = new Date();

  let chartTitle = "";
  let labels = [];
  let data = [];
  let colors = [];

  if (filterType === "expiry") {
    // ✅ Days until expiration
    const withDays = medicines
      .map((med) => {
        const expiryDate = med.expiry ? new Date(med.expiry) : null;
        const diffTime = expiryDate ? expiryDate - today : NaN;
        const daysRemaining = isNaN(diffTime)
          ? 0
          : Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...med, daysRemaining };
      })
      .filter((m) => m.daysRemaining >= 0)
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 10);

    labels = withDays.map((m) => m.name);
    data = withDays.map((m) => m.daysRemaining);
    colors = data.map((days) =>
      days <= 30
        ? "rgba(255, 99, 132, 0.7)" // Red
        : days <= 90
        ? "rgba(255, 206, 86, 0.7)" // Yellow
        : "rgba(75, 192, 192, 0.7)" // Green
    );
    chartTitle = "Top 10 Medicines Closest to Expiration";
  } else if (filterType === "stock") {
    // ⚠️ Low stock
    const lowStock = medicines
      .filter((m) => typeof m.stock === "number")
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 10);

    labels = lowStock.map((m) => m.name);
    data = lowStock.map((m) => m.stock);
    colors = data.map((qty) =>
      qty <= 20
        ? "rgba(255, 99, 132, 0.7)" // Red
        : qty <= 50
        ? "rgba(255, 206, 86, 0.7)" // Yellow
        : "rgba(75, 192, 192, 0.7)" // Green
    );
    chartTitle = "Top 10 Medicines About to Run Out of Stock";
  }

  const ctx = document.getElementById("stockChart").getContext("2d");

  if (stockChartInstance) stockChartInstance.destroy();

  stockChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label:
            filterType === "expiry"
              ? "Days Remaining Until Expiry"
              : "Current Stock",
          data,
          backgroundColor: colors,
          borderRadius: 8,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: chartTitle,
          font: { size: 16 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              filterType === "expiry"
                ? `${ctx.raw} days remaining`
                : `${ctx.raw} units left`,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text:
              filterType === "expiry"
                ? "Days Remaining"
                : "Stock Quantity",
          },
        },
        y: {
          title: { display: true, text: "Medicine Name" },
        },
      },
    },
  });
}

// 🔘 Handle filter change
document
  .getElementById("medChartFilter")
  .addEventListener("change", (e) => {
    currentFilter = e.target.value;
    renderStockChart(currentFilter);
  });

// 🚀 Initial chart render
renderStockChart(currentFilter);

// 🔄 Optional: Auto-refresh every minute
setInterval(() => renderStockChart(currentFilter), 60000);

/* ===========================================
TODAY'S APPOINTMENTS SECTION
=========================================== */
// === TODAY'S APPOINTMENTS SECTION ===
const appointmentsList = document.getElementById("appointmentsList");
const appointmentFilterBtns = document.querySelectorAll(
  ".filter-btn[data-chart='appointments']"
);

// 📅 Get today's date (YYYY-MM-DD)
function getTodayString() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

// 🧾 Load Today's Appointments
async function loadTodayAppointments(filter = "upcoming") {
  appointmentsList.innerHTML = "<div class='loading'>Checking Today's Appointments...</div>";

  const q = query(collection(db, "schedules"), orderBy("time"));
  const snapshot = await getDocs(q);

  const today = getTodayString();
  const now = new Date();

  const filteredAppointments = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const appointmentDate = data.date;
    const appointmentTime = data.time;
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);

    // Only include today's appointments
    if (appointmentDate === today) {
      if (filter === "upcoming" && appointmentDateTime >= now && data.status !== "finished") {
        filteredAppointments.push({ id: docSnap.id, ...data });
      } else if (filter === "completed" && data.status === "finished") {
        filteredAppointments.push({ id: docSnap.id, ...data });
      }
    }
  });

  renderAppointments(filteredAppointments, filter);
}

// 🧱 Render Appointments in DOM
function renderAppointments(list, filter) {
  appointmentsList.innerHTML = "";

  if (list.length === 0) {
    appointmentsList.innerHTML = `
      <div style="border:solid 2px #4682b4;padding:10px 15px;border-radius:5px;" 
           class="no-data">No ${filter} appointments today.</div>`;
    return;
  }

  list.forEach((appt) => {
  const item = document.createElement("div");
  item.classList.add("appointment-item");

  item.innerHTML = `
    <div class="patient-info">
      <div class="patient-name">${appt.person}</div>
      <div class="appointment-time">${appt.time}</div>
      <div class="doctor-name">👨‍⚕️ ${appt.doctor}</div>
      <div class="appointment-details">🗒️ ${appt.details || "No details provided"}</div>
    </div>
  `;

  // ✅ Add click event to redirect to Schedules.html
  item.addEventListener("click", () => {
    window.location.href = "Schedules.html";
  });

  // Optional: cursor pointer for UX
  item.style.cursor = "pointer";

  appointmentsList.appendChild(item);
});

}

// 🔘 Filter Button Events
appointmentFilterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    appointmentFilterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const filter = btn.dataset.filter;
    loadTodayAppointments(filter);
  });
});

// 🚀 Initial Load
loadTodayAppointments("upcoming");

// 🔄 Auto Refresh Every 30 Seconds
setInterval(() => {
  const activeBtn = document.querySelector(".filter-btn[data-chart='appointments'].active");
  loadTodayAppointments(activeBtn.dataset.filter);
}, 30000);
// Current Time and Date Display
function updateCurrentDateTime() {
  const now = new Date();

  const options = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };

  document.getElementById("currentDateTime").textContent = now.toLocaleString("en-US", options);
}

// Initial load
updateCurrentDateTime();

// Update every second
setInterval(updateCurrentDateTime, 1000);
