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
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ✅ Function to count today's visits
async function getTodayVisitCount() {
  try {
    const visitsRef = collection(db, "PatientVisits");

    // Get start and end of current day (LOCAL time)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);

    // Convert to Firestore Timestamps
    const startTimestamp = Timestamp.fromDate(startOfDay);
    const endTimestamp = Timestamp.fromDate(endOfDay);

    // Query Firestore
    const q = query(
      visitsRef,
      where("timestamp", ">=", startTimestamp),
      where("timestamp", "<", endTimestamp),
      orderBy("timestamp", "asc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.size; // ✅ returns how many visits today
  } catch (error) {
    console.error("Error fetching today's visits:", error);
    return 0;
  }
}

// ✅ Update the card UI
async function updateTodayVisitsCard() {
  const count = await getTodayVisitCount();
  document.getElementById("todayVisits").textContent = count;
}

// ✅ Auto-run when the page loads
document.addEventListener("DOMContentLoaded", updateTodayVisitsCard);
/* ============================
   FIREBASE FETCH
============================ */
async function fetchVisitData({ department, course, dateFilter }) {
  const visitsRef = collection(db, "PatientVisits");
  let q = visitsRef;

  // ✅ Compute start and end (UTC-based)
  const now = new Date();
  let startDate = null;
  let endDate = null;

  if (dateFilter === "day") {
    startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  } else if (dateFilter === "week") {
    const day = now.getUTCDay();
    startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
    endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 7);
  } else if (dateFilter === "month") {
    startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  } else if (dateFilter === "year") {
    startDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    endDate = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));
  }

  const startTimestamp = startDate ? Timestamp.fromDate(startDate) : null;
  const endTimestamp = endDate ? Timestamp.fromDate(endDate) : null;

  // ✅ Safe query with index handling
  try {
    if (startTimestamp && endTimestamp) {
      q = query(
        visitsRef,
        orderBy("timestamp", "asc"),
        where("timestamp", ">=", startTimestamp),
        where("timestamp", "<", endTimestamp)
      );
    } else if (startTimestamp) {
      q = query(visitsRef, orderBy("timestamp", "asc"), where("timestamp", ">=", startTimestamp));
    } else {
      q = query(visitsRef, orderBy("timestamp", "asc"));
    }

    const qSnap = await getDocs(q);
    const visits = [];

    for (const docSnap of qSnap.docs) {
      const visit = docSnap.data();
      if (!visit.timestamp) continue;

      // Fetch patient info
      const patientRef = doc(db, "patients", visit.patientId);
      const patientSnap = await getDoc(patientRef);
      const patientData = patientSnap.exists() ? patientSnap.data() : {};

      visits.push({
        ...visit,
        role: patientData.role || "",
        department: patientData.department || "",
        course: patientData.course || "",
      });
    }

    // ✅ Apply department & course filters
    return visits.filter((v) => {
      const deptMatch =
        !department || department === "all-dept" || v.department === department;
      const courseMatch =
        !course || course === "all-course-strand-genEduc" || v.course === course;
      return deptMatch && courseMatch;
    });
  } catch (error) {
    console.error("Firestore filter failed:", error.message);
    // fallback → fetch all
    const allSnap = await getDocs(visitsRef);
    const allVisits = [];
    for (const docSnap of allSnap.docs) {
      const visit = docSnap.data();
      if (!visit.timestamp) continue;
      allVisits.push(visit);
    }
    return allVisits;
  }
}

/* ============================
   CATEGORY GROUPING
============================ */
function categorizeVisit(v) {
  if (v.role) {
    const r = v.role.toLowerCase();
    if (["student", "employee", "visitor"].includes(r)) return r;
  }

  // fallback: if no role, treat all department members as student by default
  const knownDepartments = ["BasicEd", "CTE", "CABM", "CIT", "COT", "CCJE", "TTED"];
  if (knownDepartments.includes(v.department)) return "student";

  return "visitor";
}

/* ============================
   DYNAMIC COURSE FILTER
============================ */
const departmentSelect = document.getElementById("department");
const courseSelect = document.getElementById("course");

// ✅ Store all original course options
const allCourses = Array.from(courseSelect.options);

