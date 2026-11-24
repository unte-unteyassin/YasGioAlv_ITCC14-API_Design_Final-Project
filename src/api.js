const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
// Demo mode: used when VITE_API_URL is not set (or VITE_USE_MOCK=true). Data is kept in this browser only.
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || !import.meta.env.VITE_API_URL;

export const getToken = () => localStorage.getItem('token');
export const setToken = (t) => (t ? localStorage.setItem('token', t) : localStorage.removeItem('token'));

async function request(path, { method = 'GET', body, params } = {}) {
  const qs = params
    ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString()
    : '';
  const headers = { 'Content-Type': 'application/json' };
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(BASE + path + qs, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && getToken()) { setToken(null); window.location.hash = '#/login'; }
    const err = new Error(data.error || 'Request failed');
    err.details = data.details;
    throw err;
  }
  return data;
}

const realApi = {
  register: (b) => request('/auth/register', { method: 'POST', body: b }),
  login: (b) => request('/auth/login', { method: 'POST', body: b }),
  me: () => request('/users/me'),
  reports: (params) => request('/reports', { params }),
  report: (id) => request(`/reports/${id}`),
  createReport: (b) => request('/reports', { method: 'POST', body: b }),
  updateReport: (id, b) => request(`/reports/${id}`, { method: 'PUT', body: b }),
  deleteReport: (id) => request(`/reports/${id}`, { method: 'DELETE' }),
  changeStatus: (id, b) => request(`/reports/${id}/status`, { method: 'PATCH', body: b }),
  history: (id) => request(`/reports/${id}/status-updates`),
  laboratories: () => request('/laboratories'),
  createLab: (b) => request('/laboratories', { method: 'POST', body: b }),
  updateLab: (code, b) => request(`/laboratories/${code}`, { method: 'PUT', body: b }),
  deleteLab: (code) => request(`/laboratories/${code}`, { method: 'DELETE' }),
};

export async function uploadPhoto(file) {
  if (!CLOUD || !PRESET) {
    if (!USE_MOCK) throw new Error('Photo upload is not configured.');
    return new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(file); });
  }
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Photo upload failed.');
  return data.secure_url;
}

export const WASTE_TYPES = {
  pc_monitor: 'PC / Monitor',
  air_conditioner: 'Air Conditioner',
  lights_fans: 'Lights / Fans',
  other_electronics: 'Other Electronics',
  other: 'Other',
};
export const STATUSES = ['pending', 'verified', 'resolved'];

// ---------- Demo mock API (no backend needed) ----------
const KEY = 'ecolab_mock';
const now = () => new Date().toISOString();
function db() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d) return d; } catch { /* ignore */ }
  const t = now();
  const d = {
    seq: 10,
    users: [
      { id: 1, name: 'Laboratory Technician', email: 'admin@xu.edu.ph', password: 'admin12345', role: 'admin', createdAt: t },
      { id: 2, name: 'Demo Student', email: 'student@xu.edu.ph', password: 'student12345', role: 'user', createdAt: t },
    ],
    labs: ['A', 'B', 'C', 'D', 'E', 'F'].map((c, i) => ({ laboratoryCode: c, name: `Computer Laboratory ${c}`, building: 'Computer Studies Building', floor: (i % 3) + 1 })),
    reports: [
      { id: 1, userId: 2, laboratoryCode: 'A', wasteType: 'air_conditioner', description: 'Air conditioner left running after the last class.', photoUrl: null, status: 'pending', createdAt: t, updatedAt: t },
      { id: 2, userId: 2, laboratoryCode: 'C', wasteType: 'pc_monitor', description: 'Ten monitors remained on overnight.', photoUrl: null, status: 'verified', createdAt: t, updatedAt: t },
    ],
    history: [{ id: 1, reportId: 2, oldStatus: 'pending', newStatus: 'verified', note: 'Confirmed by the laboratory technician.', createdAt: t }],
  };
  localStorage.setItem(KEY, JSON.stringify(d));
  return d;
}
const save = (d) => localStorage.setItem(KEY, JSON.stringify(d));
const fail = (m) => { throw new Error(m); };
const strip = ({ password, ...u }) => u; // eslint-disable-line no-unused-vars
function current(d) {
  const u = d.users.find((x) => `mock-${x.id}` === getToken());
  return u || fail('Authentication is required.');
}

