import { db } from "../../firebaseconfig.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const form = document.getElementById("add-medicine-form");
const tableBody = document.getElementById("medicine-table-body");
const searchBar = document.getElementById("search-bar");
const modal = document.getElementById("add-medicine");
const overlay = document.getElementById("overlay");
const modalTitle = modal.querySelector("h2"); // 🔹 The modal label
const saveBtn = document.getElementById("save-btn");

let medicines = []; // cache all medicines
let editMode = false;
let editId = null;

/* ============================================================
   ✅ ADD or UPDATE MEDICINE
============================================================ */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const saveBtn = form.querySelector('button[type="submit"]');
  saveBtn.disabled = true;            // Disable button to prevent double click
  const originalText = saveBtn.textContent;
  saveBtn.textContent = editMode ? "Updating..." : "Saving..."; // Loading text

  const name = document.getElementById("medicine-name").value.trim();
  const stock = parseInt(document.getElementById("stock-quantity").value);
  const expiry = document.getElementById("expiry-date").value;
  const perPack = parseInt(document.getElementById("per-pack")?.value || 0);
  const datePurchased =
    document.getElementById("date-purchased")?.value ||
    new Date().toISOString().split("T")[0];

  if (!name || isNaN(stock) || !expiry) {
    alert("⚠️ Please fill in all required fields!");
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
    return;
  }

  try {
    if (editMode && editId) {
      // 🔄 UPDATE EXISTING MEDICINE
      await updateDoc(doc(db, "MedicineInventory", editId), {
        name,
        stock,
        expiry,
        perPack,
        datePurchased,
      });

      alert("✅ Medicine updated successfully!");
      editMode = false;
      editId = null;
      modalTitle.textContent = "Add New Medicine";
      saveBtn.textContent = "Save";
    } else {
      // ➕ ADD NEW MEDICINE
      await addDoc(collection(db, "MedicineInventory"), {
        name,
        stock,
        expiry,
        perPack,
        datePurchased,
        dispensed: 0,
        createdAt: new Date(),
      });

      alert("✅ Medicine added successfully!");
    }

    form.reset();
    closeButtonOverlay();
    loadMedicines();
  } catch (error) {
    console.error("Error saving medicine:", error);
    alert("⚠️ Failed to save medicine. Check console.");
  } finally {
    saveBtn.disabled = false;       // Re-enable button
    saveBtn.textContent = originalText; // Restore original text
  }
});


/* ============================================================
   ✅ LOAD MEDICINES
============================================================ */
async function loadMedicines() {
  medicines = [];
  const querySnapshot = await getDocs(collection(db, "MedicineInventory"));
  querySnapshot.forEach((docSnap) => {
    medicines.push({ id: docSnap.id, ...docSnap.data() });
  });
  renderMedicines();
}

