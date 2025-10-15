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
function addBorrowerOverlay() {
  document.getElementById("add-borrower").classList.add("show");
  document.getElementById("overlay").classList.add("show");
}

function addPatientOverlay() {
  document.getElementById("add-new-patient").classList.add("show");
  document.getElementById("overlay").classList.add("show");
}
function addConsultationRecordOverlay() {
  document.getElementById("add-consultation-record").classList.add("show");
  document.getElementById("overlay").classList.add("show");
}
function addPhysicalExamOverlay() {
  document.getElementById("add-physical-exam").classList.add("show");
  document.getElementById("overlay").classList.add("show");
}
// Close Button Function and Background Click Blocker
function closeButtonOverlay() {
  const addMedicine = document.getElementById("add-medicine");
  const dispenseMedicine = document.getElementById("dispense-medicine");
  const addBorrower = document.getElementById("add-borrower");
  const addPatient = document.getElementById("add-new-patient");
  const addConsultationRecord = document.getElementById("add-consultation-record");
  const overlay = document.getElementById("overlay");
  const addPhysicalExam = document.getElementById("add-physical-exam");

  if (addPhysicalExam && addPhysicalExam.classList.contains("show")) {
    addPhysicalExam.classList.remove("show");
  }
  if (addMedicine && addMedicine.classList.contains("show")) {
    addMedicine.classList.remove("show");
  }
  if (dispenseMedicine && dispenseMedicine.classList.contains("show")) {
    dispenseMedicine.classList.remove("show");
  }
  if (addBorrower && addBorrower.classList.contains("show")) {
    addBorrower.classList.remove("show");
  }
  if (addPatient && addPatient.classList.contains("show")) {
    addPatient.classList.remove("show");
  }
  if (addConsultationRecord && addConsultationRecord.classList.contains("show")) {
    addConsultationRecord.classList.remove("show");
  }
  if (overlay) {
    overlay.classList.remove("show");
  }
}
