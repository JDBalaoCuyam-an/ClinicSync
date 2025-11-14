import { db } from "../../firebaseconfig.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  orderBy,
  query,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const referralsList = document.getElementById("referralsList");
const addReferralBtn = document.getElementById("addReferralBtn");
const referralModal = document.getElementById("referralModal");
const referralForm = document.getElementById("referralForm");
const chartFilter = document.getElementById("chartFilter");

let selectedReferralId = null;
let referralChart = null;

// Open Modal
addReferralBtn.addEventListener("click", () => openReferralModal());

// Modal functions
function openReferralModal(data = null) {
  referralModal.style.display = "flex";
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
    document.getElementById("referralYear").value = data.year;
    document.getElementById("referralAddress").value = data.address;
    document.getElementById("referralComplaint").value = data.complaint;
    document.getElementById("referralRemarks").value = data.remarks;
  } else {
    document.getElementById("modalTitle").textContent = "Add Emergency Referral";
    selectedReferralId = null;
    referralForm.reset();
  }
}

window.closeReferralModal = () => {
  referralModal.style.display = "none";
};

// Submit form
referralForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    date: document.getElementById("referralDate").value,
    time: document.getElementById("referralTime").value,
    name: document.getElementById("referralName").value,
    age: document.getElementById("referralAge").value,
    gender: document.getElementById("referralGender").value,
    department: document.getElementById("referralDept").value,
    year: document.getElementById("referralYear").value,
    address: document.getElementById("referralAddress").value,
    complaint: document.getElementById("referralComplaint").value,
    remarks: document.getElementById("referralRemarks").value,
    createdAt: serverTimestamp()
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
  }
});

// Edit function
window.editReferral = async (id) => {
  const q = query(collection(db, "EmergencyReferrals"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  snapshot.forEach(docSnap => {
    if (docSnap.id === id) openReferralModal({ id, ...docSnap.data() });
  });
};

// Load Referrals
async function loadReferrals() {
  referralsList.innerHTML = "";
  try {
    const q = query(collection(db, "EmergencyReferrals"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const referrals = [];
    snapshot.forEach(docSnap => {
      referrals.push({ id: docSnap.id, ...docSnap.data() });
      const row = `
        <tr>
          <td><strong>${docSnap.data().date}</strong><br><small>${docSnap.data().time}</small></td>
          <td>${docSnap.data().name}</td>
          <td>${docSnap.data().age}</td>
          <td>${docSnap.data().gender}</td>
          <td>${docSnap.data().department}</td>
          <td>${docSnap.data().year}</td>
          <td>${docSnap.data().complaint}</td>
          <td>
            <button class="action-btn edit" onclick='editReferral("${docSnap.id}")'>
              <i class="fa-solid fa-pen"></i>
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
function updateChart(referrals) {
  const ctx = document.getElementById("referralChart");
  if (!ctx) return;

  const filter = chartFilter.value;
  const counts = {};
  const now = new Date();

  referrals.forEach(r => {
    const date = new Date(r.date);
    let key;

    switch (filter) {
      case "day":
        if (date.toDateString() === now.toDateString()) key = date.getHours(); // hours 0-23
        break;

      case "week": {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        if (date >= weekStart && date <= weekEnd) key = date.getDay(); // 0-6 Sun-Sat
        break;
      }

      case "month":
        if (date.getFullYear() === now.getFullYear()) key = date.getMonth(); // 0-11 months
        break;

      case "year":
      case "all":
        key = date.getFullYear(); // year
        break;
    }

    if (key !== undefined) counts[key] = (counts[key] || 0) + 1;
  });

  let labels = [];
  let data = [];

  if (filter === "day") {
    labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    data = labels.map((_, i) => counts[i] || 0);
  } else if (filter === "week") {
    labels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    data = labels.map((_, i) => counts[i] || 0);
  } else if (filter === "month") {
    labels = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    data = labels.map((_, i) => counts[i] || 0);
  } else if (filter === "year" || filter === "all") {
    const sortedYears = Object.keys(counts).sort((a,b) => a - b);
    labels = sortedYears;
    data = sortedYears.map(y => counts[y]);
  }

  if (referralChart) referralChart.destroy();

  referralChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Number of Referrals",
        data,
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true },
        x: { 
          title: { display: true, text: "Time" },
          ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 12 }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Referrals: ${context.parsed.y}`;
            }
          }
        }
      }
    }
  });
}



// Chart filter change
chartFilter.addEventListener("change", () => loadReferrals());

// Load everything on page load
document.addEventListener("DOMContentLoaded", loadReferrals);
