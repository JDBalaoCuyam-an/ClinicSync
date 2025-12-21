// Side Bar Toggle Function
// function toggleSidebar() {
//   document.getElementById("sidebar").classList.toggle("show");
// }

// Medicine Inventory Functions
// function addMedicineOverlay() {
//   document.getElementById("add-medicine").classList.add("show");
//   document.getElementById("overlay").classList.add("show");
// }

// function dispenseMedicineOverlay() {
//   document.getElementById("dispense-medicine").classList.add("show");
//   document.getElementById("overlay").classList.add("show");
// }


// function addPatientOverlay() {
//   document.getElementById("add-new-patient").classList.add("show");
//   document.getElementById("overlay").classList.add("show");
// }
// function addConsultationRecordOverlay() {
//   document.getElementById("add-consultation-record").classList.add("show");
//   document.getElementById("overlay").classList.add("show");
// }
// function addPhysicalExamOverlay() {
//   document.getElementById("add-physical-exam").classList.add("show");
//   document.getElementById("overlay").classList.add("show");
// }
// Close Button Function and Background Click Blocker
// function closeButtonOverlay() {
//   const addMedicine = document.getElementById("add-medicine");
//   // const dispenseMedicine = document.getElementById("dispense-medicine");
//   const addBorrower = document.getElementById("add-borrower");
//   const addPatient = document.getElementById("add-new-patient");
//   const addConsultationRecord = document.getElementById(
//     "add-consultation-record"
//   );
//   const overlay = document.getElementById("overlay");
//   const addPhysicalExam = document.getElementById("add-physical-exam");
//   const consultationOveriew = document.getElementById("consultation-overview");
//   const examOverview = document.getElementById("exam-overview-modal");

//   if (examOverview && examOverview.classList.contains("show")) {
//     examOverview.classList.remove("show");
//   }
//   if (addPhysicalExam && addPhysicalExam.classList.contains("show")) {
//     addPhysicalExam.classList.remove("show");
//   }
  // if (addMedicine && addMedicine.classList.contains("show")) {
  //   addMedicine.classList.remove("show");
  // }
  // if (dispenseMedicine && dispenseMedicine.classList.contains("show")) {
  //   dispenseMedicine.classList.remove("show");
  // }
  // if (addBorrower && addBorrower.classList.contains("show")) {
  //   addBorrower.classList.remove("show");
  // }
  // if (addPatient && addPatient.classList.contains("show")) {
  //   addPatient.classList.remove("show");
  // }
  // if (
  //   addConsultationRecord &&
  //   addConsultationRecord.classList.contains("show")
  // ) {
  //   addConsultationRecord.classList.remove("show");
  // }

  // if (consultationOveriew && consultationOveriew.classList.contains("show")) {
  //   consultationOveriew.classList.remove("show");
  // }
//   if (overlay) {
//     overlay.classList.remove("show");
//   }
// }


function loadHTML(id, file) {
  return fetch(file)
    .then(response => response.text())
    .then(data => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = data;
        document.dispatchEvent(new CustomEvent(`${id}-loaded`)); // 👈 this line
      }
    });
}


loadHTML("sidebar-container", "sidebar.html");
loadHTML("footer-container", "footer.html");

// class Modal {
//   constructor(modalId, openBtnId, cancelBtnId = null) {
//     this.modal = document.getElementById(modalId);
//     this.openBtn = document.getElementById(openBtnId);
//     this.cancelBtn = cancelBtnId ? document.getElementById(cancelBtnId) : null;

//     if (!this.modal || !this.openBtn) {
//       console.error("Modal or open button not found.");
//       return;
//     }

//     // Bind events
//     this.openBtn.addEventListener("click", () => this.open());
//     if (this.cancelBtn) this.cancelBtn.addEventListener("click", () => this.close());

//     // Background click closes modal
//     this.modal.addEventListener("click", (e) => {
//       if (e.target === this.modal) this.close();
//     });

//     // ESC key close
//     document.addEventListener("keydown", (e) => {
//       if (e.key === "Escape") this.close();
//     });
//   }

//   open() {
//     this.modal.classList.add("open");
//   }

//   close() {
//     this.modal.classList.remove("open");
//   }
// }

// const createNewUser = new Modal('create-new-user','create-new-user-btn','cancel-create-new-user');

