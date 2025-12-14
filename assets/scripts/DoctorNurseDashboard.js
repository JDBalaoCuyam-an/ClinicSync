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
  orderBy,
  collectionGroup,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
/* ======================================================
   CARDS VISITS BORROWWED ITEMS MEDICINES
====================================================== */
async function updateMonthlyVisitsComparison() {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();

  // Last month calculation
  let lastMonth = currentMonth - 1;
  let lastMonthYear = currentYear;
  if (lastMonth < 0) {
    lastMonth = 11; // December
    lastMonthYear -= 1;
  }

  const patientsRef = collection(db, "patients");
  const patientSnap = await getDocs(patientsRef);

  let currentMonthCount = 0;
  let lastMonthCount = 0;

  const promises = patientSnap.docs.map(async (patientDoc) => {
    const consultationsRef = collection(
      db,
      "patients",
      patientDoc.id,
      "consultations"
    );
    const consultSnap = await getDocs(consultationsRef);

    consultSnap.forEach((consultDoc) => {
      const c = consultDoc.data();
      if (!c.date || !c.time) return;

      const [year, month, day] = c.date.split("-").map(Number);
      const [hours, minutes] = c.time.split(":").map(Number);
      const visitDate = new Date(year, month - 1, day, hours, minutes, 0);

      if (visitDate.getFullYear() === currentYear && visitDate.getMonth() === currentMonth) {
        currentMonthCount++;
      }
      if (visitDate.getFullYear() === lastMonthYear && visitDate.getMonth() === lastMonth) {
        lastMonthCount++;
      }
    });
  });

  await Promise.all(promises);

  // Update current month visits
  const visitElement = document.getElementById("thisMonthVisits");
  visitElement.textContent = currentMonthCount;

  // Calculate % change
  let changePercent = 0;
  let changeText = '';
  if (lastMonthCount === 0) {
    changeText = currentMonthCount === 0 ? '0%' : '+100%';
  } else {
    changePercent = ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100;
    changeText = changePercent > 0 ? `+${changePercent.toFixed(1)}%` : `${changePercent.toFixed(1)}%`;
  }

  // Optional: Add comparison text under the card
  let comparisonElement = document.getElementById("monthComparison");
  if (!comparisonElement) {
    comparisonElement = document.createElement("div");
    comparisonElement.id = "monthComparison";
    comparisonElement.style.fontSize = "0.9em";
    comparisonElement.style.color = "#555";
    visitElement.parentElement.appendChild(comparisonElement);
  }
  comparisonElement.textContent = `Compared to last month: ${changeText}`;
}
// Call the function
updateMonthlyVisitsComparison();

const unreturnedItemsDiv = document.getElementById("unreturnedItems");

async function loadUnreturnedItemsCount() {
  try {
    const querySnapshot = await getDocs(collection(db, "ClinicInventory"));
    let totalUnreturned = 0;

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.status === "Borrowed") {
        totalUnreturned += data.quantity || 1; // counts quantities if available
      }
    });

    unreturnedItemsDiv.textContent = totalUnreturned;
  } catch (error) {
    console.error("Error loading unreturned items:", error);
    unreturnedItemsDiv.textContent = "0";
  }
}

// Run once on load
loadUnreturnedItemsCount();
async function updateLowStockItems() {
  const medicinesRef = collection(db, "MedicineInventory");
  const querySnapshot = await getDocs(medicinesRef);

  let lowStockCount = 0;

  querySnapshot.forEach((docSnap) => {
    const med = docSnap.data();
    if (med.stock != null && med.stock < 15) {
      lowStockCount++;
    }
  });

  // Update the card
  document.getElementById("lowStockItems").textContent = lowStockCount;
}

// Call the function
updateLowStockItems();

/* ======================================================
   OPTIMIZED & FIXED FETCH VISIT DATA FUNCTION
====================================================== */
let visitsChart;

// Default current year
const dateFromInput = document.getElementById("dateFrom");
const dateToInput = document.getElementById("dateTo");
const now = new Date();
const currentYear = now.getFullYear();
dateFromInput.value = `${currentYear}-01-01`;
dateToInput.value = `${currentYear}-12-31`;

const departmentInput = document.getElementById("department");
const courseInput = document.getElementById("course");
const yearLevelInput = document.getElementById("yearLevel");
const applyFilterBtn = document.getElementById("applyFilterBtn");

