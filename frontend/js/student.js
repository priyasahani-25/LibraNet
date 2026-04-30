/* student.js — frontend controller for student portal */

let currentUser = null;
let allStudentBooks = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Theme Toggle Logic
  const themeToggleBtn = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('libranet_theme') || 'dark';

  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (themeToggleBtn) themeToggleBtn.textContent = '🌙';
  } else {
    if (themeToggleBtn) themeToggleBtn.textContent = '☀️';
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      if (currentTheme === 'light') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('libranet_theme', 'dark');
        themeToggleBtn.textContent = '☀️';
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('libranet_theme', 'light');
        themeToggleBtn.textContent = '🌙';
      }
    });
  }

  // Auth Check
  const token = localStorage.getItem('libranet_token');
  let userStr = localStorage.getItem('member');
  
  if (!token || !userStr) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = JSON.parse(userStr);
  
  // Update static UI elements
  document.getElementById('studentName').textContent = currentUser.name.split(' ')[0];
  document.getElementById('welcomeName').textContent = currentUser.name.split(' ')[0];
  document.getElementById('sidebarName').textContent = currentUser.name;
  document.getElementById('sidebarRole').textContent = currentUser.memberType === 'student' ? 'Student' : 'Staff';
  
  const avatarText = currentUser.name.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
  document.getElementById('sidebarAvatar').textContent = avatarText;
  document.getElementById('topbarAvatar').textContent = avatarText;

  // Load Data
  await loadStudentDashboard();
  await loadStudentBooks();
  populateProfile();
});

function studentLogout() {
  localStorage.removeItem('libranet_token');
  localStorage.removeItem('member');
  window.location.href = 'index.html';
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Global View Switcher
window.switchView = function(viewId) {
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === viewId);
  });

  // Hide all pages, show target
  document.querySelectorAll('.page').forEach(el => {
    el.classList.remove('active');
  });
  document.getElementById('view-' + viewId).classList.add('active');

  // Topbar Updates
  const titles = {
    'dashboard': 'Dashboard',
    'search': 'Search Books',
    'history': 'Borrow History',
    'notifications': 'Notifications',
    'profile': 'My Profile'
  };
  document.getElementById('topbarTitle').textContent = titles[viewId];
  
  // Only show search bar on the "Search Books" page
  document.getElementById('topbarSearchContainer').style.display = viewId === 'search' ? 'block' : 'none';
};

