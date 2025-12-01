// Sample data - in a real application, this would come from a database
const patientData = {
    name: "John Michael Doe",
    id: "2023-12345",
    department: "College of Information Technology",
    course: "Bachelor of Science in Information Technology",
    year: "3rd Year",
    dob: "1990-01-15",
    gender: "Male",
    phone: "+1 (555) 123-4567",
    email: "john.doe@example.edu",
    address: "123 University Ave, City, State 12345"
};

const medicalRecords = [
    {
        date: "2023-10-15",
        doctor: "Dr. Sarah Johnson",
        nurse: "Nurse Maria Santos",
        complaint: "Fever and sore throat",
        diagnosis: "Viral pharyngitis",
        prescription: "Paracetamol 500mg - 1 tab every 6 hours for 3 days",
        followUp: "No"
    },
    {
        date: "2023-08-22",
        doctor: "Dr. Michael Chen",
        nurse: "Nurse James Wilson",
        complaint: "Annual physical examination",
        diagnosis: "Good health, normal results",
        prescription: "Multivitamins once daily",
        followUp: "Yes - Next year"
    },
    {
        date: "2023-06-10",
        doctor: "Dr. Emily Rodriguez",
        nurse: "Nurse Lisa Garcia",
        complaint: "Allergy symptoms",
        diagnosis: "Seasonal allergies",
        prescription: "Loratadine 10mg - 1 tab daily as needed",
        followUp: "No"
    },
    {
        date: "2023-03-05",
        doctor: "Dr. Robert Brown",
        nurse: "Nurse David Lee",
        complaint: "Back pain",
        diagnosis: "Muscle strain",
        prescription: "Ibuprofen 400mg - 1 tab every 8 hours for pain",
        followUp: "Yes - 2 weeks"
    },
    {
        date: "2023-01-18",
        doctor: "Dr. Jennifer Martinez",
        nurse: "Nurse Anna Kim",
        complaint: "Headache and dizziness",
        diagnosis: "Migraine",
        prescription: "Sumatriptan 50mg - 1 tab at onset of migraine",
        followUp: "No"
    }
];

const appointments = [
    {
        id: 1,
        date: "2023-11-20",
        time: "10:00 AM",
        doctor: "Dr. Sarah Johnson",
        reason: "Follow-up consultation",
        status: "Upcoming"
    },
    {
        id: 2,
        date: "2023-09-05",
        time: "2:30 PM",
        doctor: "Dr. Michael Chen",
        reason: "Vaccination",
        status: "Completed"
    },
    {
        id: 3,
        date: "2023-07-18",
        time: "9:15 AM",
        doctor: "Dr. Emily Rodriguez",
        reason: "Skin rash evaluation",
        status: "Completed"
    }
];

// Global variables
let calendar;
let appointmentFormListener = null;

// DOM elements
const appointmentsList = document.getElementById('appointments-list');
const recordsTableBody = document.getElementById('records-table-body');
const nextAppointmentElement = document.getElementById('next-appointment');

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    // Set patient name in header
    document.getElementById('patient-name').textContent = patientData.name;

    // Populate medical records
    populateMedicalRecords();

    // Populate appointments
    populateAppointments();

    // Initialize FullCalendar
    initializeCalendar();

    // Set up next appointment
    const nextAppointment = appointments.find(app => app.status === 'Upcoming');
    if (nextAppointment) {
        nextAppointmentElement.innerHTML = `
            <p class="mb-1"><strong>${formatDate(nextAppointment.date)} at ${nextAppointment.time}</strong></p>
            <p class="mb-1">With ${nextAppointment.doctor}</p>
            <p class="mb-0">Reason: ${nextAppointment.reason}</p>
        `;
    }

    // Set up new appointment button
    document.getElementById('new-appointment-btn').addEventListener('click', function () {
        setupAppointmentModal();
        const appointmentModal = new bootstrap.Modal(document.getElementById('appointmentModal'));
        appointmentModal.show();
    });

    // Initialize My Information edit functionality
    initializeEditInformation();

    // Initialize footer functionality
    initializeFooter();

    // Setup modal event listeners
    setupModalEventListeners();
});

