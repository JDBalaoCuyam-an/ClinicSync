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
  Timestamp,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* ======================================================
   OPTIMIZED & FIXED FETCH VISIT DATA FUNCTION
====================================================== */
async function fetchVisitData({ department, course, yearLevel, dateFilter }) {
  const now = new Date();
  const patientsRef = collection(db, "patients");
  const patientSnap = await getDocs(patientsRef);

  let earliestDate = null;
  const results = [];

  // Fetch consultations in parallel
  const promises = patientSnap.docs.map(async (patientDoc) => {
    const patientData = patientDoc.data();
    const consultationsRef = collection(
      db,
      "patients",
      patientDoc.id,
      "consultations"
    );
    const consultSnap = await getDocs(consultationsRef);

    consultSnap.forEach((consultDoc) => {
      const c = consultDoc.data();
      // if (!c.date || !c.time) return;

      const [year, month, day] = c.date.split("-").map(Number);
      const [hours, minutes] = c.time.split(":").map(Number);
      const visitDate = new Date(year, month - 1, day, hours, minutes, 0);
      if (isNaN(visitDate)) return;

      if (!earliestDate || visitDate < earliestDate) earliestDate = visitDate;

      results.push({
        ...c,
        patientId: patientDoc.id,
        role: patientData.role || "",
        department: patientData.department || "",
        course: patientData.course || "",
        year: patientData.year || "", //this is the year level of the student
        visitDate,
      });
    });
  });

  await Promise.all(promises);

  // --------------------------
  // DATE RANGE LOGIC
  // --------------------------
  let startDate, endDate;
  const setDate = (y, m, d, h = 0, min = 0, s = 0) =>
    new Date(y, m, d, h, min, s);

  if (dateFilter === "day") {
    startDate = setDate(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = setDate(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  } else if (dateFilter === "week") {
    const day = now.getDay(); // 0=Sun
    startDate = new Date(now);
    startDate.setDate(now.getDate() - day);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);
  } else if (dateFilter === "month") {
    startDate = new Date(now.getFullYear(), 0, 1); // Jan 1 of current year
    endDate = new Date(now.getFullYear() + 1, 0, 1); // Jan 1 of next year
  } else if (dateFilter === "year") {
    const years = results.map((v) => v.visitDate.getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    startDate = new Date(minYear, 0, 1);
    endDate = new Date(maxYear + 1, 0, 1);
  }

  // Apply DATE filter
  const dateFiltered = results.filter(
    (v) => v.visitDate >= startDate && v.visitDate < endDate
  );

  // Apply DEPARTMENT + COURSE filter
  return dateFiltered.filter((v) => {
    const deptMatch =
      !department || department === "all-dept" || v.department === department;

    const courseMatch =
      !course || course === "all-course-strand-genEduc" || v.course === course;

    const yearMatch =
      !yearLevel || yearLevel === "all-year" || v.year == yearLevel;

    return deptMatch && courseMatch && yearMatch;
  });
}

/* ============================
   VISIT CATEGORY LOGIC
============================ */
function categorizeVisit(v) {
  if (v.role) {
    const r = v.role.toLowerCase();
    if (["student", "employee", "visitor"].includes(r)) return r;
  }

  const knownDepartments = [
    "BasicEd",
    "CTE",
    "CABM",
    "CIT",
    "COT",
    "CCJE",
    "TTED",
  ];
  if (knownDepartments.includes(v.department)) return "student";

  return "visitor";
}
// ========================
// ✅ DYNAMIC CHART FILTER: DEPT → COURSE → YEAR
// ========================
const chartDept = document.getElementById("department");
const chartCourse = document.getElementById("course");
const chartYear = document.getElementById("yearLevel");

// ✅ Store original options
const allChartDeptOptions = Array.from(chartDept.options);
const allChartCourseOptions = Array.from(chartCourse.options);
const allChartYearOptions = Array.from(chartYear.options);

// ✅ Department → Courses mapping (same as before)
const chartDepartmentCourses = {
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

// ✅ Course → Year Levels mapping (same as before)
const chartCourseYears = {
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
  "Visitor": ["all-year"]
};

// ========================
// ✅ Update Chart Course List
// ========================
function updateChartCourseList() {
  const selectedDept = chartDept.value;

  // Visitor Case → show only Visitor
  if (selectedDept.toLowerCase() === "visitor") {
    chartDept.innerHTML = "";
    chartCourse.innerHTML = "";
    chartYear.innerHTML = "";

    const visitorDept = allChartDeptOptions.find(opt => opt.value === "Visitor");
    const visitorCourse = allChartCourseOptions.find(opt => opt.value === "Visitor");
    const visitorYear = allChartYearOptions.find(opt => opt.value === "all-year");

    if (visitorDept) chartDept.appendChild(visitorDept.cloneNode(true));
    if (visitorCourse) chartCourse.appendChild(visitorCourse.cloneNode(true));
    if (visitorYear) chartYear.appendChild(visitorYear.cloneNode(true));

    chartDept.disabled = true;
    chartCourse.disabled = true;
    chartYear.disabled = true;
    return;
  }

  // Restore dropdowns if previously disabled
  chartDept.disabled = false;
  chartCourse.disabled = false;
  chartYear.disabled = false;

  // Restore Departments
  chartDept.innerHTML = "";
  allChartDeptOptions.forEach(opt => chartDept.appendChild(opt.cloneNode(true)));

  // Update Courses
  chartCourse.innerHTML = "";
  const defaultCourse = allChartCourseOptions.find(opt => opt.value === "all-course-strand-genEduc");
  if (defaultCourse) chartCourse.appendChild(defaultCourse.cloneNode(true));

  if (selectedDept === "all-dept" || !chartDepartmentCourses[selectedDept.toLowerCase()]) {
    allChartCourseOptions.forEach(opt => {
      if (opt.value !== "all-course-strand-genEduc") chartCourse.appendChild(opt.cloneNode(true));
    });
  } else {
    const deptKey = selectedDept.toLowerCase();
    chartDepartmentCourses[deptKey].forEach(courseName => {
      const match = allChartCourseOptions.find(opt => opt.textContent.trim() === courseName);
      if (match) chartCourse.appendChild(match.cloneNode(true));
    });
  }

  chartCourse.value = "all-course-strand-genEduc";
  updateChartYearList();
}

// ========================
// ✅ Update Chart Year List
// ========================
function updateChartYearList() {
  const selectedCourse = chartCourse.value;

  chartYear.innerHTML = "";
  const defaultYear = allChartYearOptions.find(opt => opt.value === "all-year");
  if (defaultYear) chartYear.appendChild(defaultYear.cloneNode(true));

  if (selectedCourse === "all-course-strand-genEduc" || !chartCourseYears[selectedCourse]) {
    allChartYearOptions.forEach(opt => {
      if (opt.value !== "all-year") chartYear.appendChild(opt.cloneNode(true));
    });
  } else {
    chartCourseYears[selectedCourse].forEach(yearValue => {
      const match = allChartYearOptions.find(opt => opt.value === yearValue);
      if (match) chartYear.appendChild(match.cloneNode(true));
    });
  }

  chartYear.value = "all-year";
}

// ========================
// ✅ Event Listeners
// ========================
chartDept.addEventListener("change", updateChartCourseList);
chartCourse.addEventListener("change", updateChartYearList);

/* ============================
   FINAL FIXED CHART GROUPING
============================ */
function formatChartData(visits, dateFilter) {
  const months = [
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
  ];
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const grouping = {};

  let labels = [];

  if (dateFilter === "week") labels = [...weekdays];
  else if (dateFilter === "month")
    labels = months; // months as labels for month view
  else if (dateFilter === "day")
    labels = Array.from(
      { length: 24 },
      (_, i) => i.toString().padStart(2, "0") + ":00"
    );
  else if (dateFilter === "year") {
    // Dynamic year range
    const years = visits.map((v) => v.visitDate.getFullYear());
    const minYear = Math.min(...years);
    const maxYear = new Date().getFullYear();
    for (let y = minYear; y <= maxYear; y++) labels.push(y.toString());
  }

  // Pre-populate grouping with zeros
  labels.forEach((lbl) => {
    grouping[lbl] = { student: 0, employee: 0, visitor: 0 };
  });

  // Count visits
  visits.forEach((v) => {
    let ts = v.visitDate instanceof Date ? v.visitDate : new Date(v.visitDate);
    if (isNaN(ts)) return;

    let label;
    if (dateFilter === "day")
      label = ts.getHours().toString().padStart(2, "0") + ":00";
    else if (dateFilter === "week")
      label = weekdays[(ts.getDay() + 6) % 7]; // Mon=0
    else if (dateFilter === "month") label = months[ts.getMonth()];
    else if (dateFilter === "year") label = ts.getFullYear().toString();

    const cat = categorizeVisit(v);
    grouping[label][cat]++;
  });

  const student = [],
    employee = [],
    visitor = [];
  labels.forEach((lbl) => {
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
  const yearLevel = document.querySelector("select[name='yearLevel']").value;

  const visits = await fetchVisitData({
    department,
    course,
    yearLevel,
    dateFilter,
  });

  const { labels, student, employee, visitor } = formatChartData(
    visits,
    dateFilter
  );

  const data = {
    labels,
    datasets: [
      { label: "Student", data: student, borderWidth: 2, tension: 0.3 },
      { label: "Employee", data: employee, borderWidth: 2, tension: 0.3 },
      { label: "Visitor", data: visitor, borderWidth: 2, tension: 0.3 },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true } },
    interaction: { mode: "index", intersect: false },

    plugins: {
      tooltip: {
        callbacks: {
          label: function (context) {
            const dataset = context.dataset.data;
            const total = context.chart.data.datasets.reduce((sum, ds) => {
              return sum + (ds.data[context.dataIndex] || 0);
            }, 0);

            const value = context.raw;
            const percent = total ? ((value / total) * 100).toFixed(1) : 0;

            return `${context.dataset.label}: ${value} (${percent}%)`;
          },
        },
      },
    },
  };

  if (visitsChart) visitsChart.destroy();
  visitsChart = new Chart(visitsCtx, { type: "line", data, options });
}

/* ============================
   FILTER TRIGGERS
============================ */
document.querySelectorAll(".chart-filter").forEach((sel) => {
  sel.addEventListener("change", () => {
    const timeframe = document.querySelector("select[name='time']").value;
    renderVisitsChart(timeframe);
  });
});

/* DEFAULT LOAD */
renderVisitsChart("week");

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
  const selectedDept = deptComplaint.value;

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

    // Disable all
    deptComplaint.disabled = true;
    courseComplaint.disabled = true;
    yearComplaint.disabled = true;
    return;
  }

  // Restore dropdowns if previously disabled
  deptComplaint.disabled = false;
  courseComplaint.disabled = false;
  yearComplaint.disabled = false;

  // Restore Departments
  deptComplaint.innerHTML = "";
  allDeptComplaintOptions.forEach(opt => deptComplaint.appendChild(opt.cloneNode(true)));

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
  const options = {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  };
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
  const todaysAppointments = appointments.filter((appt) => {
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

  todaysAppointments.forEach((appt) => {
    const apptDiv = document.createElement("div");
    apptDiv.className = "appointment-item onclick window href";
    apptDiv.innerHTML = `
      <div class="patient-info">
        <div class="patient-name">${appt.person || "-"}</div>
        <div class="appointment-time">⏰${appt.date} ${appt.time || "-"}</div>
        <div class="doctor-name">👨‍⚕️ ${appt.doctor || "-"}</div>
        <div class="appointment-details">🗒️ ${
          appt.details || "No details provided"
        }</div>
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
