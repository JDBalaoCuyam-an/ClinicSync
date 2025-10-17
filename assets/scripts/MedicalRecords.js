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
        <td>${data.age}</td>
        <td>${data.gender ? data.gender.charAt(0) : "-"}</td>
        <td>${data.role}</td>
        <td>${data.department || "-"}</td>
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

  const filtered = allPatients.filter((p) => {
    const matchesName =
      p.firstName?.toLowerCase().includes(nameQuery) ||
      p.lastName?.toLowerCase().includes(nameQuery);
    const matchesId = p.schoolId?.toLowerCase().includes(idQuery);
    const matchesGender =
      genderFilter === "all" || p.gender?.toLowerCase() === genderFilter;
    const matchesRole =
      roleFilter === "all" || p.role?.toLowerCase() === roleFilter;
    const matchesDept =
      deptFilter === "alldept" || p.department?.toLowerCase() === deptFilter;

    return (
      matchesName && matchesId && matchesGender && matchesRole && matchesDept
    );
  });

  displayPatients(filtered);
}

// Add event listeners for filters
[searchName, searchId, filterGender, filterRole, filterDept].forEach((el) => {
  el.addEventListener("input", filterPatients);
  el.addEventListener("change", filterPatients);
});

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
