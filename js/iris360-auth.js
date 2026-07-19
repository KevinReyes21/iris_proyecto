// ============================================================
// IRIS360 — Autenticación de cliente (Supabase)
// ============================================================
// Solo maneja login / logout / sesión.
// La carga de esferas (R2) se conecta en un paso posterior,
// usando el contenedor #visor-iris360 como punto de entrada
// y el email/UID del usuario para resolver qué esferas le
// corresponden.
// ============================================================

(function () {

  const loginWrapper = document.getElementById('login-wrapper');
  const clientePanel  = document.getElementById('cliente-panel');
  const clienteEmail  = document.getElementById('cliente-email');

  const form      = document.getElementById('login-form');
  const emailIn   = document.getElementById('login-email');
  const passIn    = document.getElementById('login-password');
  const loginBtn  = document.getElementById('login-btn');
  const msgEl     = document.getElementById('login-msg');
  const logoutBtn = document.getElementById('logout-btn');

  // ── Config sin llenar todavía ──
  const configPendiente =
    !window.IRIS360_SUPABASE_URL ||
    IRIS360_SUPABASE_URL.includes('TU-PROYECTO') ||
    !window.IRIS360_SUPABASE_ANON_KEY ||
    IRIS360_SUPABASE_ANON_KEY.includes('TU_ANON_KEY');

  if (configPendiente) {
    setMsg('Configuración de Supabase pendiente (js/iris360-config.js).', 'error');
    if (loginBtn) loginBtn.disabled = true;
    return;
  }

  if (!window.supabase || !window.supabase.createClient) {
    setMsg('No se pudo cargar el SDK de Supabase.', 'error');
    return;
  }

  const client = window.supabase.createClient(
    IRIS360_SUPABASE_URL,
    IRIS360_SUPABASE_ANON_KEY
  );

  // ============================================================
  // UI helpers
  // ============================================================
  function setMsg(text, type) {
    if (!msgEl) return;
    msgEl.textContent = text || '';
    msgEl.className = 'login-msg' + (type ? ' ' + type : '');
  }

  function mostrarPanelCliente(session) {
    loginWrapper.style.display = 'none';
    clientePanel.classList.add('activo');
    if (clienteEmail) clienteEmail.textContent = session?.user?.email || '—';

    window.IRIS360_cargarProyectos(client, session);

    // window.dispatchEvent(new CustomEvent('iris360:login', { detail: { session } }));
  }

  function mostrarLogin() {
    clientePanel.classList.remove('activo');
    loginWrapper.style.display = '';
    setMsg('');
    if (form) form.reset();
  }

  function traducirError(msg) {
    if (!msg) return 'Ocurrió un error. Intenta de nuevo.';
    if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
    if (msg.includes('Email not confirmed')) return 'Cuenta pendiente de confirmación.';
    return msg;
  }

  // ============================================================
  // Sesión existente al cargar la página
  // ============================================================
  client.auth.getSession().then(({ data }) => {
    if (data?.session) {
      mostrarPanelCliente(data.session);
    }
  });

  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      mostrarPanelCliente(session);
    } else if (event === 'SIGNED_OUT') {
      mostrarLogin();
    }
  });

  // ============================================================
  // Login
  // ============================================================
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = emailIn.value.trim();
      const password = passIn.value;

      if (!email || !password) {
        setMsg('Completa correo y contraseña.', 'error');
        return;
      }

      loginBtn.disabled = true;
      loginBtn.textContent = 'Entrando...';
      setMsg('');

      const { data, error } = await client.auth.signInWithPassword({ email, password });

      loginBtn.disabled = false;
      loginBtn.textContent = 'Entrar';

      if (error) {
        setMsg(traducirError(error.message), 'error');
        return;
      }

      setMsg('Acceso correcto.', 'success');
      mostrarPanelCliente(data.session);
    });
  }

  // ============================================================
  // Logout
  // ============================================================
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await client.auth.signOut();
    });
  }

})();