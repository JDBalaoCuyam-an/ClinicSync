import { db } from "../../firebaseconfig.js";
import {
  collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const patientTableBody = document.querySelector(".records-table tbody");
const searchQuery = document.getElementById("searchQuery");
const filterRole = document.getElementById("filterRole");
const filterDept = document.getElementById("filterDept");
const filterCourse = document.getElementById("filterCourse");
const filterYear = document.getElementById("filterYear");

const patientsRef = collection(db, "users");
let allPatients = []; // store all fetched data
async function loadFilterDepartmentsAndCourses() {
  const deptSelect = document.getElementById("filterDept");
  const courseSelect = document.getElementById("filterCourse");

  if (!deptSelect || !courseSelect) return;

  // Initial loading state
  deptSelect.innerHTML = `<option value="alldept">Loading departments...</option>`;
  courseSelect.innerHTML = `<option value="allcourse">All Course/Strand/GE</option>`;

  try {
    const snap = await getDocs(collection(db, "Departments"));

    // Reset with default "All" options
    deptSelect.innerHTML = `<option value="alldept">All Department</option>`;
    courseSelect.innerHTML = `<option value="allcourse">All Course/Strand/GE</option>`;

    if (snap.empty) {
      deptSelect.innerHTML = `<option value="alldept">No departments found</option>`;
      return;
    }

    // Map: department → courses[]
    const departmentsMap = new Map();

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const deptName = data.name;       // e.g. CABM, CIT, etc.
      const courses = data.courses || [];

      // Populate department filter
      const opt = document.createElement("option");
      opt.value = deptName;
      opt.textContent = deptName;
      deptSelect.appendChild(opt);

      departmentsMap.set(deptName, courses);
    });

    // === When department filter changes ===
    deptSelect.addEventListener("change", () => {
      const selectedDept = deptSelect.value;

      // Always reset course filter
      courseSelect.innerHTML = `<option value="allcourse">All Course/Strand/GE</option>`;

      // If "All Department", do not filter courses
      if (selectedDept === "alldept") return;

      const courses = departmentsMap.get(selectedDept) || [];

      if (courses.length === 0) {
        courseSelect.innerHTML += `<option value="">No courses available</option>`;
        return;
      }

      courses.forEach((course) => {
        const opt = document.createElement("option");
        opt.value = course;
        opt.textContent = course;
        courseSelect.appendChild(opt);
      });
    });
  } catch (err) {
    console.error("Error loading department filters:", err);
    deptSelect.innerHTML = `<option value="alldept">Error loading</option>`;
  }
}

// Call once on page load
loadFilterDepartmentsAndCourses();

// ======================================================
// ✅ Load only STUDENT and EMPLOYEE users
// ======================================================
async function loadPatients() {
  patientTableBody.innerHTML = "";

  const snapshot = await getDocs(patientsRef);
  allPatients = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    // only student + employee
    if (data.user_type === "student" || data.user_type === "employee") {
      allPatients.push({ id: docSnap.id, ...data });
    }
  });

  displayPatients(allPatients);
}

// ======================================================
// ✅ Display Patients
// ======================================================
function displayPatients(patients) {
  patientTableBody.innerHTML = "";

  if (patients.length === 0) {
    patientTableBody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;">No matching records found</td></tr>';
    return;
  }

  patients.forEach((data) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${data.lastName}</strong>, ${data.firstName} ${
      data.middleName || ""
    }</td>
      <td>${data.schoolId || "-"}</td>
      <td>${data.department || "-"}</td>
      <td>${data.course || "-"}</td>
      <td>${data.year || "-"}</td>
      <td>${data.user_type}</td>
      <td>${data.email || "-"}</td>
    `;
    row.onclick = () => {
      window.location.href = "ViewPatient.html?id=" + data.id;
    };
    patientTableBody.appendChild(row);
  });
}

// ================================
// Combined Search: Name OR ID
// ================================
function filterPatients() {
  const query = searchQuery.value.toLowerCase();
  const roleFilter = filterRole.value;
  const deptFilter = filterDept.value;
  const courseFilter = filterCourse.value;
  const yearFilter = filterYear.value;

  const filtered = allPatients.filter((p) => {
    // ======================
    // Search (Name or ID)
    // ======================
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    const idValue = p.schoolId?.toLowerCase() || "";

    const matchesSearch =
      fullName.includes(query) || idValue.includes(query);

    // ======================
    // Role
    // ======================
    const matchesRole =
      roleFilter === "all" ||
      p.user_type?.toLowerCase() === roleFilter;

    // ======================
    // Department
    // ======================
    const matchesDept =
      deptFilter === "alldept" ||
      p.department === deptFilter;

    // ======================
    // Course
    // ======================
    const matchesCourse =
      courseFilter === "allcourse" ||
      p.course === courseFilter;

    // ======================
    // Year Level
    // ======================
    const matchesYear =
      yearFilter === "allyear" ||
      String(p.year) === yearFilter;

    return (
      matchesSearch &&
      matchesRole &&
      matchesDept &&
      matchesCourse &&
      matchesYear
    );
  });

  displayPatients(filtered);
}



// ======================================================
// Event Listeners
// ======================================================
[
  searchQuery,
  filterRole,
  filterDept,
  filterCourse,
  filterYear
].forEach((el) => {
  el.addEventListener("input", filterPatients);
  el.addEventListener("change", filterPatients);
});

filterRole.addEventListener("change", () => {
  if (filterRole.value === "employee") {
    filterYear.value = "allyear";
  }
  filterPatients();
});


loadPatients();

