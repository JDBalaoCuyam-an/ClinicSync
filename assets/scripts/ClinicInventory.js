import { db, auth, currentUserName } from "../../firebaseconfig.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
function setToCurrentDate() {
  const now = new Date();

  // Format date (YYYY-MM-DD)
  const date = now.toLocaleDateString("en-CA");

  // Format time (HH:MM 24-hour)
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  document.getElementById("date-borrowed").value = date;
}
setToCurrentDate();

function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
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
// ============================
// Borrowing form: Load borrowers into select
// ===========================
const borrowerSelect = document.getElementById("borrower-name");

async function loadNames() {
  borrowerSelect.innerHTML =
    `<option value="" selected disabled>Loading borrowers...</option>`;

  try {
    const usersRef = collection(db, "users");

    const q = query(
      usersRef,
      where("user_type", "in", ["student", "employee"])
    );

    const snapshot = await getDocs(q);

    borrowerSelect.innerHTML =
      `<option value="" selected disabled>Select borrower</option>`;

    snapshot.forEach((doc) => {
      const user = doc.data();

      const option = document.createElement("option");
      option.value = doc.id; // or user.fullName if preferred
      option.textContent = `${user.firstName} ${user.lastName}`;
      
      borrowerSelect.appendChild(option);
    });

  } catch (error) {
    console.error("Failed to load borrowers:", error);
    borrowerSelect.innerHTML =
      `<option value="" disabled>Error loading borrowers</option>`;
  }
}

// Load on page ready
loadNames();

// Submit new borrower
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Saving...";

  const borrowerSelect = document.getElementById("borrower-name");
  const selectedOption =
    borrowerSelect.options[borrowerSelect.selectedIndex];

  if (!borrowerSelect.value) {
    alert("Please select a borrower.");
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    return;
  }

  const now = new Date();
  const currentDate = now.toLocaleDateString("en-CA"); // YYYY-MM-DD
  const currentTime = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const borrowerData = {
    itemName: document.getElementById("item-name").value.trim(),
    quantity: parseInt(document.getElementById("quantity").value, 10),

    // ✅ Borrower info
    borrowerId: borrowerSelect.value, // Firestore user ID
    borrowerName: selectedOption.text, // Human-readable name

    personnel: currentUserName || "Unknown User",
    dateBorrowed: `${formatDateLabel(currentDate)} ${formatTimeFromString(currentTime)}`,
    status: "Borrowed",
    dateReturned: "",

    createdAt: new Date(),
  };

  try {
    await addDoc(collection(db, "ClinicInventory"), borrowerData);

    alert("✅ Borrower added successfully!");
    form.reset();
    closeButtonOverlay();
    loadBorrowers();

  } catch (error) {
    console.error("Error adding borrower:", error);
    alert("⚠️ Failed to add borrower. Check console.");

  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
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
      <td>${
        b.dateReturned ? formatDateLabel(b.dateReturned) : "Not Returned"
      }</td>

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
