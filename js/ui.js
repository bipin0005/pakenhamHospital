// UI router and views
import { ensureHashRoute, toISO, addMinutes, DURATIONS, showToast, formatDateTime, currency } from './utils.js';
import { getUsers, getAppointments, getInvoices, getNotifications, markAllNotificationsRead, markNotificationsReadByIds, clearAppointments, clearInvoices, clearNotifications, clearEmailLog, deleteUser, upsertUser } from './storage.js';
import { getCurrentUser, login, logout, registerPatient, seedDemo, registerStaff } from './auth.js';
import { forDoctor, forPatient, createAppointment, cancelAppointment, completeAppointment, deleteAppointment } from './appointments.js';
import { processPayment } from './invoice.js';

const root = document.getElementById('app-root');
const navLinks = document.getElementById('nav-links');
const navUser = document.getElementById('nav-user');
const logoutBtn = document.getElementById('logout-btn');
const seedBtn = document.getElementById('seed-btn');
const notifBadge = document.getElementById('notif-badge');

seedBtn.addEventListener('click', () => {
  const res = seedDemo();
  showToast(res.alreadySeeded ? 'Demo data already present' : 'Demo data seeded', 'success');
  render();
});

logoutBtn.addEventListener('click', () => {
  logout();
  location.hash = '#/landing';
  render();
});

function updateNavbar() {
  const user = getCurrentUser();
  navLinks.innerHTML = '';
  if (!user) {
    navLinks.innerHTML = `
      <li class="nav-item"><a class="nav-link" href="#/landing">Home</a></li>
      <li class="nav-item"><a class="nav-link" href="#/patient-portal">Patient Portal</a></li>
      <li class="nav-item"><a class="nav-link" href="#/staff-login">Staff Login</a></li>`;
    navUser.textContent = 'Guest';
    logoutBtn.style.display = 'none';
  } else {
    navUser.textContent = user.firstName;
    logoutBtn.style.display = '';
    if (user.role === 'patient') {
      navLinks.innerHTML = `
        <li class="nav-item"><a class="nav-link" href="#/patient-dashboard">Dashboard</a></li>
        <li class="nav-item"><a class="nav-link" href="#/book">Book</a></li>`;
    } else if (user.role === 'doctor') {
      navLinks.innerHTML = `
        <li class="nav-item"><a class="nav-link" href="#/doctor">Doctor Dashboard</a></li>`;
    } else if (user.role === 'receptionist') {
      navLinks.innerHTML = `
        <li class="nav-item"><a class="nav-link" href="#/reception">Receptionist Dashboard</a></li>`;
    } else if (user.role === 'admin') {
      navLinks.innerHTML = `
        <li class="nav-item"><a class="nav-link" href="#/admin">Admin</a></li>`;
    }
  }

  const current = getCurrentUser();
  const unread = getNotifications().filter(n=>!n.read).filter(n=>
    !current || shouldShowNotificationForUser(n, current)
  ).length;
  if (unread > 0) {
    notifBadge.textContent = String(unread);
    notifBadge.style.display = '';
    notifBadge.classList.add('attn');
  } else {
    notifBadge.style.display = 'none';
    notifBadge.classList.remove('attn');
  }
}

function shouldShowNotificationForUser(n, user) {
  // Show notifications addressed to the user by meta, or general types
  if (user.role === 'doctor') {
    return (n.meta?.doctorId === user.id) || (n.type === 'complete' && n.meta?.doctorId === user.id);
  }
  if (user.role === 'patient') {
    return (n.meta?.patientId === user.id);
  }
  if (user.role === 'receptionist') {
    // Show booking/invoice/cancel events broadly or where they were cashier
    return ['booking','invoice','cancel','complete'].includes(n.type) || n.meta?.cashierId === user.id;
  }
  if (user.role === 'admin') {
    // Admin sees staff registrations and seeds
    return ['staff','seed'].includes(n.type);
  }
  return false;
}

