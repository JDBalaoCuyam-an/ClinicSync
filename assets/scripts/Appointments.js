import { db } from "../../firebaseconfig.js";
import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* ===================================== */
/*            CALENDAR LOGIC             */
/* ===================================== */
const calendar = document.getElementById("calendar");
const title = document.getElementById("month-year");
const prevBtn = document.getElementById("prev-month");
const nextBtn = document.getElementById("next-month");

let currentDate = new Date();
let unavailableDays = new Set();

async function saveUnavailableDay(dateString) {
  await setDoc(doc(db, "unavailableDays", dateString), { date: dateString });
}

async function removeUnavailableDay(dateString) {
  await deleteDoc(doc(db, "unavailableDays", dateString));
}

async function loadUnavailableDays() {
  unavailableDays.clear();
  const snapshot = await getDocs(collection(db, "unavailableDays"));
  snapshot.forEach((docSnap) => {
    unavailableDays.add(docSnap.id);
  });
  renderCalendar(currentDate);
}

function renderCalendar(date) {
  calendar.innerHTML = "";
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  title.textContent = `${date.toLocaleString("default",{month:"long"})} ${year}`;
  const today = new Date(); today.setHours(0,0,0,0);

  // Previous month filler
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const div = document.createElement("div");
    div.classList.add("calendar-day","inactive");
    div.textContent = daysInPrevMonth - i;
    calendar.appendChild(div);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const div = document.createElement("div");
    div.classList.add("calendar-day");
    div.textContent = day;

    const formattedMonth = String(month + 1).padStart(2,"0");
    const formattedDay = String(day).padStart(2,"0");
    const dateString = `${year}-${formattedMonth}-${formattedDay}`;
    const thisDate = new Date(dateString); thisDate.setHours(0,0,0,0);

    if (thisDate.getTime() === today.getTime()) div.classList.add("today");
    if (thisDate < today) div.classList.add("past-day");
    else {
      if (unavailableDays.has(dateString)) div.classList.add("unavailable");

      div.addEventListener("click", async () => {
        if (unavailableDays.has(dateString)) {
          if(confirm(`This date (${dateString}) is unavailable. Make it available?`)){
            unavailableDays.delete(dateString);
            div.classList.remove("unavailable");
            await removeUnavailableDay(dateString);
          }
        } else {
          if(confirm(`Mark ${dateString} as unavailable?`)){
            unavailableDays.add(dateString);
            div.classList.add("unavailable");
            await saveUnavailableDay(dateString);
          }
        }
      });
    }
    calendar.appendChild(div);
  }

  // Next month filler
  const totalCells = firstDayOfMonth + daysInMonth;
  const remaining = 7 - (totalCells % 7);
  if (remaining < 7) {
    for (let i=1;i<=remaining;i++){
      const div=document.createElement("div");
      div.classList.add("calendar-day","inactive");
      div.textContent=i;
      calendar.appendChild(div);
    }
  }
}

prevBtn.addEventListener("click",()=>{currentDate.setMonth(currentDate.getMonth()-1);renderCalendar(currentDate);});
nextBtn.addEventListener("click",()=>{currentDate.setMonth(currentDate.getMonth()+1);renderCalendar(currentDate);});

loadUnavailableDays();

/* ===================================== */
/*            STAFF LIST                 */
/* ===================================== */
const staffList = document.getElementById("staffList");

async function loadStaff() {
  try {
    const q = query(
      collection(db, "users"),
      where("user_type", "in", ["doctor", "nurse"])
    );
    const snap = await getDocs(q);
    staffList.innerHTML = "";

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;
      const fullName = `${data.lastName}, ${data.firstName}`;
      const role = data.user_type;
      const doctorType = data.doctor_type ?? null;
      const availability = data.availability || []; // fetch availability array

      // Generate HTML for availability
      const availabilityHtml = availability.length
        ? `<ul class="m-0 mt-2 p-0" style="list-style:none;">
             ${availability
               .map((a) => `<li>${a.day}: ${a.start} - ${a.end}</li>`)
               .join("")}
           </ul>`
        : '<p class="m-0 mt-2 text-muted">(No availability set)</p>';

      const item = document.createElement("div");
      item.classList.add("staff-item");

      item.innerHTML = `
        <div class="staff-card p-3 mb-3 shadow-sm rounded" style="cursor:pointer;">
          <p class="mb-1 fw-bold">${fullName}</p>
          <p class="m-0 text-secondary">${role === "doctor" ? "Doctor" : "Nurse"}</p>
          ${role === "doctor" ? `<p class="m-0 text-primary">Specialization: ${doctorType ?? "(none yet)"}</p>` : ""}
          ${availabilityHtml}
        </div>
      `;

      item.querySelector(".staff-card").addEventListener("click", () => {
        openAvailabilityModal(id, fullName);
      });

      staffList.appendChild(item);
    });
  } catch (err) {
    console.error("Error loading staff:", err);
  }
}


loadStaff();

/* ===================================== */
/*        AVAILABILITY MODAL LOGIC       */
/* ===================================== */
let selectedStaffId=null;

function openAvailabilityModal(id,staffName){
  selectedStaffId=id;
  document.getElementById("modalStaffName").innerText=staffName;

  // Reset fields
  document.getElementById("modalDay").value="";
  document.getElementById("modalStartTime").value="";
  document.getElementById("modalEndTime").value="";
  document.getElementById("availabilityList").innerHTML="";

  loadAvailability(id);

  const modal=new bootstrap.Modal(document.getElementById("availabilityModal"));
  modal.show();
}

async function loadAvailability(userId){
  const ref=doc(db,"users",userId);
  const snap=await getDoc(ref);
  if(!snap.exists()) return;
  const data=snap.data();
  const availability=data.availability || [];

  const container=document.getElementById("availabilityList");
  container.innerHTML="";
  availability.forEach((item,index)=>{
    const entry=document.createElement("div");
    entry.className="d-flex justify-content-between align-items-center border p-2 rounded mb-2";

    entry.innerHTML=`
      <div>
        <strong>${item.day}</strong><br>
        <span>${item.start} - ${item.end}</span>
      </div>
      <button class="btn btn-danger btn-sm" data-index="${index}">Remove</button>
    `;
    entry.querySelector("button").addEventListener("click",()=>{removeAvailability(userId,index);});
    container.appendChild(entry);
  });
}

document.getElementById("addAvailability").addEventListener("click",async ()=>{
  const day=document.getElementById("modalDay").value;
  const start=document.getElementById("modalStartTime").value;
  const end=document.getElementById("modalEndTime").value;

  if(!day || !start || !end){alert("Please fill all fields.");return;}

  const ref=doc(db,"users",selectedStaffId);
  const snap=await getDoc(ref);
  const data=snap.data();
  const availability=data.availability || [];

  availability.push({day,start,end});
  await setDoc(ref,{availability},{merge:true});

  loadAvailability(selectedStaffId);

  document.getElementById("modalDay").value="";
  document.getElementById("modalStartTime").value="";
  document.getElementById("modalEndTime").value="";
});

async function removeAvailability(userId,index){
  const ref=doc(db,"users",userId);
  const snap=await getDoc(ref);
  const data=snap.data();
  const availability=data.availability || [];

  availability.splice(index,1);
  await setDoc(ref,{availability},{merge:true});
  loadAvailability(userId);
}

