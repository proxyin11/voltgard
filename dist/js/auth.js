/**
 * VaultGuard - Auth Page Logic
 */
(function () {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const showRegisterLink = document.getElementById('showRegister');
  const showLoginLink = document.getElementById('showLogin');
  const authMessage = document.getElementById('authMessage');

  // Check if already authenticated
  checkAuth();

  // Toggle between login/register
  showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    hideMessage();
  });

  showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
    hideMessage();
  });

  // Setup password toggles
  setupPasswordToggles();

  // Password strength on register
  const registerPasswordInput = document.getElementById('registerPassword');
  registerPasswordInput.addEventListener('input', () => {
    updateStrengthMeter('registerStrength', registerPasswordInput.value);
  });

  // Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const masterPassword = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');

    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Signing in...';

    try {
      await API.post('/api/auth/login', { email, masterPassword });
      window.location.href = '/vault';
    } catch (err) {
      showMessage(err.message, 'error');
      btn.classList.remove('loading');
      btn.textContent = 'Sign In';
    }
  });

  // Register
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const masterPassword = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const btn = document.getElementById('registerBtn');

    if (masterPassword !== confirmPassword) {
      showMessage('Passwords do not match.', 'error');
      return;
    }

    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Creating account...';

    try {
      await API.post('/api/auth/register', { email, masterPassword });
      showMessage('Account created! Please sign in.', 'success');
      registerForm.classList.remove('active');
      loginForm.classList.add('active');
      document.getElementById('loginEmail').value = email;
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      btn.classList.remove('loading');
      btn.textContent = 'Create Account';
    }
  });

  async function checkAuth() {
    try {
      const data = await API.get('/api/auth/status');
      if (data.authenticated) {
        window.location.href = '/vault';
      }
    } catch {
      // Not authenticated, stay on login page
    }
  }

  window.handleGoogleSSO = async function () {
    const ssoEmail = prompt("Enter your Google Account email:", "user@gmail.com");
    if (!ssoEmail) return;

    try {
      await API.post('/api/auth/sso/google', { email: ssoEmail });
      window.location.href = '/vault';
    } catch (err) {
      showMessage(err.message || 'Google SSO failed.', 'error');
    }
  };

  window.handleAppleSSO = async function () {
    const ssoEmail = prompt("Enter your Apple ID email:", "user@privaterelay.appleid.com");
    if (!ssoEmail) return;

    try {
      await API.post('/api/auth/sso/apple', { email: ssoEmail });
      window.location.href = '/vault';
    } catch (err) {
      showMessage(err.message || 'Apple SSO failed.', 'error');
    }
  };

  function showMessage(text, type) {
    authMessage.textContent = text;
    authMessage.className = `auth-message ${type}`;
  }

  function hideMessage() {
    authMessage.textContent = '';
    authMessage.className = 'auth-message';
  }
})();
