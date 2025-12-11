import { db } from "../../firebaseconfig.js";
import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* ===================================== */
/*            STAFF LIST                 */
/* ===================================== */
async function loadStaff() {
  try {
    const staffList = document.getElementById("staffList");
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

      // Availability badges
      const availabilityHtml = availability.length
        ? availability
            .map(
              (a) =>
                `<span class="badge bg-success me-1 mb-1">${a.day}: ${a.start} - ${a.end}</span>`
            )
            .join("")
        : '<p class="m-0 mt-2 text-muted">(No availability set)</p>';

      const card = document.createElement("div");
      card.className = "card mb-3 shadow-sm staff-card w-100"; // full width
      card.style.cursor = "pointer";

      card.innerHTML = `
        <div class="card-body p-3">
          <p class="fw-bold mb-1">${fullName}</p>
          <p class="text-secondary mb-1">${
            role === "doctor" ? "Doctor" : "Nurse"
          }</p>
          ${
            role === "doctor"
              ? `<p class="text-primary mb-2">Specialization: ${
                  doctorType ?? "(none yet)"
                }</p>`
              : ""
          }
          <div class="availability-container">${availabilityHtml}</div>
        </div>
      `;

      card.addEventListener("click", () => {
        openAvailabilityModal(id, fullName);
      });

      staffList.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading staff:", err);
  }
}

loadStaff();

/* ===================================== */
/*        AVAILABILITY MODAL LOGIC       */
/* ===================================== */
let selectedStaffId = null;

function openAvailabilityModal(id, staffName) {
  selectedStaffId = id;
  document.getElementById("modalStaffName").innerText = staffName;

  // Reset fields
  document.getElementById("modalDay").value = "";
  document.getElementById("modalStartTime").value = "";
  document.getElementById("modalEndTime").value = "";
  document.getElementById("availabilityList").innerHTML = "";

  loadAvailability(id);

  const modal = new bootstrap.Modal(
    document.getElementById("availabilityModal")
  );
  modal.show();
}

async function loadAvailability(userId) {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const availability = data.availability || [];

  const container = document.getElementById("availabilityList");
  container.innerHTML = "";
  availability.forEach((item, index) => {
    const entry = document.createElement("div");
    entry.className =
      "d-flex justify-content-between align-items-center border p-2 rounded mb-2";

    entry.innerHTML = `
      <div>
        <strong>${item.day}</strong><br>
        <span>${item.start} - ${item.end}</span>
      </div>
      <button class="btn btn-danger btn-sm" data-index="${index}">Remove</button>
    `;
    entry.querySelector("button").addEventListener("click", () => {
      removeAvailability(userId, index);
    });
    container.appendChild(entry);
  });
}

document
  .getElementById("addAvailability")
  .addEventListener("click", async () => {
    const day = document.getElementById("modalDay").value;
    const start = document.getElementById("modalStartTime").value;
    const end = document.getElementById("modalEndTime").value;

    if (!day || !start || !end) {
      alert("Please fill all fields.");
      return;
    }

    const ref = doc(db, "users", selectedStaffId);
    const snap = await getDoc(ref);
    const data = snap.data();
    const availability = data.availability || [];

    availability.push({ day, start, end });
    await setDoc(ref, { availability }, { merge: true });

    loadAvailability(selectedStaffId);

    document.getElementById("modalDay").value = "";
    document.getElementById("modalStartTime").value = "";
    document.getElementById("modalEndTime").value = "";
  });

async function removeAvailability(userId, index) {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);
  const data = snap.data();
  const availability = data.availability || [];

  availability.splice(index, 1);
  await setDoc(ref, { availability }, { merge: true });
  loadAvailability(userId);
}

