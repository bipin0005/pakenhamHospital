// Invoice generation and payment simulation using jsPDF
import { uuid, nowISO, currency } from './utils.js';
import { getAppointments, saveAppointments, upsertInvoice, pushNotification, pushEmailLog, getUsers } from './storage.js';

function generateInvoiceNumber() {
  const d = new Date();
  const ymd = d.toISOString().slice(0,10).replaceAll('-','');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${ymd}-${rand}`;
}

export function findAppointmentById(id) {
  return getAppointments().find(a => a.id === id) || null;
}

export async function processPayment({ appointmentId, amount, paidByUserId, method = 'Card' }) {
  const appts = getAppointments();
  const idx = appts.findIndex(a => a.id === appointmentId);
  if (idx < 0) throw new Error('Appointment not found');
  const appt = appts[idx];
  appt.paid = true;

  const invoiceId = uuid();
  const invoiceNo = generateInvoiceNumber();
  const users = getUsers();
  const patient = users.find(u => u.id === appt.patientId);
  const doctor = users.find(u => u.id === appt.doctorId);
  const cashier = users.find(u => u.id === paidByUserId) || { firstName: 'System' };

  const doc = new jspdf.jsPDF();
  doc.setFontSize(16);
  doc.text('Pakenham Hospital - Invoice', 14, 18);
  doc.setFontSize(11);
  doc.text(`Invoice No: ${invoiceNo}`, 14, 28);
  doc.text(`Date: ${new Date().toLocaleString()}`, 14, 34);
  doc.text(`Patient: ${patient.firstName} ${patient.lastName}`, 14, 44);
  doc.text(`Doctor: Dr. ${doctor.lastName} (${doctor.specialty || 'General'})`, 14, 50);
  doc.text(`Appointment: ${new Date(appt.startISO).toLocaleString()}`, 14, 56);
  doc.text(`Processed By: ${cashier.firstName}`, 14, 62);
  doc.line(14, 68, 196, 68);
  doc.text('Description', 14, 76);
  doc.text('Amount', 170, 76, { align: 'right' });
  doc.line(14, 80, 196, 80);
  doc.text('Consultation Fee', 14, 90);
  const tax = Math.round(amount * 0.1 * 100) / 100;
  const total = Math.round((amount + tax) * 100) / 100;
  doc.text(currency(amount), 196, 90, { align: 'right' });
  doc.text('GST (10%)', 14, 100);
  doc.text(currency(tax), 196, 100, { align: 'right' });
  doc.line(14, 106, 196, 106);
  doc.setFontSize(12);
  doc.text(`Total: ${currency(total)}`, 196, 116, { align: 'right' });
  doc.setFontSize(10);
  doc.text(`Payment Method: ${method}`, 14, 130);
  doc.text('This is a system-generated invoice for prototype purposes only.', 14, 140);

  const pdfDataURL = doc.output('dataurlstring');

  const invoice = { id: invoiceId, appointmentId, invoiceNo, amount: total, pdfDataURL, createdAt: nowISO(), paidBy: paidByUserId };
  upsertInvoice(invoice);
  appt.invoiceId = invoiceId;
  saveAppointments(appts);

  pushNotification('invoice', `Invoice ${invoiceNo} generated`, { appointmentId, invoiceId, doctorId: appt.doctorId, patientId: appt.patientId, cashierId: paidByUserId });
  pushEmailLog({
    to: patient.email,
    from: 'billing@pakenham.example',
    subject: `Invoice ${invoiceNo}`,
    attachment: `Invoice-${invoiceNo}.pdf`,
    meta: { appointmentId, invoiceId }
  });

  return invoice;
}


