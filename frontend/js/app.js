/* app.js — full frontend controller */

// ── STATE ────────────────────────────────────────────────────────────────────
let currentPage = 'dashboard';
let currentUser = null;
let debounceTimers = {};

// ── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // ── THEME TOGGLE LOGIC ──
const themeToggleBtn = document.getElementById('themeToggle');
// Check if the user already saved a preference, default to dark
const savedTheme = localStorage.getItem('libranet_theme') || 'dark';

if (savedTheme === 'light') {
  document.documentElement.setAttribute('data-theme', 'light');
  themeToggleBtn.textContent = '🌙'; // Show moon icon if in light mode
}

themeToggleBtn.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  
  if (currentTheme === 'light') {
    // Switch to Dark Mode
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('libranet_theme', 'dark');
    themeToggleBtn.textContent = '☀️'; // Show sun icon
  } else {
    // Switch to Light Mode
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('libranet_theme', 'light');
    themeToggleBtn.textContent = '🌙'; // Show moon icon
  }
});
  const token = localStorage.getItem('libranet_token');
  if (token) {
    try {
      const { member } = await Auth.me();
      currentUser = member;
      showApp();
    } catch {
      showLogin();
    }
  } else {
    showLogin();
  }
});

function showLogin() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('appShell').style.display  = 'none';
}

function showApp() {
  localStorage.setItem('member', JSON.stringify(currentUser));
    // === THE ULTIMATE TRAFFIC COP ===
    if (currentUser && (currentUser.memberType === 'student' || currentUser.role === 'member')) {
      
        window.location.href = 'student-portal.html';
        return; // This stops the rest of the dashboard from loading!
    }

    // Normal librarian dashboard setup
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appShell').style.display = 'flex';
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = currentUser.role;
    document.getElementById('userAvatar').textContent = currentUser.name.split(' ').map(w => w[0]).join('');
    
    setupNav();
    switchPage('dashboard');
}

// ── AUTH ─────────────────────────────────────────────────────────────────────
async function doLogin() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn      = document.getElementById('loginBtn');
  const errEl    = document.getElementById('loginError');

  errEl.style.display = 'none';
  btn.textContent = 'Signing in...';
  btn.disabled = true;

try {
        const data = await Auth.login({ email, password });
        
        // Safety Check: If wrong password, show error and stop!
        if (!data.success) {
            errEl.textContent = data.message || 'Invalid email or password';
            errEl.style.display = 'block';
            return; 
        }

        localStorage.setItem('libranet_token', data.token);
        currentUser = data.member;
        
        showApp(); 
        
    } catch (err) {           // <--- THIS IS THE MISSING PIECE!
        errEl.textContent = err.message || 'An error occurred during login';
        errEl.style.display = 'block';
    } finally {
        btn.textContent = 'Sign In';
        btn.disabled = false;
    }
}


function doLogout() {
  localStorage.removeItem('libranet_token');
  currentUser = null;
  showLogin();
}

// Allow Enter key on login
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('loginPage').style.display !== 'none') {
    doLogin();
  }
});

// ── NAVIGATION ───────────────────────────────────────────────────────────────
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      const page = el.dataset.page;
      if (page) switchPage(page);
    });
  });

  document.getElementById('topbarActionBtn').addEventListener('click', () => {
    const actions = {
      dashboard:    () => openBookModal(),
      books:        () => openBookModal(),
      members:      () => openMemberModal(),
      transactions: () => openIssueModal(null, 'Quick Issue'),
      fines:        () => {},
      purchase:     () => openPOModal(),
      suppliers:    () => openSupplierModal(),
      reports:      () => {},
    };
    (actions[currentPage] || (() => {}))();
  });
}

const actionBtnLabels = {
  dashboard: '+ Add Book', books: '+ Add Book', members: '+ Add Member',
  transactions: '+ Issue Book', purchase: '+ New Order', suppliers: '+ Add Supplier',
  fines: '', reports: '',
};

