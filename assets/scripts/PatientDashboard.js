import { db, auth } from "../../firebaseconfig.js";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const staffList = document.getElementById("staffs");

onAuthStateChanged(auth, async (user) => {
  if (user) {
    // ✅ Get the currently logged-in user
    const patientRef = doc(db, "users", user.uid);
    const patientSnap = await getDoc(patientRef);

    if (patientSnap.exists()) {
      const data = patientSnap.data();

      // Personal Details
      document.getElementById("lastName").value = data.lastName || "";
      document.getElementById("firstName").value = data.firstName || "";
      document.getElementById("middleName").value = data.middleName || "";
      document.getElementById("extName").value = data.extName || "";
      document.getElementById("gender").value = data.gender || "";
      document.getElementById("birthdate").value = data.birthdate || "";
      document.getElementById("age").value = data.age || "";
      document.getElementById("civilStatus").value = data.civilStatus || "";
      document.getElementById("nationality").value = data.nationality || "";
      document.getElementById("religion").value = data.religion || "";

      // School Information
      document.getElementById("schoolId").value = data.schoolId || "";
      document.getElementById("department").value = data.department || "";
      document.getElementById("course").value = data.course || "";
      document.getElementById("yearLevel").value = data.yearLevel || "";

      // Parent's Information
      document.getElementById("fatherName").value = data.fatherName || "";
      document.getElementById("fatherAge").value = data.fatherAge || "";
      document.getElementById("fatherOccupation").value = data.fatherOccupation || "";
      document.getElementById("fatherHealth").value = data.fatherHealth || "";
      document.getElementById("motherName").value = data.motherName || "";
      document.getElementById("motherAge").value = data.motherAge || "";
      document.getElementById("motherOccupation").value = data.motherOccupation || "";
      document.getElementById("motherHealth").value = data.motherHealth || "";

      // Contact Details
      document.getElementById("phone").value = data.phone || "";
      document.getElementById("email").value = data.email || "";
      document.getElementById("address").value = data.address || "";
      document.getElementById("guardianName").value = data.guardianName || "";
      document.getElementById("guardianPhone").value = data.guardianPhone || "";

    } else {
      console.warn("User document not found");
    }
  } else {
    console.log("No user is logged in");
  }

  // ✅ Load staff regardless of logged-in user
  loadStaff();
});



const editBtn = document.getElementById("edit-info-btn");
const cancelBtn = document.getElementById("cancel-info-btn");
const saveBtn = document.getElementById("save-info-btn");

const infoFields = document.querySelectorAll(".info-field");

let originalData = {};
let currentUserId = "";

// Initially, only Edit is visible
cancelBtn.style.display = "none";
saveBtn.style.display = "none";

// Helper to enable/disable inputs
function setFieldsEditable(editable) {
  infoFields.forEach(field => field.disabled = !editable);
}

// Store original values
function storeOriginalData() {
  originalData = {};
  infoFields.forEach(field => {
    originalData[field.id] = field.value;
  });
}

// Restore original values
function restoreOriginalData() {
  infoFields.forEach(field => {
    if (originalData[field.id] !== undefined) {
      field.value = originalData[field.id];
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  currentUserId = user.uid;

  const docRef = doc(db, "users", currentUserId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    infoFields.forEach(field => field.value = data[field.id] || "");
  }
});

// Edit button click
editBtn.addEventListener("click", () => {
  setFieldsEditable(true);
  storeOriginalData();
  editBtn.style.display = "none"; // hide edit
  cancelBtn.style.display = "inline-block";
  saveBtn.style.display = "inline-block";
});

// Cancel button click
cancelBtn.addEventListener("click", () => {
  restoreOriginalData();
  setFieldsEditable(false);
  editBtn.style.display = "inline-block"; // show edit
  cancelBtn.style.display = "none";
  saveBtn.style.display = "none";
});

// Save button click
saveBtn.addEventListener("click", async () => {
  const updatedData = {};
  infoFields.forEach(field => updatedData[field.id] = field.value);

  try {
    const docRef = doc(db, "users", currentUserId);
    await updateDoc(docRef, updatedData);
    alert("Information saved successfully!");
    setFieldsEditable(false);
    editBtn.style.display = "inline-block"; // show edit
    cancelBtn.style.display = "none";
    saveBtn.style.display = "none";
  } catch (err) {
    console.error("Error saving info:", err);
    alert("Failed to save changes.");
  }
});


/* -----------------------------------------------
     Appointment Related Functions
  ----------------------------------------------- */
async function loadStaff() {
  try {
    const q = query(
      collection(db, "users"),
      where("user_type", "in", ["doctor", "nurse"])
    );
    const snap = await getDocs(q);
    staffList.innerHTML = "";

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;
      const fullName = `${data.lastName}, ${data.firstName}`;
      const role = data.user_type;
      const doctorType = data.doctor_type ?? null;
      const availability = data.availability || [];

      const availabilityHtml = availability.length
        ? `<ul class="m-0 mt-2 p-0" style="list-style:none;">
             ${availability.map(a => `<li>${a.day}: ${a.start} - ${a.end}</li>`).join("")}
           </ul>`
        : '<p class="m-0 mt-2 text-muted">(No availability set)</p>';

      const item = document.createElement("div");
      item.classList.add("staff-item");
      item.innerHTML = `
        <div class="staff-card p-3 mb-3 shadow-sm rounded" style="cursor:pointer;">
          <p class="mb-1 fw-bold">${fullName}</p>
          <p class="m-0 text-secondary">${role === "doctor" ? "Doctor" : "Nurse"}</p>
          ${role === "doctor" ? `<p class="m-0 text-primary">Specialization: ${doctorType ?? "(none yet)"}</p>` : ""}
          ${availabilityHtml}
        </div>
      `;
      item.querySelector(".staff-card").addEventListener("click", () => {
        openAvailabilityModal(id, fullName);
      });
      staffList.appendChild(item);
    });
  } catch (err) {
    console.error("Error loading staff:", err);
  }
}
