import { db, currentUserName} from "../../firebaseconfig.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const tableBody = document.getElementById("medicine-table-body");
const searchBar = document.getElementById("search-bar");
const modal = document.getElementById("add-medicine");
const overlay = document.getElementById("overlay");

const saveBtn = document.getElementById("save-btn");

let medicines = []; // cache all medicines
let editMode = false;
let editId = null;

/* ============================================================
   ✅ ADD or UPDATE MEDICINE
============================================================ */
// Bootstrap modal instance
const addMedicineModalEl = document.getElementById("addMedicineModal");
const addMedicineModal = new bootstrap.Modal(addMedicineModalEl, {
  backdrop: 'static', // prevent closing on click outside
  keyboard: false
});

const modalTitle = addMedicineModalEl.querySelector(".modal-title");
const form = document.getElementById("add-medicine-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const saveBtn = form.querySelector('button[type="submit"]');
  saveBtn.disabled = true;
  const originalText = saveBtn.textContent;
  saveBtn.textContent = editMode ? "Updating..." : "Saving...";

  const name = document.getElementById("medicine-name").value.trim();
  const stock = parseInt(document.getElementById("stock-quantity").value, 10);
  const expiry = document.getElementById("expiry-date").value;
  const perPack = parseInt(document.getElementById("per-pack")?.value || 0, 10);
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

      // 🔹 Audit log for update
      const auditMessage = `${currentUserName || "Unknown User"} updated medicine "${name}" (Stock: ${stock}, Expiry: ${formatDateLabel(expiry)})`;
      await addDoc(collection(db, "AdminAuditTrail"), {
        message: auditMessage,
        userId: currentUserName || null,
        timestamp: new Date(),
        section: "ClinicStaffActions",
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

      // 🔹 Audit log for add
      const auditMessage = `${currentUserName || "Unknown User"} added new medicine "${name}" (Stock: ${stock}, Expiry: ${formatDateLabel(expiry)})`;
      await addDoc(collection(db, "AdminAuditTrail"), {
        message: auditMessage,
        userId: currentUserName || null,
        timestamp: new Date(),
        section: "ClinicStaffActions",
      });

      alert("✅ Medicine added successfully!");
    }

    form.reset();
    addMedicineModal.hide(); // Bootstrap: close modal
    loadMedicines();
  } catch (error) {
    console.error("Error saving medicine or logging audit:", error);
    alert("⚠️ Failed to save medicine. Check console.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
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
    form.querySelector('button[type="submit"]').textContent = "Update";

    // Show Bootstrap modal
    addMedicineModal.show();
  });
});
}