// ✅ Mapping of department → allowed courses
const departmentCourses = {
  BasicEd: [
    "Kindergarten",
    "Elementary",
    "Junior Highschool",
    "Accountancy and Business Management",
    "Science, Technology, Engineering, and Mathematics",
    "Humanities and Sciences",
  ],
  CABM: [
    "Bachelor of Science in Accountancy",
    "Bachelor of Science in Office Administration",
    "Bachelor of Science in Hospitality Management",
  ],
  CTE: [
    "Bachelor of Science in Psychology",
    "Bachelor of Elementary Education",
    "Bachelor of Science in Social Work",
    "Bachelor of Secondary Education",
    "Technical Vocational Teacher Education",
  ],
  CIT: ["Bachelor of Science in Information Technology"],
  TTED: ["NC1 NC2 NC3"],
  COT: ["Bachelor of Theology"],
  CCJE: ["Bachelor of Science in Criminology"],
  Visitor: ["Visitor"],
};

// ✅ Listen for department change
departmentSelect.addEventListener("change", () => {
  const selectedDept = departmentSelect.value;

  // ✅ Keep "All Course/Strand/GenEduc" option
  const defaultOption = allCourses.find(
    (opt) => opt.value === "all-course-strand-genEduc"
  );

  // Clear existing options
  courseSelect.innerHTML = "";
  if (defaultOption) courseSelect.appendChild(defaultOption.cloneNode(true));

  if (selectedDept === "all-dept" || !departmentCourses[selectedDept]) {
    // ✅ Restore all if "All Department" or unknown
    allCourses.forEach((opt) => {
      if (opt.value !== "all-course-strand-genEduc")
        courseSelect.appendChild(opt.cloneNode(true));
    });
  } else {
    // ✅ Show only matching courses
    departmentCourses[selectedDept].forEach((courseName) => {
      const match = allCourses.find((opt) => opt.textContent.includes(courseName));
      if (match) courseSelect.appendChild(match.cloneNode(true));
    });
  }

  // Trigger chart re-render after filtering
  renderVisitsChart(document.querySelectorAll(".chart-filter")[2].value);
});

/* ============================
   DATA GROUPING FOR CHART
============================ */
function formatChartData(visits, dateFilter) {
  const grouping = {};

  visits.forEach((v) => {
    // ✅ Ensure valid timestamp
    const ts = v.timestamp?.toDate ? v.timestamp.toDate() : new Date();
    let label = "";

    // ✅ Label logic (consistent ordering and formatting)
    if (dateFilter === "day") {
      label = ts.getHours().toString().padStart(2, "0") + ":00";
    } else if (dateFilter === "week") {
      label = ts.toLocaleDateString("en-US", { weekday: "short" }); // e.g. Mon, Tue
    } else if (dateFilter === "month") {
      const weekNum = Math.ceil(ts.getDate() / 7);
      label = "Week " + weekNum;
    } else if (dateFilter === "year") {
      label = ts.toLocaleDateString("en-US", { month: "short" }); // e.g. Jan, Feb
    } else {
      label = ts.toISOString().split("T")[0]; // default YYYY-MM-DD
    }

    // ✅ Initialize if label not yet seen
    if (!grouping[label]) {
      grouping[label] = { student: 0, employee: 0, visitor: 0 };
    }

    // ✅ Categorize visit (student / employee / visitor)
    const cat = categorizeVisit(v);
    if (grouping[label][cat] !== undefined) grouping[label][cat]++;
  });

  // ✅ Sort labels in chronological order
  const sortedLabels = Object.keys(grouping).sort((a, b) => {
    if (dateFilter === "day") {
      // "08:00" → 8, "14:00" → 14
      return parseInt(a) - parseInt(b);
    } else if (dateFilter === "week") {
      // Maintain Mon–Sun order
      const order = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return order.indexOf(a) - order.indexOf(b);
    } else if (dateFilter === "month") {
      // Week 1 → Week 2 → Week 3
      return parseInt(a.replace("Week ", "")) - parseInt(b.replace("Week ", ""));
    } else if (dateFilter === "year") {
      // Month order (Jan → Dec)
      const order = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return order.indexOf(a) - order.indexOf(b);
    } else {
      // Default ISO date sort
      return new Date(a) - new Date(b);
    }
  });

  // ✅ Build chart data arrays
  const labels = [];
  const student = [];
  const employee = [];
  const visitor = [];

  sortedLabels.forEach((lbl) => {
    labels.push(lbl);
    student.push(grouping[lbl].student);
    employee.push(grouping[lbl].employee);
    visitor.push(grouping[lbl].visitor);
  });

  return { labels, student, employee, visitor };
}


/* ============================
   CHART INITIALIZATION
============================ */
let visitsChart;
const visitsCtx = document.getElementById("visitsChart").getContext("2d");

