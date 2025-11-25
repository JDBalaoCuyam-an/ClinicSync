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
const filterYear = document.getElementById("filterYear");

const patientsRef = collection(db, "users");
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
        <td>${data.user_type}</td>
        <td>${data.email || "-"}</td>
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
  const yearFilter = filterYear.value;

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

    const matchesYear =
      yearFilter === "allyear" || p.year?.toString() === yearFilter;

    return (
      matchesName &&
      matchesId &&
      matchesGender &&
      matchesRole &&
      matchesDept &&
      matchesCourse &&
      matchesYear
    );
  });

  displayPatients(filtered);
}



// Add event listeners for filters
[searchName, searchId, filterGender, filterRole, filterDept, filterCourse, filterYear].forEach((el) => {
  el.addEventListener("input", filterPatients);
  el.addEventListener("change", filterPatients);
});


// ======================================================
// ✅ ADD NEW PATIENT FORM SUBMISSION
// ======================================================
patientForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitButton = patientForm.querySelector('button[type="submit"]');
  submitButton.disabled = true; // disable button
  submitButton.textContent = "Saving..."; // optional loading text

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
  } finally {
    submitButton.disabled = false; // re-enable button
    submitButton.textContent = "Add Patient"; // restore original text
  }
});

// ======================================================
// ✅ DYNAMIC DEPARTMENT → COURSE FOR NEW PATIENT FORM
// ======================================================

// Grab selects
const roleSelectNew = document.querySelector('select[name="role"]');
const deptSelectNew = document.querySelector('select[name="department"]');
const courseSelectNew = document.querySelector('select[name="course"]');

// Store original options
const originalDeptOptionsNew = Array.from(deptSelectNew.options);
const originalCourseOptionsNew = Array.from(courseSelectNew.options);

// Department → allowed courses mapping
const deptCourseMappingNew = {
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
    "Bachelor of Science in Business Administration",
  ],
  CTE: [
    "Bachelor of Elementary Education",
    "Bachelor of Science in Psychology",
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

// Function to update Department & Course dynamically
function updateDeptCourseNewForm() {
  const selectedRole = roleSelectNew.value;
  const selectedDept = deptSelectNew.value;

  // --- VISITOR RULE ---
  if (selectedRole === "Visitor") {
    // Department: only Visitor
    deptSelectNew.innerHTML = "";
    const visitorDept = originalDeptOptionsNew.find(opt => opt.value === "Visitor");
    if (visitorDept) deptSelectNew.appendChild(visitorDept.cloneNode(true));

    // Course: only Visitor
    courseSelectNew.innerHTML = "";
    const visitorCourse = originalCourseOptionsNew.find(opt => opt.value === "Visitor");
    if (visitorCourse) courseSelectNew.appendChild(visitorCourse.cloneNode(true));

    courseSelectNew.disabled = false;
    return;
  }

  // Restore all departments if needed
  if (deptSelectNew.options.length < originalDeptOptionsNew.length) {
    deptSelectNew.innerHTML = "";
    originalDeptOptionsNew.forEach(opt => deptSelectNew.appendChild(opt.cloneNode(true)));
  }

  // --- COURSE FILTER BASED ON DEPARTMENT ---
  if (!selectedDept) {
    // No department selected → disable course
    courseSelectNew.innerHTML = "";
    const defaultOption = originalCourseOptionsNew.find(opt => opt.value === "");
    if (defaultOption) courseSelectNew.appendChild(defaultOption.cloneNode(true));
    courseSelectNew.disabled = true;
    return;
  }

  // Department selected → enable course
  courseSelectNew.disabled = false;
  courseSelectNew.innerHTML = "";
  const defaultCourseOption = originalCourseOptionsNew.find(opt => opt.value === "");
  if (defaultCourseOption) courseSelectNew.appendChild(defaultCourseOption.cloneNode(true));

  // Show department-specific courses
  if (deptCourseMappingNew[selectedDept]) {
    deptCourseMappingNew[selectedDept].forEach(courseName => {
      const match = originalCourseOptionsNew.find(opt =>
        opt.textContent.includes(courseName)
      );
      if (match) courseSelectNew.appendChild(match.cloneNode(true));
    });
  } else {
    // Show all courses if department not in mapping
    originalCourseOptionsNew.forEach(opt => {
      if (opt.value !== "") courseSelectNew.appendChild(opt.cloneNode(true));
    });
  }

  courseSelectNew.value = "";
}

// --- Event Listeners ---
roleSelectNew.addEventListener("change", updateDeptCourseNewForm);
deptSelectNew.addEventListener("change", updateDeptCourseNewForm);

// ✅ Initial call
updateDeptCourseNewForm();
// Initial load
loadPatients();
