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



// Attach all filters
// [dateFromInput, dateToInput, departmentInput, courseInput, yearLevelInput].forEach(el =>
//   el.addEventListener("change", loadVisitsChart)
// );


/* ===========================================
Chief Complaints Chart
=========================================== */
let complaintsChart;
const complaintsCtx = document
  .getElementById("complaintsChart")
  .getContext("2d");

const deptFilter = document.getElementById("departmentComplaintFilter");
const courseFilter = document.getElementById("courseComplaintFilter");
const startDateFilter = document.getElementById("startDateFilter");
const endDateFilter = document.getElementById("endDateFilter");

const yearLevelFilter = document.getElementById("yearLevelComplaintFilter");

/* ===============================
   PRELOAD PATIENTS (1-time only)
=============================== */
let patientCache = null;

async function loadAllPatientsOnce() {
  if (patientCache) return patientCache;

  const snap = await getDocs(collection(db, "patients"));

  const map = {};
  snap.forEach((doc) => {
    map[doc.id] = doc.data();
  });

  patientCache = map;
  return map;
}

/* ===============================
   LOAD + FILTER COMPLAINTS
=============================== */
async function loadComplaints(
  departmentFilter = "all-dept",
  courseFilterValue = "all-course-strand-genEduc",
  yearLevelValue = "all-yearLevel"
) {
  try {
    // ==============================
    // 1️⃣ Read FROM–TO Date Filters
    // ==============================
    const start = startDateFilter.value
      ? new Date(startDateFilter.value + "T00:00:00")
      : new Date("1970-01-01");

    const end = endDateFilter.value
      ? new Date(endDateFilter.value + "T23:59:59")
      : new Date();

    // ==============================
    // 2️⃣ Load all patients (cached)
    // ==============================
    const patients = await loadAllPatientsOnce();

    // ==============================
    // 3️⃣ Load complaints collection
    // ==============================
    const complaintSnap = await getDocs(collection(db, "complaintRecords"));

    const complaintCounts = {};

    for (const rec of complaintSnap.docs) {
      const { patientId, consultationId } = rec.data();
      if (!patientId || !consultationId) continue;

      const patient = patients[patientId] || {};

      // Department filter
      if (
        departmentFilter !== "all-dept" &&
        patient.department !== departmentFilter
      )
        continue;

      // Course filter
      if (
        courseFilterValue !== "all-course-strand-genEduc" &&
        patient.course !== courseFilterValue
      )
        continue;

      // Year Level filter
      if (
        yearLevelValue !== "all-yearLevel" &&
        String(patient.year) !== String(yearLevelValue)
      )
        continue;

      // ==============================
      // 4️⃣ Load consultation document
      // ==============================
      const consultRef = doc(
        db,
        "patients",
        patientId,
        "consultations",
        consultationId
      );
      const consultSnap = await getDoc(consultRef);
      if (!consultSnap.exists()) continue;

      const consultData = consultSnap.data();

      const dateStr = consultData.date;
      const timeStr = consultData.time;
      if (!dateStr || !timeStr) continue;

      const recordDate = new Date(`${dateStr}T${timeStr}:00`);
      if (isNaN(recordDate)) continue;

      // ==============================
      // 5️⃣ Date Range Filter (From – To)
      // ==============================
      if (recordDate < start || recordDate > end) continue;

      // ==============================
      // 6️⃣ Count complaint
      // ==============================
      const complaint = (consultData.complaint || "").trim();
      if (!complaint) continue;

      complaintCounts[complaint] = (complaintCounts[complaint] || 0) + 1;
    }

    renderComplaintsChart(
      Object.keys(complaintCounts),
      Object.values(complaintCounts)
    );
  } catch (err) {
    console.error("❌ Error loading complaints:", err);
  }
}
// ========================
// ✅ DYNAMIC COMPLAINT FILTER: DEPT → COURSE → YEAR
// ========================
const deptComplaint = document.getElementById("departmentComplaintFilter");
const courseComplaint = document.getElementById("courseComplaintFilter");
const yearComplaint = document.getElementById("yearLevelComplaintFilter");