async function renderVisitsChart(dateFilter = "week") {
  const department = document.querySelector("select[name='department']").value;
  const course = document.querySelector("select[name='course']").value;

  // ✅ Fetch from Firestore not mock
  const visits = await fetchVisitData({ department, course, dateFilter });

  const { labels, student, employee, visitor } = formatChartData(visits, dateFilter);

  const data = {
    labels,
    datasets: [
      {
        label: "Student",
        data: student,
        borderWidth: 2,
        tension: 0.3,
      },
      {
        label: "Employee",
        data: employee,
        borderWidth: 2,
        tension: 0.3,
      },
      {
        label: "Visitor",
        data: visitor,
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

/* ============================
   FILTER TRIGGERS
============================ */
document.querySelectorAll(".chart-filter").forEach((sel) => {
  sel.addEventListener("change", () => {
    const timeframe = document.querySelectorAll(".chart-filter")[2].value;
    renderVisitsChart(timeframe);
  });
});

/* DEFAULT LOAD */
renderVisitsChart("week");


/* ===========================================
Chief Complaints Chart with Department & Course Filters
=========================================== */
let complaintsChart;
const complaintsCtx = document.getElementById("complaintsChart").getContext("2d");

// === SELECT ELEMENTS ===
const deptFilter = document.getElementById("departmentComplaintFilter");
const courseFilter = document.getElementById("courseComplaintFilter");
const dateFilter = document.getElementById("complaintChartFilter");

// 🕒 GET START + END DATE RANGE
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

// 📊 LOAD CHIEF COMPLAINTS
async function loadComplaints(
  timeFilter = "week",
  departmentFilter = "all-dept",
  courseFilterValue = "all-course-strand-genEduc"
) {
  try {
    const { start, end } = getDateRange(timeFilter);

    // ✅ Directly read all consultation documents
    const consultRef = collection(db, "complaintRecords");
    const consultSnap = await getDocs(consultRef);

    const complaintCounts = {};

    for (const docSnap of consultSnap.docs) {
      const data = docSnap.data();
      const complaint = (data.complaint || "").trim();
      const recordDate = data.timestamp?.toDate?.() ?? null;
if (!recordDate || recordDate < start || recordDate > end) continue;


      // Filter only consultations within date range
      if (!recordDate || recordDate < start || recordDate > end) continue;

      // 🔍 Fetch patient info to apply department/course filters
      const patientRef = doc(db, "patients", data.patientId);
      const patientSnap = await getDoc(patientRef);
      const patient = patientSnap.exists() ? patientSnap.data() : {};

      // Department filter
      if (
        departmentFilter !== "all-dept" &&
        patient.department !== departmentFilter
      )
        continue;

      // Course/Strand filter
      if (
        courseFilterValue !== "all-course-strand-genEduc" &&
        patient.course !== courseFilterValue
      )
        continue;

      // ✅ Count complaints
      if (complaint) {
        complaintCounts[complaint] = (complaintCounts[complaint] || 0) + 1;
      }
    }

    const labels = Object.keys(complaintCounts);
    const values = Object.values(complaintCounts);

    renderComplaintsChart(labels, values);

    if (labels.length === 0) {
      console.warn("No complaints found within the selected date range.");
    }
  } catch (err) {
    console.error("❌ Error loading complaints:", err);
  }
}


  //  DYNAMIC COURSE FILTER for Chief Complaints

const deptComplaintSelect = document.getElementById("departmentComplaintFilter");
const courseComplaintSelect = document.getElementById("courseComplaintFilter");

// ✅ Store all original course options
const allComplaintCourses = Array.from(courseComplaintSelect.options);

// ✅ Department → allowed course mapping
const departmentComplaintCourses = {
  BasicEd: [
    "Kindergarten",
    "Elementary",
    "Junior Highschool",
    "Accountancy and Business Management",
    "Science, Technology, Engineering, and Mathematics",
    "Humanities and Sciences",
  ],
  CABM: [
    "Bachelor of Science in Accountancy",
    "Bachelor of Science in Office Administration",
    "Bachelor of Science in Hospitality Management",
  ],
  CTE: [
    "Bachelor of Science in Psychology",
    "Bachelor of Elementary Education",
    "Bachelor of Science in Social Work",
    "Bachelor of Secondary Education",
    "Technical Vocational Teacher Education",
  ],
  CIT: ["Bachelor of Science in Information Technology"],
  TTED: ["NC1 NC2 NC3"],
  COT: ["Bachelor of Theology"],
  CCJE: ["Bachelor of Science in Criminology"],
  Visitor: ["Visitor"],
};

// ✅ Listen for department change
deptComplaintSelect.addEventListener("change", () => {
  const selectedDept = deptComplaintSelect.value;

  // ✅ Keep "All Course/Strand/GenEduc" option
  const defaultOption = allComplaintCourses.find(
    (opt) => opt.value === "all-course-strand-genEduc"
  );

  // Clear old options
  courseComplaintSelect.innerHTML = "";
  if (defaultOption) courseComplaintSelect.appendChild(defaultOption.cloneNode(true));

  if (selectedDept === "all-dept" || !departmentComplaintCourses[selectedDept]) {
    // ✅ Restore all courses
    allComplaintCourses.forEach((opt) => {
      if (opt.value !== "all-course-strand-genEduc")
        courseComplaintSelect.appendChild(opt.cloneNode(true));
    });
  } else {
    // ✅ Add only matching courses
    departmentComplaintCourses[selectedDept].forEach((courseName) => {
      const match = allComplaintCourses.find((opt) =>
        opt.textContent.includes(courseName)
      );
      if (match) courseComplaintSelect.appendChild(match.cloneNode(true));
    });
  }

  // ✅ Auto-reset course filter to default for cleaner filtering
  courseComplaintSelect.value = "all-course-strand-genEduc";

  // ✅ Refresh chart after filtering
  applyFilters();
});

// 🎨 RENDER BAR CHART
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

// 🔄 FILTER CHANGE HANDLERS
function applyFilters() {
  const timeFilter = dateFilter.value;
  const departmentFilter = deptFilter.value;
  const courseFilterValue = courseFilter.value;

  loadComplaints(timeFilter, departmentFilter, courseFilterValue);
}

deptFilter.addEventListener("change", applyFilters);
courseFilter.addEventListener("change", applyFilters);
dateFilter.addEventListener("change", applyFilters);

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
const appointmentsList = document.getElementById("appointmentsList");
const currentDateTimeSpan = document.getElementById("currentDateTime");

let appointments = [];

// Utility: format date to YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

// Display current date/time
function displayCurrentDate() {
  const now = new Date();
  const options = { weekday: "long", month: "short", day: "numeric", year: "numeric" };
  currentDateTimeSpan.textContent = now.toLocaleDateString(undefined, options);
}

// Load appointments from Firestore
async function loadAppointments() {
  appointments = [];
  const querySnapshot = await getDocs(collection(db, "schedules"));

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    appointments.push({ id: docSnap.id, ...data });
  });

  renderAppointments();
}

// Render only today's appointments
function renderAppointments() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`; // e.g., "2025-11-09"

  appointmentsList.innerHTML = "";

  // Filter appointments for today, upcoming status, and not in the past
  const todaysAppointments = appointments.filter(appt => {
    if (appt.date !== todayStr) return false;
    if (appt.status !== "upcoming") return false; // Only show upcoming appointments
    
    if (!appt.time) return true; // If no time, assume it's still valid

    const [hours, minutes] = appt.time.split(":").map(Number);
    const apptDateTime = new Date(yyyy, now.getMonth(), dd, hours, minutes);

    return apptDateTime >= now;
  });

  if (todaysAppointments.length === 0) {
    appointmentsList.innerHTML = `<p class="no-appointments">No upcoming appointments for today.</p>`;
    return;
  }

  todaysAppointments.forEach(appt => {
    const apptDiv = document.createElement("div");
    apptDiv.className = "appointment-item onclick window href";
    apptDiv.innerHTML = `
      <div class="patient-info">
        <div class="patient-name">${appt.person || "-"}</div>
        <div class="appointment-time">⏰${appt.date} ${appt.time || "-"}</div>
        <div class="doctor-name">👨‍⚕️ ${appt.doctor || "-"}</div>
        <div class="appointment-details">🗒️ ${appt.details || "No details provided"}</div>
      </div>
    `;
     // ✅ Make the whole div clickable
  apptDiv.addEventListener("click", () => {
    // Example: redirect to an appointment details page
    window.location.href = `Schedules.html`;
  });

  // Optional: make it look clickable with CSS
  apptDiv.style.cursor = "pointer";
    appointmentsList.appendChild(apptDiv);
  });
}

// Initialize
displayCurrentDate();
loadAppointments();

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