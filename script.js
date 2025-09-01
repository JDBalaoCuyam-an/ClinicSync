// Side Bar Toggle Function
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("show");
}

// Medicine Inventory Functions
function addMedicine() {
  document.getElementById("add-medicine").classList.add("show");
}

// Close Button Function
function closeButton() {
  if (document.getElementById("add-medicine").classList.contains("show")) {
    document.getElementById("add-medicine").classList.remove("show");
  }
}