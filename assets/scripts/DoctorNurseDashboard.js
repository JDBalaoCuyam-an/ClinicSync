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

  const patientsRef = collection(db, "users");
  const patientSnap = await getDocs(patientsRef);

  let currentMonthCount = 0;
  let lastMonthCount = 0;

  const promises = patientSnap.docs.map(async (patientDoc) => {
    const consultationsRef = collection(
      db,
      "users",
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

      if (
        visitDate.getFullYear() === currentYear &&
        visitDate.getMonth() === currentMonth
      ) {
        currentMonthCount++;
      }
      if (
        visitDate.getFullYear() === lastMonthYear &&
        visitDate.getMonth() === lastMonth
      ) {
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
  let changeText = "";
  if (lastMonthCount === 0) {
    changeText = currentMonthCount === 0 ? "0%" : "+100%";
  } else {
    changePercent =
      ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100;
    changeText =
      changePercent > 0
        ? `+${changePercent.toFixed(1)}%`
        : `${changePercent.toFixed(1)}%`;
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
    if (course !== "all-course-strand-genEduc" && user.course !== course)
      continue;
    if (yearLevel !== "all-year" && String(user.yearLevel) !== yearLevel)
      continue;

    const type = user.user_type;
    if (type === "student")
      studentVisits[label] = (studentVisits[label] || 0) + 1;
    if (type === "employee")
      employeeVisits[label] = (employeeVisits[label] || 0) + 1;
  }

  renderVisitsChart(studentVisits, employeeVisits, fromDate, toDate);
}

function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Render chart
function renderVisitsChart(studentData, employeeData, fromDate, toDate) {
  // 🔹 Raw date keys (YYYY-MM-DD)
  let rawLabels = Array.from(
    new Set([...Object.keys(studentData), ...Object.keys(employeeData)])
  ).sort();

  // 🔹 If no data, generate date range
  if (rawLabels.length === 0 && fromDate && toDate) {
    rawLabels = [];
    const current = new Date(fromDate);
    while (current <= toDate) {
      rawLabels.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
  }

  // 🔹 Chart values must use RAW keys
  const studentValues = rawLabels.map((d) => studentData[d] || 0);
  const employeeValues = rawLabels.map((d) => employeeData[d] || 0);

  // 🔹 Display labels (formatted)
  const displayLabels = rawLabels.map(formatDateLabel);

  const ctx = document.getElementById("visitsChart");
  if (visitsChart) visitsChart.destroy();

  visitsChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: displayLabels, // 👈 formatted labels
      datasets: [
        {
          label: "Student Visits",
          data: studentValues,
          tension: 0.3,
          borderColor: "blue",
          fill: false,
        },
        {
          label: "Employee Visits",
          data: employeeValues,
          tension: 0.3,
          borderColor: "green",
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
    },
  });
}

// ✅ Only trigger chart on button click
applyFilterBtn.addEventListener("click", loadVisitsChart);

// Initial load on page
loadVisitsChart();
// ===========================================================
// Export Visits Chart as PDF
// ===========================================================
document.getElementById("exportImageBtn").addEventListener("click", () => {
  if (!visitsChart) {
    alert("No chart to export.");
    return;
  }
  // Map values to display-friendly text
  const departmentLabel =
    departmentInput.value === "all-dept"
      ? "All Departments"
      : departmentInput.value;
  const courseLabel =
    courseInput.value === "all-course-strand-genEduc"
      ? "All Course, Strand, and General Education"
      : courseInput.value;
  const yearLevelLabel =
    yearLevelInput.value === "all-year"
      ? "All Year Levels"
      : yearLevelInput.value;
  // Create a temporary canvas
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = visitsChart.canvas.width;
  tempCanvas.height = visitsChart.canvas.height + 40; // extra space for filter text
  const tempCtx = tempCanvas.getContext("2d");

  // Draw the chart onto the temp canvas
  tempCtx.drawImage(visitsChart.canvas, 0, 40);

  // Draw filter text above the chart
  tempCtx.font = "bold 14px Arial";
  tempCtx.fillStyle = "#444";
  tempCtx.textAlign = "center";

  const filterText =
    `Date: ${formatDateLabel(dateFromInput.value)} → ${formatDateLabel(
      dateToInput.value
    )} | ` +
    `Department: ${departmentLabel} | ` +
    `Course: ${courseLabel} | ` +
    `Year Level: ${yearLevelLabel}`;

  tempCtx.fillText(filterText, tempCanvas.width / 2, 20);

  // Export temp canvas as image
  const imageURL = tempCanvas.toDataURL("image/png");

  // Create download link
  const link = document.createElement("a");
  link.href = imageURL;
  link.download = "Patient_Visits_Chart.png";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

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
    if (course !== "all-course-strand-genEduc" && user.course !== course)
      continue;

    // 🔹 Year level filter
    if (yearLevel !== "all-yearLevel" && String(user.yearLevel) !== yearLevel)
      continue;

    // 🔹 Count complaint
    const complaintName = data.complaint.trim();

    complaintCounts[complaintName] = (complaintCounts[complaintName] || 0) + 1;
  }

  renderChiefComplaintChart(complaintCounts);
}

function renderChiefComplaintChart(complaintCounts) {
  const labels = Object.keys(complaintCounts);
  const values = Object.values(complaintCounts);

  const ctx = document.getElementById("chiefComplaintChart").getContext("2d");

  if (chiefComplaintChart) chiefComplaintChart.destroy();

  chiefComplaintChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Chief Complaint Count",
          data: values,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
    },
  });
}

// ✅ Load on page load
loadChiefComplaintChart();

