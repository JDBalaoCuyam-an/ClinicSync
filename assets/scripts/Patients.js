import { db } from "../../firebaseconfig.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const patientTableBody = document.querySelector(".records-table tbody");

const searchName = document.getElementById("searchName");
const searchId = document.getElementById("searchId");
const filterRole = document.getElementById("filterRole");

const patientsRef = collection(db, "users");
let allPatients = []; // store all fetched data


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
      <td><strong>${data.lastName}</strong>, ${data.firstName} ${data.middleName || ""}</td>
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


// ======================================================
// ✅ Filtering — Name, ID, Gender, Role
// ======================================================
function filterPatients() {
  const nameQuery = searchName.value.toLowerCase();
  const idQuery = searchId.value.toLowerCase();
  const roleFilter = filterRole.value;

  const filtered = allPatients.filter((p) => {
    const matchesName =
      p.firstName?.toLowerCase().includes(nameQuery) ||
      p.lastName?.toLowerCase().includes(nameQuery);

    const matchesId = p.schoolId?.toLowerCase().includes(idQuery);

    const matchesRole =
      roleFilter === "all" || p.user_type?.toLowerCase() === roleFilter;

    return matchesName && matchesId && matchesRole;
  });

  displayPatients(filtered);
}


// ======================================================
// Event Listeners
// ======================================================
[searchName, searchId, filterRole].forEach((el) => {
  el.addEventListener("input", filterPatients);
  el.addEventListener("change", filterPatients);
});


loadPatients();