function switchPage(name) {
  currentPage = name;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === name);
  });

  const titles = {
    dashboard:'Dashboard', books:'Book Catalog', members:'Members',
    transactions:'Transactions', fines:'Fine Management', purchase:'Purchase Orders',
    suppliers:'Suppliers', reports:'Reports',
  };
  document.getElementById('pageTitle').textContent = titles[name] || name;

  const btn = document.getElementById('topbarActionBtn');
  btn.textContent = actionBtnLabels[name] || '';
  btn.style.display = actionBtnLabels[name] ? '' : 'none';

  // load page data
  const loaders = {
    dashboard:    loadDashboard,
    books:        loadBooks,
    members:      loadMembers,
    transactions: loadTransactions,
    fines:        loadFines,
    purchase:     loadPurchaseOrders,
    suppliers:    loadSuppliers,
    reports:      loadReports,
  };
  if (loaders[name]) loaders[name]();
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function debounce(fn, ms) {
  return function (...args) {
    const key = fn.name;
    clearTimeout(debounceTimers[key]);
    debounceTimers[key] = setTimeout(() => fn(...args), ms);
  };
}

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function badge(status) {
  const map = {
    available:'badge-available', issued:'badge-issued', overdue:'badge-overdue',
    active:'badge-active', returned:'badge-returned', reserved:'badge-reserved',
    pending:'badge-pending', paid:'badge-paid', waived:'badge-waived',
    received:'badge-received', in_transit:'badge-in_transit', suspended:'badge-suspended',
    student:'badge-available', staff:'badge-issued',
  };
  return `<span class="badge ${map[status] || 'badge-available'}">${status?.replace('_',' ')}</span>`;
}

function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = (type === 'success' ? '✓ ' : '✕ ') + msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close modal on backdrop click
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('open');
  });
});

function showErr(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg; el.style.display = 'block';
}
function clearErr(id) {
  const el = document.getElementById(id);
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}