// Main load function
async function loadVisitsChart() {
  const from = dateFromInput.value;
  const to = dateToInput.value;
  const department = departmentInput.value;
  const course = courseInput.value;
  const yearLevel = yearLevelInput.value;

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  if (toDate) toDate.setHours(23, 59, 59, 999);

  const snap = await getDocs(collectionGroup(db, "consultations"));

  const studentVisits = {};
  const employeeVisits = {};

  for (const consultDoc of snap.docs) {
    const data = consultDoc.data();
    if (!data.date) continue;

    let visitDate;
    if (data.date.toDate) visitDate = data.date.toDate();
    else if (data.date instanceof Date) visitDate = data.date;
    else visitDate = new Date(data.date);
    if (isNaN(visitDate)) continue;

    // Date range filter
    if (fromDate && visitDate < fromDate) continue;
    if (toDate && visitDate > toDate) continue;

    const label = visitDate.toISOString().split("T")[0];

    // User info
    const userRef = consultDoc.ref.parent.parent;
    if (!userRef) continue;
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) continue;
    const user = userSnap.data();

    // Filter by department, course, yearLevel
    if (department !== "all-dept" && user.department !== department) continue;
    if (course !== "all-course-strand-genEduc" && user.course !== course) continue;
    if (yearLevel !== "all-year" && String(user.yearLevel) !== yearLevel) continue;

    const type = user.user_type;
    if (type === "student") studentVisits[label] = (studentVisits[label] || 0) + 1;
    if (type === "employee") employeeVisits[label] = (employeeVisits[label] || 0) + 1;
  }

  renderVisitsChart(studentVisits, employeeVisits, fromDate, toDate);
}

// Render chart
function renderVisitsChart(studentData, employeeData, fromDate, toDate) {
  let labels = Array.from(
    new Set([...Object.keys(studentData), ...Object.keys(employeeData)])
  ).sort();

  // If no data, create labels for date range
  if (labels.length === 0 && fromDate && toDate) {
    labels = [];
    const current = new Date(fromDate);
    while (current <= toDate) {
      labels.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
  }

  const studentValues = labels.map(d => studentData[d] || 0);
  const employeeValues = labels.map(d => employeeData[d] || 0);

  const ctx = document.getElementById("visitsChart");
  if (visitsChart) visitsChart.destroy();

  visitsChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Student Visits", data: studentValues, tension: 0.3, borderColor: "blue", fill: false },
        { label: "Employee Visits", data: employeeValues, tension: 0.3, borderColor: "green", fill: false },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

// ✅ Only trigger chart on button click
applyFilterBtn.addEventListener("click", loadVisitsChart);

// Initial load on page
loadVisitsChart();


/* ===========================================
Chief Complaints Chart
=========================================== */
// Set default year range
const startDateInput = document.getElementById("startDateFilter");
const endDateInput = document.getElementById("endDateFilter");

const deptFilter = document.getElementById("departmentComplaintFilter");
const courseFilter = document.getElementById("courseComplaintFilter");
const yearLevelFilter = document.getElementById("yearLevelComplaintFilter");

const currentYearComplaints = new Date().getFullYear();
startDateInput.value = `${currentYearComplaints}-01-01`;
endDateInput.value = `${currentYearComplaints}-12-31`;

// Initial load
loadChiefComplaintChart();

let chiefComplaintChart;

async function loadChiefComplaintChart() {
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;

  const department = deptFilter.value;
  const course = courseFilter.value;
  const yearLevel = yearLevelFilter.value;

  const complaintSnap = await getDocs(collection(db, "complaintRecords"));

  const complaintCounts = {};

  for (const docSnap of complaintSnap.docs) {
    const data = docSnap.data();

    if (!data.complaint || !data.date || !data.patientId) continue;

    // 🔹 Date filter (string-based, safe)
    if (startDate && data.date < startDate) continue;
    if (endDate && data.date > endDate) continue;

    // 🔹 Get patient (user) data
    const userRef = doc(db, "users", data.patientId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) continue;

    const user = userSnap.data();

    // 🔹 Only students & employees
    if (!["student", "employee"].includes(user.user_type)) continue;

    // 🔹 Department filter
    if (department !== "all-dept" && user.department !== department) continue;

    // 🔹 Course filter
    if (
      course !== "all-course-strand-genEduc" &&
      user.course !== course
    ) continue;

    // 🔹 Year level filter
    if (
      yearLevel !== "all-yearLevel" &&
      String(user.yearLevel) !== yearLevel
    ) continue;

    // 🔹 Count complaint
    const complaintName = data.complaint.trim();

    complaintCounts[complaintName] =
      (complaintCounts[complaintName] || 0) + 1;
  }

  renderChiefComplaintChart(complaintCounts);
}

function renderChiefComplaintChart(complaintCounts) {
  const labels = Object.keys(complaintCounts);
  const values = Object.values(complaintCounts);

  const ctx = document
    .getElementById("chiefComplaintChart")
    .getContext("2d");

  if (chiefComplaintChart) chiefComplaintChart.destroy();

  chiefComplaintChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Chief Complaint Count",
          data: values,
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });
}

