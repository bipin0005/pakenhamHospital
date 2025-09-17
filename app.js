/*
  Pakenham Hospital - Smart Patient Management System (PMS) Prototype
  Frontend-only SPA with simulated data and logic. No backend.

  Notes for assessors:
  - All state is stored in-memory and in localStorage for demo persistence.
  - Places where real backend/database calls would go are marked clearly.
*/

(function () {
  // -------------------------------
  // Simulated Database / State
  // -------------------------------
  /** In a real app, validate against a backend auth service */
  const DEMO_USERS = {
    admin: { password: 'password123', role: 'Admin' },
    doctor: { password: 'doctor123', role: 'Doctor' },
    nurse: { password: 'nurse123', role: 'Nurse' },
  };

  /** Load or initialize demo state from localStorage */
  const initialState = {
    session: null, // { username, role }
    patients: [
      {
        id: 'P-1001',
        name: 'Manish',
        dob: '1985-02-10',
        contact: '0412 000 111',
        history: 'Diabetes Type II, Metformin',
        disciplinary: 'None',
      },
      {
        id: 'P-1002',
        name: 'Jane Smith',
        dob: '1990-11-25',
        contact: '0412 222 333',
        history: 'Hypertension, ACE inhibitors',
        disciplinary: 'None',
      },
    ],
    doctors: [
      { id: 'D-01', name: 'Dr. Allen', specialty: 'Cardiology' },
      { id: 'D-02', name: 'Dr. Baker', specialty: 'Endocrinology' },
      { id: 'D-03', name: 'Dr. Clark', specialty: 'General Medicine' },
    ],
    appointments: [
      { id: 'A-2001', patient: 'Bipin Khatiwada', doctor: 'Dr. Allen', date: today(2), status: 'Scheduled' },
    ],
    waitlist: [{ id: 'W-1', name: 'Waiting Patient 1' }],
    tracking: [
      { patient: 'Manish Lamichhane', lastVisit: today(-10), attendance: 92 },
      { patient: 'Anurag Regmi', lastVisit: today(-40), attendance: 58 },
    ],
    tickets: [
      { id: 'T-501', subject: 'Portal access issue', status: 'Open' },
      { id: 'T-502', subject: 'Change appointment request', status: 'Pending' },
    ],
  };

  function today(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    return d.toISOString().slice(0, 10);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem('pms_state');
      if (!raw) return structuredClone(initialState);
      const parsed = JSON.parse(raw);
      return { ...structuredClone(initialState), ...parsed };
    } catch {
      return structuredClone(initialState);
    }
  }

  function saveState() {
    localStorage.setItem('pms_state', JSON.stringify(state));
  }

  let state = loadState();

  // -------------------------------
  // Elements
  // -------------------------------
  const views = {
    login: document.getElementById('view-login'),
    dashboard: document.getElementById('view-dashboard'),
    patients: document.getElementById('view-patients'),
    appointments: document.getElementById('view-appointments'),
    tracking: document.getElementById('view-tracking'),
    support: document.getElementById('view-support'),
  };
  const topnav = document.getElementById('topnav');
  const currentUser = document.getElementById('currentUser');
  document.getElementById('year').textContent = String(new Date().getFullYear());

  // -------------------------------
  // Routing
  // -------------------------------
  const routes = ['dashboard', 'patients', 'appointments', 'tracking', 'support'];

  function showView(name) {
    Object.values(views).forEach((el) => el.classList.add('d-none'));
    if (name === 'login') {
      views.login.classList.remove('d-none');
      topnav.classList.add('d-none');
    } else {
      views[name].classList.remove('d-none');
      topnav.classList.remove('d-none');
      renderView(name);
    }
  }

  function requireAuth(nextRoute) {
    if (!state.session) {
      location.hash = '#/login';
      return false;
    }
    return true;
  }

  function handleRoute() {
    const hash = location.hash || '#/login';
    const route = hash.replace('#/', '');
    if (route === 'login') {
      showView('login');
      return;
    }
    if (!routes.includes(route)) {
      location.hash = '#/dashboard';
      return;
    }
    if (!requireAuth(route)) return;
    showView(route);
  }

  window.addEventListener('hashchange', handleRoute);

  // -------------------------------
  // Authentication (Simulated)
  // -------------------------------
  const loginForm = document.getElementById('loginForm');
  const loginAlert = document.getElementById('loginAlert');
  const logoutBtn = document.getElementById('logoutBtn');

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    const record = DEMO_USERS[username];
    if (record && record.password === password) {
      state.session = { username, role: record.role };
      saveState();
      currentUser.textContent = `${record.role} · ${username}`;
      loginAlert.classList.add('d-none');
      location.hash = '#/dashboard';
    } else {
      // In a real app, server would return error message
      loginAlert.textContent = 'Invalid username or password';
      loginAlert.classList.remove('d-none');
    }
  });

  logoutBtn.addEventListener('click', () => {
    state.session = null;
    saveState();
    currentUser.textContent = '';
    location.hash = '#/login';
    showView('login');
  });

  // -------------------------------
  // Renderers
  // -------------------------------
  function renderView(name) {
    currentUser.textContent = state.session ? `${state.session.role} · ${state.session.username}` : '';
    if (name === 'dashboard') renderDashboard();
    if (name === 'patients') renderPatients();
    if (name === 'appointments') renderAppointments();
    if (name === 'tracking') renderTracking();
    if (name === 'support') renderSupport();
  }

  function renderDashboard() {
    // For future: aggregate stats could be rendered here
  }

  // Patients
  const patientsTableBody = document.querySelector('#patientsTable tbody');
  const patientForm = document.getElementById('patientForm');
  const patientModalEl = document.getElementById('patientModal');
  const patientModal = new bootstrap.Modal(patientModalEl);
  let editingPatientId = null;

  function renderPatients() {
    patientsTableBody.innerHTML = '';
    state.patients.forEach((p) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.id}</td>
        <td>${escapeHtml(p.name)}</td>
        <td>${p.dob}</td>
        <td>${escapeHtml(p.contact)}</td>
        <td class="small">${escapeHtml(p.history)}</td>
        <td class="small">${escapeHtml(p.disciplinary)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary me-2" data-action="edit" data-id="${p.id}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${p.id}"><i class="bi bi-trash"></i></button>
        </td>`;
      patientsTableBody.appendChild(tr);
    });
  }

  patientsTableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    if (action === 'edit') {
      const p = state.patients.find((x) => x.id === id);
      if (!p) return;
      editingPatientId = id;
      document.getElementById('patientName').value = p.name;
      document.getElementById('patientDob').value = p.dob;
      document.getElementById('patientContact').value = p.contact;
      document.getElementById('patientHistory').value = p.history;
      document.getElementById('patientDisciplinary').value = p.disciplinary;
      patientModal.show();
    } else if (action === 'delete') {
      state.patients = state.patients.filter((x) => x.id !== id);
      saveState();
      renderPatients();
    }
  });

  patientForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('patientName').value.trim();
    const dob = document.getElementById('patientDob').value;
    const contact = document.getElementById('patientContact').value.trim();
    const history = document.getElementById('patientHistory').value.trim();
    const disciplinary = document.getElementById('patientDisciplinary').value.trim();

    if (editingPatientId) {
      const p = state.patients.find((x) => x.id === editingPatientId);
      if (p) {
        p.name = name;
        p.dob = dob;
        p.contact = contact;
        p.history = history;
        p.disciplinary = disciplinary;
      }
    } else {
      const newId = `P-${Math.floor(Math.random() * 9000) + 1000}`;
      state.patients.push({ id: newId, name, dob, contact, history, disciplinary });
    }
    editingPatientId = null;
    saveState();
    patientForm.reset();
    patientModal.hide();
    renderPatients();
  });

  patientModalEl.addEventListener('hidden.bs.modal', () => {
    editingPatientId = null;
    patientForm.reset();
  });

  // Appointments
  const apptForm = document.getElementById('appointmentForm');
  const apptDoctor = document.getElementById('apptDoctor');
  const apptPatient = document.getElementById('apptPatient');
  const apptDate = document.getElementById('apptDate');
  const appointmentsBody = document.querySelector('#appointmentsTable tbody');
  const doctorsList = document.getElementById('doctorsList');
  const waitlistEl = document.getElementById('waitlist');

  function renderAppointments() {
    // Doctors list
    doctorsList.innerHTML = '';
    apptDoctor.innerHTML = '';
    state.doctors.forEach((d) => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex align-items-center justify-content-between';
      li.innerHTML = `<div><strong>${escapeHtml(d.name)}</strong><div class="text-secondary small">${escapeHtml(d.specialty)}</div></div><span class="badge text-bg-success">Available</span>`;
      doctorsList.appendChild(li);
      const opt = document.createElement('option');
      opt.value = d.name;
      opt.textContent = `${d.name} · ${d.specialty}`;
      apptDoctor.appendChild(opt);
    });

    // Appointments table
    appointmentsBody.innerHTML = '';
    state.appointments.forEach((a) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(a.patient)}</td>
        <td>${escapeHtml(a.doctor)}</td>
        <td>${a.date}</td>
        <td><span class="badge ${a.status === 'Scheduled' ? 'text-bg-primary' : 'text-bg-secondary'}">${a.status}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-success me-2" data-action="complete" data-id="${a.id}"><i class="bi bi-check2"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-action="cancel" data-id="${a.id}"><i class="bi bi-x"></i></button>
        </td>`;
      appointmentsBody.appendChild(tr);
    });

    // Waitlist
    waitlistEl.innerHTML = '';
    state.waitlist.forEach((w) => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex align-items-center justify-content-between';
      li.innerHTML = `<span>${escapeHtml(w.name)}</span><button class="btn btn-sm btn-outline-primary" data-action="assign" data-id="${w.id}">Assign</button>`;
      waitlistEl.appendChild(li);
    });
  }

  appointmentsBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    const appt = state.appointments.find((x) => x.id === id);
    if (!appt) return;
    if (action === 'complete') appt.status = 'Completed';
    if (action === 'cancel') appt.status = 'Cancelled';
    saveState();
    renderAppointments();
  });

  waitlistEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="assign"]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const person = state.waitlist.find((x) => x.id === id);
    if (!person) return;
    // Simulate assigning first available slot
    state.appointments.push({
      id: `A-${Math.floor(Math.random() * 9000) + 1000}`,
      patient: person.name,
      doctor: state.doctors[0]?.name || 'Dr. Clark',
      date: today(3),
      status: 'Scheduled',
    });
    state.waitlist = state.waitlist.filter((x) => x.id !== id);
    saveState();
    renderAppointments();
  });

  apptForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!apptPatient.value.trim() || !apptDate.value) return;
    state.appointments.push({
      id: `A-${Math.floor(Math.random() * 9000) + 1000}`,
      patient: apptPatient.value.trim(),
      doctor: apptDoctor.value,
      date: apptDate.value,
      status: 'Scheduled',
    });
    saveState();
    apptForm.reset();
    const modal = bootstrap.Modal.getInstance(document.getElementById('appointmentModal'));
    modal?.hide();
    renderAppointments();
  });

  // Tracking & Monitoring
  const trackingBody = document.querySelector('#trackingTable tbody');
  function renderTracking() {
    trackingBody.innerHTML = '';
    state.tracking.forEach((t) => {
      const low = t.attendance < 70;
      const tr = document.createElement('tr');
      if (low) tr.classList.add('row-alert');
      tr.innerHTML = `
        <td>${escapeHtml(t.patient)}</td>
        <td>${t.lastVisit}</td>
        <td>${t.attendance}%</td>
        <td>${low ? '<span class="badge badge-low">Low attendance</span>' : '<span class="text-secondary">OK</span>'}</td>`;
      trackingBody.appendChild(tr);
    });
  }

  // Support & Helpdesk
  const chatWindow = document.getElementById('chatWindow');
  const chatInput = document.getElementById('chatInput');
  const chatSend = document.getElementById('chatSend');
  const ticketsBody = document.querySelector('#ticketsTable tbody');
  const ticketForm = document.getElementById('ticketForm');

  function renderSupport() {
    // Tickets
    ticketsBody.innerHTML = '';
    state.tickets.forEach((t) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${t.id}</td>
        <td>${escapeHtml(t.subject)}</td>
        <td><span class="badge ${t.status === 'Open' ? 'text-bg-danger' : t.status === 'Pending' ? 'text-bg-warning' : 'text-bg-secondary'}">${t.status}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-success me-2" data-action="resolve" data-id="${t.id}"><i class="bi bi-check2"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${t.id}"><i class="bi bi-trash"></i></button>
        </td>`;
      ticketsBody.appendChild(tr);
    });

    // Chat greeting
    if (!chatWindow.dataset.init) {
      chatWindow.dataset.init = '1';
      pushBot('Hello! I am a demo assistant. Ask about appointments, patients, or support.');
    }
  }

  ticketsBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    if (action === 'resolve') {
      const t = state.tickets.find((x) => x.id === id);
      if (t) t.status = 'Resolved';
    }
    if (action === 'delete') {
      state.tickets = state.tickets.filter((x) => x.id !== id);
    }
    saveState();
    renderSupport();
  });

  ticketForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const subject = document.getElementById('ticketSubject').value.trim();
    const desc = document.getElementById('ticketDesc').value.trim();
    if (!subject || !desc) return;
    state.tickets.push({ id: `T-${Math.floor(Math.random() * 900) + 100}`, subject, status: 'Open' });
    saveState();
    ticketForm.reset();
    const modal = bootstrap.Modal.getInstance(document.getElementById('ticketModal'));
    modal?.hide();
    renderSupport();
  });

  // Chatbot (scripted rules)
  chatSend.addEventListener('click', sendChat);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendChat();
    }
  });

  function sendChat() {
    const text = chatInput.value.trim();
    if (!text) return;
    pushUser(text);
    chatInput.value = '';
    setTimeout(() => replyTo(text), 350);
  }

  function replyTo(text) {
    const t = text.toLowerCase();
    // In a real app, this would call an AI service
    if (t.includes('appointment')) {
      pushBot('To book an appointment, go to Appointments and click New Appointment.');
    } else if (t.includes('patient')) {
      pushBot('You can add or edit patients in the Patients section using the Add Patient button.');
    } else if (t.includes('ticket')) {
      pushBot('Open a new ticket from Support > New Ticket. Our team will respond.');
    } else if (t.includes('help')) {
      pushBot('I can assist with Patients, Appointments, Tracking, and Tickets.');
    } else {
      pushBot("I'm a demo bot. Try asking about 'appointments', 'patients', or 'tickets'.");
    }
  }

  function pushUser(message) {
    const div = document.createElement('div');
    div.className = 'msg user ms-auto';
    div.textContent = message;
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function pushBot(message) {
    const div = document.createElement('div');
    div.className = 'msg bot';
    div.textContent = message;
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  // -------------------------------
  // Utilities
  // -------------------------------
  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  // -------------------------------
  // Init
  // -------------------------------
  document.addEventListener('DOMContentLoaded', function() {
    if (state.session) {
      currentUser.textContent = `${state.session.role} · ${state.session.username}`;
    }
    handleRoute();
  });
})();