document
  .getElementById("applyComplaintFilterBtn")
  .addEventListener("click", loadChiefComplaintChart);
// ===========================================================
// Export Chief Complaint Chart as Image
// ===========================================================
document.getElementById("exportComplaintImageBtn").addEventListener("click", () => {
  if (!chiefComplaintChart) {
    alert("No chart to export.");
    return;
  }

  // Get chart canvas
  const canvas = document.getElementById("chiefComplaintChart");

  // Map filter values to readable text
  const departmentLabel = deptFilter.value === "all-dept" ? "All Departments" : deptFilter.value;
  const courseLabel = courseFilter.value === "all-course-strand-genEduc" ? 
                      "All Course, Strand, and General Education" : courseFilter.value;
  const yearLevelLabel = yearLevelFilter.value === "all-yearLevel" ? "All Year Levels" : yearLevelFilter.value;

  // Create temporary canvas to add filter text
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height + 40; // extra space for filter text
  const tempCtx = tempCanvas.getContext("2d");

  // Draw the chart onto temp canvas
  tempCtx.drawImage(canvas, 0, 40);

  // Draw filter text above the chart
  tempCtx.font = "bold 14px Arial";
  tempCtx.fillStyle = "#444";
  tempCtx.textAlign = "center";

  const filterText = 
    `Date: ${formatDateLabel(startDateInput.value)} → ${formatDateLabel(endDateInput.value)} | ` +
    `Department: ${departmentLabel} | ` +
    `Course: ${courseLabel} | ` +
    `Year Level: ${yearLevelLabel}`;

  tempCtx.fillText(filterText, tempCanvas.width / 2, 20);

  // Convert to image and trigger download
  const imageURL = tempCanvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = imageURL;
  link.download = "Chief_Complaints_Chart.png";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});


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


const appointmentsList = document.getElementById("appointmentsList");
const currentDateTimeSpan = document.getElementById("currentDateTime");

// Get current week range (Sunday → Saturday)
function getCurrentWeekRange() {
  const now = new Date();
  const firstDay = new Date(now);
  firstDay.setDate(now.getDate() - now.getDay()); // Sunday
  firstDay.setHours(0, 0, 0, 0);

  const lastDay = new Date(firstDay);
  lastDay.setDate(firstDay.getDate() + 6); // Saturday
  lastDay.setHours(23, 59, 59, 999);

  return { firstDay, lastDay };
}

async function loadWeeklyAppointments() {
  appointmentsList.innerHTML = `<p class="text-center text-muted my-2">Loading...</p>`;

  const { firstDay, lastDay } = getCurrentWeekRange();

  // Update header with week
  currentDateTimeSpan.textContent = `(${formatDateLabel(firstDay)} - ${formatDateLabel(lastDay)})`;

  try {
    // 🔹 Fetch In Queue
    const qInQueue = query(
      collection(db, "appointments"),
      where("status", "==", "in queue")
    );
    const snapInQueue = await getDocs(qInQueue);

    let inQueueAppointments = snapInQueue.docs
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      .filter(appt => {
        const apptDate = new Date(appt.day);
        return apptDate >= firstDay && apptDate <= lastDay;
      });

    // 🔹 Fetch Accepted
    const qAccepted = query(
      collection(db, "appointments"),
      where("status", "==", "accepted")
    );
    const snapAccepted = await getDocs(qAccepted);

    let acceptedAppointments = snapAccepted.docs
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      .filter(appt => {
        const apptDate = new Date(appt.day);
        return apptDate >= firstDay && apptDate <= lastDay;
      });

    // 🔹 Combine and sort each by date & time
    const sortByDateTime = appts => {
      return appts.sort((a, b) => {
        const dateA = new Date(`${a.day}`);
        const dateB = new Date(`${b.day}`);
        return dateA - dateB;
      });
    };

    inQueueAppointments = sortByDateTime(inQueueAppointments);
    acceptedAppointments = sortByDateTime(acceptedAppointments);

    appointmentsList.innerHTML = "";

    function renderAppointments(title, appts, isAccepted = false) {
      if (appts.length === 0) return;

      const section = document.createElement("div");
      section.className = "mb-3";

      section.innerHTML = `<h5 class="mb-2">${title} (${appts.length})</h5>`;
      const container = document.createElement("div");
      container.className = "appointments-horizontal-list";

      appts.forEach(appt => {
        const row = document.createElement("div");
        row.className = "appointment-row d-flex align-items-center justify-content-between p-2 mb-2 border rounded shadow-sm";

        row.innerHTML = `
          <div class="flex-grow-1">
            <strong>${appt.patientName}</strong>
            ${isAccepted ? `<span class="ms-3"><i class="bi bi-calendar"></i> ${appt.day} (${appt.weekday})</span>` : ""}
            <span class="ms-3"><i class="bi bi-clock"></i> ${appt.slot}</span>
            <span class="ms-3"><strong>With:</strong> ${appt.staffName}</span>
          </div>
        `;

        container.appendChild(row);
      });

      section.appendChild(container);
      appointmentsList.appendChild(section);
    }

    // 🔹 Accepted first, then in queue
    renderAppointments("Accepted Appointments", acceptedAppointments, true);
    renderAppointments("In Queue Appointments", inQueueAppointments, false);

    if (inQueueAppointments.length === 0 && acceptedAppointments.length === 0) {
      appointmentsList.innerHTML = `<p class="text-center text-muted my-3">No appointments this week.</p>`;
    }

  } catch (error) {
    console.error(error);
    appointmentsList.innerHTML = `<p class="text-center text-danger my-3">Failed to load appointments.</p>`;
  }
}

// Load weekly appointments on page load
loadWeeklyAppointments();
