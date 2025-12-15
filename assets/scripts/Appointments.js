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

(function () {
  emailjs.init("e30TrJHG9V9Mp1D-_");
})();


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
      card.className = "card mb-3 shadow-sm staff-card w-100";

      card.innerHTML = `
        <div class="card-body p-3 d-flex flex-column">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <p class="fw-bold mb-0">${fullName}</p>
            <button class="btn btn-sm btn-primary open-modal-btn">Schedule</button>
          </div>

          <p class="text-secondary mb-1">${role === "doctor" ? "Doctor" : "Nurse"}</p>

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

      // Only the button triggers the modal
      card.querySelector(".open-modal-btn").addEventListener("click", () => {
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
        <button class="btn btn-warning btn-sm reschedule-btn" data-bs-toggle="modal" data-bs-target="#rescheduleModal">Reschedule</button>
      </div>
    </div>
  `;

  const acceptBtn = card.querySelector(".accept-btn");
acceptBtn.addEventListener("click", async () => {
  const confirmAccept = confirm(`Are you sure you want to accept the appointment for ${appt.patientName}?`);
  if (!confirmAccept) return;

  try {
    // 1️⃣ Update Firestore
    const ref = doc(db, "appointments", appt.id);
    await updateDoc(ref, { status: "accepted" });

    // 2️⃣ Get patient's email from users collection
    const userRef = doc(db, "users", appt.patientId);
    const userSnap = await getDoc(userRef);
    const patientEmail = userSnap.exists() ? userSnap.data().email : null;

    if (!patientEmail) {
      alert("Patient email not found. Email notification will not be sent.");
    } else {
      // 3️⃣ Send Email via EmailJS
      emailjs.send(
        "service_rfw77oo",       // Your EmailJS Service ID
        "template_n37ttab",      // Your EmailJS Template ID
        {
          to_email: patientEmail,
          patient_name: appt.patientName,
          day: appt.day,
          weekday: appt.weekday,
          slot: appt.slot,
          status: "accepted",
          message: `Your appointment has been accepted! See you on ${appt.day} (${appt.weekday}) at ${appt.slot}. Please arrive 10 minutes early.`
        }
      )
      .then(() => console.log("Appointment email sent successfully"))
      .catch(err => console.error("Email sending failed:", err));
    }

    alert("Appointment accepted successfully!");

    // 4️⃣ Remove the card immediately
    col.remove();

  } catch (err) {
    console.error("Error updating appointment:", err);
    alert("Failed to accept appointment. Try again.");
  }
});


  const rescheduleBtn = card.querySelector(".reschedule-btn");
  rescheduleBtn.addEventListener("click", () => {
    document.getElementById("rescheduleApptId").value = appt.id;
    document.getElementById("newDate").value = appt.day; // default to current date
    document.getElementById("newSlot").value = appt.slot; // default to current slot
  });

  col.appendChild(card);
  row.appendChild(col);
});



    container.appendChild(daySection);
  });
}

document.getElementById("rescheduleForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const apptId = document.getElementById("rescheduleApptId").value;
  const newDate = document.getElementById("newDate").value; // YYYY-MM-DD
  const newSlot = document.getElementById("newSlot").value;

  // Calculate weekday
  const dateObj = new Date(newDate);
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const newWeekday = weekdays[dateObj.getDay()];

  try {
    const ref = doc(db, "appointments", apptId);
    await updateDoc(ref, {
      day: newDate,
      slot: newSlot,
      weekday: newWeekday,
      status: "accepted" // optional: keep it in queue
    });

    // ✅ Get patient email from users collection
    const apptSnap = await getDoc(ref);
    const patientId = apptSnap.data().patientId;
    const userRef = doc(db, "users", patientId);
    const userSnap = await getDoc(userRef);
    const patientEmail = userSnap.exists() ? userSnap.data().email : null;
    const patientFullName = userSnap.exists() ? `${userSnap.data().firstName} ${userSnap.data().middleName || ""} ${userSnap.data().lastName}`.trim() : "";

    if (patientEmail) {
      // ✅ Send reschedule email via EmailJS
      emailjs.send(
        "service_rfw77oo",      // Your EmailJS Service ID
        "template_tpgmqni",     // Your EmailJS Template ID
        {
          to_email: patientEmail,
          patient_name: patientFullName,
          day: newDate,
          weekday: newWeekday,
          slot: newSlot,
          status: "rescheduled",
          message: `Your appointment has been rescheduled to ${newDate} (${newWeekday}) at ${newSlot}. Please be on time.`
        }
      )
      .then(() => console.log("Reschedule email sent successfully"))
      .catch(err => console.error("Email sending failed:", err));
    } else {
      console.warn("Patient email not found. Email notification not sent.");
    }

    alert("Appointment rescheduled successfully!");

    // Close the modal
    const modalEl = document.getElementById("rescheduleModal");
    const modal = bootstrap.Modal.getInstance(modalEl);
    modal.hide();

    // Reload appointments
    loadPatientAppointments();

  } catch (error) {
    console.error(error);
    alert("Error rescheduling appointment.");
  }
});




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
        <div class="mt-auto d-flex justify-content-end gap-2 pt-2">
          <button class="btn btn-success btn-sm done-btn">Done</button>
          <button class="btn btn-warning btn-sm no-show-btn">No Show</button>
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
        if (!confirmDone) return;

        const ref = doc(db, "appointments", docSnap.id);
        await updateDoc(ref, { status: "finished" });

        acceptedCol.remove();
        loadFinishedAppointments();
      } catch (error) {
        console.error(error);
        alert("Error marking appointment as done.");
      }
    });

    // No Show button
    const noShowBtn = acceptedCard.querySelector(".no-show-btn");
    noShowBtn.addEventListener("click", async () => {
      try {
        const confirmNoShow = confirm(
          `Mark ${appt.patientName}'s appointment as No Show?`
        );
        if (!confirmNoShow) return;

        const ref = doc(db, "appointments", docSnap.id);
        await updateDoc(ref, { status: "no show" });

        acceptedCol.remove();
        loadNoShowAppointments(); // Reload No Show appointments table
      } catch (error) {
        console.error(error);
        alert("Error marking appointment as no show.");
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

// 🔹 Load Canceled Appointments
async function loadCanceledAppointments() {
  const tbody = document.getElementById("canceled-appointments-body");
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center text-muted p-3">Loading...</td>
    </tr>
  `;

  try {
    const q = query(
      collection(db, "appointments"),
      where("status", "==", "canceled")
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted p-3">
            No canceled appointments yet
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
          Error loading canceled appointments
        </td>
      </tr>
    `;
  }
}

// 🔹 Load No-Show Appointments
async function loadNoShowAppointments() {
  const tbody = document.getElementById("no-show-appointments-body");
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center text-muted p-3">Loading...</td>
    </tr>
  `;

  try {
    const q = query(
      collection(db, "appointments"),
      where("status", "==", "no show")
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted p-3">
            No no-show appointments yet
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
          Error loading no-show appointments
        </td>
      </tr>
    `;
  }
}

// 🔹 Call them all at once
loadFinishedAppointments();
loadCanceledAppointments();
loadNoShowAppointments();
loadAcceptedAppointments();
loadPatientAppointments();