function viewLanding() {
  root.innerHTML = `
    <section class="hero mb-4">
      <div class="row align-items-center">
        <div class="col-lg-8">
          <h1 class="display-6 mb-3">Pakenham Hospital Smart PMS</h1>
          <p class="lead">High-fidelity frontend prototype demonstrating patient booking, staff dashboards, conflict prevention, and invoicing.</p>
          <a class="btn btn-primary me-2" href="#/patient-portal">Patient Portal</a>
          <a class="btn btn-outline-primary" href="#/staff-login">Staff Login</a>
        </div>
      </div>
    </section>
    <div class="row g-3">
      <div class="col-md-4">
        <div class="card card-hover h-100"><div class="card-body">
          <h5 class="card-title">Robust booking</h5>
          <p class="mb-0">30-minute slots, real-time conflict checks, and suggested next slot.</p>
        </div></div>
      </div>
      <div class="col-md-4">
        <div class="card card-hover h-100"><div class="card-body">
          <h5 class="card-title">Doctor & Receptionist</h5>
          <p class="mb-0">Role-based dashboards with notifications and email log simulation.</p>
        </div></div>
      </div>
      <div class="col-md-4">
        <div class="card card-hover h-100"><div class="card-body">
          <h5 class="card-title">Invoices</h5>
          <p class="mb-0">Client-side PDF invoices via jsPDF with download and log.</p>
        </div></div>
      </div>
    </div>`;
}