document.getElementById("export-btn").addEventListener("click", async () => {
  // 🔹 Filtered & sorted medicines
  const searchValue = searchBar.value.toLowerCase();
  const filtered = medicines
    .filter((med) => med.name.toLowerCase().includes(searchValue))
    .sort((a, b) => a.name.localeCompare(b.name));

  // 🔹 Map to sheet-friendly format
  const data = filtered.map((med) => ({
    Name: med.name || "",
    Stock: med.stock || 0,
    "Date Purchased": formatDateLabel(med.datePurchased) || "-",
    Expiry: formatDateLabel(med.expiry) || "-",
    "Per Pack": med.perPack || "-",
    Dispensed: med.dispensed || 0,
  }));

  // 🔹 Create worksheet & workbook
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Medicines");

  // 🔹 Export Excel file
  XLSX.writeFile(wb, "medicines.xlsx");

  // 🔹 Add audit trail
  try {
    const auditMessage = `${currentUserName || "Unknown User"} exported the medicines list to Excel`;
    
    await addDoc(collection(db, "AdminAuditTrail"), {
      message: auditMessage,
      userId: currentUserName || null,
      timestamp: new Date(),
      section: "ClinicStaffActions",
    });

    console.log("Audit trail for export added ✅");
  } catch (error) {
    console.error("Failed to log export audit trail:", error);
  }
});


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

    if (rows.length < 2) {
      return alert("⚠ CSV has no data rows!");
    }

    // Skip header row
    const dataRows = rows.slice(1);
    const previewTable = document.getElementById("bulk-preview-table");
    const tbody = previewTable.querySelector("tbody");
    tbody.innerHTML = "";

    dataRows.forEach((row) => {
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


// Download CSV Template
document.getElementById("download-template-btn").onclick = async () => {
  const headers = ["Name", "Stock", "Expiry(YYYY-MM-DD)", "Per Pack", "Date Purchased(YYYY-MM-DD)"];
  const csvContent = [headers.join(",")].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "medicine_template.csv";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // 🔹 Audit log for template download
  try {
    const auditMessage = `${currentUserName || "Unknown User"} downloaded the medicine CSV template.`;
    await addDoc(collection(db, "AdminAuditTrail"), {
      message: auditMessage,
      userId: currentUserName || null,
      timestamp: new Date(),
      section: "ClinicStaffActions",
    });
  } catch (err) {
    console.error("Failed to log audit for template download:", err);
  }
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
    if (rows.length < 2) return alert("⚠ No data found in CSV!");

    const dataRows = rows.slice(1);
    const duplicates = [];
    const newEntries = [];

    try {
      for (const row of dataRows) {
        const [name, stock, expiry, perPack, datePurchased] = row;
        const medicineRef = collection(db, "MedicineInventory");
        const querySnapshot = await getDocs(query(medicineRef, where("name", "==", name.trim())));

        if (!querySnapshot.empty) {
          querySnapshot.forEach((docSnap) => {
            duplicates.push({
              id: docSnap.id,
              existing: docSnap.data(),
              incoming: { name: name.trim(), stock: Number(stock), expiry, perPack: Number(perPack), datePurchased },
            });
          });
        } else {
          newEntries.push({ name: name.trim(), stock: Number(stock), expiry, perPack: Number(perPack), datePurchased });
        }
      }

      if (duplicates.length > 0) {
        // Populate Bootstrap modal table
        const tbody = document.querySelector("#duplicates-table tbody");
        tbody.innerHTML = "";
        duplicates.forEach((dup, index) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td><input type="checkbox" data-index="${index}" checked></td>
            <td>${dup.incoming.name}</td>
            <td>${dup.existing.stock}</td>
            <td>${dup.incoming.stock}</td>
            <td>${dup.incoming.expiry}</td>
            <td>${dup.incoming.datePurchased}</td>
          `;
          tbody.appendChild(tr);
        });

        // Show Bootstrap modal
        const duplicatesModal = new bootstrap.Modal(document.getElementById('duplicatesModal'));
        duplicatesModal.show();

        // Merge button
        document.getElementById("merge-selected-btn").onclick = async () => {
          const checkboxes = document.querySelectorAll("#duplicates-table tbody input[type='checkbox']");
          for (const checkbox of checkboxes) {
            if (checkbox.checked) {
              const dup = duplicates[checkbox.dataset.index];
              const docRef = doc(db, "MedicineInventory", dup.id);
              await updateDoc(docRef, {
                stock: dup.existing.stock + dup.incoming.stock,
                expiry: dup.incoming.expiry,
                perPack: dup.incoming.perPack,
                datePurchased: dup.incoming.datePurchased,
              });
            }
          }

          duplicatesModal.hide();

          // Upload non-duplicates
          for (const entry of newEntries) {
            await addDoc(collection(db, "MedicineInventory"), {
              ...entry,
              dispensed: 0,
              createdAt: new Date(),
            });
          }

          loadMedicines();
          alert("✅ Upload and merge completed!");
        };

        // Skip duplicates button
        document.getElementById("skip-duplicates-btn").onclick = async () => {
          duplicatesModal.hide();
          for (const entry of newEntries) {
            await addDoc(collection(db, "MedicineInventory"), {
              ...entry,
              dispensed: 0,
              createdAt: new Date(),
            });
          }
          loadMedicines();
          alert("✅ Uploaded non-duplicate medicines.");
        };
      } else {
        // No duplicates, upload all
        for (const entry of newEntries) {
          await addDoc(collection(db, "MedicineInventory"), {
            ...entry,
            dispensed: 0,
            createdAt: new Date(),
          });
        }
        alert("✅ Bulk upload completed!");
        loadMedicines();
      }

    } catch (err) {
      console.error(err);
      alert("⚠ Error uploading medicines. Check console.");
    }
  };

  reader.readAsText(file);
};


