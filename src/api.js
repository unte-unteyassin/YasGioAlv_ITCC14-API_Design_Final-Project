const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

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

export const api = {
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
  if (!CLOUD || !PRESET) throw new Error('Photo upload is not configured.');
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