// ── GLOBAL SEARCH ────────────────────────────────────────────────────────────
async function handleGlobalSearch(val) {
  if (!val.trim()) return;
  switchPage('books');
  document.getElementById('bookSearch').value = val;
  loadBooks();
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [dash, monthly] = await Promise.all([Reports.dashboard(), Reports.monthly()]);

    // Stats
    const s = dash.stats;
    document.getElementById('dashboardStats').innerHTML = `
      <div class="stat-card gold">
        <div class="stat-label">Total Books</div>
        <div class="stat-value">${s.totalBooks.toLocaleString()}</div>
        <div class="stat-sub">${s.booksIssued} currently issued</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-label">Books Issued</div>
        <div class="stat-value">${s.booksIssued}</div>
        <div class="stat-sub">${monthly.report.booksIssued} issued this month</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">Active Members</div>
        <div class="stat-value">${s.activeMembers.toLocaleString()}</div>
        <div class="stat-sub">${s.totalMembers} total registered</div>
      </div>
      <div class="stat-card red">
        <div class="stat-label">Overdue Books</div>
        <div class="stat-value">${s.overdueCount}</div>
        <div class="stat-sub">₹${s.pendingFines.toLocaleString()} pending fines</div>
      </div>`;

    // Update nav badge
    const badge = document.getElementById('overdueNavBadge');
    if (s.overdueCount > 0) {
      badge.textContent = s.overdueCount;
      badge.style.display = '';
    }

// Overdue alerts
    // Fetch directly from the transactions list where status is already 'overdue'
    const overdueRes = await Transactions.list({ status: 'overdue' });
    const alertsEl = document.getElementById('overdueAlerts');
    
    if (!overdueRes.transactions || !overdueRes.transactions.length) {
      alertsEl.innerHTML = '<div class="empty-state">🎉 No overdue books!</div>';
    } else {
      alertsEl.innerHTML = overdueRes.transactions.slice(0, 5).map(t => {
        // Calculate days and fine on the frontend since we are using the generic list API
        const daysOverdue = Math.max(0, Math.floor((new Date() - new Date(t.dueDate)) / 86400000));
        const estimatedFine = daysOverdue * 10; // ₹10 per day
        
        return `
        <div class="overdue-alert">
          <span style="font-size:18px">📕</span>
          <div class="overdue-alert-text">
            <div class="title">${t.book?.title || '—'} — ${t.member?.name || '—'}</div>
            <div class="sub">Due: ${fmt(t.dueDate)} · ${daysOverdue} days overdue · ₹${estimatedFine} fine</div>
          </div>
          <div class="overdue-alert-action">
            <button class="btn btn-ghost btn-small" onclick="openReturnModal('${t._id}')">Return</button>
          </div>
        </div>`;
      }).join('');
    }

    // Recent transactions
    const txnsEl = document.getElementById('recentTxns');
    if (!dash.recentTxns.length) {
      txnsEl.innerHTML = '<div class="empty-state">No transactions yet.</div>';
    } else {
      txnsEl.innerHTML = `<div>${dash.recentTxns.slice(0, 6).map(t => `
        <div class="txn-item">
          <div class="txn-icon ${t.type === 'return' ? 'return' : 'issue'}">${t.type === 'return' ? '📥' : '📤'}</div>
          <div class="txn-info">
            <div class="title">${t.book?.title || '—'} — ${t.type === 'return' ? 'Returned' : 'Issued to'} ${t.member?.name || '—'}</div>
            <div class="meta">${fmt(t.createdAt)} · Due: ${fmt(t.dueDate)}</div>
          </div>
          <div class="txn-amount" style="color:${t.type === 'return' ? 'var(--accent3)' : 'var(--accent2)'}">
            ${t.type.toUpperCase()}
          </div>
        </div>`).join('')}</div>`;
    }

    // Top subjects
    const subjEl = document.getElementById('topSubjects');
    const maxCount = dash.topSubjects[0]?.count || 1;
    subjEl.innerHTML = dash.topSubjects.map(s => `
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span>${s._id || 'Unknown'}</span>
          <span style="color:var(--accent);font-family:'DM Mono',monospace">${s.count} borrows</span>
        </div>
        <div class="progress-wrap">
          <div class="progress-bar" style="width:${(s.count/maxCount*100).toFixed(0)}%;background:var(--accent)"></div>
        </div>
      </div>`).join('') || '<div class="empty-state">No data yet.</div>';

  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

// ── BOOKS ─────────────────────────────────────────────────────────────────────
async function loadBooks() {
  const tbody = document.getElementById('booksTableBody');
  tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">Loading...</td></tr>';
  try {
    const params = {
      search:  document.getElementById('bookSearch')?.value || '',
      subject: document.getElementById('bookSubjectFilter')?.value || '',
      status:  document.getElementById('bookStatusFilter')?.value || '',
      limit: 25,
    };
    const { books, total } = await Books.list(params);
    if (!books.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">No books found.</td></tr>';
      return;
    }
    tbody.innerHTML = books.map(b => `
      <tr>
        <td><span class="mono">${b.bookId}</span></td>
        <td><strong>${b.title}</strong></td>
        <td>${b.author}</td>
        <td>${b.subject}</td>
        <td><span class="mono">${b.isbn}</span></td>
        <td>${b.totalCopies}</td>
        <td style="color:${b.availableCopies > 0 ? 'var(--accent3)' : 'var(--danger)'};font-weight:600">${b.availableCopies}</td>
        <td>${badge(b.availableCopies > 0 ? 'available' : 'issued')}</td>
        <td>
          <div style="display:flex;gap:6px">
            ${b.availableCopies > 0
              ? `<button class="btn btn-ghost btn-small" onclick="openIssueModal('${b._id}','${b.title.replace(/'/g,"\\'")}')">Issue</button>`
              : `<button class="btn btn-ghost btn-small" disabled style="opacity:.4">Issue</button>`}
            <button class="btn btn-ghost btn-small" onclick="openEditBookModal('${b._id}')">Edit</button>
            <button class="btn btn-ghost btn-small" style="color:var(--danger)" onclick="confirmDelete('book','${b._id}','${b.title.replace(/'/g,"\\'")}')">Del</button>
          </div>
        </td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="loading-cell" style="color:var(--danger)">${err.message}</td></tr>`;
  }
}

function openBookModal(data = null) {
  clearErr('bookModalError');
  document.getElementById('bookEditId').value = '';
  document.getElementById('bookModalTitle').textContent = 'Add New Book';
  ['bookTitle','bookAuthor','bookISBN','bookSubject','bookPublisher','bookEdition','bookLocation'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('bookCopies').value = 1;
  if (data) {
    document.getElementById('bookEditId').value    = data._id;
    document.getElementById('bookModalTitle').textContent = 'Edit Book';
    document.getElementById('bookTitle').value     = data.title;
    document.getElementById('bookAuthor').value    = data.author;
    document.getElementById('bookISBN').value      = data.isbn;
    document.getElementById('bookSubject').value   = data.subject;
    document.getElementById('bookPublisher').value = data.publisher || '';
    document.getElementById('bookEdition').value   = data.edition || '';
    document.getElementById('bookCopies').value    = data.totalCopies;
    document.getElementById('bookLocation').value  = data.location || '';
  }
  openModal('bookModal');
}

async function openEditBookModal(id) {
  try {
    const { book } = await Books.get(id);
    openBookModal(book);
  } catch (err) { toast(err.message, 'error'); }
}

async function saveBook() {
  clearErr('bookModalError');
  const id    = document.getElementById('bookEditId').value;
  const body  = {
    title:       document.getElementById('bookTitle').value.trim(),
    author:      document.getElementById('bookAuthor').value.trim(),
    isbn:        document.getElementById('bookISBN').value.trim(),
    subject:     document.getElementById('bookSubject').value.trim(),
    publisher:   document.getElementById('bookPublisher').value.trim(),
    edition:     document.getElementById('bookEdition').value.trim(),
    totalCopies: Number(document.getElementById('bookCopies').value),
    location:    document.getElementById('bookLocation').value.trim(),
  };
  if (!body.title || !body.author || !body.isbn || !body.subject)
    return showErr('bookModalError', 'Title, Author, ISBN and Subject are required.');
  try {
    if (id) {
      await Books.update(id, body);
      toast('Book updated successfully!');
    } else {
      body.availableCopies = body.totalCopies;
      await Books.create(body);
      toast('Book added successfully!');
    }
    closeModal('bookModal');
    loadBooks();
  } catch (err) { showErr('bookModalError', err.message); }
}

// ── MEMBERS ───────────────────────────────────────────────────────────────────
async function loadMembers() {
  const tbody = document.getElementById('membersTableBody');
  tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">Loading...</td></tr>';
  try {
    const { members } = await Members.list({
      search:     document.getElementById('memberSearch')?.value || '',
      memberType: document.getElementById('memberTypeFilter')?.value || '',
      status:     document.getElementById('memberStatusFilter')?.value || '',
    });
    if (!members.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No members found.</td></tr>';
      return;
    }
    tbody.innerHTML = members.map(m => `
      <tr>
        <td><span class="mono">${m.memberId}</span></td>
        <td><strong>${m.name}</strong><br><span style="font-size:11px;color:var(--text3)">${m.email}</span></td>
        <td>${badge(m.memberType)}</td>
        <td>${m.department || '—'}</td>
        <td>${m.booksIssued}</td>
        <td style="color:${m.outstandingFines > 0 ? 'var(--danger)' : 'var(--accent3)'}; font-family:'DM Mono',monospace; font-weight:600">
          ₹${m.outstandingFines || 0}
        </td>
        <td>${badge(m.membershipStatus)}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-small" onclick="openEditMemberModal('${m._id}')">Edit</button>
            <button class="btn btn-ghost btn-small" style="color:var(--danger)" onclick="confirmDelete('member','${m._id}','${m.name.replace(/'/g,"\\'")}')">Del</button>
          </div>
        </td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="loading-cell" style="color:var(--danger)">${err.message}</td></tr>`;
  }
}

function openMemberModal(data = null) {
  clearErr('memberModalError');
  document.getElementById('memberEditId').value = '';
  document.getElementById('memberModalTitle').textContent = 'Add New Member';
  ['memberName','memberEmail','memberPassword','memberPhone','memberDept','memberRollNo'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('memberType').value = 'student';
  document.getElementById('memberRole').value = 'member';
  if (data) {
    document.getElementById('memberEditId').value  = data._id;
    document.getElementById('memberModalTitle').textContent = 'Edit Member';
    document.getElementById('memberName').value    = data.name;
    document.getElementById('memberEmail').value   = data.email;
    document.getElementById('memberPhone').value   = data.phone || '';
    document.getElementById('memberDept').value    = data.department || '';
    document.getElementById('memberRollNo').value  = data.rollNo || '';
    document.getElementById('memberType').value    = data.memberType;
    document.getElementById('memberRole').value    = data.role;
    document.getElementById('memberPassword').placeholder = 'Leave blank to keep current';
    document.getElementById('memberPassword').required = false;
  }
  openModal('memberModal');
}

async function openEditMemberModal(id) {
  try {
    const { member } = await Members.get(id);
    openMemberModal(member);
  } catch (err) { toast(err.message, 'error'); }
}

async function saveMember() {
  clearErr('memberModalError');
  const id = document.getElementById('memberEditId').value;
  const body = {
    name:       document.getElementById('memberName').value.trim(),
    email:      document.getElementById('memberEmail').value.trim(),
    phone:      document.getElementById('memberPhone').value.trim(),
    memberType: document.getElementById('memberType').value,
    department: document.getElementById('memberDept').value.trim(),
    rollNo:     document.getElementById('memberRollNo').value.trim(),
    role:       document.getElementById('memberRole').value,
  };
  const pw = document.getElementById('memberPassword').value;
  if (!id && !pw) return showErr('memberModalError', 'Password is required for new members.');
  if (pw) body.password = pw;
  if (!body.name || !body.email) return showErr('memberModalError', 'Name and Email are required.');
  try {
    if (id) { await Members.update(id, body); toast('Member updated!'); }
    else    { await Members.create(body);     toast('Member added!'); }
    closeModal('memberModal');
    loadMembers();
  } catch (err) { showErr('memberModalError', err.message); }
}

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────
async function loadTransactions() {
  const tbody = document.getElementById('txnsTableBody');
  tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">Loading...</td></tr>';
  try {
    const { transactions } = await Transactions.list({
      status: document.getElementById('txnStatusFilter')?.value || '',
    });
    if (!transactions.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">No transactions found.</td></tr>';
      return;
    }
    tbody.innerHTML = transactions.map(t => {
      const daysOverdue = t.status === 'overdue'
        ? Math.floor((new Date() - new Date(t.dueDate)) / 86400000) : 0;
      return `
        <tr>
          <td><span class="mono">${t.transactionId}</span></td>
          <td>${badge(t.type)}</td>
          <td><strong>${t.book?.title || '—'}</strong></td>
          <td>${t.member?.name || '—'}<br><span class="mono" style="font-size:10px">${t.member?.memberId || ''}</span></td>
          <td>${fmt(t.issueDate)}</td>
          <td style="color:${t.status === 'overdue' ? 'var(--danger)' : ''}">${fmt(t.dueDate)}</td>
          <td>${badge(t.status)}</td>
          <td style="font-family:'DM Mono',monospace;color:${t.fineAmount > 0 ? 'var(--danger)' : 'var(--text3)'}">
            ${t.fineAmount > 0 ? '₹'+t.fineAmount : (daysOverdue > 0 ? '₹'+(daysOverdue*10) : '—')}
          </td>
          <td>
            ${t.status !== 'returned'
              ? `<button class="btn btn-ghost btn-small" onclick="openReturnModal('${t._id}')">Return</button>`
              : `<span style="color:var(--text3);font-size:11px">Returned ${fmt(t.returnDate)}</span>`}
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="loading-cell" style="color:var(--danger)">${err.message}</td></tr>`;
  }
}

// ── ISSUE MODAL ───────────────────────────────────────────────────────────────
function openIssueModal(bookId = null, bookTitle = '') {
  clearErr('issueModalError');
  document.getElementById('issueBookId').value       = bookId || '';
  document.getElementById('issueBookTitle').value    = bookTitle;
  document.getElementById('issueMemberSearch').value = '';
  document.getElementById('issueMemberId').value     = '';
  document.getElementById('memberSearchResults').innerHTML = '';
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('issueDate').value         = today;
  document.getElementById('issueLoanDays').value     = 14;
  openModal('issueModal');
}

async function searchMemberForIssue(val) {
  const results = document.getElementById('memberSearchResults');
  if (val.length < 2) { results.innerHTML = ''; return; }
  try {
    const { members } = await Members.list({ search: val, limit: 6 });
    results.innerHTML = members.map(m => `
      <div class="search-result-item" onclick="selectMember('${m._id}','${m.name.replace(/'/g,"\\'")}','${m.memberId}')">
        <div>${m.name} <span class="mono">(${m.memberId})</span></div>
        <div class="sub">${m.department || ''} · ${m.booksIssued} books issued · ₹${m.outstandingFines || 0} due</div>
      </div>`).join('') || '<div class="search-result-item" style="color:var(--text3)">No members found</div>';
  } catch {}
}

function selectMember(id, name, memberId) {
  document.getElementById('issueMemberId').value     = id;
  document.getElementById('issueMemberSearch').value = `${name} (${memberId})`;
  document.getElementById('memberSearchResults').innerHTML = '';
}

async function confirmIssue() {
  clearErr('issueModalError');
  const bookId   = document.getElementById('issueBookId').value;
  const memberId = document.getElementById('issueMemberId').value;
  const dueDays  = Number(document.getElementById('issueLoanDays').value);
  if (!bookId)   return showErr('issueModalError', 'Please select a book first.');
  if (!memberId) return showErr('issueModalError', 'Please select a member.');
  try {
    await Transactions.issue({ bookId, memberId, dueDays });
    toast('Book issued successfully!');
    closeModal('issueModal');
    loadBooks();
    loadTransactions();
  } catch (err) { showErr('issueModalError', err.message); }
}

// ── RETURN MODAL ──────────────────────────────────────────────────────────────
async function openReturnModal(txnId) {
  clearErr('returnModalError');
  document.getElementById('returnTxnId').value = txnId;
  try {
    const { transactions } = await Transactions.list({ limit: 200 });
    const txn = transactions.find(t => t._id === txnId);
    if (!txn) return;
    const daysOverdue = Math.max(0, Math.floor((new Date() - new Date(txn.dueDate)) / 86400000));
    const fine        = daysOverdue * 10;
    document.getElementById('returnSummary').innerHTML = `
      <div class="return-summary">
        <div class="row"><span class="label">Book</span><span>${txn.book?.title}</span></div>
        <div class="row"><span class="label">Member</span><span>${txn.member?.name}</span></div>
        <div class="row"><span class="label">Issue Date</span><span>${fmt(txn.issueDate)}</span></div>
        <div class="row"><span class="label">Due Date</span><span>${fmt(txn.dueDate)}</span></div>
        <div class="row"><span class="label">Days Overdue</span><span style="color:${daysOverdue>0?'var(--danger)':'var(--accent3)'}">${daysOverdue > 0 ? daysOverdue+' days' : 'On time ✓'}</span></div>
        <div class="row"><span class="label">Fine</span><span style="color:${fine>0?'var(--danger)':'var(--accent3)'}; font-family:'DM Mono',monospace; font-weight:700">${fine > 0 ? '₹'+fine : '₹0'}</span></div>
      </div>`;
  } catch {}
  openModal('returnModal');
}

async function confirmReturn() {
  const txnId = document.getElementById('returnTxnId').value;
  try {
    const res = await Transactions.return_({ transactionId: txnId });
    toast(`Book returned! ${res.fineAmount > 0 ? 'Fine: ₹'+res.fineAmount : 'No fine.'}`);
    closeModal('returnModal');
    loadTransactions();
    loadBooks();
    loadFines();
  } catch (err) { showErr('returnModalError', err.message); }
}

// ── FINES ─────────────────────────────────────────────────────────────────────
async function loadFines() {
  const tbody = document.getElementById('finesTableBody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Loading...</td></tr>';
  try {
    const { fines } = await Fines.list({ status: 'pending' });
    if (!fines.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">🎉 No pending fines!</td></tr>';
    } else {
      tbody.innerHTML = fines.map(f => `
        <tr>
          <td><span class="mono">${f.fineId}</span></td>
          <td>${f.member?.name || '—'}<br><span class="mono">${f.member?.memberId || ''}</span></td>
          <td>${f.book?.title || '—'}</td>
          <td style="color:var(--danger);font-weight:600">${f.daysOverdue}</td>
          <td style="color:var(--danger);font-family:'DM Mono',monospace;font-weight:700">₹${f.totalAmount}</td>
          <td>
            <div style="display:flex;gap:6px">
              <button class="btn btn-ghost btn-small" onclick="openCollectFineModal('${f._id}',${f.totalAmount},'${f.member?.name?.replace(/'/g,"\\'")}','${f.book?.title?.replace(/'/g,"\\'")}')">Collect</button>
              <button class="btn btn-ghost btn-small" style="color:var(--text3)" onclick="waiveFine('${f._id}')">Waive</button>
            </div>
          </td>
        </tr>`).join('');
    }

    // Populate fine calculator dropdown with overdue transactions
    const overdueRes = await Transactions.overdue();
    const sel = document.getElementById('fineCalcTxn');
    sel.innerHTML = '<option value="">— select overdue transaction —</option>' +
      overdueRes.transactions.map(t =>
        `<option value="${t._id}" data-member="${t.member?.name}" data-book="${t.book?.title}" data-due="${t.dueDate}" data-days="${t.daysOverdue}" data-fine="${t.estimatedFine}">
          ${t.member?.name} — ${t.book?.title}
        </option>`
      ).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="loading-cell" style="color:var(--danger)">${err.message}</td></tr>`;
  }
}

