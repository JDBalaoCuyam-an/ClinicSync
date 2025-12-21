import { db } from "../../firebaseconfig.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  // Format: 20 December 2025
  return date.toLocaleDateString(undefined, { // 'undefined' uses browser locale
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimeFromString(timeStr) {
  // timeStr should be in "HH:MM" format (e.g., "08:45" or "15:30")
  const [hours, minutes] = timeStr.split(":");
  let hour = parseInt(hours, 10);
  const period = hour >= 12 ? "PM" : "AM";

  // Convert to 12-hour format
  if (hour === 0) {
    hour = 12; // Midnight
  } else if (hour > 12) {
    hour -= 12;
  }

  // Remove leading zero and format minutes (keep 2 digits)
  return `${hour}:${minutes} ${period}`;
}
const referralSelect = document.getElementById("referralName");
const referralAgeInput = document.getElementById("referralAge");

async function loadNames() {
  try {
    const usersRef = collection(db, "users");

    const q = query(
      usersRef,
      where("user_type", "in", ["student", "employee"])
    );
    
    const snapshot = await getDocs(q);

    snapshot.forEach((docSnap) => {
      const user = docSnap.data();

      const option = document.createElement("option");
      option.textContent = `${user.firstName} ${user.lastName}`;
      option.value = `${user.firstName} ${user.lastName}`;

      // 🔹 Store birthdate on the option (important)
      if (user.birthdate) {
        option.dataset.birthdate = user.birthdate.toDate
          ? user.birthdate.toDate().toISOString()
          : user.birthdate;
      }

      referralSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Failed to load referees:", error);
    referralSelect.innerHTML =
      `<option value="" selected disabled>Failed to load names</option>`;
  }
}

loadNames();
referralSelect.addEventListener("change", () => {
  const selectedOption =
    referralSelect.options[referralSelect.selectedIndex];

  const birthdateValue = selectedOption.dataset.birthdate;

  if (!birthdateValue) {
    referralAgeInput.value = "";
    return;
  }

  const birthdate = new Date(birthdateValue);
  const today = new Date();

  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthdate.getDate())
  ) {
    age--;
  }

  referralAgeInput.value = age;
});

const referralComplaintSelect =
  document.getElementById("referralComplaint");
const newReferralComplaintInput =
  document.getElementById("newReferralComplaint");

async function loadReferralComplaints() {
  try {
    referralComplaintSelect.innerHTML = `
      <option value="">Select Complaint</option>
      <option value="__add_new__">➕ Add New Complaint</option>
    `;

    const snap = await getDocs(collection(db, "complaints"));

    snap.forEach((doc) => {
      const data = doc.data();
      const option = document.createElement("option");
      option.value = data.name;
      option.textContent = data.name;
      referralComplaintSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Failed to load complaints:", error);
  }
}

referralComplaintSelect.addEventListener("change", () => {
  if (referralComplaintSelect.value === "__add_new__") {
    newReferralComplaintInput.style.display = "block";
    newReferralComplaintInput.focus();
  } else {
    newReferralComplaintInput.style.display = "none";
    newReferralComplaintInput.value = "";
  }
});
loadReferralComplaints();
function getSelectedComplaint() {
  if (referralComplaintSelect.value === "__add_new__") {
    return newReferralComplaintInput.value.trim();
  }
  return referralComplaintSelect.value;
}



// Grab elements
const referralsList = document.getElementById("referralsList");
const addReferralBtn = document.getElementById("addReferralBtn");
const referralForm = document.getElementById("referralForm");
const referralModalEl = document.getElementById("referralModal");
const referralModal = new bootstrap.Modal(referralModalEl); // Bootstrap Modal instance

let selectedReferralId = null;


// Open Modal
addReferralBtn.addEventListener("click", () => openReferralModal());

// Modal functions
function openReferralModal(data = null) {
  if (data) {
    document.getElementById("modalTitle").textContent = "Update Referral";
    selectedReferralId = data.id;
    document.getElementById("referralId").value = data.id;
    document.getElementById("referralDate").value = data.date;
    document.getElementById("referralTime").value = data.time;
    document.getElementById("referralName").value = data.name;
    document.getElementById("referralAge").value = data.age;
    document.getElementById("referralGender").value = data.gender;
    document.getElementById("referralDept").value = data.department;
    document.getElementById("referralAddress").value = data.address;
    document.getElementById("referralComplaint").value = data.complaint;
    document.getElementById("referralRemarks").value = data.remarks;
  } else {
    document.getElementById("modalTitle").textContent =
      "Add Emergency Referral";
    selectedReferralId = null;
    referralForm.reset();
  }

  referralModal.show(); // Bootstrap method to open modal
}

window.closeReferralModal = () => {
  referralModal.hide(); // Bootstrap method to close modal
};

// Submit form
referralForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = document.getElementById("submitReferral");
  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = selectedReferralId ? "Updating..." : "Saving...";

  const data = {
    date: document.getElementById("referralDate").value,
    time: document.getElementById("referralTime").value,
    name: document.getElementById("referralName").value,
    age: document.getElementById("referralAge").value,
    gender: document.getElementById("referralGender").value,
    department: document.getElementById("referralDept").value,
    address: document.getElementById("referralAddress").value,
    complaint: getSelectedComplaint(),
    remarks: document.getElementById("referralRemarks").value,
    createdAt: serverTimestamp(),
  };

  try {
    if (selectedReferralId) {
      const ref = doc(db, "EmergencyReferrals", selectedReferralId);
      await updateDoc(ref, data);
      alert("Referral Updated!");
    } else {
      await addDoc(collection(db, "EmergencyReferrals"), data);
      alert("Referral Added!");
    }
    closeReferralModal();
    loadReferrals();
  } catch (error) {
    console.error(error);
    alert("⚠️ Failed to save referral. Check console.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

// Edit function
window.editReferral = async (id) => {
  const q = query(
    collection(db, "EmergencyReferrals"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  snapshot.forEach((docSnap) => {
    if (docSnap.id === id) openReferralModal({ id, ...docSnap.data() });
  });
};

// Load Referrals
async function loadReferrals() {
  referralsList.innerHTML = "";
  try {
    const q = query(
      collection(db, "EmergencyReferrals"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const referrals = [];
    snapshot.forEach((docSnap) => {
      referrals.push({ id: docSnap.id, ...docSnap.data() });
      const row = `
        <tr>
          <td><strong>${formatDateLabel(
            docSnap.data().date
          )}</strong><br><small>${formatTimeFromString(docSnap.data().time)}</small></td>
          <td>${docSnap.data().name}</td>
          <td>${docSnap.data().age}</td>
          <td>${docSnap.data().gender}</td>
          <td>${docSnap.data().department}</td>
          <td>${docSnap.data().complaint}</td>
          <td class="text-center">
            <button 
              type="button" 
              class="btn btn-sm btn-warning me-1" 
              onclick='editReferral("${docSnap.id}")' 
              title="Edit Referral"
            >
              <i class="fa-solid fa-eye"></i>
            </button>
          </td>
        </tr>
      `;
      referralsList.innerHTML += row;
    });
    updateChart(referrals);
  } catch (error) {
    console.error(error);
  }
}

let referralChart = null; // global Chart.js instance

const chartStartDate = document.getElementById("chartStartDate");
const chartEndDate = document.getElementById("chartEndDate");

// Default to current year
const now = new Date();
const currentYear = now.getFullYear();
chartStartDate.value = `${currentYear}-01-01`;
chartEndDate.value = `${currentYear}-12-31`;

// Helper: format Date as YYYY-MM-DD
function formatDate(d) {
  return d.toISOString().split("T")[0];
}

// Update chart with dynamic date range
function updateChart(referrals) {
  const ctx = document.getElementById("referralChart");
  if (!ctx) return;

  const start = new Date(chartStartDate.value + "T00:00:00"); // avoid locale parsing issues
  const end = new Date(chartEndDate.value + "T23:59:59");     // include entire day

  // Generate all dates in range
  const labels = [];
  const counts = {};
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = formatDate(d);
    labels.push(key);
    counts[key] = 0;
  }

  // Count referrals
  referrals.forEach((r) => {
    let date;
    if (r.date?.toDate) {
      date = r.date.toDate(); // Firestore Timestamp
    } else {
      date = new Date(r.date);
    }

    const key = formatDate(date);
    if (counts[key] !== undefined) counts[key] += 1;
  });

  const data = labels.map((label) => counts[label]);

  // Destroy previous chart if exists
  if (referralChart) referralChart.destroy();

  referralChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: labels.map(formatDateLabel), // format all labels
    datasets: [
      {
        label: "Number of Referrals",
        data,
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.3,
        fill: true,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true },
      x: {
        title: { display: true, text: "Date" },
        ticks: {
          maxRotation: 45,
          autoSkip: true,
          maxTicksLimit: 15,
          callback: function(value, index, ticks) {
            return formatDateLabel(this.getLabelForValue(value));
          },
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          title: function(context) {
            return formatDateLabel(context[0].label);
          },
          label: function(context) {
            return `Referrals: ${context.parsed.y}`;
          },
        },
      },
    },
  },
});

}

// Apply button
document.getElementById("applyDateFilter").addEventListener("click", () => {
  loadReferrals(); // assumes loadReferrals calls updateChart()
});
// =======================
// Export Referral Chart as Image
// =======================
document.getElementById("exportReferralImageBtn").addEventListener("click", () => {
  if (!referralChart) {
    alert("No chart to export.");
    return;
  }

  const canvas = document.getElementById("referralChart");

  // Create temporary canvas to add filter text
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height + 40;
  const tempCtx = tempCanvas.getContext("2d");

  tempCtx.drawImage(canvas, 0, 40);

  const filterText = `Date: ${formatDateLabel(chartStartDate.value)} → ${formatDateLabel(chartEndDate.value)}`;

  tempCtx.font = "bold 14px Arial";
  tempCtx.fillStyle = "#444";
  tempCtx.textAlign = "center";
  tempCtx.fillText(filterText, tempCanvas.width / 2, 20);

  const imageURL = tempCanvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = imageURL;
  link.download = `Emergency_Referrals_${chartStartDate.value}_to_${chartEndDate.value}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// =======================
// Export Referral Data as Excel
// =======================
document.getElementById("exportReferralExcelBtn").addEventListener("click", async () => {
  const startDateVal = chartStartDate.value;
  const endDateVal = chartEndDate.value;
  if (!startDateVal || !endDateVal) return alert("Select a date range first.");

  const startDate = new Date(startDateVal);
  const endDate = new Date(endDateVal);
  endDate.setHours(23, 59, 59, 999);

  const q = query(collection(db, "EmergencyReferrals"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  const rows = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (!data.date) return;

    // Handle Firestore Timestamp or string
    const recordDate = data.date.toDate ? data.date.toDate() : new Date(data.date);
    if (isNaN(recordDate)) return;
    if (recordDate < startDate || recordDate > endDate) return;

    const row = {
      Date: formatDateLabel(recordDate),
      Time: formatTimeFromString(data.time) || "",
      Name: data.name || "",
      Age: data.age || "",
      Gender: data.gender || "",
      Department: data.department || "",
      Complaint: data.complaint || "",
    };
    rows.push(row);
  });

  if (rows.length === 0) return alert("No data to export.");

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet([]);
  XLSX.utils.sheet_add_aoa(worksheet, [
    [`Date Range: ${formatDateLabel(startDateVal)} → ${formatDateLabel(endDateVal)}`],
    [],
  ], { origin: "A1" });
  XLSX.utils.sheet_add_json(worksheet, rows, { origin: "A4", skipHeader: false });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Emergency Referrals");

  const fileName = `Emergency_Referrals_${formatDateLabel(startDateVal)}_to_${formatDateLabel(endDateVal)}.xlsx`;
  XLSX.writeFile(workbook, fileName);

  // alert("Excel exported successfully!");
});

// Initial load
document.addEventListener("DOMContentLoaded", loadReferrals);