// ✅ Load on page load
loadChiefComplaintChart();

document
  .getElementById("applyComplaintFilterBtn")
  .addEventListener("click", loadChiefComplaintChart);


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
    colors = data.map(
      (days) =>
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
    colors = data.map(
      (qty) =>
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
            text: filterType === "expiry" ? "Days Remaining" : "Stock Quantity",
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
document.getElementById("medChartFilter").addEventListener("change", (e) => {
  currentFilter = e.target.value;
  renderStockChart(currentFilter);
});

// 🚀 Initial chart render
renderStockChart(currentFilter);

// 🔄 Optional: Auto-refresh every minute
setInterval(() => renderStockChart(currentFilter), 60000);
async function loadTodayAppointments() {
  const appointmentsContainer = document.getElementById("appointmentsList");
  appointmentsContainer.innerHTML = "";

  // Make container scrollable
  appointmentsContainer.style.maxHeight = "400px"; // adjust height as needed
  appointmentsContainer.style.overflowY = "auto";
  appointmentsContainer.style.paddingRight = "5px"; // avoid scrollbar overlay

  try {
    const q = query(
      collection(db, "PendingAppointments"),
      orderBy("appointmentDate", "asc")
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      appointmentsContainer.innerHTML = "<p style='font-size:0.9em;'>No appointments today.</p>";
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize

    let hasTodayAppointments = false;

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.appointmentDate) return;

      const [year, month, day] = data.appointmentDate.split("-").map(Number);
      const appointmentDateObj = new Date(year, month - 1, day);
      appointmentDateObj.setHours(0, 0, 0, 0);

      if (appointmentDateObj.getTime() !== today.getTime()) return;

      hasTodayAppointments = true;

      // Create clickable card
      const card = document.createElement("div");
      card.classList.add("appointment-card");
      card.style.cursor = "pointer";
      card.style.padding = "8px 10px";
      card.style.marginBottom = "8px";
      card.style.borderRadius = "6px";
      card.style.border = "1px solid #E0EFFF";
      // card.style.backgroundColor = "#E0FFE0";
      card.style.boxShadow = "0 1px 4px rgba(0,0,0,0.1)";
      card.style.transition = "transform 0.2s";
      card.style.fontSize = "0.85em"; // smaller text

      card.addEventListener("mouseover", () => {
        card.style.transform = "scale(1.02)";
      });
      card.addEventListener("mouseout", () => {
        card.style.transform = "scale(1)";
      });

      card.addEventListener("click", () => {
        window.location.href = "Schedules.html";
      });

      const formattedDate = appointmentDateObj.toLocaleDateString();

      card.innerHTML = `
        <h4 style="margin:0 0 4px 0;">${data.patientFirstName || ""} ${data.patientMiddleName || ""} ${data.patientLastName || ""}</h4>
        <p style="margin:1px 0;"><strong>Type:</strong> ${data.patientType || "N/A"}</p>
        <p style="margin:1px 0;"><strong>Reason:</strong> ${data.appointmentReason || "N/A"}</p>
        <p style="margin:1px 0;"><strong>Scheduled:</strong> ${formattedDate}</p>
        <p style="margin:1px 0;"><strong>Time:</strong> ${data.appointmentTime || "N/A"}</p>
      `;

      appointmentsContainer.appendChild(card);
    });

    if (!hasTodayAppointments) {
      appointmentsContainer.innerHTML = "<p style='font-size:0.9em;'>No appointments today.</p>";
    }

    // Update current date display
    const dateTimeEl = document.getElementById("currentDateTime");
    dateTimeEl.textContent = today.toLocaleDateString();

  } catch (error) {
    console.error("Error loading appointments:", error);
    appointmentsContainer.innerHTML = "<p style='font-size:0.9em;'>Failed to load appointments.</p>";
  }
}

// Call the function
loadTodayAppointments();