async function loadStudentDashboard() {
  try {
    // Fetch transactions for this member
    const txnsRes = await Transactions.list({ memberId: currentUser._id, limit: 100 });
    const transactions = txnsRes.transactions || [];

    // Fetch fines for this member
    const finesRes = await Fines.list({ memberId: currentUser._id });
    const fines = finesRes.fines || [];

    // Calculate Stats
    const activeBorrows = transactions.filter(t => t.status === 'active' || t.status === 'overdue');
    const overdueBorrows = activeBorrows.filter(t => t.status === 'overdue' || new Date(t.dueDate) < new Date());
    const pendingFines = fines.filter(f => f.status === 'pending');
    
    const totalPendingAmount = pendingFines.reduce((sum, f) => sum + f.totalAmount, 0);

    // Update Stat Cards
    document.getElementById('statActiveBorrows').textContent = activeBorrows.length;
    document.getElementById('statOverdue').textContent = overdueBorrows.length;
    document.getElementById('statFines').textContent = '₹' + totalPendingAmount;
    document.getElementById('statMaxAllowed').textContent = `Max ${currentUser.maxBooksAllowed || 4} allowed`;

    // Generate Notifications
    const notifications = [];
    overdueBorrows.forEach(t => {
      notifications.push({
        type: 'danger',
        title: 'Overdue Book',
        message: `Your book "${t.book?.title}" is overdue. Please return it immediately to avoid further fines.`,
        date: t.dueDate
      });
    });

    activeBorrows.forEach(t => {
      if (t.status !== 'overdue') {
        const daysLeft = Math.ceil((new Date(t.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 0 && daysLeft <= 3) {
          notifications.push({
            type: 'warning',
            title: 'Book Due Soon',
            message: `Your book "${t.book?.title}" is due in ${daysLeft} days. Please return or renew it.`,
            date: t.dueDate
          });
        }
      }
    });

    document.getElementById('statNotifications').textContent = notifications.length;
    if (notifications.length > 0) {
      document.getElementById('topbarNotifBadge').style.display = 'block';
      document.getElementById('topbarNotifBadge').textContent = notifications.length;
    } else {
      document.getElementById('topbarNotifBadge').style.display = 'none';
    }
    
    // Render "Currently Borrowed" (Dashboard)
    const borrowedContainer = document.getElementById('currentlyBorrowedList');
    if (activeBorrows.length === 0) {
      borrowedContainer.innerHTML = '<div class="empty-state">No books currently borrowed.</div>';
    } else {
      borrowedContainer.innerHTML = activeBorrows.map(t => {
        const isOverdue = t.status === 'overdue' || new Date(t.dueDate) < new Date();
        const daysLeftStr = isOverdue 
          ? `<span style="color:var(--danger)">Overdue</span>` 
          : `<span style="color:var(--accent)">${Math.ceil((new Date(t.dueDate) - new Date()) / (1000 * 60 * 60 * 24))} days left</span>`;
        
        return `
          <div style="background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:16px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:600; font-size:14px; margin-bottom:4px;">${t.book?.title || 'Unknown Book'}</div>
              <div style="font-size:12px; color:var(--text3);">${t.book?.author || 'Unknown'} • ISBN: ${t.book?.isbn || '—'}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:13px; font-weight:600; margin-bottom:4px;">${daysLeftStr}</div>
              <div style="font-size:11.5px; color:var(--text3);">Due: ${fmtDate(t.dueDate)}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Render Notifications (Both Dashboard & Notifications Page)
    renderNotifications(notifications);

    // Render Borrow History Page
    renderBorrowHistory(transactions);

  } catch (err) {
    console.error("Error loading dashboard:", err);
    toast("Failed to load dashboard data.", "error");
  }
}

function renderNotifications(notifications) {
  const alertHtml = (n) => `
    <div style="background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:16px; margin-bottom:12px; display:flex; gap:12px;">
      <div style="font-size:18px;">${n.type === 'danger' ? '⚠️' : '🗓️'}</div>
      <div>
        <div style="font-weight:600; font-size:13.5px; margin-bottom:4px; color:${n.type === 'danger' ? 'var(--danger)' : 'var(--text)'}">${n.title}</div>
        <div style="font-size:12px; color:var(--text2); margin-bottom:6px;">${n.message}</div>
        <div style="font-size:11px; color:var(--text3);">${fmtDate(n.date)}</div>
      </div>
    </div>
  `;

  const dashboardContainer = document.getElementById('recentNotificationsList');
  const fullContainer = document.getElementById('fullNotificationsList');

  if (notifications.length === 0) {
    dashboardContainer.innerHTML = '<div class="empty-state">No recent notifications.</div>';
    fullContainer.innerHTML = '<div class="empty-state">You are all caught up! No notifications.</div>';
  } else {
    // Show only top 3 on dashboard
    dashboardContainer.innerHTML = notifications.slice(0, 3).map(alertHtml).join('');
    // Show all on notifications page
    fullContainer.innerHTML = notifications.map(alertHtml).join('');
  }
}

function renderBorrowHistory(transactions) {
  const tbody = document.getElementById('studentHistoryTableBody');
  if (transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No borrowing history found.</td></tr>';
    return;
  }

  tbody.innerHTML = transactions.map(t => {
    let statusBadge = '';
    if (t.status === 'active') statusBadge = `<span class="badge badge-active">Active</span>`;
    else if (t.status === 'returned') statusBadge = `<span class="badge badge-returned">Returned</span>`;
    else if (t.status === 'overdue') statusBadge = `<span class="badge badge-overdue">Overdue</span>`;
    
    let fineDisplay = '—';
    if (t.fineAmount > 0) {
      fineDisplay = `<span style="color:var(--danger)">₹${t.fineAmount}</span>`;
      if (t.finePaid) fineDisplay += ` <span style="font-size:10px; color:var(--accent3)">(Paid)</span>`;
    }

    return `
      <tr>
        <td>
          <div style="font-weight:500">${t.book?.title || 'Unknown'}</div>
          <div style="font-size:11px; color:var(--text3)">${t.book?.author || ''}</div>
        </td>
        <td>${fmtDate(t.issueDate)}</td>
        <td>${fmtDate(t.dueDate)}</td>
        <td>${statusBadge}</td>
        <td>${fineDisplay}</td>
      </tr>
    `;
  }).join('');
}

async function loadStudentBooks() {
  try {
    const res = await Books.list({ limit: 1000 });
    allStudentBooks = res.books || [];
    renderStudentBooks(allStudentBooks);
  } catch (err) {
    console.error("Error loading books:", err);
    document.getElementById('studentBooksTableBody').innerHTML = '<tr><td colspan="5" class="empty-state">Failed to load catalog.</td></tr>';
  }
}

function renderStudentBooks(books) {
  const tbody = document.getElementById('studentBooksTableBody');
  if (books.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No books found.</td></tr>';
    return;
  }

  tbody.innerHTML = books.map(b => {
    let availBadge = `<span class="badge badge-available">${b.availableCopies} available</span>`;
    if (b.availableCopies === 0) availBadge = `<span class="badge badge-pending">Out of stock</span>`;
    
    return `
      <tr>
        <td style="font-weight:500">${b.title}</td>
        <td>${b.author}</td>
        <td>${b.subject || '—'}</td>
        <td class="mono">${b.isbn}</td>
        <td>${availBadge}</td>
      </tr>
    `;
  }).join('');
}

window.handleStudentSearch = function(query) {
  if (!query) {
    renderStudentBooks(allStudentBooks);
    return;
  }
  const lower = query.toLowerCase();
  const filtered = allStudentBooks.filter(b => 
    b.title.toLowerCase().includes(lower) || 
    b.author.toLowerCase().includes(lower) || 
    b.subject.toLowerCase().includes(lower) ||
    b.isbn.toLowerCase().includes(lower)
  );
  renderStudentBooks(filtered);
};

function populateProfile() {
  if (!currentUser) return;
  document.getElementById('profileName').textContent = currentUser.name;
  document.getElementById('profileRole').textContent = currentUser.memberType === 'student' ? 'Student Member' : 'Staff Member';
  
  const avatarText = currentUser.name.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
  document.getElementById('profileAvatar').textContent = avatarText;

  document.getElementById('profileEmail').textContent = currentUser.email;
  document.getElementById('profilePhone').textContent = currentUser.phone || '—';
  document.getElementById('profileDept').textContent = currentUser.department || '—';
  document.getElementById('profileId').textContent = currentUser.rollNo || currentUser.memberId || '—';
}