/* ===================================== */
/*        APPOINTMENTS LOGIC            */
/* ===================================== */
async function loadPatientAppointments() {
  const container = document.getElementById("appointments-container");
  container.innerHTML = `<p class="text-center text-muted my-3">Loading...</p>`;

  const q = query(
    collection(db, "appointments"),
    where("status", "==", "in queue")
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    container.innerHTML = `<p class="text-center text-muted my-3">No appointments found.</p>`;
    return;
  }

  const days = {};
  snap.forEach((docSnap) => {
    const appt = docSnap.data();
    const dayKey = `${appt.day} (${appt.weekday})` || "UNKNOWN DATE";
    if (!days[dayKey]) days[dayKey] = [];
    days[dayKey].push({ ...appt, id: docSnap.id });
  });

  container.innerHTML = "";

  const sortedDays = Object.keys(days).sort((a, b) => {
    const dateA = new Date(a.split(" ")[0]);
    const dateB = new Date(b.split(" ")[0]);
    return dateA - dateB;
  });

  sortedDays.forEach((day, index) => {
    const events = days[day];
    const collapseId = `collapse-${index}`;

    const daySection = document.createElement("div");
    daySection.className = "mb-3";

    daySection.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-success text-white rounded shadow-sm"
           style="cursor:pointer;"
           data-bs-toggle="collapse"
           data-bs-target="#${collapseId}"
           aria-expanded="true"
           aria-controls="${collapseId}">
        <h4 class="fw-bold mb-0">${day}</h4>
        <div class="d-flex align-items-center">
          <span class="badge bg-secondary me-2">${events.length} Event${
      events.length > 1 ? "s" : ""
    }</span>
          <i class="bi bi-chevron-down rotate-icon"></i>
        </div>
      </div>

      <div class="collapse show" id="${collapseId}">
        <div class="row gx-3 gy-3 day-row mt-2"></div>
      </div>
    `;

    const row = daySection.querySelector(".day-row");

    events.forEach((appt) => {
      const col = document.createElement("div");
      col.className = "col-12 col-md-6 col-lg-4";

      const card = document.createElement("div");
      card.className = "card h-100 shadow-sm";

      card.innerHTML = `
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${appt.patientName}</h5>
          <p class="card-text mb-1"><i class="bi bi-clock"></i> ${appt.slot}</p>
          <p class="card-text mb-1"><strong>With:</strong> ${appt.staffName}</p>
          <p class="card-text mb-0"><strong>Reason:</strong> ${appt.reason}</p>
          <div class="mt-auto d-flex justify-content-between pt-2">
            <button class="btn btn-success btn-sm accept-btn">Accept</button>
            <button class="btn btn-warning btn-sm reschedule-btn">Reschedule</button>
          </div>
        </div>
      `;

      const acceptBtn = card.querySelector(".accept-btn");
      acceptBtn.addEventListener("click", async () => {
        try {
          const confirmAccept = confirm(
            `Are you sure you want to accept ${appt.patientName}'s appointment?`
          );
          if (!confirmAccept) return; // Stop if user cancels

          const ref = doc(db, "appointments", appt.id);
          await updateDoc(ref, { status: "accepted" });

          // Remove card from pending list
          col.remove();

          // Reload accepted appointments
          loadAcceptedAppointments();
        } catch (error) {
          console.error(error);
          alert("Error accepting appointment.");
        }
      });

      col.appendChild(card);
      row.appendChild(col);
    });

    container.appendChild(daySection);
  });
}
async function loadAcceptedAppointments() {
  const container = document.getElementById("accepted-appointments-container");
  container.innerHTML = `<p class="text-center text-muted">Loading...</p>`;

  const q = query(
    collection(db, "appointments"),
    where("status", "==", "accepted")
  );
  const snap = await getDocs(q);

  container.innerHTML = "";

  if (snap.empty) {
    container.innerHTML = `<p class="text-center text-muted">No accepted appointments yet</p>`;
    return;
  }

  snap.forEach((docSnap) => {
    const appt = docSnap.data();
    const acceptedCol = document.createElement("div");
    acceptedCol.className = "col-12 col-md-6 col-lg-4";

    const acceptedCard = document.createElement("div");
    acceptedCard.className = "card p-3 border-primary shadow-sm h-100";

    acceptedCard.innerHTML = `
      <div class="card-body d-flex flex-column">
        <h5 class="card-title">${appt.patientName}</h5>
        <p class="card-text mb-1"><i class="bi bi-calendar"></i> ${appt.day} (${appt.weekday})</p>
        <p class="card-text mb-1"><i class="bi bi-clock"></i> ${appt.slot}</p>
        <p class="card-text mb-1"><strong>With:</strong> ${appt.staffName}</p>
        <p class="card-text mb-1"><strong>Reason:</strong> ${appt.reason}</p>
        <div class="mt-auto d-flex justify-content-end pt-2">
          <button class="btn btn-success btn-sm done-btn">Done</button>
        </div>
      </div>
    `;

    acceptedCol.appendChild(acceptedCard);
    container.appendChild(acceptedCol);

    // Done button
    const doneBtn = acceptedCard.querySelector(".done-btn");
    doneBtn.addEventListener("click", async () => {
      try {
        const confirmDone = confirm(
          `Mark ${appt.patientName}'s appointment as finished?`
        );
        if (!confirmDone) return; // Stop if user cancels

        const ref = doc(db, "appointments", docSnap.id); // docSnap from accepted appt
        await updateDoc(ref, { status: "finished" });

        // Remove card from accepted appointments
        acceptedCol.remove();

        // Reload finished appointments table
        loadFinishedAppointments();
      } catch (error) {
        console.error(error);
        alert("Error marking appointment as done.");
      }
    });
  });
}
async function loadFinishedAppointments() {
  const tbody = document.getElementById("finished-appointments-body");
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center text-muted p-3">Loading...</td>
    </tr>
  `;

  try {
    const q = query(
      collection(db, "appointments"),
      where("status", "==", "finished")
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted p-3">
            No finished appointments yet
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = ""; // Clear loading

    snap.forEach((docSnap) => {
      const appt = docSnap.data();

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${appt.patientName}</td>
        <td>${appt.staffName}</td>
        <td>${appt.day} (${appt.weekday})</td>
        <td>${appt.slot}</td>
        <td>${appt.reason}</td>
      `;

      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger p-3">
          Error loading finished appointments
        </td>
      </tr>
    `;
  }
}

loadFinishedAppointments();
loadAcceptedAppointments();
loadPatientAppointments();