const mockApi = {
  register: async ({ name, email, password }) => {
    const d = db();
    if (d.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) fail('Email is already registered.');
    const u = { id: ++d.seq, name, email, password, role: 'user', createdAt: now() };
    d.users.push(u); save(d); return strip(u);
  },
  login: async ({ email, password }) => {
    const u = db().users.find((x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password);
    if (!u) fail('Invalid email or password.');
    return { token: `mock-${u.id}`, user: strip(u) };
  },
  me: async () => strip(current(db())),
  reports: async ({ status, wasteType, laboratoryCode, mine, page = 1, limit = 10 } = {}) => {
    const d = db(); const me = current(d);
    let r = d.reports.filter((x) => (!status || x.status === status) && (!wasteType || x.wasteType === wasteType)
      && (!laboratoryCode || x.laboratoryCode === laboratoryCode) && (mine !== 'true' || x.userId === me.id));
    r = r.sort((a, b) => b.id - a.id);
    return { data: r.slice((page - 1) * limit, page * limit), page, limit, total: r.length };
  },
  report: async (id) => { const d = db(); current(d); return d.reports.find((x) => x.id === +id) || fail('Report not found.'); },
  createReport: async (b) => {
    const d = db(); const me = current(d);
    if (!d.labs.some((l) => l.laboratoryCode === b.laboratoryCode)) fail('Laboratory not found.');
    const r = { id: ++d.seq, userId: me.id, photoUrl: null, ...b, status: 'pending', createdAt: now(), updatedAt: now() };
    d.reports.push(r); save(d); return r;
  },
  updateReport: async (id, b) => {
    const d = db(); const me = current(d); const r = d.reports.find((x) => x.id === +id) || fail('Report not found.');
    if (r.userId !== me.id || r.status !== 'pending') fail('Only your own pending reports can be edited.');
    Object.assign(r, b, { updatedAt: now() }); save(d); return r;
  },
  deleteReport: async (id) => {
    const d = db(); const me = current(d); const r = d.reports.find((x) => x.id === +id) || fail('Report not found.');
    if (me.role !== 'admin' && (r.userId !== me.id || r.status !== 'pending')) fail('You are not allowed to delete this report.');
    d.reports = d.reports.filter((x) => x.id !== +id); save(d); return null;
  },
  changeStatus: async (id, { status, note }) => {
    const d = db(); const me = current(d); if (me.role !== 'admin') fail('Administrator access is required.');
    const r = d.reports.find((x) => x.id === +id) || fail('Report not found.');
    if (!note) fail('A note is required.');
    d.history.push({ id: ++d.seq, reportId: r.id, oldStatus: r.status, newStatus: status, note, createdAt: now() });
    r.status = status; r.updatedAt = now(); save(d); return r;
  },
  history: async (id) => db().history.filter((h) => h.reportId === +id),
  laboratories: async () => db().labs,
  createLab: async (b) => {
    const d = db(); if (current(d).role !== 'admin') fail('Administrator access is required.');
    if (d.labs.some((l) => l.laboratoryCode === b.laboratoryCode)) fail('Laboratory code already exists.');
    d.labs.push(b); save(d); return b;
  },
  updateLab: async (code, b) => {
    const d = db(); if (current(d).role !== 'admin') fail('Administrator access is required.');
    const l = d.labs.find((x) => x.laboratoryCode === code) || fail('Laboratory not found.'); Object.assign(l, b); save(d); return l;
  },
  deleteLab: async (code) => {
    const d = db(); if (current(d).role !== 'admin') fail('Administrator access is required.');
    d.labs = d.labs.filter((x) => x.laboratoryCode !== code); save(d); return null;
  },
};

export const api = USE_MOCK ? mockApi : realApi;
