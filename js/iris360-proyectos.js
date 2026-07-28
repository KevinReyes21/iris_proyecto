// ============================================================
// IRIS360 — Selector de proyectos del cliente
// ============================================================
// Se ejecuta después del login. Consulta qué proyectos tiene
// vinculados el usuario (via RLS) y los pinta como tarjetas.
// Al elegir un proyecto, dispara 'iris360:proyecto-elegido'
// con el r2_prefix — ese evento es el punto de enganche para
// cargar el visor con R2 en el siguiente paso.
// ============================================================

window.IRIS360_cargarProyectos = async function (client, session) {
  const cont = document.getElementById('proyectos-lista');
  if (!cont) return;

  cont.innerHTML = '<p class="login-sub">Cargando tus proyectos...</p>';

  const { data, error } = await client
    .from('usuario_proyectos')
    .select('proyectos ( id, nombre, r2_prefix, logo_url )')
    .eq('user_id', session.user.id);

  if (error) {
    cont.innerHTML = '<p class="login-msg error">No se pudieron cargar tus proyectos.</p>';
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    cont.innerHTML = '<p class="login-sub">Aún no tienes proyectos asignados. Contáctanos.</p>';
    return;
  }

  cont.innerHTML = '';
  data.forEach(({ proyectos }) => {
    if (!proyectos) return;
    const card = document.createElement('div');
    card.className = 'proyecto-card';
    card.innerHTML = `<h4>${proyectos.nombre}</h4><span>Ver recorrido →</span>`;
    card.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('iris360:proyecto-elegido', {
        detail: { id: proyectos.id, nombre: proyectos.nombre, r2_prefix: proyectos.r2_prefix, logo_url: proyectos.logo_url }
      }));
    });
    cont.appendChild(card);
  });
};