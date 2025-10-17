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
const categoryFilter = document.querySelector("#category-filter select");

let medicines = []; // cache all medicines

// Submit form -> save medicine
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const medicineName = document.getElementById("medicine-name").value;
  const stockQuantity = document.getElementById("stock-quantity").value;
  const expiryDate = document.getElementById("expiry-date").value;

  const categories = [];
  document.querySelectorAll('input[name="category"]:checked').forEach((c) => {
    categories.push(c.value);
  });

  try {
    await addDoc(collection(db, "MedicineInventory"), {
      name: medicineName,
      categories,
      stock: parseInt(stockQuantity),
      expiry: expiryDate,
      createdAt: new Date(),
    });

    alert("✅ Medicine added successfully!");
    form.reset();
    closeButtonOverlay();
    loadMedicines(); // reload table
  } catch (error) {
    console.error("Error adding medicine:", error);
  }
});

// Load medicines
async function loadMedicines() {
  medicines = []; // reset cache
  const querySnapshot = await getDocs(collection(db, "MedicineInventory"));
  querySnapshot.forEach((docSnap) => {
    medicines.push({ id: docSnap.id, ...docSnap.data() });
  });
  renderMedicines(); // render with filter/search
}

// Render medicines based on search + filter
function renderMedicines() {
  const searchValue = searchBar.value.toLowerCase();
  const categoryValue = categoryFilter.value;

  tableBody.innerHTML = "";

  const filtered = medicines.filter((med) => {
    const matchesSearch = med.name.toLowerCase().includes(searchValue);
    const matchesCategory =
      categoryValue === "All" ||
      med.categories.some((c) =>
        c.toLowerCase().includes(categoryValue.toLowerCase())
      );
    return matchesSearch && matchesCategory;
  });

  filtered.forEach((med) => {
    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${med.name}</td>
        <td>${med.categories.join(", ")}</td>
        <td>${med.stock}</td>
        <td>${med.expiry}</td>
        <td><button class="delete-btn" data-id="${med.id}">Delete</button></td>
      `;

    // Click row -> open dispense medicine form
    row.addEventListener("click", (e) => {
      if (e.target.classList.contains("delete-btn")) return;

      const dispenseForm = document.getElementById("dispense-medicine");
      const overlay = document.getElementById("overlay");

      dispenseForm.classList.add("show");
      overlay.classList.add("show");
      document.getElementById("dispense-medicine-name").innerText = med.name;
      dispenseForm.setAttribute("data-id", med.id);
    });

    tableBody.appendChild(row);
  });

  // Delete listeners
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      await deleteDoc(doc(db, "MedicineInventory", id));
      loadMedicines();
    });
  });
}

// Listen for search + filter
searchBar.addEventListener("input", renderMedicines);
categoryFilter.addEventListener("change", renderMedicines);

// Dispense logic
const dispenseForm = document.getElementById("dispense-medicine-form");
dispenseForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const parentPopup = document.getElementById("dispense-medicine");
  const medicineId = parentPopup.getAttribute("data-id");
  const qtyToGive = parseInt(
    document.getElementById("medicine-quantity").value
  );

  if (!medicineId || isNaN(qtyToGive) || qtyToGive <= 0) {
    alert("⚠️ Please enter a valid quantity");
    return;
  }

  const med = medicines.find((m) => m.id === medicineId);
  if (!med) {
    alert("⚠️ Medicine not found!");
    return;
  }

  if (qtyToGive > med.stock) {
    alert("⚠️ Not enough stock available!");
    return;
  }

  try {
    const medRef = doc(db, "MedicineInventory", medicineId);
    await updateDoc(medRef, { stock: med.stock - qtyToGive });

    alert(`✅ Dispensed ${qtyToGive} of ${med.name}`);
    dispenseForm.reset();
    closeButtonOverlay();
    loadMedicines();
  } catch (error) {
    console.error("Error dispensing medicine:", error);
  }
});

// Load on page start
loadMedicines();