// ✅ Store original options
const allDeptComplaintOptions = Array.from(deptComplaint.options);
const allCourseComplaintOptions = Array.from(courseComplaint.options);
const allYearComplaintOptions = Array.from(yearComplaint.options);

// ✅ Department → Courses mapping
const departmentCoursesComplaint = {
  basiced: [
    "Kindergarten",
    "Elementary",
    "Junior Highschool",
    "Accountancy and Business Management",
    "Science, Technology, Engineering, and Mathematics",
    "Humanities and Sciences",
  ],
  cabm: [
    "Bachelor of Science in Accountancy",
    "Bachelor of Science in Office Administration",
    "Bachelor of Science in Hospitality Management",
    "Bachelor of Science in Business Administration",
  ],
  cte: [
    "Bachelor of Elementary Education",
    "Bachelor of Science in Psychology",
    "Bachelor of Science in Social Work",
    "Bachelor of Secondary Education",
    "Technical Vocational Teacher Education",
  ],
  cit: ["Bachelor of Science in Information Technology"],
  tted: ["NC1 NC2 NC3"],
  cot: ["Bachelor of Theology"],
  ccje: ["Bachelor of Science in Criminology"],
  visitor: ["Visitor"],
};

// ✅ Course → Year Levels mapping
const courseYearsComplaint = {
  "Kindergarten": ["1","2"],
  "Elementary": ["1","2","3","4","5","6"],
  "Junior Highschool": ["7","8","9","10"],
  "Accountancy and Business Management": ["11","12"],
  "Science, Technology, Engineering, and Mathematics": ["11","12"],
  "Humanities and Sciences": ["11","12"],
  "Bachelor of Science in Accountancy": ["1","2","3","4"],
  "Bachelor of Science in Office Administration": ["1","2","3","4"],
  "Bachelor of Science in Hospitality Management": ["1","2","3","4"],
  "Bachelor of Science in Business Administration": ["1","2","3","4"],
  "Bachelor of Elementary Education": ["1","2","3","4"],
  "Bachelor of Science in Psychology": ["1","2","3","4"],
  "Bachelor of Science in Social Work": ["1","2","3","4"],
  "Bachelor of Secondary Education": ["1","2","3","4"],
  "Technical Vocational Teacher Education": ["1","2","3"],
  "Bachelor of Science in Information Technology": ["1","2","3","4"],
  "NC1 NC2 NC3": ["1","2","3"],
  "Bachelor of Theology": ["1","2","3","4"],
  "Bachelor of Science in Criminology": ["1","2","3","4"],
  "Visitor": ["all-yearLevel"]
};
// ========================
// ✅ Update Course List for Complaint Filter
// ========================
function updateComplaintCourseList() {
  const selectedDept = deptComplaint.value; // store current selection

  // Visitor Case → show only Visitor
  if (selectedDept.toLowerCase() === "visitor") {
    deptComplaint.innerHTML = "";
    courseComplaint.innerHTML = "";
    yearComplaint.innerHTML = "";

    const visitorDept = allDeptComplaintOptions.find(opt => opt.value === "Visitor");
    const visitorCourse = allCourseComplaintOptions.find(opt => opt.value === "Visitor");
    const visitorYear = allYearComplaintOptions.find(opt => opt.value === "all-yearLevel");

    if (visitorDept) deptComplaint.appendChild(visitorDept.cloneNode(true));
    if (visitorCourse) courseComplaint.appendChild(visitorCourse.cloneNode(true));
    if (visitorYear) yearComplaint.appendChild(visitorYear.cloneNode(true));

    // Disable all dropdowns
    deptComplaint.disabled = true;
    courseComplaint.disabled = true;
    yearComplaint.disabled = true;
    return;
  }

  // Restore dropdowns if previously disabled
  deptComplaint.disabled = false;
  courseComplaint.disabled = false;
  yearComplaint.disabled = false;

  // Restore Departments and preserve selection
  deptComplaint.innerHTML = "";
  allDeptComplaintOptions.forEach(opt => deptComplaint.appendChild(opt.cloneNode(true)));
  deptComplaint.value = selectedDept;

  // Update Courses
  courseComplaint.innerHTML = "";
  const defaultCourse = allCourseComplaintOptions.find(opt => opt.value === "all-course-strand-genEduc");
  if (defaultCourse) courseComplaint.appendChild(defaultCourse.cloneNode(true));

  if (selectedDept === "all-dept" || !departmentCoursesComplaint[selectedDept.toLowerCase()]) {
    allCourseComplaintOptions.forEach(opt => {
      if (opt.value !== "all-course-strand-genEduc") courseComplaint.appendChild(opt.cloneNode(true));
    });
  } else {
    const deptKey = selectedDept.toLowerCase();
    departmentCoursesComplaint[deptKey].forEach(courseName => {
      const match = allCourseComplaintOptions.find(opt => opt.textContent.trim() === courseName);
      if (match) courseComplaint.appendChild(match.cloneNode(true));
    });
  }

  courseComplaint.value = "all-course-strand-genEduc";
  updateComplaintYearList();
}

