import { db, auth, currentUserName } from "../../firebaseconfig.js";
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

// ✅ Utility function: check if a date is older than N days
function isOlderThan(dateString, days) {
  if (!dateString) return false;
  const [datePart] = dateString.split(" "); // Extract "YYYY-MM-DD" only
  const date = new Date(datePart);
  if (isNaN(date)) return false;
  const now = new Date();
  const diffMs = now - date;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > days;
}

// Submit new borrower
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;                // Prevent double clicks
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Saving...";      // Optional loading text

  const now = new Date();
  const currentDate = now.toISOString().split("T")[0];
  const currentTime = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const borrower = {
    itemName: document.getElementById("item-name").value,
    quantity: parseInt(document.getElementById("quantity").value),
    borrowerName: document.getElementById("borrower-name").value,
    personnel: currentUserName || "Unknown User",
    dateBorrowed: `${currentDate} ${currentTime}`,
    status: "Borrowed",
    dateReturned: "",
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
    alert("⚠️ Failed to add borrower. Check console.");
  } finally {
    submitBtn.disabled = false;             // Re-enable button
    submitBtn.textContent = originalText;   // Restore original text
  }
});

// ✅ Load borrowers and clean up old returned ones
async function loadBorrowers() {
  borrowers = [];
  const querySnapshot = await getDocs(collection(db, "ClinicInventory"));

  const deletions = []; // track deletions to await them together

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();

    // ✅ Auto-delete records returned > 30 days ago
    if (data.status === "Returned" && isOlderThan(data.dateReturned, 30)) {
      deletions.push(deleteDoc(doc(db, "ClinicInventory", docSnap.id)));
    } else {
      borrowers.push({ id: docSnap.id, ...data });
    }
  });

  // ✅ Wait for all deletions to finish before rendering
  if (deletions.length > 0) {
    console.log(`🧹 Deleting ${deletions.length} old returned record(s)...`);
    await Promise.all(deletions);
    alert(`${deletions.length} old returned record(s) were auto-deleted.`);
  }

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
        ? "#EF4000"
        : status === "returned"
        ? "#66BB6A"
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
        dateReturned: "",
      });

      alert("↩️ Undo successful. Marked back as Borrowed.");
      loadBorrowers();
    });
  });
}

searchBar.addEventListener("input", renderBorrowers);
filter.addEventListener("change", renderBorrowers);

loadBorrowers();
