// Utility helpers shared across modules

export const DURATIONS = {
  appointmentMinutes: 30
};

export function uuid() {
  // Simple unique id for demo purposes
  return 'id-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
}

export function nowISO() {
  return new Date().toISOString();
}

export function toISO(dateStr, timeStr) {
  const d = new Date(dateStr + 'T' + timeStr + ':00');
  return d.toISOString();
}

export function addMinutes(iso, minutes) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

export function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString();
}

export function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function showToast(message, variant = 'primary') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center text-bg-${variant} border-0`;
  toastEl.setAttribute('role', 'alert');
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>`;
  container.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
  toast.show();
}

export function ensureHashRoute() {
  if (!location.hash) location.hash = '#/landing';
}

export function currency(amount) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD' }).format(amount);
}


