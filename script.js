// Side Bar Toggle Function
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("show");
}

// Medicine Inventory Functions
function addMedicineOverlay() {
  document.getElementById("add-medicine").classList.add("show");
  document.getElementById("overlay").classList.add("show");
}

function dispenseMedicineOverlay() {
  document.getElementById("dispense-medicine").classList.add("show");
  document.getElementById("overlay").classList.add("show");
}
// Close Button Function and Background Click Blocker
function closeButtonOverlay() {
  if (document.getElementById("add-medicine").classList.contains("show")) {
    document.getElementById("add-medicine").classList.remove("show");
  }
  if (document.getElementById("dispense-medicine").classList.contains("show")) {
    document.getElementById("dispense-medicine").classList.remove("show");
  }
    document.getElementById("overlay").classList.remove("show");
}