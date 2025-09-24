// LocalStorage helpers and simple models
import { uuid, nowISO } from './utils.js';

const KEYS = {
  users: 'pms.users',
  appointments: 'pms.appointments',
  invoices: 'pms.invoices',
  notifications: 'pms.notifications',
  emailLog: 'pms.emailLog',
  session: 'pms.session'
};

function readArray(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}

function writeArray(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}

export function getUsers() { return readArray(KEYS.users); }
export function saveUsers(users) { writeArray(KEYS.users, users); }
export function deleteUser(userId) {
  const users = getUsers().filter(u => u.id !== userId);
  saveUsers(users);
}

export function getAppointments() { return readArray(KEYS.appointments); }
export function saveAppointments(appts) { writeArray(KEYS.appointments, appts); }
export function clearAppointments() { saveAppointments([]); }

export function getInvoices() { return readArray(KEYS.invoices); }
export function saveInvoices(invoices) { writeArray(KEYS.invoices, invoices); }
export function clearInvoices() { saveInvoices([]); }

export function getNotifications() { return readArray(KEYS.notifications); }
export function saveNotifications(notifs) { writeArray(KEYS.notifications, notifs); }
export function clearNotifications() { saveNotifications([]); }

export function getEmailLog() { return readArray(KEYS.emailLog); }
export function saveEmailLog(logs) { writeArray(KEYS.emailLog, logs); }
export function clearEmailLog() { saveEmailLog([]); }

export function setSession(session) {
  localStorage.setItem(KEYS.session, JSON.stringify(session));
}

export function getSession() {
  try { return JSON.parse(localStorage.getItem(KEYS.session)); } catch { return null; }
}

export function clearSession() { localStorage.removeItem(KEYS.session); }

export function upsertUser(user) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) users[idx] = user; else users.push(user);
  saveUsers(users);
}

export function addAppointment(appt) {
  const appts = getAppointments();
  appts.push(appt);
  saveAppointments(appts);
}

export function updateAppointment(appt) {
  const appts = getAppointments();
  const idx = appts.findIndex(a => a.id === appt.id);
  if (idx >= 0) { appts[idx] = appt; saveAppointments(appts); }
}

export function upsertInvoice(inv) {
  const invoices = getInvoices();
  const idx = invoices.findIndex(i => i.id === inv.id);
  if (idx >= 0) invoices[idx] = inv; else invoices.push(inv);
  saveInvoices(invoices);
}

export function pushNotification(type, message, meta = {}) {
  const notifs = getNotifications();
  notifs.push({ id: uuid(), type, message, meta, createdAt: nowISO(), read: false });
  saveNotifications(notifs);
}

export function markAllNotificationsRead() {
  const notifs = getNotifications();
  notifs.forEach(n => n.read = true);
  saveNotifications(notifs);
}

export function markNotificationsReadByIds(ids) {
  const set = new Set(ids);
  const notifs = getNotifications();
  let changed = false;
  for (const n of notifs) {
    if (set.has(n.id) && !n.read) { n.read = true; changed = true; }
  }
  if (changed) saveNotifications(notifs);
}

export function pushEmailLog(entry) {
  const logs = getEmailLog();
  logs.push({ id: uuid(), createdAt: nowISO(), ...entry });
  saveEmailLog(logs);
}

// Export keys for access in other modules (e.g., reset)
export const STORAGE_KEYS = KEYS;


