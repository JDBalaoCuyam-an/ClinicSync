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

/* ============================
   FILTER CONTROLS
============================ */
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

// Chief Complaints
let complaintsChart;
const complaintsCtx = document
  .getElementById("complaintsChart")
  .getContext("2d");

/* ===========================================
   GET START + END DATE RANGE BY FILTER
=========================================== */
function getDateRange(filter) {
  const now = new Date();
  let start = new Date();
  if (filter === "day") {
    start.setDate(now.getDate() - 1);
  } else if (filter === "week") start.setDate(now.getDate() - 7);
  else if (filter === "month") start.setMonth(now.getMonth() - 1);
  else if (filter === "year") start.setFullYear(now.getFullYear() - 1);

  return { start, end: now };
}

/* ===========================================
   LOAD CHIEF COMPLAINTS
=========================================== */
async function loadComplaints(filter = "week") {
  try {
    const { start, end } = getDateRange(filter);

    const patientsRef = collection(db, "patients");
    const patientsSnap = await getDocs(patientsRef);

    const complaintCounts = {};

    for (const p of patientsSnap.docs) {
      const consultRef = collection(db, "patients", p.id, "consultations");
      const consultSnap = await getDocs(consultRef);

      consultSnap.forEach((doc) => {
        const data = doc.data();
        const complaint = (data.complaint || "").trim();
        const recordDate = data.date ? new Date(data.date) : null;

        if (
          complaint !== "" &&
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

/* ===========================================
   RENDER BAR CHART
=========================================== */
function renderComplaintsChart(labels, values) {
  if (complaintsChart) complaintsChart.destroy();

  complaintsChart = new Chart(complaintsCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Complaints Count",
          data: values,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } },
    },
  });
}

/* ===========================================
   FILTER BUTTON EVENTS
=========================================== */
document
  .querySelectorAll(".filter-btn[data-chart='complaints']")
  .forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-btn[data-chart='complaints']")
        .forEach((b) => b.classList.remove("active"));

      btn.classList.add("active");
      loadComplaints(btn.dataset.filter);
    });
  });

/* ✅ Default load */
loadComplaints("week");
