/**
 * VaultGuard - Vault Page Logic
 */
(function () {
  // State
  let credentials = [];
  let categories = [];
  let activeCategory = 'all';
  let editingCredentialId = null;
  let deletingCredentialId = null;
  let sessionTimeoutTimer = null;
  let sessionWarningTimer = null;
  let sessionTimeoutMinutes = 15;

  // DOM Elements
  const credentialsList = document.getElementById('credentialsList');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const userEmailEl = document.getElementById('userEmail');
  const categoryListEl = document.getElementById('categoryList');
  const allCountEl = document.getElementById('allCount');

  // Init
  init();

  async function init() {
    // Check auth
    try {
      const status = await API.get('/api/auth/status');
      if (!status.authenticated) {
        window.location.href = '/';
        return;
      }
      userEmailEl.textContent = status.email;
      sessionTimeoutMinutes = status.sessionTimeout || 15;
    } catch {
      window.location.href = '/';
      return;
    }

    setupPasswordToggles();
    setupEventListeners();
    setupSessionTimeout();
    await loadData();
  }

  function setupEventListeners() {
    // Add credential
    document.getElementById('addCredentialBtn').addEventListener('click', () => openCredentialModal());
    document.getElementById('emptyAddBtn').addEventListener('click', () => openCredentialModal());

    // Credential form
    document.getElementById('credentialForm').addEventListener('submit', handleSaveCredential);
    document.getElementById('closeModal').addEventListener('click', closeCredentialModal);
    document.getElementById('cancelModal').addEventListener('click', closeCredentialModal);
    document.querySelector('#credentialModal .modal-overlay').addEventListener('click', closeCredentialModal);

    // Delete modal
    document.getElementById('confirmDelete').addEventListener('click', handleDeleteCredential);
    document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);
    document.getElementById('closeDeleteModal').addEventListener('click', closeDeleteModal);
    document.querySelector('#deleteModal .modal-overlay').addEventListener('click', closeDeleteModal);

    // Search
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => renderCredentials(), 200);
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Settings
    document.getElementById('settingsBtn').addEventListener('click', () => {
      document.getElementById('settingsModal').classList.remove('hidden');
    });
    document.getElementById('closeSettings').addEventListener('click', () => {
      document.getElementById('settingsModal').classList.add('hidden');
    });
    document.querySelector('#settingsModal .modal-overlay').addEventListener('click', () => {
      document.getElementById('settingsModal').classList.add('hidden');
    });

    // Change password
    document.getElementById('changePasswordForm').addEventListener('submit', handleChangePassword);
    document.getElementById('newPassword').addEventListener('input', (e) => {
      updateStrengthMeter('newPwStrength', e.target.value);
    });

    // Delete account
    document.getElementById('deleteAccountBtn').addEventListener('click', handleDeleteAccount);

    // Password generator
    document.getElementById('generatePasswordBtn').addEventListener('click', () => {
      const panel = document.getElementById('generatorPanel');
      panel.classList.toggle('hidden');
    });
    document.getElementById('genLength').addEventListener('input', (e) => {
      document.getElementById('genLengthValue').textContent = e.target.value;
    });
    document.getElementById('doGenerate').addEventListener('click', handleGeneratePassword);

    // Password strength in credential form
    document.getElementById('credPassword').addEventListener('input', (e) => {
      updateStrengthMeter('credStrength', e.target.value);
    });

    // Categories
    document.getElementById('addCategoryBtn').addEventListener('click', () => openCategoryModal());
    document.getElementById('categoryForm').addEventListener('submit', handleSaveCategory);
    document.getElementById('closeCategoryModal').addEventListener('click', closeCategoryModal);
    document.getElementById('cancelCategory').addEventListener('click', closeCategoryModal);
    document.querySelector('#categoryModal .modal-overlay').addEventListener('click', closeCategoryModal);

    // Import/Export
    document.getElementById('exportBtn').addEventListener('click', handleExport);
    document.getElementById('importBtn').addEventListener('click', () => {
      document.getElementById('importModal').classList.remove('hidden');
    });
    document.getElementById('closeImportModal').addEventListener('click', () => {
      document.getElementById('importModal').classList.add('hidden');
    });
    document.getElementById('cancelImport').addEventListener('click', () => {
      document.getElementById('importModal').classList.add('hidden');
    });
    document.querySelector('#importModal .modal-overlay').addEventListener('click', () => {
      document.getElementById('importModal').classList.add('hidden');
    });
    document.getElementById('importForm').addEventListener('submit', handleImport);

    // Sidebar toggle (mobile)
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // Extend session
    document.getElementById('extendSession').addEventListener('click', (e) => {
      e.preventDefault();
      resetSessionTimeout();
      document.getElementById('timeoutWarning').classList.add('hidden');
      showToast('Session extended', 'success');
    });

    // Reset timeout on user activity
    ['click', 'keypress', 'mousemove', 'scroll'].forEach(event => {
      document.addEventListener(event, () => resetSessionTimeout(), { passive: true });
    });
  }

  // ==================== DATA ====================

  async function loadData() {
    try {
      [credentials, categories] = await Promise.all([
        API.get('/api/credentials'),
        API.get('/api/categories'),
      ]);
      renderCategories();
      renderCredentials();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ==================== CREDENTIALS ====================

  function renderCredentials() {
    const searchQuery = searchInput.value.toLowerCase().trim();

    let filtered = credentials;

    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter(c => c.categoryId === activeCategory);
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(c =>
        (c.siteName || '').toLowerCase().includes(searchQuery) ||
        (c.username || '').toLowerCase().includes(searchQuery) ||
        (c.url || '').toLowerCase().includes(searchQuery)
      );
    }

    if (filtered.length === 0) {
      credentialsList.innerHTML = '';
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
      credentialsList.innerHTML = filtered.map(cred => createCredentialCard(cred)).join('');
      attachCardListeners();
    }

    // Update count
    allCountEl.textContent = credentials.length;
  }

  function createCredentialCard(cred) {
    const initial = getInitial(cred.siteName);
    const maskedPassword = '•'.repeat(Math.min(12, (cred.password || '').length));

    return `
      <div class="credential-card" data-id="${cred.id}">
        <div class="card-header">
          <div class="card-site">
            <div class="card-favicon">${escapeHtml(initial)}</div>
            <div>
              <div class="card-site-name">${escapeHtml(cred.siteName)}</div>
              ${cred.url ? `<div class="card-url">${escapeHtml(cred.url)}</div>` : ''}
            </div>
          </div>
          <div class="card-actions">
            <button class="card-action-btn edit-btn" data-id="${cred.id}" title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="card-action-btn delete delete-btn" data-id="${cred.id}" data-name="${escapeHtml(cred.siteName)}" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
              </svg>
            </button>
          </div>
        </div>

        ${cred.username ? `
        <div class="card-field">
          <span class="field-label">Username</span>
          <div class="field-value">
            <span class="field-text">${escapeHtml(cred.username)}</span>
            <button class="field-copy-btn copy-btn" data-copy="${escapeHtml(cred.username)}" data-field="Username" title="Copy username">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
              </svg>
            </button>
          </div>
        </div>` : ''}

        <div class="card-field">
          <span class="field-label">Password</span>
          <div class="field-value">
            <span class="field-text password-display password-dots" data-password="${escapeHtml(cred.password)}" data-revealed="false">${maskedPassword}</span>
            <button class="field-toggle-btn reveal-btn" title="Show/Hide password">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            <button class="field-copy-btn copy-pw-btn" data-password="${escapeHtml(cred.password)}" data-field="Password" title="Copy password">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
              </svg>
            </button>
          </div>
        </div>

        ${cred.categoryName ? `<span class="card-category-badge">${escapeHtml(cred.categoryName)}</span>` : ''}
        ${cred.notes ? `<div class="card-notes">${escapeHtml(cred.notes)}</div>` : ''}
      </div>
    `;
  }

  function attachCardListeners() {
    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const cred = credentials.find(c => c.id === id);
        if (cred) openCredentialModal(cred);
      });
    });

    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        deletingCredentialId = btn.getAttribute('data-id');
        document.getElementById('deleteName').textContent = btn.getAttribute('data-name');
        document.getElementById('deleteModal').classList.remove('hidden');
      });
    });

    // Copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        copyToClipboard(btn.getAttribute('data-copy'), btn.getAttribute('data-field'));
      });
    });

    // Copy password buttons
    document.querySelectorAll('.copy-pw-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        copyToClipboard(btn.getAttribute('data-password'), btn.getAttribute('data-field'));
      });
    });

    // Reveal password buttons
    document.querySelectorAll('.reveal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const display = btn.parentElement.querySelector('.password-display');
        const isRevealed = display.getAttribute('data-revealed') === 'true';
        if (isRevealed) {
          display.textContent = '•'.repeat(Math.min(12, display.getAttribute('data-password').length));
          display.classList.add('password-dots');
          display.setAttribute('data-revealed', 'false');
        } else {
          display.textContent = display.getAttribute('data-password');
          display.classList.remove('password-dots');
          display.setAttribute('data-revealed', 'true');
        }
      });
    });
  }

  // ==================== CREDENTIAL MODAL ====================

  function openCredentialModal(cred = null) {
    editingCredentialId = cred ? cred.id : null;
    document.getElementById('modalTitle').textContent = cred ? 'Edit Credential' : 'Add Credential';

    document.getElementById('credSiteName').value = cred ? cred.siteName : '';
    document.getElementById('credUrl').value = cred ? cred.url : '';
    document.getElementById('credUsername').value = cred ? cred.username : '';
    document.getElementById('credPassword').value = cred ? cred.password : '';
    document.getElementById('credNotes').value = cred ? cred.notes : '';
    document.getElementById('credId').value = cred ? cred.id : '';
    document.getElementById('generatorPanel').classList.add('hidden');

    // Update strength meter
    updateStrengthMeter('credStrength', cred ? cred.password : '');

    // Populate category dropdown
    const select = document.getElementById('credCategory');
    select.innerHTML = '<option value="">No category</option>';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      if (cred && cred.categoryId === cat.id) option.selected = true;
      select.appendChild(option);
    });

    document.getElementById('credentialModal').classList.remove('hidden');
    document.getElementById('credSiteName').focus();
  }

  function closeCredentialModal() {
    document.getElementById('credentialModal').classList.add('hidden');
    editingCredentialId = null;
  }

  async function handleSaveCredential(e) {
    e.preventDefault();

    const data = {
      siteName: document.getElementById('credSiteName').value,
      url: document.getElementById('credUrl').value,
      username: document.getElementById('credUsername').value,
      password: document.getElementById('credPassword').value,
      notes: document.getElementById('credNotes').value,
      categoryId: document.getElementById('credCategory').value || null,
    };

    try {
      if (editingCredentialId) {
        await API.put(`/api/credentials/${editingCredentialId}`, data);
        showToast('Credential updated', 'success');
      } else {
        await API.post('/api/credentials', data);
        showToast('Credential saved', 'success');
      }
      closeCredentialModal();
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ==================== DELETE ====================

  function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    deletingCredentialId = null;
  }

  async function handleDeleteCredential() {
    if (!deletingCredentialId) return;
    try {
      await API.delete(`/api/credentials/${deletingCredentialId}`);
      showToast('Credential deleted', 'success');
      closeDeleteModal();
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ==================== CATEGORIES ====================

  function renderCategories() {
    // Keep "All Items" as first entry
    const dynamicItems = categories.map(cat => {
      const count = credentials.filter(c => c.categoryId === cat.id).length;
      const isActive = activeCategory === cat.id ? 'active' : '';
      return `
        <li class="category-item ${isActive}" data-category="${cat.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"></path></svg>
          <span>${escapeHtml(cat.name)}</span>
          <span class="category-count">${count}</span>
        </li>
      `;
    }).join('');

    // Set the "All Items" count
    allCountEl.textContent = credentials.length;

    // Update active state on "All Items"
    const allItem = categoryListEl.querySelector('[data-category="all"]');
    if (allItem) {
      allItem.className = `category-item ${activeCategory === 'all' ? 'active' : ''}`;
    }

    // Remove old dynamic items and add new ones
    categoryListEl.querySelectorAll('[data-category]:not([data-category="all"])').forEach(el => el.remove());
    categoryListEl.insertAdjacentHTML('beforeend', dynamicItems);

    // Attach click listeners
    categoryListEl.querySelectorAll('.category-item').forEach(item => {
      item.addEventListener('click', () => {
        activeCategory = item.getAttribute('data-category');
        renderCategories();
        renderCredentials();

        // Close sidebar on mobile
        document.getElementById('sidebar').classList.remove('open');
      });
    });
  }

  function openCategoryModal(cat = null) {
    document.getElementById('categoryModalTitle').textContent = cat ? 'Edit Category' : 'Add Category';
    document.getElementById('categoryName').value = cat ? cat.name : '';
    document.getElementById('categoryId').value = cat ? cat.id : '';
    document.getElementById('categoryModal').classList.remove('hidden');
    document.getElementById('categoryName').focus();
  }

  function closeCategoryModal() {
    document.getElementById('categoryModal').classList.add('hidden');
  }

  async function handleSaveCategory(e) {
    e.preventDefault();
    const name = document.getElementById('categoryName').value;
    const id = document.getElementById('categoryId').value;

    try {
      if (id) {
        await API.put(`/api/categories/${id}`, { name });
        showToast('Category updated', 'success');
      } else {
        await API.post('/api/categories', { name });
        showToast('Category created', 'success');
      }
      closeCategoryModal();
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ==================== PASSWORD GENERATOR ====================

  async function handleGeneratePassword() {
    const options = {
      length: parseInt(document.getElementById('genLength').value),
      uppercase: document.getElementById('genUppercase').checked,
      lowercase: document.getElementById('genLowercase').checked,
      digits: document.getElementById('genDigits').checked,
      symbols: document.getElementById('genSymbols').checked,
    };

    try {
      const result = await API.post('/api/generate-password', options);
      document.getElementById('credPassword').value = result.password;
      updateStrengthMeter('credStrength', result.password);
      showToast(`Generated ${result.strength.label.toLowerCase()} password`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ==================== IMPORT/EXPORT ====================

  async function handleExport() {
    try {
      const response = await fetch('/api/credentials/export', { credentials: 'same-origin' });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vaultguard_export.csv';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Credentials exported', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleImport(e) {
    e.preventDefault();
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const result = await API.post('/api/credentials/import', { csvData: event.target.result });
        showToast(result.message, 'success');
        document.getElementById('importModal').classList.add('hidden');
        fileInput.value = '';
        await loadData();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  // ==================== AUTH ====================

  async function handleLogout() {
    try {
      await API.post('/api/auth/logout');
      window.location.href = '/';
    } catch {
      window.location.href = '/';
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmNewPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    try {
      const result = await API.put('/api/account/change-password', { currentPassword, newPassword });
      showToast(result.message, 'success');
      document.getElementById('changePasswordForm').reset();
      document.getElementById('settingsModal').classList.add('hidden');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleDeleteAccount() {
    if (!confirm('Are you absolutely sure? This will permanently delete your account and ALL stored credentials. This cannot be undone.')) {
      return;
    }
    try {
      await API.delete('/api/account');
      window.location.href = '/';
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ==================== SESSION TIMEOUT ====================

  function setupSessionTimeout() {
    resetSessionTimeout();
  }

  function resetSessionTimeout() {
    clearTimeout(sessionWarningTimer);
    clearTimeout(sessionTimeoutTimer);

    const warningMs = (sessionTimeoutMinutes - 2) * 60 * 1000;
    const timeoutMs = sessionTimeoutMinutes * 60 * 1000;

    if (warningMs > 0) {
      sessionWarningTimer = setTimeout(() => {
        document.getElementById('timeoutWarning').classList.remove('hidden');
      }, warningMs);
    }

    sessionTimeoutTimer = setTimeout(async () => {
      try { await API.post('/api/auth/logout'); } catch {}
      window.location.href = '/';
    }, timeoutMs);

    document.getElementById('timeoutWarning').classList.add('hidden');
  }
})();
