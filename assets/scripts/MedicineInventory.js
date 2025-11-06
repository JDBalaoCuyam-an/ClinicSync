import { db } from "../../firebaseconfig.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const form = document.getElementById("add-medicine-form");
const tableBody = document.getElementById("medicine-table-body");
const searchBar = document.getElementById("search-bar");

let medicines = []; // cache all medicines

// ✅ Add Medicine (with full fields)
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("medicine-name").value;
  const stock = parseInt(document.getElementById("stock-quantity").value);
  const expiry = document.getElementById("expiry-date").value;

  // 🔥 Additional Fields
  const perPack = parseInt(
    document.getElementById("per-pack")?.value || 0
  );
  const datePurchased =
    document.getElementById("date-purchased")?.value ||
    new Date().toISOString().split("T")[0];

  try {
    await addDoc(collection(db, "MedicineInventory"), {
      name,
      stock,
      expiry,
      perPack,
      datePurchased,
      dispensed: 0, // default
      createdAt: new Date(),
    });

    alert("✅ Medicine added successfully!");
    form.reset();
    closeButtonOverlay();
    loadMedicines();
  } catch (error) {
    console.error("Error adding medicine:", error);
  }
});

// ✅ Load medicines
async function loadMedicines() {
  medicines = [];

  const querySnapshot = await getDocs(collection(db, "MedicineInventory"));
  querySnapshot.forEach((docSnap) => {
    medicines.push({ id: docSnap.id, ...docSnap.data() });
  });

  renderMedicines();
}

// ✅ Render to table
function renderMedicines() {
  const searchValue = searchBar.value.toLowerCase();

  tableBody.innerHTML = "";

  const filtered = medicines.filter((med) =>
    med.name.toLowerCase().includes(searchValue)
  );

  filtered.forEach((med) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${med.name ?? ""}</td>
      <td>${med.stock ?? 0}</td>
      <td>${med.datePurchased ?? "-"}</td>
      <td>${med.expiry ?? ""}</td>
      <td>${med.perPack ?? "-"}</td>
      <td>${med.dispensed ?? 0}</td>
      <td>
        <button class="delete-btn" data-id="${med.id}">Delete</button>
      </td>
    `;

    // ✅ row click = dispense
    row.addEventListener("click", (e) => {
      if (e.target.classList.contains("delete-btn")) return;

      const popup = document.getElementById("dispense-medicine");
      const overlay = document.getElementById("overlay");

      popup.classList.add("show");
      overlay.classList.add("show");
      document.getElementById("dispense-medicine-name").innerText = med.name;
      popup.setAttribute("data-id", med.id);
    });

    tableBody.appendChild(row);
  });

  // ✅ delete listener
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      await deleteDoc(doc(db, "MedicineInventory", id));
      loadMedicines();
    });
  });
}

// ✅ Search listener
searchBar.addEventListener("input", renderMedicines);

// ✅ Dispense functionality update
const dispenseForm = document.getElementById("dispense-medicine-form");
dispenseForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const popup = document.getElementById("dispense-medicine");
  const medicineId = popup.getAttribute("data-id");
  const qtyToGive = parseInt(
    document.getElementById("medicine-quantity").value
  );

  if (!medicineId || isNaN(qtyToGive) || qtyToGive <= 0) {
    alert("⚠️ Invalid quantity!");
    return;
  }

  const med = medicines.find((m) => m.id === medicineId);

  if (!med) {
    alert("⚠️ Medicine not found");
    return;
  }

  if (qtyToGive > med.stock) {
    alert("⚠️ Not enough stock!");
    return;
  }

  try {
    const newStock = med.stock - qtyToGive;
    const newDispensed = (med.dispensed || 0) + qtyToGive;

    await updateDoc(doc(db, "MedicineInventory", medicineId), {
      stock: newStock,
      dispensed: newDispensed,
    });

    alert(`✅ Dispensed ${qtyToGive} of ${med.name}`);
    dispenseForm.reset();
    closeButtonOverlay();
    loadMedicines();
  } catch (error) {
    console.error("Error dispensing:", error);
  }
});

loadMedicines();
