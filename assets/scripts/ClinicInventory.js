import { db } from "../../firebaseconfig.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const form = document.getElementById("add-borrower-form");
const tableBody = document.getElementById("clinic-table-body");
const searchBar = document.getElementById("search-bar");
const filter = document.getElementById("filter");

let borrowers = [];

// Submit new borrower
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // get raw input value
  const dateBorrowedInput = document.getElementById("date-borrowed").value;

  // current date & time
  const now = new Date();
  const currentDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const currentTime = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // if user picked a date, use it + current time
  // else fallback to current date + current time
  const finalDateBorrowed = dateBorrowedInput
    ? `${dateBorrowedInput} ${currentTime}`
    : `${currentDate} ${currentTime}`;

  const borrower = {
    itemName: document.getElementById("item-name").value,
    quantity: parseInt(document.getElementById("quantity").value),
    borrowerName: document.getElementById("borrower-name").value,
    personnel: document.getElementById("personnel-incharge").value,
    dateBorrowed: finalDateBorrowed,
    status: "Borrowed",
    dateReturned: document.getElementById("date-returned").value || "",
    createdAt: new Date(),
  };

  try {
    await addDoc(collection(db, "ClinicInventory"), borrower);
    alert("✅ Borrower added successfully!");
    form.reset();
    closeButtonOverlay();
    loadBorrowers();
  } catch (error) {
    console.error("Error adding borrower:", error);
  }
});

// Load borrowers
async function loadBorrowers() {
  borrowers = [];
  const querySnapshot = await getDocs(collection(db, "ClinicInventory"));
  querySnapshot.forEach((docSnap) => {
    borrowers.push({ id: docSnap.id, ...docSnap.data() });
  });
  renderBorrowers();
}

// Render borrowers with search & filter
function renderBorrowers() {
  const searchValue = searchBar.value.toLowerCase();
  const filterValue = filter.value;

  tableBody.innerHTML = "";

  const filtered = borrowers.filter((b) => {
    const name = (b.borrowerName || "").toLowerCase();
    const status = (b.status || "").toLowerCase();

    const matchesSearch = name.includes(searchValue.toLowerCase());
    const matchesFilter = filterValue === "all" || status === filterValue;

    return matchesSearch && matchesFilter;
  });

  filtered.forEach((b) => {
    const status = (b.status || "").toLowerCase();
    const statusColor =
      status === "borrowed"
        ? "#EF4000" // Borrowed = Red-Orange
        : status === "returned"
        ? "#66BB6A" // Returned = Green
        : "gray";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${b.itemName || "-"}</td>
      <td>${b.quantity || "-"}</td>
      <td>${b.borrowerName || "-"}</td>
      <td>${b.personnel || "-"}</td>
      <td>${b.dateBorrowed || "-"}</td>
      <td>
        <span style="
          background-color:${statusColor};
          color:white;
          padding:2px 8px;
          border-radius:12px;
          font-weight:bold;
          text-transform:capitalize;
        ">
          ${b.status || "-"}
        </span>
      </td>
      <td>${b.dateReturned || "-"}</td>
      <td>
        ${
          status === "borrowed"
            ? `<button class="check-btn" data-id="${b.id}">Return</button>`
            : `<button class="undo-btn" data-id="${b.id}">Undo</button>`
        }
      </td>
    `;
    tableBody.appendChild(row);
  });

  // Handle Return button
  document.querySelectorAll(".check-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const borrower = borrowers.find((b) => b.id === id);

      if (!borrower) return;

      const confirmReturn = confirm(
        `Mark "${borrower.itemName}" borrowed by ${borrower.borrowerName} as returned?`
      );

      if (!confirmReturn) return;

      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const currentTime = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      await updateDoc(doc(db, "ClinicInventory", id), {
        status: "Returned",
        dateReturned: `${today} ${currentTime}`,
      });

      alert("✅ Item marked as returned.");
      loadBorrowers();
    });
  });

  // Handle Undo button
  document.querySelectorAll(".undo-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const borrower = borrowers.find((b) => b.id === id);

      if (!borrower) return;

      const confirmUndo = confirm(
        `Undo return for "${borrower.itemName}" borrowed by ${borrower.borrowerName}?`
      );

      if (!confirmUndo) return;

      await updateDoc(doc(db, "ClinicInventory", id), {
        status: "Borrowed",
        dateReturned: "", // clear returned date
      });

      alert("↩️ Undo successful. Marked back as Borrowed.");
      loadBorrowers();
    });
  });
}

searchBar.addEventListener("input", renderBorrowers);
filter.addEventListener("change", renderBorrowers);

loadBorrowers();