// Setup modal event listeners
function setupModalEventListeners() {
    const appointmentModal = document.getElementById('appointmentModal');
    
    // Reset form when modal is hidden
    appointmentModal.addEventListener('hidden.bs.modal', function () {
        resetAppointmentForm();
        removeAppointmentFormListener();
    });
    
    // Clean up when modal is closed
    appointmentModal.addEventListener('hide.bs.modal', function () {
        removeAppointmentFormListener();
    });
}

// Setup appointment modal
function setupAppointmentModal() {
    // Remove any existing listener first
    removeAppointmentFormListener();
    
    // Set today's date as the default
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    document.getElementById('appointment-date').value = formattedDate;
    
    // Set default time (next available hour)
    const nextHour = today.getHours() + 1;
    const formattedTime = `${nextHour.toString().padStart(2, '0')}:00`;
    document.getElementById('appointment-time').value = formattedTime;
    
    // Add new form submission listener
    const appointmentForm = document.getElementById('appointment-form');
    appointmentFormListener = function(e) {
        e.preventDefault();
        handleAppointmentSubmission();
    };
    appointmentForm.addEventListener('submit', appointmentFormListener);
}

// Remove appointment form listener
function removeAppointmentFormListener() {
    if (appointmentFormListener) {
        const appointmentForm = document.getElementById('appointment-form');
        appointmentForm.removeEventListener('submit', appointmentFormListener);
        appointmentFormListener = null;
    }
}

// Reset appointment form
function resetAppointmentForm() {
    const appointmentForm = document.getElementById('appointment-form');
    if (appointmentForm) {
        appointmentForm.reset();
    }
}

// Handle appointment form submission
function handleAppointmentSubmission() {
    // Get form data
    const formData = {
        date: document.getElementById('appointment-date').value,
        time: document.getElementById('appointment-time').value,
        reason: document.getElementById('appointment-reason').value,
        doctor: document.getElementById('appointment-doctor').value
    };

    // Validate required fields
    if (!formData.date || !formData.time || !formData.reason) {
        alert('Please fill in all required fields: Date, Time, and Reason for Visit.');
        return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(formData.date + 'T' + formData.time);
    const today = new Date();
    
    if (selectedDate < today) {
        alert('Please select a future date and time for your appointment.');
        return;
    }

    // Create new appointment
    const newAppointment = {
        id: appointments.length + 1,
        date: formData.date,
        time: formatTimeForDisplay(formData.time),
        doctor: formData.doctor || 'Any Available Doctor',
        reason: formData.reason,
        status: 'Upcoming'
    };
    
    appointments.push(newAppointment);

    console.log('Appointment scheduled:', newAppointment);

    // Hide modal first
    const appointmentModal = bootstrap.Modal.getInstance(document.getElementById('appointmentModal'));
    appointmentModal.hide();

    // Show success message
    setTimeout(() => {
        alert('Appointment scheduled successfully!');
        
        // Refresh appointments list and calendar
        populateAppointments();
        refreshCalendar();
        
        // Update next appointment
        updateNextAppointment();
    }, 300);
}

// Format time for display (convert 24h to 12h format)
function formatTimeForDisplay(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

// Initialize FullCalendar
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    // Convert appointments to FullCalendar events
    const events = appointments.map(appointment => {
        const eventDate = new Date(appointment.date);
        const [time, modifier] = appointment.time.split(' ');
        let [hours, minutes] = time.split(':');
        
        if (modifier === 'PM' && hours !== '12') {
            hours = parseInt(hours, 10) + 12;
        }
        if (modifier === 'AM' && hours === '12') {
            hours = '00';
        }
        
        eventDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        
        return {
            id: appointment.id,
            title: `Appointment with ${appointment.doctor}`,
            start: eventDate,
            extendedProps: {
                reason: appointment.reason,
                status: appointment.status,
                time: appointment.time
            },
            backgroundColor: appointment.status === 'Upcoming' ? '#2c7fb8' : 
                            appointment.status === 'Completed' ? '#28a745' : '#6c757d',
            borderColor: appointment.status === 'Upcoming' ? '#1d5f8a' : 
                        appointment.status === 'Completed' ? '#1e7e34' : '#545b62'
        };
    });

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: events,
        eventClick: function(info) {
            const appointment = appointments.find(app => app.id == info.event.id);
            if (appointment) {
                showAppointmentDetails(appointment);
            }
        },
        dateClick: function(info) {
            // When a date is clicked, open the appointment modal with that date pre-filled
            document.getElementById('appointment-date').value = info.dateStr;
            setupAppointmentModal();
            const appointmentModal = new bootstrap.Modal(document.getElementById('appointmentModal'));
            appointmentModal.show();
        },
        eventMouseEnter: function(info) {
            // Show tooltip on hover
            info.el.setAttribute('title', `${info.event.extendedProps.reason} - ${info.event.extendedProps.status}`);
        },
        eventDisplay: 'block',
        eventTimeFormat: {
            hour: '2-digit',
            minute: '2-digit',
            meridiem: true
        }
    });

    calendar.render();
}

