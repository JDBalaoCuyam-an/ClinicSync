import { db } from "../../firebaseconfig.js";
import {
  collection,
  addDoc,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const patientForm = document.getElementById("new-patient-form");
const patientTableBody = document.querySelector(".records-table tbody");

const searchName = document.getElementById("searchName");
const searchId = document.getElementById("searchId");
const filterGender = document.getElementById("filterGender");
const filterRole = document.getElementById("filterRole");
const filterDept = document.getElementById("filterDept");
const filterCourse = document.getElementById("filterCourse");

const patientsRef = collection(db, "patients");
let allPatients = []; // store all fetched data

// Load all patients once
async function loadPatients() {
  patientTableBody.innerHTML = "";
  const snapshot = await getDocs(patientsRef);
  allPatients = [];
  snapshot.forEach((doc) => {
    allPatients.push({ id: doc.id, ...doc.data() });
  });
  displayPatients(allPatients);
}

// Display filtered or all patients
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
        <td>${data.schoolId}</td>
        <td>${data.department}</td>
        <td>${data.course}</td>
        <td>${data.year || "-"}</td>
        <td>${data.role}</td>
        <td>${data.contact || "-"}</td>
      `;
    row.onclick = () => {
      window.location.href = "ViewPatient.html?id=" + data.id;
    };
    patientTableBody.appendChild(row);
  });
}

// Filter logic
function filterPatients() {
  const nameQuery = searchName.value.toLowerCase();
  const idQuery = searchId.value.toLowerCase();
  const genderFilter = filterGender.value;
  const roleFilter = filterRole.value;
  const deptFilter = filterDept.value;
  const courseFilter = filterCourse.value;

  const filtered = allPatients.filter((p) => {
    const matchesName =
      p.firstName?.toLowerCase().includes(nameQuery) ||
      p.lastName?.toLowerCase().includes(nameQuery);

    const matchesId = p.schoolId?.toLowerCase().includes(idQuery);

    const matchesGender =
      genderFilter === "all" || p.gender?.toLowerCase() === genderFilter;

    const matchesDept =
      deptFilter === "alldept" || p.department === deptFilter;

const matchesCourse =
      courseFilter === "allcourse" || p.course === courseFilter;

const matchesRole =
      roleFilter === "all" || p.role === roleFilter;

    return (
      matchesName &&
      matchesId &&
      matchesGender &&
      matchesRole &&
      matchesDept &&
      matchesCourse
    );
  });

  displayPatients(filtered);
}


// Add event listeners for filters
[searchName, searchId, filterGender, filterRole, filterDept, filterCourse].forEach((el) => {
  el.addEventListener("input", filterPatients);
  el.addEventListener("change", filterPatients);
});
// ======================================================
// ✅ DYNAMIC COURSE FILTER for MEDICAL RECORDS
// ======================================================
const deptSelect = document.getElementById("filterDept");
const courseSelect = document.getElementById("filterCourse");
const roleSelect = document.getElementById("filterRole");

// ✅ Store all original options
const allCourseOptions = Array.from(courseSelect.options);
const allDeptOptions = Array.from(deptSelect.options);

// ✅ Department → Allowed Course Mapping
const departmentCourses = {
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

// ✅ Function to update the Course & Department lists
function updateMedicalCourseList() {
  const selectedDept = deptSelect.value;
  const selectedRole = roleSelect.value;

  // 🧍 VISITOR RULE → Only show "Visitor" in dept & course
  if (selectedRole === "Visitor") {
    // --- Department ---
    deptSelect.innerHTML = "";
    const visitorDept = allDeptOptions.find((opt) => opt.value === "Visitor");
    if (visitorDept) deptSelect.appendChild(visitorDept.cloneNode(true));

    // --- Course ---
    courseSelect.innerHTML = "";
    const visitorCourse = allCourseOptions.find((opt) => opt.value === "Visitor");
    if (visitorCourse) courseSelect.appendChild(visitorCourse.cloneNode(true));

    filterPatients();
    return;
  }

  // 🏫 Restore all departments if needed
  if (deptSelect.options.length < allDeptOptions.length) {
    deptSelect.innerHTML = "";
    allDeptOptions.forEach((opt) =>
      deptSelect.appendChild(opt.cloneNode(true))
    );
  }

  // --- Course filter based on department ---
  courseSelect.innerHTML = "";
  const defaultCourse = allCourseOptions.find((opt) => opt.value === "allcourse");
  if (defaultCourse) courseSelect.appendChild(defaultCourse.cloneNode(true));

  if (selectedDept === "alldept" || !departmentCourses[selectedDept.toLowerCase()]) {
    // Show all courses
    allCourseOptions.forEach((opt) => {
      if (opt.value !== "allcourse")
        courseSelect.appendChild(opt.cloneNode(true));
    });
  } else {
    // Add only department-specific courses
    const deptKey = selectedDept.toLowerCase(); // still use lowercase to match the mapping keys
    departmentCourses[deptKey].forEach((courseName) => {
      const match = allCourseOptions.find((opt) =>
        opt.textContent.includes(courseName)
      );
      if (match) courseSelect.appendChild(match.cloneNode(true));
    });
  }

  courseSelect.value = "allcourse";
  filterPatients();
}

// ✅ Listen for Department & Role Changes
deptSelect.addEventListener("change", updateMedicalCourseList);
roleSelect.addEventListener("change", updateMedicalCourseList);


// Add new patient
patientForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(patientForm);
  const newPatient = Object.fromEntries(formData.entries());

  try {
    await addDoc(patientsRef, newPatient);
    alert("Patient added successfully!");
    patientForm.reset();
    closeButtonOverlay();
    loadPatients(); // refresh
  } catch (error) {
    console.error("Error adding patient:", error);
    alert("Failed to add patient. Check console.");
  }
});

// Initial load
loadPatients();