function viewPatientPortal() {
  root.innerHTML = `
    <div class="row">
      <div class="col-md-6">
        <div class="card mb-3"><div class="card-body">
          <h5 class="card-title">Patient Login</h5>
          <form id="loginForm">
            <div class="mb-2"><label class="form-label">Username</label><input class="form-control" name="username" required></div>
            <div class="mb-2"><label class="form-label">Password</label><input class="form-control" name="password" type="password" required></div>
            <button class="btn btn-primary" type="submit">Login</button>
          </form>
        </div></div>
      </div>
      <div class="col-md-6">
        <div class="card mb-3"><div class="card-body">
          <h5 class="card-title">Register</h5>
          <form id="registerForm">
            <div class="row g-2">
              <div class="col-md-6"><label class="form-label">First Name</label><input class="form-control" name="firstName" required></div>
              <div class="col-md-6"><label class="form-label">Last Name</label><input class="form-control" name="lastName" required></div>
              <div class="col-12"><label class="form-label">Email</label><input class="form-control" name="email" type="email" required></div>
              <div class="col-md-6"><label class="form-label">Username</label><input class="form-control" name="username" required></div>
              <div class="col-md-6"><label class="form-label">Password</label><input class="form-control" name="password" type="password" minlength="6" required></div>
            </div>
            <div class="form-text">For demo only. Credentials stored in localStorage.</div>
            <button class="btn btn-success mt-2" type="submit">Create Account</button>
          </form>
        </div></div>
      </div>
    </div>`;

  document.getElementById('loginForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const f = e.target;
    try {
      const user = login(f.username.value, f.password.value);
      if (user.role !== 'patient') throw new Error('Use Staff Login for staff accounts');
      location.hash = '#/patient-dashboard';
      render();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
  document.getElementById('registerForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const f = e.target;
    try {
      registerPatient({ username: f.username.value.trim(), firstName: f.firstName.value.trim(), lastName: f.lastName.value.trim(), email: f.email.value.trim(), password: f.password.value });
      showToast('Registration successful. Please login.', 'success');
      f.reset();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}

function viewStaffLogin() {
  root.innerHTML = `
    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card"><div class="card-body">
          <h5 class="card-title">Staff Login</h5>
          <div class="alert alert-info py-2">If login fails, click "Seed Demo Data" in the top-right and try again.</div>
          <form id="staffLogin">
            <div class="mb-2"><label class="form-label">Username</label><input class="form-control" name="username" required></div>
            <div class="mb-2"><label class="form-label">Password</label><input class="form-control" name="password" type="password" required></div>
            <button class="btn btn-primary" type="submit">Login</button>
          </form>
          <div class="form-text mt-2">Demo: drsmith/doctor123, drlee/doctor123, reception/reception123</div>
        </div></div>
      </div>
    </div>`;
  document.getElementById('staffLogin').addEventListener('submit', (e)=>{
    e.preventDefault();
    const f = e.target;
    try {
      const user = login(f.username.value, f.password.value);
      if (user.role === 'doctor') location.hash = '#/doctor';
      else if (user.role === 'receptionist') location.hash = '#/reception';
      else throw new Error('Use Patient Portal for patient accounts');
      render();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}

function viewPatientDashboard() {
  const user = getCurrentUser();
  if (!user || user.role !== 'patient') { location.hash = '#/patient-portal'; return; }
  const appts = forPatient(user.id);
  const doctors = getUsers().filter(u => u.role === 'doctor');
  const rows = appts.map(a => {
    const d = doctors.find(x=>x.id===a.doctorId);
    const inv = getInvoices().find(i=>i.id===a.invoiceId);
    return `<tr>
      <td>${formatDateTime(a.startISO)}</td>
      <td>Dr. ${d?.lastName || ''}</td>
      <td>${a.status}${a.status==='completed' && a.notes ? `<div class="small text-muted mt-1">${a.notes}</div>` : ''}</td>
      <td>${a.paid ? 'Paid' : 'Unpaid'}</td>
      <td>
        ${a.status==='scheduled' ? `<button class="btn btn-sm btn-outline-danger me-1" data-cancel="${a.id}">Cancel</button>`:''}
        ${inv ? `<a class="btn btn-sm btn-success" href="${inv.pdfDataURL}" download="Invoice-${inv.invoiceNo}.pdf">Download Invoice</a>`:''}
      </td>
    </tr>`;
  }).join('');

  root.innerHTML = `
    <h3 class="mb-3">Welcome, ${user.firstName}</h3>
    <div class="d-flex gap-2 mb-3">
      <a class="btn btn-primary" href="#/book">Book Appointment</a>
      <a class="btn btn-outline-secondary" href="#/notifications">Notifications</a>
    </div>
    <div class="card"><div class="card-body">
      <h5 class="card-title">Your Appointments</h5>
      <div class="table-responsive">
      <table class="table table-sm">
        <thead><tr><th>Date & Time</th><th>Doctor</th><th>Status</th><th>Payment</th><th>Actions</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="text-muted">No appointments yet</td></tr>'}</tbody>
      </table>
      </div>
    </div></div>`;

  root.querySelectorAll('[data-cancel]').forEach(btn => btn.addEventListener('click', ()=>{
    cancelAppointment(btn.getAttribute('data-cancel'));
    showToast('Appointment cancelled', 'warning');
    render();
  }));
}

function viewBook() {
  const user = getCurrentUser();
  if (!user || user.role !== 'patient') { location.hash = '#/patient-portal'; return; }
  const doctors = getUsers().filter(u => u.role === 'doctor');
  // Avoid HTML elements inside <option>; use plain text for compatibility
  const options = doctors.map(d=>`<option value="${d.id}">Dr. ${d.lastName} — ${d.specialty || 'General'}</option>`).join('');
  root.innerHTML = `
    <div class="card"><div class="card-body">
      <h5 class="card-title">Book Appointment</h5>
      <form id="bookForm" class="row g-3">
        <div class="col-md-6"><label class="form-label">Doctor</label>
          <select class="form-select" name="doctorId" required>
            <option value="" disabled selected>Select...</option>
            ${options}
          </select>
        </div>
        <div class="col-md-3"><label class="form-label">Date</label><input class="form-control" type="date" name="date" required></div>
        <div class="col-md-3"><label class="form-label">Time</label><input class="form-control" type="time" name="time" required></div>
        <div class="col-12"><label class="form-label">Reason</label><input class="form-control" name="reason" maxlength="120"></div>
        <div class="col-12"><button class="btn btn-primary" type="submit">Check & Confirm</button></div>
        <div class="form-text">Default duration is ${DURATIONS.appointmentMinutes} minutes.</div>
      </form>
    </div></div>`;

  document.getElementById('bookForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const f = e.target;
    const startISO = toISO(f.date.value, f.time.value);
    const endISO = addMinutes(startISO, DURATIONS.appointmentMinutes);
    const doctorId = f.doctorId.value;
    const reason = f.reason.value;
    // Client-side guard: prevent past dates
    const today = new Date(); today.setSeconds(0,0);
    if (new Date(startISO) < today) {
      showToast('Please pick a date/time in the future.', 'warning');
      return;
    }
    const modalEl = document.getElementById('confirmModal');
    const modal = new bootstrap.Modal(modalEl);
    document.getElementById('confirmModalBody').innerHTML = `
      <p>Doctor: ${doctors.find(d=>d.id===doctorId)?.firstName} ${doctors.find(d=>d.id===doctorId)?.lastName}</p>
      <p>When: ${new Date(startISO).toLocaleString()} — ${new Date(endISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      <p>Reason: ${reason || 'N/A'}</p>`;
    modal.show();
    const confirmBtn = document.getElementById('confirmBookingBtn');
    const handler = ()=>{
      confirmBtn.removeEventListener('click', handler);
      try {
        createAppointment({ patientId: user.id, doctorId, startISO, endISO, reason });
        showToast('Appointment booked', 'success');
        modal.hide();
        location.hash = '#/patient-dashboard';
        render();
      } catch (err) {
        modal.hide();
        if (err.suggestion) {
          const s = err.suggestion;
          showToast(`Conflict. Next available: ${new Date(s.startISO).toLocaleString()}`, 'warning');
        } else {
          showToast(err.message, 'danger');
        }
      }
    };
    confirmBtn.addEventListener('click', handler, { once: true });
  });
}

function viewDoctorDashboard() {
  const user = getCurrentUser();
  if (!user || user.role !== 'doctor') { location.hash = '#/staff-login'; return; }
  const appts = forDoctor(user.id).filter(a=>a.status==='scheduled');
  const patients = getUsers().filter(u=>u.role==='patient');
  const rows = appts.map(a=>{
    const p = patients.find(x=>x.id===a.patientId);
    return `<tr>
      <td>${formatDateTime(a.startISO)}</td>
      <td>${p ? p.firstName + ' ' + p.lastName : ''}</td>
      <td>${a.reason || ''}</td>
      <td><button class="btn btn-sm btn-outline-success" data-complete="${a.id}">Mark Completed</button></td>
    </tr>`;
  }).join('');
  root.innerHTML = `
    <h3>Doctor Dashboard</h3>
    <div class="row g-3">
      <div class="col-lg-8">
        <div class="card"><div class="card-body">
          <h5 class="card-title">Upcoming Appointments</h5>
          <div class="table-responsive"><table class="table table-sm">
            <thead><tr><th>Time</th><th>Patient</th><th>Reason</th><th></th></tr></thead>
            <tbody>${rows || '<tr><td colspan="4" class="text-muted">No upcoming appointments</td></tr>'}</tbody>
          </table></div>
        </div></div>
      </div>
      <div class="col-lg-4">
        <div class="card h-100"><div class="card-body">
          <h5 class="card-title">Notifications</h5>
          <div class="small text-muted">New bookings appear here.</div>
          <div class="mt-2" id="doc-notifs"></div>
        </div></div>
      </div>
    </div>`;

  // notifications filtered for this doctor
  const notifs = getNotifications().slice(-50).reverse();
  const own = notifs.filter(n=> shouldShowNotificationForUser(n, user));
  const list = own.map(n=>`<div class="alert alert-info py-2 mb-2">${n.message} <span class="text-muted">${new Date(n.createdAt).toLocaleString()}</span></div>`).join('');
  root.querySelector('#doc-notifs').innerHTML = list || '<div class="text-muted">No notifications</div>';
  markNotificationsReadByIds(own.map(n=>n.id));

  root.querySelectorAll('[data-complete]').forEach(btn=> btn.addEventListener('click', ()=>{
    const apptId = btn.getAttribute('data-complete');
    const modalEl = document.getElementById('completeModal');
    const modal = new bootstrap.Modal(modalEl);
    const notesEl = document.getElementById('completeNotes');
    notesEl.value = '';
    modal.show();
    const confirmBtn = document.getElementById('confirmCompleteBtn');
    const handler = ()=>{
      confirmBtn.removeEventListener('click', handler);
      const notes = notesEl.value.trim() || 'Completed by doctor';
      completeAppointment(apptId, notes);
      showToast('Marked completed', 'success');
      modal.hide();
      render();
    };
    confirmBtn.addEventListener('click', handler, { once: true });
  }));
}

function viewReceptionDashboard() {
  const user = getCurrentUser();
  if (!user || user.role !== 'receptionist') { location.hash = '#/staff-login'; return; }
  const patients = getUsers().filter(u=>u.role==='patient');
  const doctors = getUsers().filter(u=>u.role==='doctor');
  const appts = getAppointments().sort((a,b)=> new Date(a.startISO)-new Date(b.startISO));
  const rows = appts.map(a=>{
    const p = patients.find(x=>x.id===a.patientId);
    const d = doctors.find(x=>x.id===a.doctorId);
    return `<tr>
      <td>${formatDateTime(a.startISO)}</td>
      <td>${p? p.firstName+' '+p.lastName: ''}</td>
      <td>Dr. ${d? d.lastName: ''}</td>
      <td>${a.status}${a.status==='completed' && a.notes ? ` — <span class="text-success">Notes saved</span>` : ''}</td>
      <td>${a.paid? 'Paid' : 'Unpaid'}</td>
      <td>
        ${a.status==='scheduled' ? `<button class="btn btn-sm btn-outline-danger me-1" data-cancel="${a.id}">Cancel</button>`:''}
        <button class="btn btn-sm btn-outline-secondary" data-delete-appt="${a.id}">Delete</button>
        ${!a.paid && a.status!=='cancelled' ? `<button class="btn btn-sm btn-success" data-pay="${a.id}">Accept Payment</button>`:''}
      </td>
    </tr>`;
  }).join('');

  root.innerHTML = `
    <h3>Receptionist Dashboard</h3>
    <div class="row g-3">
      <div class="col-lg-5">
        <div class="card h-100"><div class="card-body">
          <h5 class="card-title">Create Appointment</h5>
          <form id="createAppt" class="row g-2">
            <div class="col-12">
              <label class="form-label">Patient Type</label>
              <div class="d-flex gap-3 align-items-center">
                <div class="form-check">
                  <input class="form-check-input" type="radio" name="patientMode" id="modeExisting" value="existing" checked>
                  <label class="form-check-label" for="modeExisting">Existing</label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="radio" name="patientMode" id="modeNew" value="new">
                  <label class="form-check-label" for="modeNew">New</label>
                </div>
              </div>
            </div>
            <div class="col-12" id="existingPatientRow"><label class="form-label">Patient</label>
              <select class="form-select" name="patientId">
                <option value="" disabled selected>Select...</option>
                ${patients.map(p=>`<option value="${p.id}">${p.firstName} ${p.lastName} (${p.username})</option>`).join('')}
              </select>
            </div>
            <div id="newPatientFields" class="row g-2" style="display:none;">
              <div class="col-6"><label class="form-label">First Name</label><input class="form-control" name="np_firstName"></div>
              <div class="col-6"><label class="form-label">Last Name</label><input class="form-control" name="np_lastName"></div>
              <div class="col-12"><label class="form-label">Email</label><input class="form-control" type="email" name="np_email"></div>
              <div class="col-6"><label class="form-label">Username</label><input class="form-control" name="np_username"></div>
              <div class="col-6"><label class="form-label">Password</label><input class="form-control" type="password" name="np_password" minlength="6"></div>
              <div class="form-text">Receptionist can register new patients here.</div>
            </div>
            <div class="col-12"><label class="form-label">Doctor</label>
              <select class="form-select" name="doctorId" required>
                <option value="" disabled selected>Select...</option>
                ${doctors.map(d=>`<option value="${d.id}">Dr. ${d.lastName} — ${d.specialty||'General'}</option>`).join('')}
              </select>
            </div>
            <div class="col-6"><label class="form-label">Date</label><input class="form-control" type="date" name="date" required></div>
            <div class="col-6"><label class="form-label">Time</label><input class="form-control" type="time" name="time" required></div>
            <div class="col-12"><label class="form-label">Reason</label><input class="form-control" name="reason"></div>
            <div class="col-12"><button class="btn btn-primary" type="submit">Create</button></div>
          </form>
        </div></div>
      </div>
      <div class="col-lg-7">
        <div class="card h-100"><div class="card-body">
          <h5 class="card-title">All Appointments</h5>
          <div class="table-responsive"><table class="table table-sm">
            <thead><tr><th>Time</th><th>Patient</th><th>Doctor</th><th>Status</th><th>Payment</th><th>Actions</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6" class="text-muted">No appointments</td></tr>'}</tbody>
          </table></div>
        </div></div>
      </div>
    </div>`;

  const formEl = document.getElementById('createAppt');
  formEl.querySelectorAll('input[name="patientMode"]').forEach(r=> r.addEventListener('change', ()=>{
    const mode = formEl.querySelector('input[name="patientMode"]:checked').value;
    const newFields = document.getElementById('newPatientFields');
    const existingRow = document.getElementById('existingPatientRow');
    if (mode === 'new') {
      newFields.style.display = '';
      existingRow.style.display = 'none';
    } else {
      newFields.style.display = 'none';
      existingRow.style.display = '';
    }
  }));

  document.getElementById('createAppt').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const f = e.target;
    const startISO = toISO(f.date.value, f.time.value);
    const endISO = addMinutes(startISO, DURATIONS.appointmentMinutes);
    const now = new Date(); now.setSeconds(0,0);
    if (new Date(startISO) < now) {
      showToast('Cannot create appointment in the past.', 'warning');
      return;
    }
    let patientId = f.patientId?.value;
    const mode = f.patientMode.value;
    if (mode === 'new') {
      // validate minimal fields
      const firstName = f.np_firstName.value.trim();
      const lastName = f.np_lastName.value.trim();
      const email = f.np_email.value.trim();
      const username = f.np_username.value.trim();
      const password = f.np_password.value;
      if (!firstName || !lastName || !email || !username || password.length < 6) {
        showToast('Fill all new patient fields (password min 6).', 'danger');
        return;
      }
      try {
        const p = registerPatient({ username, firstName, lastName, email, password });
        patientId = p.id;
        showToast('New patient registered', 'success');
      } catch (err) {
        showToast(err.message, 'danger');
        return;
      }
    }
    try {
      createAppointment({ patientId, doctorId: f.doctorId.value, startISO, endISO, reason: f.reason.value });
      showToast('Appointment created', 'success');
      render();
    } catch (err) {
      if (err.suggestion) {
        showToast(`Conflict. Next available: ${new Date(err.suggestion.startISO).toLocaleString()}`, 'warning');
      } else {
        showToast(err.message, 'danger');
      }
    }
  });

  root.querySelectorAll('[data-cancel]').forEach(btn => btn.addEventListener('click', ()=>{
    cancelAppointment(btn.getAttribute('data-cancel'));
    showToast('Appointment cancelled', 'warning');
    render();
  }));

  root.querySelectorAll('[data-pay]').forEach(btn => btn.addEventListener('click', async ()=>{
    const apptId = btn.getAttribute('data-pay');
    try {
      const amount = 120; // demo flat fee
      const invoice = await processPayment({ appointmentId: apptId, amount, paidByUserId: user.id, method: 'Card' });
      const modalEl = document.getElementById('invoiceModal');
      const modal = new bootstrap.Modal(modalEl);
      const frame = document.getElementById('invoiceFrame');
      frame.src = invoice.pdfDataURL;
      const dl = document.getElementById('downloadInvoiceBtn');
      dl.href = invoice.pdfDataURL;
      dl.download = `Invoice-${invoice.invoiceNo}.pdf`;
      modal.show();
      showToast(`Invoice ${invoice.invoiceNo} generated (${currency(invoice.amount)})`, 'success');
      render();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }));

  root.querySelectorAll('[data-delete-appt]').forEach(btn => btn.addEventListener('click', ()=>{
    const apptId = btn.getAttribute('data-delete-appt');
    if (confirm('Delete this appointment? This cannot be undone.')) {
      deleteAppointment(apptId);
      showToast('Appointment deleted', 'warning');
      render();
    }
  }));
}

function viewAdmin() {
  const user = getCurrentUser();
  if (!user || user.role !== 'admin') { location.hash = '#/staff-login'; return; }
  const allUsers = getUsers();
  const staff = allUsers.filter(u=> u.role==='doctor' || u.role==='receptionist');
  const patients = allUsers.filter(u=> u.role==='patient');
  const rows = staff.map(s=>`<tr>
    <td>${s.firstName} ${s.lastName}</td>
    <td>${s.username}</td>
    <td>${s.role}</td>
    <td>${s.role==='doctor'? (s.specialty||'General') : ''}</td>
    <td>
      <button class="btn btn-sm btn-outline-secondary me-2" data-edit-user="${s.id}">Edit</button>
      <button class="btn btn-sm btn-outline-danger" data-del-user="${s.id}">Delete</button>
    </td>
  </tr>`).join('');
  const patientRows = patients.map(p=>`<tr>
    <td>${p.firstName} ${p.lastName}</td>
    <td>${p.username}</td>
    <td>${p.email}</td>
    <td>${p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</td>
    <td>
      <button class="btn btn-sm btn-outline-secondary me-2" data-edit-user="${p.id}">Edit</button>
      <button class="btn btn-sm btn-outline-danger" data-del-user="${p.id}">Delete</button>
    </td>
  </tr>`).join('');
  root.innerHTML = `
    <h3>Admin</h3>
    <div class="row g-3">
      <div class="col-lg-5">
        <div class="card h-100"><div class="card-body">
          <h5 class="card-title">My Profile</h5>
          <div class="mb-3">
            <div><strong>${user.firstName} ${user.lastName}</strong> <span class="text-muted">(${user.username})</span></div>
            <div class="small text-muted">${user.email}</div>
          </div>
          <button class="btn btn-sm btn-outline-secondary" id="editSelf">Edit My Details</button>
          <hr />
          <h5 class="card-title">Add Staff</h5>
          <form id="addStaff" class="row g-2">
            <div class="col-6"><label class="form-label">First Name</label><input class="form-control" name="firstName" required></div>
            <div class="col-6"><label class="form-label">Last Name</label><input class="form-control" name="lastName" required></div>
            <div class="col-12"><label class="form-label">Email</label><input class="form-control" name="email" type="email" required></div>
            <div class="col-6"><label class="form-label">Username</label><input class="form-control" name="username" required></div>
            <div class="col-6"><label class="form-label">Password</label><input class="form-control" name="password" type="password" minlength="6" required></div>
            <div class="col-6"><label class="form-label">Role</label>
              <select class="form-select" name="role" required>
                <option value="doctor">Doctor</option>
                <option value="receptionist">Receptionist</option>
              </select>
            </div>
            <div class="col-6"><label class="form-label">Specialty (Doctor)</label><input class="form-control" name="specialty" placeholder="General"></div>
            <div class="col-12"><button class="btn btn-primary" type="submit">Create</button></div>
          </form>
        </div></div>
      </div>
      <div class="col-lg-7">
        <div class="card h-100"><div class="card-body">
          <h5 class="card-title">Staff</h5>
          <div class="table-responsive"><table class="table table-sm">
            <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Specialty</th><th></th></tr></thead>
            <tbody>${rows || '<tr><td colspan="5" class="text-muted">No staff yet</td></tr>'}</tbody>
          </table></div>
        </div></div>
      </div>
      <div class="col-12">
        <div class="card"><div class="card-body">
          <h5 class="card-title">Danger Zone</h5>
          <div class="d-flex flex-wrap gap-2">
            <button class="btn btn-outline-danger" id="clearAppts">Delete All Appointments</button>
            <button class="btn btn-outline-danger" id="clearInvoices">Delete All Invoices</button>
            <button class="btn btn-outline-danger" id="clearNotifs">Delete All Notifications</button>
            <button class="btn btn-outline-danger" id="clearEmail">Delete Email Log</button>
          </div>
          <div class="form-text">Irreversible. Affects localStorage only.</div>
        </div></div>
      </div>
      <div class="col-12">
        <div class="card"><div class="card-body">
          <h5 class="card-title">Registered Users (Patients)</h5>
          <div class="table-responsive"><table class="table table-sm">
            <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Registered At</th><th></th></tr></thead>
            <tbody>${patientRows || '<tr><td colspan="5" class="text-muted">No patients yet</td></tr>'}</tbody>
          </table></div>
        </div></div>
      </div>
    </div>`;

  document.getElementById('addStaff').addEventListener('submit', (e)=>{
    e.preventDefault();
    const f = e.target;
    try {
      registerStaff({
        username: f.username.value.trim(),
        firstName: f.firstName.value.trim(),
        lastName: f.lastName.value.trim(),
        email: f.email.value.trim(),
        password: f.password.value,
        role: f.role.value,
        specialty: f.specialty.value.trim()
      });
      showToast('Staff added', 'success');
      render();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // Delete staff
  root.querySelectorAll('[data-del-user]').forEach(btn=> btn.addEventListener('click', ()=>{
    const id = btn.getAttribute('data-del-user');
    deleteUser(id);
    showToast('Staff deleted', 'warning');
    render();
  }));

  // Edit staff or self
  function openEditUser(u) {
    const modalEl = document.getElementById('editUserModal');
    const modal = new bootstrap.Modal(modalEl);
    const form = document.getElementById('editUserForm');
    form.id.value = u.id;
    form.firstName.value = u.firstName || '';
    form.lastName.value = u.lastName || '';
    form.email.value = u.email || '';
    form.username.value = u.username || '';
    form.password.value = '';
    form.role.value = u.role || 'patient';
    form.specialty.value = u.specialty || '';
    modal.show();
    const saveBtn = document.getElementById('saveUserBtn');
    const handler = ()=>{
      saveBtn.removeEventListener('click', handler);
      const updated = {
        ...u,
        firstName: form.firstName.value.trim(),
        lastName: form.lastName.value.trim(),
        email: form.email.value.trim(),
        username: form.username.value.trim(),
        role: form.role.value,
        specialty: form.role.value==='doctor' ? (form.specialty.value.trim() || 'General') : undefined
      };
      const newPwd = form.password.value;
      if (newPwd) updated.password = newPwd;
      upsertUser(updated);
      showToast('User updated', 'success');
      modal.hide();
      render();
    };
    saveBtn.addEventListener('click', handler, { once: true });
  }

  root.querySelectorAll('[data-edit-user]').forEach(btn=> btn.addEventListener('click', ()=>{
    const id = btn.getAttribute('data-edit-user');
    const u = allUsers.find(x=>x.id===id);
    if (u) openEditUser(u);
  }));
  document.getElementById('editSelf').addEventListener('click', ()=> openEditUser(user));

  // Danger zone actions
  document.getElementById('clearAppts').addEventListener('click', ()=>{ clearAppointments(); showToast('All appointments deleted', 'warning'); render(); });
  document.getElementById('clearInvoices').addEventListener('click', ()=>{ clearInvoices(); showToast('All invoices deleted', 'warning'); render(); });
  document.getElementById('clearNotifs').addEventListener('click', ()=>{ clearNotifications(); showToast('All notifications deleted', 'warning'); render(); });
  document.getElementById('clearEmail').addEventListener('click', ()=>{ clearEmailLog(); showToast('Email log cleared', 'warning'); render(); });
}

function viewNotifications() {
  const current = getCurrentUser();
  const list = getNotifications().slice().reverse().filter(n=> current ? shouldShowNotificationForUser(n, current) : false);
  root.innerHTML = `
    <h3>Notifications</h3>
    <div class="list-group">
      ${list.map(n=>`<div class="list-group-item d-flex justify-content-between align-items-start">
        <div>
          <div class="fw-semibold text-capitalize">${n.type}</div>
          <div>${n.message}</div>
        </div>
        <small class="text-muted">${new Date(n.createdAt).toLocaleString()}</small>
      </div>`).join('')}
    </div>`;
  markNotificationsReadByIds(list.map(n=>n.id));
  updateNavbar();
}

function viewEmailLog() {
  const logs = JSON.parse(localStorage.getItem('pms.emailLog')||'[]').slice().reverse();
  root.innerHTML = `
    <h3>Email Log</h3>
    <div class="table-responsive"><table class="table table-sm">
      <thead><tr><th>Time</th><th>To</th><th>Subject</th><th>Attachment</th></tr></thead>
      <tbody>
        ${logs.map(l=>`<tr><td>${new Date(l.createdAt).toLocaleString()}</td><td>${l.to}</td><td>${l.subject}</td><td>${l.attachment}</td></tr>`).join('')}
      </tbody>
    </table></div>`;
}

function render() {
  updateNavbar();
  const route = location.hash || '#/landing';
  switch (route) {
    case '#/landing': viewLanding(); break;
    case '#/patient-portal': viewPatientPortal(); break;
    case '#/staff-login': viewStaffLogin(); break;
    case '#/patient-dashboard': viewPatientDashboard(); break;
    case '#/book': viewBook(); break;
    case '#/doctor': viewDoctorDashboard(); break;
    case '#/reception': viewReceptionDashboard(); break;
    case '#/admin': viewAdmin(); break;
    case '#/notifications': viewNotifications(); break;
    case '#/email-log': viewEmailLog(); break;
    default: viewLanding();
  }
}

window.addEventListener('hashchange', render);
ensureHashRoute();
render();


