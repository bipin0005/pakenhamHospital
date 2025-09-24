// Auth simulation and demo seeding
import { uuid, nowISO } from './utils.js';
import { getUsers, saveUsers, setSession, getSession, clearSession, addAppointment, getAppointments, saveAppointments, upsertInvoice, pushNotification } from './storage.js';

export function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  const users = getUsers();
  return users.find(u => u.id === session.userId) || null;
}

export function login(username, password) {
  const users = getUsers();
  const uname = String(username || '').trim().toLowerCase();
  const pwd = String(password || '').trim();
  const user = users.find(u => u.username.toLowerCase() === uname && u.password === pwd);
  if (!user) throw new Error('Invalid credentials');
  setSession({ userId: user.id, loggedInAt: nowISO() });
  pushNotification('auth', `${user.firstName} logged in`, { userId: user.id, role: user.role });
  return user;
}

export function logout() {
  const user = getCurrentUser();
  clearSession();
  if (user) pushNotification('auth', `${user.firstName} logged out`, { userId: user.id, role: user.role });
}

export function registerPatient({ username, firstName, lastName, email, password }) {
  const users = getUsers();
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Username already exists');
  }
  const patient = { id: uuid(), username, firstName, lastName, email, password, role: 'patient', createdAt: nowISO() };
  users.push(patient);
  saveUsers(users);
  pushNotification('registration', `New patient registered: ${firstName} ${lastName}`, { userId: patient.id });
  return patient;
}

export function registerStaff({ username, firstName, lastName, email, password, role, specialty }) {
  const users = getUsers();
  if (!['doctor','receptionist','admin'].includes(role)) {
    throw new Error('Invalid staff role');
  }
  if (users.some(u => u.username.toLowerCase() === String(username).toLowerCase())) {
    throw new Error('Username already exists');
  }
  const staff = { id: uuid(), username, firstName, lastName, email, password, role, createdAt: nowISO() };
  if (role === 'doctor') staff.specialty = specialty || 'General';
  users.push(staff);
  saveUsers(users);
  pushNotification('staff', `New ${role} added: ${firstName} ${lastName}`, { userId: staff.id, role });
  return staff;
}

/**
 * Seed demo data: 2 doctors, 1 receptionist, 2 patients, and 1 pre-booked appointment.
 * Also creates an invoice for the pre-booked appointment (generated later on demand).
 */
export function seedDemo() {
  const users = getUsers();
  const byUsername = Object.fromEntries(users.map(u => [u.username.toLowerCase(), u]));

  function ensureUser(u) {
    const key = u.username.toLowerCase();
    if (byUsername[key]) {
      // merge essential demo fields in case of drift
      const existing = byUsername[key];
      Object.assign(existing, u, { id: existing.id, createdAt: existing.createdAt || nowISO() });
    } else {
      users.push({ ...u, createdAt: u.createdAt || nowISO() });
      byUsername[key] = u;
    }
  }

  const doctor1 = byUsername['drsmith'] || { id: uuid() };
  ensureUser({ ...doctor1, username: 'drsmith', firstName: 'Emily', lastName: 'Smith', email: 'emily.smith@pakenham.example', password: 'doctor123', role: 'doctor', specialty: 'Cardiology' });
  const doctor2 = byUsername['drlee'] || { id: uuid() };
  ensureUser({ ...doctor2, username: 'drlee', firstName: 'Daniel', lastName: 'Lee', email: 'daniel.lee@pakenham.example', password: 'doctor123', role: 'doctor', specialty: 'Pediatrics' });
  const receptionist = byUsername['reception'] || { id: uuid() };
  ensureUser({ ...receptionist, username: 'reception', firstName: 'Rita', lastName: 'Nguyen', email: 'reception@pakenham.example', password: 'reception123', role: 'receptionist' });
  const admin = byUsername['admin'] || { id: uuid() };
  ensureUser({ ...admin, username: 'admin', firstName: 'Aiden', lastName: 'Admin', email: 'admin@pakenham.example', password: 'admin123', role: 'admin' });
  const patient1 = byUsername['jdoe'] || { id: uuid() };
  ensureUser({ ...patient1, username: 'jdoe', firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', password: 'patient123', role: 'patient' });
  const patient2 = byUsername['maria'] || { id: uuid() };
  ensureUser({ ...patient2, username: 'maria', firstName: 'Maria', lastName: 'Garcia', email: 'maria.garcia@example.com', password: 'patient123', role: 'patient' });

  saveUsers(users);

  // Ensure a pre-booked appointment exists for tomorrow 10:00 between jdoe and drsmith
  const appts = getAppointments();
  const dr = users.find(u => u.username === 'drsmith');
  const pt = users.find(u => u.username === 'jdoe');
  const tomorrow10 = new Date();
  tomorrow10.setDate(tomorrow10.getDate() + 1);
  tomorrow10.setHours(10, 0, 0, 0);
  const exists = appts.some(a => a.doctorId === dr.id && a.patientId === pt.id && new Date(a.startISO).getTime() === tomorrow10.getTime());
  if (!exists) {
    const end = new Date(tomorrow10.getTime());
    end.setMinutes(end.getMinutes() + 30);
    const appt = { id: uuid(), patientId: pt.id, doctorId: dr.id, startISO: tomorrow10.toISOString(), endISO: end.toISOString(), reason: 'Routine check-up', status: 'scheduled', paid: false, invoiceId: null, notes: '' };
    appts.push(appt);
    saveAppointments(appts);
    pushNotification('booking', `New appointment: ${pt.firstName} with Dr. ${dr.lastName} at ${tomorrow10.toLocaleString()}`, { doctorId: dr.id, patientId: pt.id });
  }

  pushNotification('seed', 'Demo data seeded or refreshed', {});
  return { alreadySeeded: false };
}

// Expose seedDemo for the Seed button
window.seedDemo = seedDemo;