// Refresh calendar
function refreshCalendar() {
    if (calendar) {
        calendar.refetchEvents();
    }
}

// Show appointment details
function showAppointmentDetails(appointment) {
    const modalContent = `
        <div class="appointment-details">
            <h5>Appointment Details</h5>
            <div class="detail-item">
                <strong>Date:</strong> ${formatDate(appointment.date)}
            </div>
            <div class="detail-item">
                <strong>Time:</strong> ${appointment.time}
            </div>
            <div class="detail-item">
                <strong>Doctor:</strong> ${appointment.doctor}
            </div>
            <div class="detail-item">
                <strong>Reason:</strong> ${appointment.reason}
            </div>
            <div class="detail-item">
                <strong>Status:</strong> 
                <span class="badge ${appointment.status === 'Upcoming' ? 'bg-warning' : 'bg-success'}">
                    ${appointment.status}
                </span>
            </div>
        </div>
    `;
    
    // You could use a custom modal or alert for this
    // For now, using a simple alert
    alert(`Appointment Details:\n\nDate: ${formatDate(appointment.date)}\nTime: ${appointment.time}\nDoctor: ${appointment.doctor}\nReason: ${appointment.reason}\nStatus: ${appointment.status}`);
}

// Update next appointment display
function updateNextAppointment() {
    const nextAppointment = appointments.find(app => app.status === 'Upcoming');
    if (nextAppointment) {
        nextAppointmentElement.innerHTML = `
            <p class="mb-1"><strong>${formatDate(nextAppointment.date)} at ${nextAppointment.time}</strong></p>
            <p class="mb-1">With ${nextAppointment.doctor}</p>
            <p class="mb-0">Reason: ${nextAppointment.reason}</p>
        `;
    } else {
        nextAppointmentElement.innerHTML = `<p class="text-muted mb-0">No upcoming appointments</p>`;
    }
}

