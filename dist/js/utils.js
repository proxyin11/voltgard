/**
 * VaultGuard - Shared Utilities
 */

const API = {
  async request(url, options = {}) {
    const defaults = {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    };
    const config = { ...defaults, ...options };
    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }
    
    const response = await fetch(url, config);
    
    // Handle CSV export (blob response)
    if (response.headers.get('content-type')?.includes('text/csv')) {
      return { ok: true, blob: await response.blob() };
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    
    return data;
  },

  get: (url) => API.request(url),
  post: (url, body) => API.request(url, { method: 'POST', body }),
  put: (url, body) => API.request(url, { method: 'PUT', body }),
  delete: (url) => API.request(url, { method: 'DELETE' }),
};

/**
 * Show toast notification.
 */
function showToast(message, type = 'success', duration = 3000) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  
  toast.className = `toast ${type}`;
  toastMessage.textContent = message;
  toast.classList.remove('hidden');
  
  clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, duration);
}

/**
 * Calculate password strength client-side.
 */
function calculatePasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };

  let score = 0;
  const len = password.length;

  // Length scoring
  if (len >= 8) score += 15;
  if (len >= 12) score += 15;
  if (len >= 16) score += 10;
  if (len >= 20) score += 10;

  // Character diversity
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;

  // Uniqueness bonus
  const uniqueChars = new Set(password).size;
  if (uniqueChars > len * 0.7) score += 5;

  score = Math.min(100, score);

  let label, color;
  if (score >= 80) { label = 'Very Strong'; color = 'var(--strength-strong)'; }
  else if (score >= 60) { label = 'Strong'; color = 'var(--strength-strong)'; }
  else if (score >= 40) { label = 'Moderate'; color = 'var(--strength-moderate)'; }
  else if (score >= 20) { label = 'Weak'; color = 'var(--strength-weak)'; }
  else { label = 'Very Weak'; color = 'var(--strength-weak)'; }

  return { score, label, color };
}

/**
 * Update a strength meter element.
 */
function updateStrengthMeter(meterId, password) {
  const meter = document.getElementById(meterId);
  if (!meter) return;

  const { score, label, color } = calculatePasswordStrength(password);
  const fill = meter.querySelector('.strength-fill');
  const labelEl = meter.querySelector('.strength-label');

  fill.style.width = `${score}%`;
  fill.style.background = color;
  labelEl.textContent = label;
  labelEl.style.color = color;
}

/**
 * Copy text to clipboard.
 */
async function copyToClipboard(text, fieldName = 'Text') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`${fieldName} copied to clipboard`, 'success');
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast(`${fieldName} copied to clipboard`, 'success');
  }
}

/**
 * Setup toggle password visibility buttons.
 */
function setupPasswordToggles() {
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input.type === 'password') {
        input.type = 'text';
        btn.classList.add('active');
      } else {
        input.type = 'password';
        btn.classList.remove('active');
      }
    });
  });
}

/**
 * Escape HTML entities.
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Get favicon initial from site name.
 */
function getInitial(siteName) {
  return (siteName || '?').charAt(0).toUpperCase();
}
