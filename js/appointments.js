// Appointment booking, conflict detection, optimistic locking
import { DURATIONS, uuid, addMinutes } from './utils.js';
import { getAppointments, saveAppointments, pushNotification } from './storage.js';

export function forDoctor(doctorId) {
  return getAppointments().filter(a => a.doctorId === doctorId).sort((a,b)=> new Date(a.startISO)-new Date(b.startISO));
}

export function forPatient(patientId) {
  return getAppointments().filter(a => a.patientId === patientId).sort((a,b)=> new Date(a.startISO)-new Date(b.startISO));
}

export function overlap(aStart, aEnd, bStart, bEnd) {
  return !(new Date(aEnd) <= new Date(bStart) || new Date(aStart) >= new Date(bEnd));
}

export function hasConflict(doctorId, startISO, endISO, excludeAppointmentId = null) {
  const appts = forDoctor(doctorId);
  return appts.some(a => (excludeAppointmentId ? a.id !== excludeAppointmentId : true) && overlap(a.startISO, a.endISO, startISO, endISO));
}

export function suggestNextFree(doctorId, desiredStartISO) {
  // Simple next-slot search in 30-min increments from desired time up to end of day 17:00
  let candidate = new Date(desiredStartISO);
  const endOfDay = new Date(candidate);
  endOfDay.setHours(17, 0, 0, 0);
  const slotMinutes = DURATIONS.appointmentMinutes;
  while (candidate <= endOfDay) {
    const candStart = candidate.toISOString();
    const candEnd = addMinutes(candStart, slotMinutes);
    if (!hasConflict(doctorId, candStart, candEnd)) {
      return { startISO: candStart, endISO: candEnd };
    }
    candidate.setMinutes(candidate.getMinutes() + slotMinutes);
  }
  return null;
}

export function createAppointment({ patientId, doctorId, startISO, endISO, reason }) {
  // Optimistic locking: re-read storage right before write
  // Prevent booking in the past
  const now = new Date();
  if (new Date(startISO) < now || new Date(endISO) < now) {
    const err = new Error('Cannot book appointments in the past.');
    throw err;
  }
  const latest = getAppointments();
  if (latest.some(a => a.doctorId === doctorId && overlap(a.startISO, a.endISO, startISO, endISO))) {
    const suggestion = suggestNextFree(doctorId, startISO);
    const err = new Error('Selected time overlaps an existing appointment.');
    err.suggestion = suggestion;
    throw err;
  }
  const appt = { id: uuid(), patientId, doctorId, startISO, endISO, reason, status: 'scheduled', paid: false, invoiceId: null, notes: '' };
  latest.push(appt);
  saveAppointments(latest);
  pushNotification('booking', 'Appointment booked', { appointmentId: appt.id, doctorId, patientId, startISO });
  return appt;
}

export function cancelAppointment(appointmentId) {
  const appts = getAppointments();
  const idx = appts.findIndex(a => a.id === appointmentId);
  if (idx >= 0) {
    appts[idx].status = 'cancelled';
    saveAppointments(appts);
    const a = appts[idx];
    pushNotification('cancel', 'Appointment cancelled', { appointmentId, doctorId: a.doctorId, patientId: a.patientId });
  }
}

export function completeAppointment(appointmentId, notes = '') {
  const appts = getAppointments();
  const idx = appts.findIndex(a => a.id === appointmentId);
  if (idx >= 0) {
    appts[idx].status = 'completed';
    appts[idx].notes = notes;
    saveAppointments(appts);
    const a = appts[idx];
    pushNotification('complete', 'Appointment completed', { appointmentId, doctorId: a.doctorId, patientId: a.patientId });
  }
}

export function deleteAppointment(appointmentId) {
  const appts = getAppointments();
  const idx = appts.findIndex(a => a.id === appointmentId);
  if (idx >= 0) {
    const a = appts[idx];
    appts.splice(idx, 1);
    saveAppointments(appts);
    pushNotification('appt_delete', 'Appointment deleted', { appointmentId, doctorId: a.doctorId, patientId: a.patientId });
  }
}


