/* api.js — centralised API calls */
const BASE = '/api';

function getToken() {
  return localStorage.getItem('libranet_token') || '';
}

async function apiFetch(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'API error');
  return data;
}

/* ── AUTH ─────────────────────────────────────────────────────────────────── */
const Auth = {
  login:  (body)  => apiFetch('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  me:     ()      => apiFetch('/auth/me'),
};

/* ── BOOKS ────────────────────────────────────────────────────────────────── */
const Books = {
  list:   (params = {}) => apiFetch('/books?' + new URLSearchParams(params)),
  get:    (id)          => apiFetch(`/books/${id}`),
  create: (body)        => apiFetch('/books',      { method: 'POST',   body: JSON.stringify(body) }),
  update: (id, body)    => apiFetch(`/books/${id}`, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (id)          => apiFetch(`/books/${id}`, { method: 'DELETE' }),
  stats:  ()            => apiFetch('/books/stats/summary'),
};

/* ── MEMBERS ──────────────────────────────────────────────────────────────── */
const Members = {
  list:   (params = {}) => apiFetch('/members?' + new URLSearchParams(params)),
  get:    (id)          => apiFetch(`/members/${id}`),
  create: (body)        => apiFetch('/members',       { method: 'POST',   body: JSON.stringify(body) }),
  update: (id, body)    => apiFetch(`/members/${id}`, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (id)          => apiFetch(`/members/${id}`, { method: 'DELETE' }),
  stats:  ()            => apiFetch('/members/stats/summary'),
};

/* ── TRANSACTIONS ─────────────────────────────────────────────────────────── */
const Transactions = {
  list:    (params = {}) => apiFetch('/transactions?' + new URLSearchParams(params)),
  issue:   (body)        => apiFetch('/transactions/issue',  { method: 'POST', body: JSON.stringify(body) }),
  return_: (body)        => apiFetch('/transactions/return', { method: 'POST', body: JSON.stringify(body) }),
  renew:   (body)        => apiFetch('/transactions/renew',  { method: 'POST', body: JSON.stringify(body) }),
  overdue: ()            => apiFetch('/transactions/overdue/list'),
};

/* ── FINES ────────────────────────────────────────────────────────────────── */
const Fines = {
  list:    (params = {}) => apiFetch('/fines?' + new URLSearchParams(params)),
  collect: (id, body)    => apiFetch(`/fines/${id}/collect`, { method: 'POST', body: JSON.stringify(body) }),
  waive:   (id)          => apiFetch(`/fines/${id}/waive`,   { method: 'POST' }),
};

/* ── SUPPLIERS ────────────────────────────────────────────────────────────── */
const Suppliers = {
  list:   ()          => apiFetch('/suppliers'),
  create: (body)      => apiFetch('/suppliers',       { method: 'POST',   body: JSON.stringify(body) }),
  update: (id, body)  => apiFetch(`/suppliers/${id}`, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (id)        => apiFetch(`/suppliers/${id}`, { method: 'DELETE' }),
};

/* ── PURCHASE ORDERS ──────────────────────────────────────────────────────── */
const PurchaseOrders = {
  list:   ()          => apiFetch('/purchase-orders'),
  create: (body)      => apiFetch('/purchase-orders',       { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body)  => apiFetch(`/purchase-orders/${id}`, { method: 'PUT',  body: JSON.stringify(body) }),
};

/* ── REPORTS ──────────────────────────────────────────────────────────────── */
const Reports = {
  dashboard: () => apiFetch('/reports/dashboard'),
  monthly:   () => apiFetch('/reports/monthly'),
};