function calcFine() {
  const sel = document.getElementById('fineCalcTxn');
  const opt = sel.options[sel.selectedIndex];
  const res = document.getElementById('fineCalcResult');
  if (!sel.value) { res.style.display = 'none'; return; }
  document.getElementById('fcMember').textContent = opt.dataset.member;
  document.getElementById('fcBook').textContent   = opt.dataset.book;
  document.getElementById('fcDue').textContent    = fmt(opt.dataset.due);
  document.getElementById('fcDays').textContent   = opt.dataset.days + ' days';
  document.getElementById('fcTotal').textContent  = '₹' + opt.dataset.fine;
  res.style.display = 'block';
}

function openCollectFineModal(fineId, amount, memberName, bookTitle) {
  document.getElementById('collectFineId').value = fineId;
  document.getElementById('collectFineAmount').value = amount;
  document.getElementById('collectFineSummary').innerHTML = `
    <div class="return-summary">
      <div class="row"><span class="label">Member</span><span>${memberName}</span></div>
      <div class="row"><span class="label">Book</span><span>${bookTitle}</span></div>
      <div class="row"><span class="label">Total Fine</span><span style="color:var(--danger);font-weight:700;font-family:'DM Mono',monospace">₹${amount}</span></div>
    </div>`;
  openModal('collectFineModal');
}