// ========================
// ✅ Update Year List for Complaint Filter
// ========================
function updateComplaintYearList() {
  const selectedCourse = courseComplaint.value;

  yearComplaint.innerHTML = "";
  const defaultYear = allYearComplaintOptions.find(opt => opt.value === "all-yearLevel");
  if (defaultYear) yearComplaint.appendChild(defaultYear.cloneNode(true));

  if (selectedCourse === "all-course-strand-genEduc" || !courseYearsComplaint[selectedCourse]) {
    allYearComplaintOptions.forEach(opt => {
      if (opt.value !== "all-yearLevel") yearComplaint.appendChild(opt.cloneNode(true));
    });
  } else {
    courseYearsComplaint[selectedCourse].forEach(yearValue => {
      const match = allYearComplaintOptions.find(opt => opt.value === yearValue);
      if (match) yearComplaint.appendChild(match.cloneNode(true));
    });
  }

  yearComplaint.value = "all-yearLevel";
}

// ========================
// ✅ Event Listeners
// ========================
deptComplaint.addEventListener("change", updateComplaintCourseList);
courseComplaint.addEventListener("change", updateComplaintYearList);


/* ===============================
   RENDER BAR CHART
=============================== */
function renderComplaintsChart(labels, values) {
  if (complaintsChart) complaintsChart.destroy();

  const total = values.reduce((a, b) => a + b, 0);

  complaintsChart = new Chart(complaintsCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "No. of Complaints",
          data: values,
          backgroundColor: "rgba(54, 162, 235, 0.7)",
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: { display: false },
        title: { display: true, text: "Chief Complaints" },

        tooltip: {
          callbacks: {
            label: function (context) {
              const value = context.raw;
              const percent =
                total > 0 ? ((value / total) * 100).toFixed(1) : 0;

              return `Count: ${value} (${percent}%)`;
            },
          },
        },
      },

      scales: {
        y: { beginAtZero: true },
        x: {},
      },
    },
  });
}

/* ===============================
   FILTER HANDLERS
=============================== */
function applyFilters() {
  loadComplaints(deptFilter.value, courseFilter.value, yearLevelFilter.value);
}

deptFilter.addEventListener("change", applyFilters);
courseFilter.addEventListener("change", applyFilters);
startDateFilter.addEventListener("change", applyFilters);
endDateFilter.addEventListener("change", applyFilters);
yearLevelFilter.addEventListener("change", applyFilters);

/* ===============================
   DEFAULT LOAD
=============================== */
function setDefaultCurrentMonth() {
  const now = new Date();

  // 1st day of the month
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  // Today
  const today = now.toISOString().split("T")[0];

  startDateFilter.value = firstDay;
  endDateFilter.value = today;
}
setDefaultCurrentMonth();
loadComplaints("all-dept", "all-course-strand-genEduc", "all-yearLevel");

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