/* ============================================================
   ✅ RENDER TABLE
============================================================ */
function renderMedicines() {
  const searchValue = searchBar.value.toLowerCase();
  tableBody.innerHTML = "";

  // 🔹 Filter medicines by search
  let filtered = medicines.filter((med) =>
    med.name.toLowerCase().includes(searchValue)
  );

  // 🔹 Sort alphabetically by name
  filtered.sort((a, b) => {
    const nameA = (a.name || "").toLowerCase();
    const nameB = (b.name || "").toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });

  filtered.forEach((med) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${med.name ?? ""}</td>
      <td>${med.stock ?? 0}</td>
      <td>${formatDateLabel(med.datePurchased) ?? "-"}</td>
      <td>${formatDateLabel(med.expiry) ?? ""}</td>
      <td>${med.perPack ?? "-"}</td>
      <td>${med.dispensed ?? 0}</td>
      <td>
        <button style="padding:5px; 
        background-color:#4682B4; 
        border:none; 
        color:white; 
        border-radius:5px;
        cursor:pointer;
        " class="update-btn" data-id="${
          med.id
        }">Update</button>
      </td>
    `;

    // Row click opens dispense (except edit button)
    // row.addEventListener("click", (e) => {
    //   if (e.target.classList.contains("update-btn")) return;

    //   const popup = document.getElementById("dispense-medicine");
    //   const overlay = document.getElementById("overlay");

    //   popup.classList.add("show");
    //   overlay.classList.add("show");
    //   document.getElementById("dispense-medicine-name").innerText = med.name;
    //   popup.setAttribute("data-id", med.id);
    // });

    tableBody.appendChild(row);
  });

  // Edit button listener
  document.querySelectorAll(".update-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const med = medicines.find((m) => m.id === id);
      if (!med) return;

      // Fill form fields
      document.getElementById("medicine-name").value = med.name || "";
      document.getElementById("stock-quantity").value = med.stock || 0;
      document.getElementById("per-pack").value = med.perPack || 0;
      document.getElementById("date-purchased").value =
        med.datePurchased || new Date().toISOString().split("T")[0];
      document.getElementById("expiry-date").value = med.expiry || "";

      // Switch to Edit mode
      editMode = true;
      editId = id;

      // Change modal title & button
      modalTitle.textContent = "Edit Medicine";
      saveBtn.textContent = "Update";

      // Show modal
      modal.style.display = "block";
      overlay.classList.add("show");
    });
  });
}


/* ============================================================
   ✅ SEARCH FILTER
============================================================ */
searchBar.addEventListener("input", renderMedicines);


/* ============================================================
   ✅ RESET MODAL STATE WHEN CLOSED
============================================================ */
// window.closeButtonOverlay = function () {
//   overlay.classList.remove("show");
//   modal.style.display = "none";
//   document.getElementById("dispense-medicine")?.classList.remove("show");

  // 🧹 Reset form and modal label
//   form.reset();
//   editMode = false;
//   editId = null;
//   modalTitle.textContent = "Add New Medicine";
//   saveBtn.textContent = "Save";
// };

/* ============================================================
   ✅ INITIAL LOAD
============================================================ */
loadMedicines();


/* ============================================================
   📌 BULK UPLOAD MODAL OPEN/CLOSE
============================================================ */
document.getElementById("open-bulk-upload").onclick = () => {
  document.getElementById("bulk-upload-modal").classList.remove("d-none");
};

document.getElementById("close-bulk-btn").onclick = () => {
  document.getElementById("bulk-upload-modal").classList.add("d-none");
  document.getElementById("bulk-preview-table").classList.add("d-none");
  document.getElementById("upload-bulk-btn").classList.add("d-none");
};


/* ============================================================
   📌 SIMPLE CSV PARSER
============================================================ */
function parseCSV(text) {
  return text
    .trim()
    .split("\n")
    .map((line) => line.split(",").map((value) => value.trim()));
}


/* ============================================================
   📌 PREVIEW CSV BEFORE UPLOAD
============================================================ */
document.getElementById("preview-bulk-btn").onclick = () => {
  const file = document.getElementById("bulk-file").files[0];
  if (!file) return alert("⚠ Please select a CSV file!");

  const reader = new FileReader();
  reader.onload = (e) => {
    const rows = parseCSV(e.target.result);
    const previewTable = document.getElementById("bulk-preview-table");
    const tbody = previewTable.querySelector("tbody");

    tbody.innerHTML = "";

    rows.forEach((row) => {
      const [name, stock, expiry, perPack, datePurchased] = row;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${name}</td>
        <td>${stock}</td>
        <td>${formatDateLabel(expiry)}</td>
        <td>${perPack}</td>
        <td>${formatDateLabel(datePurchased)}</td>
      `;
      tbody.appendChild(tr);
    });

    previewTable.classList.remove("d-none");
    document.getElementById("upload-bulk-btn").classList.remove("d-none");
  };

  reader.readAsText(file);
};


/* ============================================================
   📌 UPLOAD ALL ROWS TO FIRESTORE
============================================================ */
document.getElementById("upload-bulk-btn").onclick = async () => {
  const file = document.getElementById("bulk-file").files[0];
  if (!file) return alert("⚠ Please select a CSV file!");

  const reader = new FileReader();
  reader.onload = async (e) => {
    const rows = parseCSV(e.target.result);

    try {
      for (const row of rows) {
        const [name, stock, expiry, perPack, datePurchased] = row;

        await addDoc(collection(db, "MedicineInventory"), {
          name,
          stock: Number(stock),
          expiry,
          perPack: Number(perPack),
          datePurchased,
          dispensed: 0,
          createdAt: new Date(),
        });
      }

      alert("✅ Bulk upload completed!");
      document.getElementById("bulk-upload-modal").classList.add("d-none");
      loadMedicines(); // refresh table
    } catch (err) {
      console.error(err);
      alert("⚠ Error uploading medicines. Check console.");
    }
  };

  reader.readAsText(file);
};