async function confirmCollectFine() {
  const id     = document.getElementById('collectFineId').value;
  const amount = Number(document.getElementById('collectFineAmount').value);
  try {
    await Fines.collect(id, { amountPaid: amount });
    toast(`₹${amount} fine collected!`);
    closeModal('collectFineModal');
    loadFines();
    loadDashboard();
  } catch (err) { toast(err.message, 'error'); }
}

async function waiveFine(id) {
  if (!confirm('Waive this fine?')) return;
  try {
    await Fines.waive(id);
    toast('Fine waived.');
    loadFines();
  } catch (err) { toast(err.message, 'error'); }
}

// ── PURCHASE ORDERS ───────────────────────────────────────────────────────────
async function loadPurchaseOrders() {
  const tbody = document.getElementById('poTableBody');
  tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Loading...</td></tr>';
  try {
    const { orders } = await PurchaseOrders.list();
    if (!orders.length) { tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No purchase orders.</td></tr>'; return; }
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><span class="mono">${o.poNumber}</span></td>
        <td>${o.supplier?.name || '—'}</td>
        <td>${o.totalBooks || 0}</td>
        <td style="font-family:'DM Mono',monospace">₹${(o.totalAmount||0).toLocaleString()}</td>
        <td>${fmt(o.orderDate)}</td>
        <td>${badge(o.status)}</td>
        <td>
          <select class="form-input" style="width:130px;padding:4px 8px;font-size:11.5px" onchange="updatePOStatus('${o._id}',this.value)">
            ${['pending','approved','in_transit','received','cancelled'].map(s =>
              `<option value="${s}" ${o.status===s?'selected':''}>${s.replace('_',' ')}</option>`
            ).join('')}
          </select>
        </td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="loading-cell" style="color:var(--danger)">${err.message}</td></tr>`;
  }
}

async function updatePOStatus(id, status) {
  try {
    await PurchaseOrders.update(id, { status });
    toast('Order status updated!');
  } catch (err) { toast(err.message, 'error'); }
}

async function openPOModal() {
  try {
    const { suppliers } = await Suppliers.list();
    const sel = document.getElementById('poSupplier');
    sel.innerHTML = '<option value="">— Select Supplier —</option>' +
      suppliers.map(s => `<option value="${s._id}">${s.name}</option>`).join('');
    const tomorrow = new Date(Date.now() + 7*86400000).toISOString().split('T')[0];
    document.getElementById('poExpectedDate').value = tomorrow;
    openModal('poModal');
  } catch (err) { toast(err.message, 'error'); }
}

function addPOItem() {
  const container = document.getElementById('poItems');
  const row = document.createElement('div');
  row.className = 'po-item-row';
  row.innerHTML = `
    <input class="form-input" placeholder="Book Title" style="flex:2">
    <input class="form-input" placeholder="Author">
    <input class="form-input" placeholder="ISBN">
    <input class="form-input" type="number" placeholder="Qty" min="1" style="width:70px">
    <input class="form-input" type="number" placeholder="Unit ₹" style="width:90px">
    <button class="btn btn-ghost btn-small" style="color:var(--danger)" onclick="this.parentElement.remove()">✕</button>`;
  container.appendChild(row);
}

async function savePO() {
  const supplierId = document.getElementById('poSupplier').value;
  if (!supplierId) return toast('Please select a supplier.', 'error');
  const rows = document.querySelectorAll('#poItems .po-item-row');
  const items = [];
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const title  = inputs[0].value.trim();
    if (title) {
      items.push({
        title,
        author:    inputs[1].value.trim(),
        isbn:      inputs[2].value.trim(),
        quantity:  Number(inputs[3].value) || 1,
        unitPrice: Number(inputs[4].value) || 0,
      });
    }
  });
  if (!items.length) return toast('Add at least one item.', 'error');
  try {
    await PurchaseOrders.create({
      supplier: supplierId,
      items,
      expectedDate: document.getElementById('poExpectedDate').value,
      notes: document.getElementById('poNotes').value,
    });
    toast('Purchase order created!');
    closeModal('poModal');
    loadPurchaseOrders();
  } catch (err) { toast(err.message, 'error'); }
}

// ── SUPPLIERS ─────────────────────────────────────────────────────────────────
async function loadSuppliers() {
  const tbody = document.getElementById('suppliersTableBody');
  tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">Loading...</td></tr>';
  try {
    const { suppliers } = await Suppliers.list();
    if (!suppliers.length) { tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No suppliers.</td></tr>'; return; }
    tbody.innerHTML = suppliers.map(s => `
      <tr>
        <td><span class="mono">${s.supplierId}</span></td>
        <td><strong>${s.name}</strong></td>
        <td>${s.contactPerson || '—'}</td>
        <td>${s.phone || '—'}</td>
        <td>${s.city || '—'}</td>
        <td>${s.totalOrders}</td>
        <td>${badge(s.status)}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-small" onclick="openEditSupplierModal('${s._id}')">Edit</button>
            <button class="btn btn-ghost btn-small" style="color:var(--danger)" onclick="confirmDelete('supplier','${s._id}','${s.name.replace(/'/g,"\\'")}')">Del</button>
          </div>
        </td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="loading-cell" style="color:var(--danger)">${err.message}</td></tr>`;
  }
}

function openSupplierModal(data = null) {
  ['supplierName','supplierContact','supplierPhone','supplierEmail','supplierCity','supplierGSTIN'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('supplierEditId').value = '';
  document.getElementById('supplierModalTitle').textContent = 'Add Supplier';
  if (data) {
    document.getElementById('supplierEditId').value     = data._id;
    document.getElementById('supplierModalTitle').textContent = 'Edit Supplier';
    document.getElementById('supplierName').value       = data.name;
    document.getElementById('supplierContact').value    = data.contactPerson || '';
    document.getElementById('supplierPhone').value      = data.phone || '';
    document.getElementById('supplierEmail').value      = data.email || '';
    document.getElementById('supplierCity').value       = data.city || '';
    document.getElementById('supplierGSTIN').value      = data.gstin || '';
  }
  openModal('supplierModal');
}

async function openEditSupplierModal(id) {
  const { suppliers } = await Suppliers.list();
  const s = suppliers.find(x => x._id === id);
  if (s) openSupplierModal(s);
}

async function saveSupplier() {
  const id   = document.getElementById('supplierEditId').value;
  const body = {
    name:          document.getElementById('supplierName').value.trim(),
    contactPerson: document.getElementById('supplierContact').value.trim(),
    phone:         document.getElementById('supplierPhone').value.trim(),
    email:         document.getElementById('supplierEmail').value.trim(),
    city:          document.getElementById('supplierCity').value.trim(),
    gstin:         document.getElementById('supplierGSTIN').value.trim(),
  };
  if (!body.name) return toast('Supplier name is required.', 'error');
  try {
    if (id) { await Suppliers.update(id, body); toast('Supplier updated!'); }
    else    { await Suppliers.create(body);     toast('Supplier added!'); }
    closeModal('supplierModal');
    loadSuppliers();
  } catch (err) { toast(err.message, 'error'); }
}

// ── REPORTS ───────────────────────────────────────────────────────────────────
async function loadReports() {
  try {
    const [dash, monthly] = await Promise.all([Reports.dashboard(), Reports.monthly()]);
    const r = monthly.report;
    document.getElementById('monthlyStats').innerHTML = `
      <div class="stat-card gold">
        <div class="stat-label">Books Issued (${r.month})</div>
        <div class="stat-value">${r.booksIssued}</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">Books Returned</div>
        <div class="stat-value">${r.booksReturned}</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-label">New Members</div>
        <div class="stat-value">${r.newMembers}</div>
      </div>
      <div class="stat-card red">
        <div class="stat-label">Fines Collected (₹)</div>
        <div class="stat-value">${r.finesCollected.toLocaleString()}</div>
      </div>`;

    const maxCount = dash.topSubjects[0]?.count || 1;
    document.getElementById('reportSubjects').innerHTML = dash.topSubjects.map(s => `
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span>${s._id || 'Unknown'}</span>
          <span style="color:var(--accent);font-family:'DM Mono',monospace">${s.count}</span>
        </div>
        <div class="progress-wrap">
          <div class="progress-bar" style="width:${(s.count/maxCount*100).toFixed(0)}%;background:var(--accent)"></div>
        </div>
      </div>`).join('') || '<div class="empty-state">No data yet.</div>';
  } catch (err) { console.error(err); }
}

function exportReport(type) {
  toast(`Generating ${type} report...`);
  setTimeout(() => toast(`${type} report ready — implement CSV export here.`), 1200);
}

// ── DELETE CONFIRM ────────────────────────────────────────────────────────────
function confirmDelete(type, id, name) {
  document.getElementById('confirmMessage').textContent = `Are you sure you want to delete "${name}"? This cannot be undone.`;
  const btn = document.getElementById('confirmDeleteBtn');
  btn.onclick = async () => {
    try {
      if (type === 'book')     await Books.delete(id);
      if (type === 'member')   await Members.delete(id);
      if (type === 'supplier') await Suppliers.delete(id);
      toast(`${name} deleted.`);
      closeModal('confirmModal');
      if (type === 'book')     loadBooks();
      if (type === 'member')   loadMembers();
      if (type === 'supplier') loadSuppliers();
    } catch (err) { toast(err.message, 'error'); }
  };
  openModal('confirmModal');
}
// Function to load real books into our new dropdown
async function loadBooksIntoDropdown() {
  const select = document.getElementById('issueBookSelect');
  if (!select) return;
  
  try {
    // Fetch all books from the backend
    const res = await Books.list(); 
    
    // Create options only for books that are actually in stock!
    const options = res.books
      .filter(book => book.availableCopies > 0)
      .map(book => `<option value="${book._id}">${book.title} (${book.availableCopies} available)</option>`)
      .join('');
      
    select.innerHTML = '<option value="">-- Select an Available Book --</option>' + options;
  } catch (err) {
    console.error('Error loading books for dropdown:', err);
  }
}

// Run this automatically as soon as the page loads
document.addEventListener('DOMContentLoaded', loadBooksIntoDropdown);