// Footer Quick Links functionality
function initializeFooter() {
    // Footer quick links navigation
    const footerLinks = document.querySelectorAll('.footer-links a[data-tab]');

    footerLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const tabId = this.getAttribute('data-tab');

            // Switch to the selected tab
            const targetTab = document.querySelector(`a[href="#${tabId}"]`);
            if (targetTab) {
                const tab = new bootstrap.Tab(targetTab);
                tab.show();

                // Scroll to top of the page
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Back to Top functionality
    const backToTopBtn = document.querySelector('.backToTop');

    if (backToTopBtn) {
        // Scroll to top when clicked
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// Simple Edit Information Functionality
function initializeEditInformation() {
    const editBtn = document.getElementById('edit-info-btn');
    const cancelBtn = document.getElementById('cancel-info-btn');
    const saveBtn = document.getElementById('save-info-btn');
    const infoFields = document.querySelectorAll('.info-field');

    // Edit button click handler
    editBtn.addEventListener('click', function (e) {
        e.preventDefault();
        console.log('Edit button clicked - enabling edit mode');

        // Enable all fields
        infoFields.forEach(field => {
            field.disabled = false;
            field.classList.add('editing');
        });

        // Toggle button visibility
        editBtn.style.display = 'none';
        cancelBtn.style.display = 'inline-block';
        saveBtn.style.display = 'inline-block';
    });

    // Cancel button click handler
    cancelBtn.addEventListener('click', function (e) {
        e.preventDefault();
        console.log('Cancel button clicked - disabling edit mode');

        // Disable all fields
        infoFields.forEach(field => {
            field.disabled = true;
            field.classList.remove('editing');
        });

        // Toggle button visibility
        editBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'none';
        saveBtn.style.display = 'none';

        // Reset form to original values
        resetInformationForm();
    });

    // Save button click handler
    saveBtn.addEventListener('click', function (e) {
        e.preventDefault();
        console.log('Save button clicked - saving changes');

        // Get the updated values
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;

        // Update the header name
        document.getElementById('patient-name').textContent = `${firstName} ${lastName}`;

        // Update avatar initials
        const userAvatar = document.querySelector('.user-avatar');
        if (userAvatar) {
            userAvatar.textContent = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
        }

        // Disable all fields
        infoFields.forEach(field => {
            field.disabled = true;
            field.classList.remove('editing');
        });

        // Toggle button visibility
        editBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'none';
        saveBtn.style.display = 'none';

        alert('Information saved successfully!');
    });

    // Auto-calculate age when birthdate changes
    const birthdateField = document.getElementById('birthdate');
    const ageField = document.getElementById('age');

    if (birthdateField && ageField) {
        birthdateField.addEventListener('change', function () {
            const birthdate = new Date(this.value);
            const today = new Date();
            let age = today.getFullYear() - birthdate.getFullYear();
            const monthDiff = today.getMonth() - birthdate.getMonth();

            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
                age--;
            }

            ageField.value = age;
        });
    }
}

// Reset information form to original values
function resetInformationForm() {
    document.getElementById('firstName').value = 'John';
    document.getElementById('lastName').value = 'Doe';
    document.getElementById('middleName').value = 'Michael';
    document.getElementById('extName').value = '';
    document.getElementById('gender').value = 'Male';
    document.getElementById('birthdate').value = '1990-01-15';
    document.getElementById('age').value = '33';
    document.getElementById('civilStatus').value = 'Single';
    document.getElementById('nationality').value = 'Filipino';
    document.getElementById('religion').value = 'Roman Catholic';
    document.getElementById('schoolId').value = '2023-12345';
    document.getElementById('department').value = 'CIT';
    document.getElementById('course').value = 'Bachelor of Science in Information Technology';
    document.getElementById('year').value = '3';
    document.getElementById('fatherName').value = 'Robert Doe';
    document.getElementById('fatherAge').value = '65';
    document.getElementById('fatherOccupation').value = 'Engineer';
    document.getElementById('fatherHealth').value = 'Good';
    document.getElementById('motherName').value = 'Jane Doe';
    document.getElementById('motherAge').value = '62';
    document.getElementById('motherOccupation').value = 'Teacher';
    document.getElementById('motherHealth').value = 'Good';
    document.getElementById('phone').value = '+1 (555) 123-4567';
    document.getElementById('email').value = 'john.doe@example.edu';
    document.getElementById('address').value = '123 University Ave, City, State 12345';
    document.getElementById('guardianName').value = 'Jane Doe';
    document.getElementById('guardianPhone').value = '+1 (555) 987-6543';
}

// Helper functions
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function populateMedicalRecords() {
    recordsTableBody.innerHTML = '';

    medicalRecords.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(record.date)}</td>
            <td>${record.doctor}</td>
            <td>${record.nurse}</td>
            <td>${record.complaint}</td>
            <td>${record.diagnosis}</td>
            <td>${record.prescription}</td>
            <td>
                <span class="badge ${record.followUp === 'No' ? 'bg-success' : 'bg-warning'}">
                    ${record.followUp}
                </span>
            </td>
        `;
        recordsTableBody.appendChild(row);
    });
}

function populateAppointments() {
    appointmentsList.innerHTML = '';

    appointments.forEach(appointment => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-3';
        col.innerHTML = `
            <div class="card appointment-card ${appointment.status.toLowerCase()} h-100">
                <div class="card-body">
                    <div class="appointment-date fw-bold">${formatDate(appointment.date)}</div>
                    <div class="appointment-time text-muted">${appointment.time}</div>
                    <div class="appointment-doctor mt-2">With: ${appointment.doctor}</div>
                    <div class="appointment-reason mt-1">${appointment.reason}</div>
                    <div class="mt-3">
                        <span class="badge ${appointment.status === 'Upcoming' ? 'bg-warning' : 'bg-success'}">${appointment.status}</span>
                    </div>
                </div>
            </div>
        `;
        appointmentsList.appendChild(col);
    });
}

// Export functions for global access (useful for debugging)
window.patientDashboard = {
    patientData,
    medicalRecords,
    appointments,
    populateAppointments,
    populateMedicalRecords
};