const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function confirmarApp(mensaje, opciones = {}) {
  return new Promise((resolve) => {
    document.getElementById('confirmar-mensaje').textContent = mensaje;
    const modal = document.getElementById('modal-confirmar');
    const btnAceptar = document.getElementById('btn-confirmar-aceptar');
    const btnCancelar = document.getElementById('btn-confirmar-cancelar');
    btnAceptar.textContent = opciones.textoAceptar || 'Confirmar';
    btnAceptar.className = opciones.peligro ? 'btn btn-peligro' : 'btn';
    const cerrar = (resultado) => {
      modal.classList.add('oculto');
      btnAceptar.onclick = null;
      btnCancelar.onclick = null;
      resolve(resultado);
    };
    btnAceptar.onclick = () => cerrar(true);
    btnCancelar.onclick = () => cerrar(false);
    modal.classList.remove('oculto');
  });
}

let NEGOCIO_NOMBRE = 'La Españita';
let NEGOCIO_DIRECCION = 'Av. Francia 512 - Valparaíso';
let NOMBRE_APP = 'La Españita';
let negocioTelefono = '';
let turnoActivo = '1';

async function cargarConfiguracion() {
  const { data } = await sb.from('configuracion').select('clave, valor')
    .in('clave', ['telefono', 'turno_activo', 'nombre_negocio', 'direccion_negocio', 'nombre_app']);
  negocioTelefono = data?.find(d => d.clave === 'telefono')?.valor || '';
  turnoActivo = data?.find(d => d.clave === 'turno_activo')?.valor || '1';
  NEGOCIO_NOMBRE = data?.find(d => d.clave === 'nombre_negocio')?.valor || NEGOCIO_NOMBRE;
  NEGOCIO_DIRECCION = data?.find(d => d.clave === 'direccion_negocio')?.valor || NEGOCIO_DIRECCION;
  NOMBRE_APP = data?.find(d => d.clave === 'nombre_app')?.valor || NOMBRE_APP;
  const input = document.getElementById('config-telefono');
  if (input) input.value = negocioTelefono;
  const inputNombre = document.getElementById('config-nombre-negocio');
  if (inputNombre) inputNombre.value = NEGOCIO_NOMBRE;
  const inputDireccion = document.getElementById('config-direccion-negocio');
  if (inputDireccion) inputDireccion.value = NEGOCIO_DIRECCION;
  const inputNombreApp = document.getElementById('config-nombre-app');
  if (inputNombreApp) inputNombreApp.value = NOMBRE_APP;
  aplicarNombreApp();
  actualizarBotonTurno();
}

function aplicarNombreApp() {
  const tituloApp = document.getElementById('titulo-app-nombre');
  if (tituloApp) tituloApp.textContent = NOMBRE_APP;
  const subtituloAdmin = document.getElementById('subtitulo-admin-nombre');
  if (subtituloAdmin) subtituloAdmin.textContent = NOMBRE_APP;
}

document.getElementById('form-nombre-app').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = document.getElementById('config-nombre-app').value.trim() || NOMBRE_APP;
  const { error } = await sb.from('configuracion').upsert({ clave: 'nombre_app', valor: nombre }, { onConflict: 'clave' });
  const mensaje = document.getElementById('config-nombre-app-msg');
  if (error) {
    mensaje.textContent = '✕ No se pudo guardar: ' + error.message;
    mensaje.classList.add('mensaje-error');
    mensaje.classList.remove('oculto');
    return;
  }
  NOMBRE_APP = nombre;
  aplicarNombreApp();
  mensaje.textContent = '✓ Guardado';
  mensaje.classList.remove('mensaje-error', 'oculto');
  setTimeout(() => mensaje.classList.add('oculto'), 2500);
});

function actualizarBotonTurno() {
  const boton = document.getElementById('btn-turno');
  if (boton) boton.textContent = `Turno ${turnoActivo}`;
}

async function toggleTurno() {
  const siguienteTurno = turnoActivo === '1' ? '2' : '1';
  if (!(await confirmarApp(`¿Cambiar a Turno ${siguienteTurno}?`))) return;
  turnoActivo = siguienteTurno;
  actualizarBotonTurno();
  await sb.from('configuracion').update({ valor: turnoActivo }).eq('clave', 'turno_activo');
}

document.getElementById('form-telefono-negocio').addEventListener('submit', async (e) => {
  e.preventDefault();
  const telefono = document.getElementById('config-telefono').value.trim();
  const nombre = document.getElementById('config-nombre-negocio').value.trim() || NEGOCIO_NOMBRE;
  const direccion = document.getElementById('config-direccion-negocio').value.trim() || NEGOCIO_DIRECCION;
  const { error } = await sb.from('configuracion').upsert([
    { clave: 'telefono', valor: telefono },
    { clave: 'nombre_negocio', valor: nombre },
    { clave: 'direccion_negocio', valor: direccion },
  ], { onConflict: 'clave' });
  const mensaje = document.getElementById('config-guardado-msg');
  if (error) {
    mensaje.textContent = '✕ No se pudo guardar: ' + error.message;
    mensaje.classList.add('mensaje-error');
    mensaje.classList.remove('oculto');
    return;
  }
  negocioTelefono = telefono;
  NEGOCIO_NOMBRE = nombre;
  NEGOCIO_DIRECCION = direccion;
  mensaje.textContent = '✓ Guardado';
  mensaje.classList.remove('mensaje-error', 'oculto');
  setTimeout(() => mensaje.classList.add('oculto'), 2500);
});

let MENU = [];
let CATEGORIAS = ['Top20'];
let categoriasDb = [];
let TOP20_IDS = [];

async function cargarCategoriasYProductos() {
  const { data: cats } = await sb.from('categorias').select('*').order('orden');
  categoriasDb = cats || [];
  CATEGORIAS = ['Top20', ...categoriasDb.map(c => c.nombre)];

  const { data: productos } = await sb.from('productos').select('*').eq('visible', true).order('categoria_id').order('orden_categoria');
  const mapaCategorias = Object.fromEntries(categoriasDb.map(c => [c.id, c.nombre]));
  MENU = (productos || []).map(p => ({
    id: p.id,
    nombre: p.nombre,
    precio: p.precio,
    costo: p.costo,
    icono: p.icono,
    foto_url: p.foto_url,
    categoria: mapaCategorias[p.categoria_id],
    prepara_cocina: p.prepara_cocina,
  }));

  TOP20_IDS = (productos || [])
    .filter(p => p.top20)
    .sort((a, b) => (a.orden_top20 ?? 0) - (b.orden_top20 ?? 0))
    .map(p => p.id)
    .slice(0, 20);

  if (mesaActivaId) { renderListaMenu(); renderGaleriaMenu(); }
}

sb
  .channel('menu-cambios')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, cargarCategoriasYProductos)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'categorias' }, cargarCategoriasYProductos)
  .subscribe();

const USAR_TOP20_AUTOMATICO = false;
let top20AutomaticoIds = [];

async function cargarTop20Automatico() {
  const { data } = await sb.from('conteo_ventas').select('plato_id').order('veces_vendido', { ascending: false }).limit(20);
  top20AutomaticoIds = data ? data.map(r => r.plato_id) : [];
}

let mesas = [];
let mesaActivaId = null;
let categoriaActiva = 'Top20';

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  document.getElementById('login-error').textContent = error ? error.message : '';
});

async function cerrarSesion() {
  if (!(await confirmarApp('¿Cerrar sesión?'))) return;
  await sb.auth.signOut();
}

async function crearCuenta() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  if (!email || !password) {
    document.getElementById('login-error').textContent = 'Escribe correo y contraseña arriba, luego presiona "Crear cuenta"';
    return;
  }
  const { error } = await sb.auth.signUp({ email, password });
  document.getElementById('login-error').textContent = error ? error.message : 'Cuenta creada. Revisa tu correo si pide confirmación, luego presiona Entrar.';
}

let rolUsuario = null;
let usuarioActualId = null;

async function cargarRolUsuario(userId) {
  usuarioActualId = userId;
  const { data } = await sb.from('perfiles').select('rol, activo').eq('id', userId).single();
  rolUsuario = data?.rol || 'mesero';
  document.getElementById('btn-admin-dashboard').classList.toggle('oculto', rolUsuario === 'mesero');
  return data?.activo !== false;
}

function aplicarEstadoCuenta(cuentaActiva) {
  document.getElementById('vista-mesas').classList.toggle('oculto', !cuentaActiva);
  document.getElementById('vista-pendiente').classList.toggle('oculto', cuentaActiva);
  document.getElementById('barra-superior').classList.toggle('oculto', !cuentaActiva);
}

sb.auth.onAuthStateChange(async (_event, session) => {
  const haySesion = !!session;
  document.getElementById('vista-login').classList.toggle('oculto', haySesion);
  if (!haySesion) {
    document.getElementById('vista-mesas').classList.add('oculto');
    document.getElementById('vista-pendiente').classList.add('oculto');
    document.getElementById('barra-superior').classList.add('oculto');
    rolUsuario = null;
    usuarioActualId = null;
    return;
  }
  const cuentaActiva = await cargarRolUsuario(session.user.id);
  aplicarEstadoCuenta(cuentaActiva);
  if (cuentaActiva) {
    cargarMesas(); cargarCategoriasYProductos(); cargarConfiguracion(); cargarNotasRapidas(); cargarGastosRapidos();
  }
});

// Revalida rol/activo contra la base de datos aunque la sesion quede abierta
// muchas horas sin recargar (ej. la compu de caja siempre prendida) -- sin
// esto, un bloqueo o cambio de rol hecho por el dueño no se reflejaba hasta
// el proximo login.
const INTERVALO_REVISION_CUENTA_MS = 3 * 60 * 1000;

async function revisarCuentaActiva() {
  if (!usuarioActualId) return;
  const cuentaActiva = await cargarRolUsuario(usuarioActualId);
  aplicarEstadoCuenta(cuentaActiva);
}

setInterval(revisarCuentaActiva, INTERVALO_REVISION_CUENTA_MS);

async function cargarMesas() {
  const mesaAntes = mesaActivaId ? mesaActiva() : null;
  const teniaPedidoAntes = !!mesaAntes && mesaAntes.pedido.length > 0;
  const { data, error } = await sb.from('mesas').select('*').eq('visible', true).order('orden');
  if (error) { console.error(error); return; }
  mesas = data;
  if (mesaActivaId && !mesaActiva()) {
    cerrarModalMenu();
  } else if (mesaActivaId) {
    const mesaAhora = mesaActiva();
    if (teniaPedidoAntes && mesaAhora.pedido.length === 0) {
      // La mesa que tenia abierta se cobro/vacio desde otro dispositivo mientras
      // la miraba -- la vuelve a la grilla en vez de dejarla atascada con un
      // pedido vacio que ya no existe.
      cerrarModalMenu();
    } else {
      renderPedido();
    }
  }
  renderMesas();
  actualizarBadgeCuentasPendientes();
}

const UMBRAL_TICKET_OLVIDADO_MIN = 7;

function minutosDesde(fechaIso) {
  return Math.floor((Date.now() - new Date(fechaIso).getTime()) / 60000);
}

function actualizarBadgeCuentasPendientes() {
  const badge = document.getElementById('badge-cuentas-pendientes');
  if (badge) {
    const pendientes = mesas.filter(m => m.cuenta_solicitada).length;
    badge.classList.toggle('oculto', pendientes === 0);
    badge.textContent = `🔔 ${pendientes}`;
    badge.title = pendientes === 1 ? '1 mesa pide la cuenta' : `${pendientes} mesas piden la cuenta`;
  }
  const badgeTickets = document.getElementById('badge-tickets-olvidados');
  if (badgeTickets) {
    const olvidados = mesas.filter(m => m.ticket_impreso_en && minutosDesde(m.ticket_impreso_en) >= UMBRAL_TICKET_OLVIDADO_MIN).length;
    badgeTickets.classList.toggle('oculto', olvidados === 0);
    badgeTickets.textContent = `⏰ ${olvidados}`;
    badgeTickets.title = olvidados === 1
      ? '1 mesa tiene un ticket impreso hace rato y sigue sin cerrarse'
      : `${olvidados} mesas tienen un ticket impreso hace rato y siguen sin cerrarse`;
  }
}

sb
  .channel('mesas-cambios')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, cargarMesas)
  .subscribe();

// Respaldo por si el canal en tiempo real se desconecta en silencio (pasa con
// WebSockets que quedan abiertos muchas horas, ej. la compu de caja siempre
// prendida) -- sin esto, avisos como "pedir cuenta" podrian no llegar nunca
// hasta recargar la pagina a mano.
setInterval(() => { if (rolUsuario) cargarMesas(); }, 20000);

function totalMesa(mesa) {
  return mesa.pedido.reduce((s, i) => s + i.precio * i.cantidad, 0);
}

function formatoMoneda(n) {
  return '$' + n.toLocaleString('es-CO');
}

function formatoMonedaCompacto(n) {
  if (Math.abs(n) >= 10000000) {
    return '$' + (n / 1000000).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M';
  }
  return formatoMoneda(n);
}

function formatoDuracion(minutos) {
  if (minutos == null) return '—';
  const total = Math.round(minutos);
  const horas = Math.floor(total / 60);
  const mins = total % 60;
  return horas > 0 ? `${horas} h ${mins} min` : `${mins} min`;
}

function renderMesas() {
  const grid = document.getElementById('grid-mesas');
  grid.innerHTML = '';
  const esMeseroVista = rolUsuario === 'mesero';
  mesas.forEach(mesa => {
    const ocupada = mesa.pedido.length > 0;
    const btn = document.createElement('button');
    const minutosTicket = mesa.ticket_impreso_en ? minutosDesde(mesa.ticket_impreso_en) : null;
    const ticketOlvidado = minutosTicket !== null && minutosTicket >= UMBRAL_TICKET_OLVIDADO_MIN;
    btn.className = 'mesa' + (ocupada ? ' ocupada' : '') + (mesa.cuenta_solicitada ? ' pide-cuenta' : '') + (ticketOlvidado && !esMeseroVista ? ' ticket-olvidado' : '');
    const etiqueta = mesa.nombre || mesa.id;
    const esSoloNumero = /^\d+$/.test(String(etiqueta));
    const claseEtiqueta = mesa.nombre && !esSoloNumero ? 'numero-mesa etiqueta-texto' : 'numero-mesa';
    const detalleOcupada = rolUsuario === 'mesero' ? 'Ocupada' : formatoMoneda(totalMesa(mesa));
    const badgeTicket = (!esMeseroVista && minutosTicket !== null)
      ? `<span class="badge-ticket-pendiente${ticketOlvidado ? ' alerta' : ''}" title="Se imprimió el ticket hace ${minutosTicket} min y la mesa sigue sin cerrarse">${ticketOlvidado ? '⏰' : '🎫'} ${minutosTicket}m</span>`
      : '';
    btn.innerHTML = (mesa.cuenta_solicitada ? '<span class="badge-pide-cuenta">🔔</span>' : '') +
      badgeTicket +
      `<span class="${claseEtiqueta}">${etiqueta}</span>` +
      (ocupada ? `<small>${detalleOcupada}</small>` : '<small>Libre</small>');
    btn.onclick = () => abrirModalMenu(mesa.id);
    grid.appendChild(btn);
  });
}

let vistaModal = 'menu';
let itemExpandidoId = null;

function toggleExpandido(itemId) {
  itemExpandidoId = itemExpandidoId === itemId ? null : itemId;
  renderPedido();
}

async function pedirCuentaACaja() {
  const mesa = mesaActiva();
  if (!mesa) return;
  mesa.cuenta_solicitada = true;
  renderPedido();
  await sb.from('mesas').update({ cuenta_solicitada: true }).eq('id', mesa.id);
}

async function toggleTotalVisibleMesero() {
  const mesa = mesaActiva();
  if (!mesa) return;
  const nuevoValor = !mesa.total_visible_mesero;
  mesa.total_visible_mesero = nuevoValor;
  const datos = { total_visible_mesero: nuevoValor };
  if (nuevoValor && mesa.cuenta_solicitada) {
    mesa.cuenta_solicitada = false;
    datos.cuenta_solicitada = false;
  }
  renderPedido();
  await sb.from('mesas').update(datos).eq('id', mesa.id);
}

function abrirModalMenu(mesaId) {
  const mesaAbierta = mesas.find(m => m.id === mesaId);
  if (!mesaAbierta) return;
  mesaActivaId = mesaId;
  itemExpandidoId = null;
  categoriaActiva = 'Top20';
  vistaModal = mesaAbierta.pedido.length > 0 ? 'detalle' : 'menu';
  document.getElementById('titulo-mesa').textContent = mesaAbierta.nombre || `Mesa ${mesaId}`;
  if (USAR_TOP20_AUTOMATICO) cargarTop20Automatico().then(renderGaleriaMenu);
  renderListaMenu();
  renderPedido();
  document.getElementById('modal-menu').classList.remove('oculto');
  if (rolUsuario !== 'mesero' && mesaAbierta.cuenta_solicitada) {
    mesaAbierta.cuenta_solicitada = false;
    sb.from('mesas').update({ cuenta_solicitada: false }).eq('id', mesaId);
  }
}

function cerrarModalMenu() {
  document.getElementById('modal-menu').classList.add('oculto');
  mesaActivaId = null;
  window.scrollTo(0, 0);
}

function alternarVistaModal() {
  vistaModal = vistaModal === 'menu' ? 'detalle' : 'menu';
  if (vistaModal === 'menu') {
    categoriaActiva = 'Top20';
    renderListaMenu();
  }
  actualizarVistaModal();
}

function actualizarVistaModal() {
  const mesa = mesaActiva();
  if (!mesa) return;
  const enMenu = vistaModal === 'menu';
  document.getElementById('vista-menu-platos').classList.toggle('oculto', !enMenu);
  document.getElementById('tabs-menu').classList.toggle('oculto', !enMenu);
  document.getElementById('vista-detalle-mesa').classList.toggle('oculto', enMenu);
  const cantidadItems = mesa.pedido.reduce((s, i) => s + i.cantidad, 0);
  const fab = document.getElementById('btn-alternar-vista');
  fab.classList.toggle('oculto', !enMenu);
  fab.textContent = `🧾 Detalle (${cantidadItems})`;
}

function renderTabsMenu() {
  const tabs = document.getElementById('tabs-menu');
  tabs.innerHTML = '';
  CATEGORIAS.forEach(cat => {
    const btn = document.createElement('button');
    btn.textContent = cat;
    btn.className = cat === categoriaActiva ? 'activa' : '';
    btn.onclick = () => {
      categoriaActiva = cat;
      renderTabsMenu();
      renderGaleriaMenu();
      document.querySelector('#modal-menu .modal-caja').scrollTop = 0;
    };
    tabs.appendChild(btn);
  });
}

function renderGaleriaMenu() {
  const galeria = document.getElementById('galeria-menu');
  galeria.innerHTML = '';
  const mesa = mesaActiva();
  if (!mesa) return;
  const idsTop20 = (USAR_TOP20_AUTOMATICO && top20AutomaticoIds.length > 0) ? top20AutomaticoIds : TOP20_IDS;
  const platos = categoriaActiva === 'Top20'
    ? idsTop20.map(id => MENU.find(p => p.id === id)).filter(Boolean)
    : MENU.filter(p => p.categoria === categoriaActiva);
  platos.forEach(plato => {
    const enPedido = mesa.pedido.find(i => i.id === plato.id);
    const el = document.createElement('div');
    el.className = 'plato';
    const iconoHtml = plato.foto_url
      ? `<img src="${plato.foto_url}" alt="">`
      : (plato.icono || '🍽️');
    el.innerHTML = `
      ${enPedido ? `<span class="badge-cantidad">${enPedido.cantidad}</span>` : ''}
      <span class="icono">${iconoHtml}</span>
      <span class="nombre">${plato.nombre}</span>
      <span class="precio">${formatoMoneda(plato.precio)}</span>`;
    el.onclick = () => agregarPlato(plato.id);
    galeria.appendChild(el);
  });
}

function renderListaMenu() {
  renderTabsMenu();
  renderGaleriaMenu();
}

function mesaActiva() {
  return mesas.find(m => m.id === mesaActivaId);
}

async function guardarPedido(mesa) {
  const { error } = await sb.from('mesas').update({ pedido: mesa.pedido, abierta_en: mesa.abierta_en }).eq('id', mesa.id);
  if (error) { console.error(error); return false; }
  return true;
}

let avisoSyncPedidoMostrado = false;
async function sincronizarItemPedido(llamadaRpc) {
  try {
    const { error } = await llamadaRpc();
    if (error) throw error;
  } catch (err) {
    console.error(err);
    await cargarMesas();
    renderPedido();
    if (!avisoSyncPedidoMostrado) {
      avisoSyncPedidoMostrado = true;
      alert('Problema de conexión al guardar el pedido. Se restauró la última versión guardada del servidor — revisa la mesa antes de seguir.');
      setTimeout(() => { avisoSyncPedidoMostrado = false; }, 5000);
    }
  }
}

function limpiarSolicitudCuentaPorCambioPedido(mesa) {
  // Si el pedido crece despues de haber pedido la cuenta, esa solicitud quedo
  // desactualizada (hay algo nuevo por enviar a cocina) -- se limpia sola para
  // que "Enviar a cocina" vuelva a estar disponible.
  if (!mesa.cuenta_solicitada) return;
  mesa.cuenta_solicitada = false;
  sb.from('mesas').update({ cuenta_solicitada: false }).eq('id', mesa.id);
}

function agregarPlato(platoId) {
  const mesa = mesaActiva();
  if (!mesa) return;
  const plato = MENU.find(p => p.id === platoId);
  const item = mesa.pedido.find(i => i.id === platoId);
  if (mesa.pedido.length === 0 && !mesa.abierta_en) mesa.abierta_en = new Date().toISOString();
  if (item) item.cantidad++;
  else mesa.pedido.push({ id: plato.id, nombre: plato.nombre, precio: plato.precio, icono: plato.icono, foto_url: plato.foto_url, cantidad: 1 });
  limpiarSolicitudCuentaPorCambioPedido(mesa);
  renderPedido();
  sincronizarItemPedido(() => sb.rpc('agregar_item_pedido', {
    p_mesa_id: mesa.id, p_item_id: plato.id, p_nombre: plato.nombre,
    p_precio: plato.precio, p_icono: plato.icono || null, p_foto_url: plato.foto_url || null,
  }));
}

function cambiarCantidad(platoId, delta) {
  const mesa = mesaActiva();
  if (!mesa) return;
  const item = mesa.pedido.find(i => i.id === platoId);
  item.cantidad += delta;
  if (item.cantidad <= 0) mesa.pedido = mesa.pedido.filter(i => i.id !== platoId);
  else if (delta > 0) limpiarSolicitudCuentaPorCambioPedido(mesa);
  renderPedido();
  sincronizarItemPedido(() => sb.rpc('cambiar_cantidad_item_pedido', {
    p_mesa_id: mesa.id, p_item_id: platoId, p_delta: delta,
  }));
}

let notasRapidas = [];

async function cargarNotasRapidas() {
  const { data, error } = await sb.from('notas_rapidas').select('*').order('orden');
  if (error) { console.error(error); return; }
  notasRapidas = data;
  if (rolUsuario === 'dueno' && seccionActivaDashboard === 'config') renderNotasRapidasAdmin();
}

let gastosRapidos = [];

async function cargarGastosRapidos() {
  const { data, error } = await sb.from('gastos_rapidos').select('*').order('orden');
  if (error) { console.error(error); return; }
  gastosRapidos = data;
  if (rolUsuario === 'dueno' && seccionActivaDashboard === 'config') renderGastosRapidosAdmin();
  renderMenuGastosRapidos();
}

let itemNotaEditandoId = null;

function editarNotaItem(platoId) {
  const mesa = mesaActiva();
  if (!mesa) return;
  const item = mesa.pedido.find(i => i.id === platoId);
  if (!item) return;
  itemNotaEditandoId = platoId;
  document.getElementById('nota-item-titulo').textContent = `📝 Nota: ${item.nombre}`;
  document.getElementById('chips-notas-rapidas').innerHTML = notasRapidas
    .map(n => `<button type="button" class="chip-nota" onclick="agregarNotaRapida('${n.texto.replace(/'/g, "\\'")}')">${n.texto}</button>`)
    .join('');
  document.getElementById('campo-nota-item').value = item.nota || '';
  sincronizarChipsNota();
  document.getElementById('modal-nota-item').classList.remove('oculto');
}

function sincronizarChipsNota() {
  const actuales = document.getElementById('campo-nota-item').value.split(',').map(s => s.trim()).filter(Boolean);
  document.querySelectorAll('#chips-notas-rapidas .chip-nota').forEach(btn => {
    btn.classList.toggle('activa', actuales.includes(btn.textContent));
  });
}

function agregarNotaRapida(texto) {
  const campo = document.getElementById('campo-nota-item');
  const actuales = campo.value.split(',').map(s => s.trim()).filter(Boolean);
  const idx = actuales.indexOf(texto);
  if (idx >= 0) actuales.splice(idx, 1);
  else actuales.push(texto);
  campo.value = actuales.join(', ');
  sincronizarChipsNota();
}

function cerrarModalNota() {
  document.getElementById('modal-nota-item').classList.add('oculto');
  itemNotaEditandoId = null;
}

function guardarNotaItem() {
  const mesa = mesaActiva();
  if (!mesa || itemNotaEditandoId === null) return;
  const item = mesa.pedido.find(i => i.id === itemNotaEditandoId);
  if (!item) return;
  const notaLimpia = document.getElementById('campo-nota-item').value.trim();
  if (notaLimpia) item.nota = notaLimpia;
  else delete item.nota;
  const platoId = itemNotaEditandoId;
  cerrarModalNota();
  if (itemExpandidoId === platoId) itemExpandidoId = null;
  renderPedido();
  sincronizarItemPedido(() => sb.rpc('actualizar_nota_item_pedido', {
    p_mesa_id: mesa.id, p_item_id: platoId, p_nota: notaLimpia || null,
  }));
}

async function eliminarDelPedido(platoId) {
  const mesa = mesaActiva();
  if (!mesa) return;
  const item = mesa.pedido.find(i => i.id === platoId);
  if (!item) return;
  if (!(await confirmarApp(`¿Quitar "${item.nombre}" del pedido?`))) return;
  mesa.pedido = mesa.pedido.filter(i => i.id !== platoId);
  renderPedido();
  sincronizarItemPedido(() => sb.rpc('quitar_item_pedido', {
    p_mesa_id: mesa.id, p_item_id: platoId,
  }));
}

function renderPedido() {
  const mesa = mesaActiva();
  if (!mesa) return;
  const esMesero = rolUsuario === 'mesero';
  const ocultarMontos = esMesero && !mesa.total_visible_mesero;
  const cont = document.getElementById('lista-pedido');
  cont.innerHTML = '';
  mesa.pedido.forEach(item => {
    const subtotal = item.precio * item.cantidad;
    const expandido = item.id === itemExpandidoId;
    const el = document.createElement('div');
    el.className = 'item-pedido';
    el.onclick = () => toggleExpandido(item.id);
    const iconoItemHtml = item.foto_url ? `<img src="${item.foto_url}" alt="">` : (item.icono || '🍽️');
    const detalleTexto = ocultarMontos
      ? `Cantidad: ${item.cantidad}`
      : `${item.cantidad} x ${formatoMoneda(item.precio)}  Subtotal: ${formatoMoneda(subtotal)}`;
    el.innerHTML = `
      <span class="item-icono">${iconoItemHtml}</span>
      <div class="item-info">
        <span class="item-nombre">${item.nombre}</span>
        <span class="item-detalle">${detalleTexto}</span>
        ${item.nota ? `<span class="item-nota">📝 ${item.nota}</span>` : ''}
      </div>
      ${expandido ? `
      <div class="item-acciones" onclick="event.stopPropagation()">
        <button class="btn-icono" onclick="cambiarCantidad(${item.id}, -1)">−</button>
        <span class="item-cantidad-num">${item.cantidad}</span>
        <button class="btn-icono" onclick="cambiarCantidad(${item.id}, 1)">+</button>
        <button class="btn-icono" onclick="editarNotaItem(${item.id})" title="Nota">📝</button>
        <button class="btn-icono btn-eliminar" onclick="eliminarDelPedido(${item.id})" title="Quitar">🗑️</button>
      </div>` : ''}`;
    cont.appendChild(el);
  });
  const total = totalMesa(mesa);
  const propina = Math.round(total * 0.10);
  document.getElementById('total-pedido').textContent = formatoMoneda(total);
  document.getElementById('propina-pedido').textContent = formatoMoneda(propina);
  document.getElementById('total-con-propina').textContent = formatoMoneda(total + propina);
  document.getElementById('resumen-total').classList.toggle('oculto', ocultarMontos);
  document.getElementById('btn-cobrar').classList.toggle('oculto', esMesero);
  document.getElementById('btn-imprimir-ticket').classList.toggle('oculto', esMesero);
  const sinCierreEnCurso = !mesa.cuenta_solicitada && !mesa.total_visible_mesero;
  const hayPendienteCocina = itemsPendientesCocina(mesa).length > 0;
  // "Enviar a cocina" solo depende de si hay algo pendiente -- si piden la
  // cuenta y despues agregan un producto mas, tiene que poder enviarse igual.
  document.getElementById('btn-comanda-cocina').classList.toggle('oculto', !hayPendienteCocina);
  document.getElementById('btn-pedir-cuenta').classList.toggle('oculto', !esMesero || !sinCierreEnCurso || hayPendienteCocina);
  document.getElementById('aviso-cuenta-solicitada').classList.toggle('oculto', !esMesero || !mesa.cuenta_solicitada);
  document.getElementById('aviso-cuenta-para-caja').classList.toggle('oculto', esMesero || !mesa.cuenta_solicitada);
  const btnMostrarTotal = document.getElementById('btn-mostrar-total-mesero');
  btnMostrarTotal.classList.toggle('oculto', esMesero || (!mesa.cuenta_solicitada && !mesa.total_visible_mesero));
  btnMostrarTotal.textContent = mesa.total_visible_mesero ? '🙈 Ocultar total al mesero' : '👁️ Mostrar total al mesero';
  actualizarVistaModal();
  renderGaleriaMenu();
}

let cobroEnProceso = false;

function mostrarPanelMetodoPago() {
  const mesa = mesaActiva();
  if (!mesa) return;
  if (mesa.pedido.length === 0) {
    alert('La mesa no tiene pedidos.');
    return;
  }
  document.getElementById('panel-metodo-pago').classList.remove('oculto');
}

function ocultarPanelMetodoPago() {
  document.getElementById('panel-metodo-pago').classList.add('oculto');
}

const ETIQUETAS_METODO_PAGO = { efectivo: 'efectivo', tarjeta: 'tarjeta', transferencia: 'transferencia' };

let contextoAudioCobro = null;

function reproducirSonidoCobro(metodoPago) {
  try {
    if (!contextoAudioCobro) contextoAudioCobro = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = contextoAudioCobro;
    if (ctx.state === 'suspended') ctx.resume();

    // Cada metodo tiene su propio patron para reconocerlo sin mirar la pantalla.
    const patrones = {
      efectivo: [{ freq: 523, dur: 0.09 }, { freq: 659, dur: 0.09 }, { freq: 784, dur: 0.2 }],
      tarjeta: [{ freq: 880, dur: 0.11 }, { freq: 1318, dur: 0.22 }],
      transferencia: [{ freq: 700, dur: 0.08 }, { freq: 700, dur: 0.08, espera: 0.05 }],
    };
    const notas = patrones[metodoPago] || patrones.efectivo;
    let inicio = ctx.currentTime;
    notas.forEach(nota => {
      inicio += nota.espera || 0;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = nota.freq;
      gain.gain.setValueAtTime(0.85, inicio);
      gain.gain.exponentialRampToValueAtTime(0.001, inicio + nota.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(inicio);
      osc.stop(inicio + nota.dur + 0.02);
      inicio += nota.dur;
    });
  } catch (e) {
    // Sonido no disponible en este navegador/dispositivo -- no debe interrumpir el cobro.
  }
}

async function cerrarMesa(metodoPago) {
  const mesa = mesaActiva();
  if (!mesa) return;
  if (mesa.pedido.length === 0) {
    alert('La mesa no tiene pedidos.');
    return;
  }
  if (cobroEnProceso) return;

  const etiqueta = mesa.nombre || `Mesa ${mesa.id}`;
  const etiquetaMetodo = ETIQUETAS_METODO_PAGO[metodoPago] || 'un método sin especificar';
  if (!(await confirmarApp(`¿Cobrar ${etiqueta} por ${formatoMoneda(totalMesa(mesa))} en ${etiquetaMetodo}? Esta acción cierra la mesa.`))) return;

  ocultarPanelMetodoPago();
  cobroEnProceso = true;
  const btnCobrar = document.getElementById('btn-cobrar');
  if (btnCobrar) { btnCobrar.disabled = true; btnCobrar.textContent = 'Procesando...'; }

  try {
    const duracionMinutos = mesa.abierta_en
      ? Math.round((Date.now() - new Date(mesa.abierta_en).getTime()) / 60000)
      : null;

    const { data: venta, error } = await sb.from('ventas').insert({
      mesa_id: mesa.id, items: mesa.pedido, total: totalMesa(mesa), duracion_minutos: duracionMinutos, turno: Number(turnoActivo), metodo_pago: metodoPago
    }).select().single();

    if (error || !venta) {
      alert('No se pudo registrar el cobro (problema de conexión). El pedido no se perdió: vuelve a intentar "Cobrar".');
      return;
    }

    reproducirSonidoCobro(metodoPago);

    mesa.pedido.forEach(item => sb.rpc('incrementar_conteo', { p_id: item.id, cant: item.cantidad }));
    sb.rpc('descontar_inventario_venta', { p_items: mesa.pedido }).then(({ error }) => {
      if (error) console.error('No se pudo descontar el inventario:', error);
    });
    mesa.pedido = [];
    mesa.abierta_en = null;
    mesa.cuenta_solicitada = false;
    mesa.total_visible_mesero = false;
    mesa.comanda_cocina_enviada = {};
    mesa.ticket_impreso_en = null;
    await sb.from('mesas').update({ cuenta_solicitada: false, total_visible_mesero: false, comanda_cocina_enviada: {}, ticket_impreso_en: null }).eq('id', mesa.id);
    const mesaLimpiada = await guardarPedido(mesa);
    if (!mesaLimpiada) {
      alert('El cobro ya quedó registrado, pero no se pudo limpiar la mesa (problema de conexión). Ciérrala manualmente para no cobrarla dos veces.');
    }

    cerrarModalMenu();
  } catch (err) {
    alert('No se pudo registrar el cobro por un problema de conexión. El pedido no se perdió: vuelve a intentar "Cobrar".');
  } finally {
    cobroEnProceso = false;
    if (btnCobrar) { btnCobrar.disabled = false; btnCobrar.textContent = '💰 Cobrar'; }
  }
}

function itemsPendientesCocina(mesa) {
  const yaEnviado = mesa.comanda_cocina_enviada || {};
  const itemsDeCocina = mesa.pedido.filter(item => {
    const producto = MENU.find(p => p.id === item.id);
    return producto ? producto.prepara_cocina !== false : true;
  });
  // Solo lo nuevo desde el ultimo envio: si ya se mandaron 2 y ahora hay 3, se imprime solo 1.
  return itemsDeCocina
    .map(item => ({ ...item, cantidad: item.cantidad - (yaEnviado[item.id] || 0) }))
    .filter(item => item.cantidad > 0);
}

async function imprimirComandaCocina() {
  const mesa = mesaActiva();
  if (!mesa) return;
  if (mesa.pedido.length === 0) {
    alert('La mesa no tiene productos para enviar a cocina.');
    return;
  }
  const yaEnviado = mesa.comanda_cocina_enviada || {};
  const esActualizacion = Object.keys(yaEnviado).length > 0;
  const itemsCocina = itemsPendientesCocina(mesa);

  if (itemsCocina.length === 0) {
    alert(esActualizacion
      ? 'No hay productos nuevos para enviar a cocina — ya se enviaron todos los que hay en el pedido.'
      : 'Ningún producto de este pedido se prepara en cocina (por ejemplo, son solo bebidas embotelladas).');
    return;
  }
  const ahora = new Date();
  const hora = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const etiqueta = mesa.nombre || `Mesa ${mesa.id}`;

  const ANCHO = 32;
  const centrar = (linea) => {
    const relleno = Math.max(0, Math.floor((ANCHO - linea.length) / 2));
    return ' '.repeat(relleno) + linea;
  };
  const separador = '-'.repeat(ANCHO) + '\n';
  const BOLD_ON = '\x1B\x45\x01', BOLD_OFF = '\x1B\x45\x00';
  const FUENTE_B = '\x1B\x4D\x01', FUENTE_A = '\x1B\x4D\x00';

  let t = `${BOLD_ON}${centrar(esActualizacion ? 'ACTUALIZACION DE PEDIDO' : 'COMANDA DE COCINA')}${BOLD_OFF}\n`;
  t += separador;
  t += `${BOLD_ON}${centrar(`MESA: ${etiqueta}`)}${BOLD_OFF}\n`;
  t += `${FUENTE_B}${centrar(hora)}${FUENTE_A}\n`;
  t += separador;
  itemsCocina.forEach(item => {
    t += `${BOLD_ON}${item.cantidad}x  ${item.nombre}${BOLD_OFF}\n`;
    if (item.nota) t += `   » ${item.nota}\n`;
  });
  t += separador;

  const nuevoEstado = { ...yaEnviado };
  mesa.pedido.forEach(item => {
    const producto = MENU.find(p => p.id === item.id);
    if (producto ? producto.prepara_cocina !== false : true) nuevoEstado[item.id] = item.cantidad;
  });
  mesa.comanda_cocina_enviada = nuevoEstado;
  renderPedido();
  const { error } = await sb.from('mesas').update({ comanda_cocina_enviada: nuevoEstado }).eq('id', mesa.id);
  if (error) console.error('No se pudo guardar el estado de comanda enviada a cocina:', error);

  const textoCodificado = encodeURI(t);
  window.location.href = `intent:${textoCodificado}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
}

let reciboActual = null;

function renderRecibo({ pedido, numeroRecibo, etiquetaMesa, fecha, hora, total, esReimpresion, esPrevia, metodoPago }) {
  const propina = Math.round(total * 0.10);
  reciboActual = { pedido: [...pedido], numeroRecibo, fecha, hora, total, propina, etiquetaMesa, esReimpresion, esPrevia, metodoPago };

  const filasItems = pedido.map(item => `
    <div class="recibo-fila">
      <span>${item.nombre}${item.nota ? `<br><small>📝 ${item.nota}</small>` : ''}</span>
      <span>${item.cantidad} x ${formatoMoneda(item.precio)}</span>
    </div>`).join('');

  const lineaEncabezado = esPrevia
    ? 'CUENTA — aún no cobrada'
    : `Recibo N.° ${numeroRecibo ?? ''}${esReimpresion ? ' (REIMPRESIÓN)' : ''}`;

  document.getElementById('recibo').innerHTML = `
    <div class="recibo-nombre-negocio">${NEGOCIO_NOMBRE}</div>
    <div class="recibo-centrado">${NEGOCIO_DIRECCION}</div>
    <div class="recibo-centrado">${negocioTelefono}</div>
    <div class="recibo-mesa-grande">MESA : ${etiquetaMesa}</div>
    <hr>
    <div>${lineaEncabezado}</div>
    <div>${fecha} · ${hora}</div>
    ${metodoPago ? `<div>Método de pago: ${ETIQUETAS_METODO_PAGO[metodoPago] || metodoPago}</div>` : ''}
    <hr>
    ${filasItems}
    <hr>
    <div class="recibo-fila recibo-total-grande"><span>Total Consumo</span><span>${formatoMoneda(total)}</span></div>
    <hr>
    <div class="recibo-fila"><span>Propina sugerida (10%)</span><span>${formatoMoneda(propina)}</span></div>
    <div class="recibo-fila"><span>Total con propina</span><span>${formatoMoneda(total + propina)}</span></div>
    <hr>
    <div class="recibo-centrado">¡Gracias por tu visita!</div>
  `;
  document.getElementById('modal-recibo').classList.remove('oculto');
}

function mostrarRecibo(mesa, numeroRecibo) {
  const ahora = new Date();
  renderRecibo({
    pedido: mesa.pedido,
    numeroRecibo,
    etiquetaMesa: mesa.nombre || mesa.id,
    fecha: ahora.toLocaleDateString('es-CL'),
    hora: ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    total: totalMesa(mesa),
  });
}

async function mostrarCuentaPrevia() {
  const mesa = mesaActiva();
  if (!mesa) return;
  if (mesa.pedido.length === 0) {
    alert('La mesa no tiene pedidos.');
    return;
  }
  const ahora = new Date();
  renderRecibo({
    pedido: mesa.pedido,
    numeroRecibo: null,
    etiquetaMesa: mesa.nombre || mesa.id,
    fecha: ahora.toLocaleDateString('es-CL'),
    hora: ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    total: totalMesa(mesa),
    esPrevia: true,
  });

  mesa.ticket_impreso_en = ahora.toISOString();
  renderMesas();
  const { error } = await sb.from('mesas').update({ ticket_impreso_en: mesa.ticket_impreso_en }).eq('id', mesa.id);
  if (error) console.error('No se pudo guardar la hora del ticket impreso:', error);
}

function reimprimirVenta(ventaId) {
  const venta = ventasCache.find(v => v.id === ventaId);
  if (!venta) {
    alert('No se encontró esa venta — vuelve a cargar los reportes e intenta de nuevo.');
    return;
  }
  const fechaVenta = new Date(venta.creado_en);
  renderRecibo({
    pedido: venta.items || [],
    numeroRecibo: venta.id,
    etiquetaMesa: mapaMesasCache[venta.mesa_id] || `Mesa ${venta.mesa_id}`,
    fecha: fechaVenta.toLocaleDateString('es-CL'),
    hora: fechaVenta.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    total: Number(venta.total),
    esReimpresion: true,
    metodoPago: venta.metodo_pago,
  });
}

function cerrarRecibo() {
  document.getElementById('modal-recibo').classList.add('oculto');
}

function imprimirConRawBT() {
  if (!reciboActual) return;
  const r = reciboActual;
  const ANCHO = 32;
  const ANCHO_FUENTE_B = 42;
  const centrarEn = (linea, ancho) => {
    const relleno = Math.max(0, Math.floor((ancho - linea.length) / 2));
    return ' '.repeat(relleno) + linea;
  };
  const centrar = (linea) => centrarEn(linea, ANCHO);
  const centrarChico = (linea) => centrarEn(linea, ANCHO_FUENTE_B);
  const fila = (izquierda, derecha, ancho = ANCHO) => {
    const disponible = ancho - derecha.length;
    if (izquierda.length <= disponible - 1) return `${izquierda.padEnd(disponible)}${derecha}\n`;
    return `${izquierda}\n${derecha.padStart(ancho)}\n`;
  };
  const separador = '-'.repeat(ANCHO) + '\n';
  const BOLD_ON = '\x1B\x45\x01', BOLD_OFF = '\x1B\x45\x00';
  const FUENTE_B = '\x1B\x4D\x01', FUENTE_A = '\x1B\x4D\x00';

  let t = `${BOLD_ON}${centrar(NEGOCIO_NOMBRE)}${BOLD_OFF}\n`;
  t += `${FUENTE_B}${centrarChico(NEGOCIO_DIRECCION)}\n`;
  t += `${centrarChico(negocioTelefono)}${FUENTE_A}\n`;
  t += `${centrar(`MESA : ${r.etiquetaMesa}`)}\n`;
  t += separador;
  t += `${FUENTE_B}${r.esPrevia ? 'CUENTA - aun no cobrada' : ('Recibo N.° ' + (r.numeroRecibo ?? '') + (r.esReimpresion ? ' (REIMPRESION)' : ''))}\n`;
  t += `${r.fecha} · ${r.hora}\n`;
  if (r.metodoPago) t += `Metodo de pago: ${ETIQUETAS_METODO_PAGO[r.metodoPago] || r.metodoPago}\n`;
  t += `${FUENTE_A}`;
  t += separador;
  const MAX_NOMBRE_PRODUCTO = 18;
  r.pedido.forEach(item => {
    const nombreCorto = item.nombre.length > MAX_NOMBRE_PRODUCTO
      ? item.nombre.slice(0, MAX_NOMBRE_PRODUCTO - 1) + '…'
      : item.nombre;
    const cantidadPrecio = `${item.cantidad} x ${item.precio.toLocaleString('es-CO')}`;
    t += fila(nombreCorto, cantidadPrecio);
    if (item.nota) t += `${FUENTE_B}  » ${item.nota}${FUENTE_A}\n`;
  });
  t += separador;
  const MEDIO_ESPACIO = '\x1B\x4A\x0C';
  const soloNumero = (n) => n.toLocaleString('es-CO');
  t += `${BOLD_ON}${fila('Total Consumo $', soloNumero(r.total))}${BOLD_OFF}`;
  t += separador;
  t += MEDIO_ESPACIO;
  t += fila('Propina sugerida (10%) $', soloNumero(r.propina));
  t += fila('Total con propina $', soloNumero(r.total + r.propina));
  t += separador;
  t += centrar('¡Gracias por tu visita!');

  const textoCodificado = encodeURI(t);
  window.location.href = `intent:${textoCodificado}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
  cerrarRecibo();
}

function abrirDashboard() {
  if (rolUsuario !== 'admin' && rolUsuario !== 'cajero' && rolUsuario !== 'dueno') {
    alert('Esta sección es solo para administradores y cajeros.');
    return;
  }
  const esAdmin = rolUsuario === 'admin' || rolUsuario === 'dueno';
  const esDueno = rolUsuario === 'dueno';
  document.getElementById('modal-dashboard').classList.remove('oculto');
  ['top20', 'productos', 'insumos', 'orden', 'mesas', 'categorias'].forEach(s => {
    document.getElementById(`icono-admin-${s}`).classList.toggle('oculto', !esAdmin);
  });
  ['config', 'usuarios'].forEach(s => {
    document.getElementById(`icono-admin-${s}`).classList.toggle('oculto', !esDueno);
  });
  mostrarMenuAdmin();
  if (esAdmin) {
    cancelarEdicionMesa();
    cancelarEdicionProducto();
    cancelarEdicionCategoria();
    cancelarEdicionInsumo();
    cancelarConteo();
    cargarMesasAdmin();
    cargarInsumosAdmin().then(() => { cargarProductosAdmin(); poblarSelectInsumos(); cargarHistorialConteos(); cargarHistorialCompras(); });
    renderCategoriasAdmin();
    poblarSelectCategorias();
  }
}

function cerrarDashboard() {
  document.getElementById('modal-dashboard').classList.add('oculto');
}

let seccionActivaDashboard = 'mesas';

const TITULOS_SECCION_ADMIN = {
  metricas: '📊 Reportes',
  'reporte-caja': '🧾 Reporte de Caja',
  top20: '🏆 Top 20',
  productos: '🍔 Productos',
  insumos: '📦 Insumos',
  orden: '🔀 Orden Menú',
  mesas: '🪑 Mesas',
  categorias: '🗂️ Categorías',
  config: '⚙️ Ajustes',
  usuarios: '👥 Usuarios',
};

function mostrarMenuAdmin() {
  seccionActivaDashboard = null;
  document.getElementById('panel-admin-menu').classList.remove('oculto');
  document.getElementById('barra-volver-menu').classList.add('oculto');
  document.getElementById('filtros-reportes-fila').classList.add('oculto');
  const bloquePeriodo = document.getElementById('bloque-periodo');
  bloquePeriodo.classList.add('oculto');
  ['mesas', 'productos', 'insumos', 'categorias', 'top20', 'orden', 'metricas', 'config', 'usuarios', 'reporte-caja'].forEach(s => {
    document.getElementById(`seccion-admin-${s}`).classList.add('oculto');
  });
  document.getElementById('btn-guardar-flotante').classList.add('oculto');
  document.querySelector('#modal-dashboard .modal-caja').scrollTop = 0;
}

function mostrarSeccionDashboard(seccion) {
  seccionActivaDashboard = seccion;
  document.getElementById('panel-admin-menu').classList.add('oculto');
  document.getElementById('barra-volver-menu').classList.remove('oculto');
  document.getElementById('titulo-seccion-activa').textContent = TITULOS_SECCION_ADMIN[seccion] || '';
  ['mesas', 'productos', 'insumos', 'categorias', 'top20', 'orden', 'metricas', 'config', 'usuarios', 'reporte-caja'].forEach(s => {
    document.getElementById(`seccion-admin-${s}`).classList.toggle('oculto', s !== seccion);
  });
  document.querySelector('#modal-dashboard .modal-caja').scrollTop = 0;
  document.getElementById('filtros-reportes-fila').classList.toggle('oculto', seccion !== 'metricas');
  const bloquePeriodo = document.getElementById('bloque-periodo');
  bloquePeriodo.classList.toggle('oculto', seccion !== 'metricas' && bloquePeriodo.classList.contains('bloque-periodo-fijo'));
  const fab = document.getElementById('btn-guardar-flotante');
  fab.classList.toggle('oculto', seccion === 'categorias' || seccion === 'top20' || seccion === 'orden' || seccion === 'metricas' || seccion === 'config' || seccion === 'mesas' || seccion === 'usuarios' || seccion === 'insumos' || seccion === 'reporte-caja');
  if (seccion === 'top20') cargarTop20Admin();
  if (seccion === 'orden') cargarOrdenAdmin();
  if (seccion === 'metricas') { cargarMetricas(); cargarComparativas(); }
  if (seccion === 'usuarios') cargarUsuariosAdmin();
  if (seccion === 'config') { renderNotasRapidasAdmin(); renderGastosRapidosAdmin(); }
  if (seccion === 'reporte-caja') iniciarReporteCaja();
}

function guardarDesdeFlotante() {
  const formId = { productos: 'form-nuevo-producto' }[seccionActivaDashboard];
  if (formId) document.getElementById(formId).requestSubmit();
}

let periodoMetricas = 'hoy';
let turnoFiltro = 'ambos';

document.querySelectorAll('#tabs-periodo-metricas button').forEach(btn => {
  btn.onclick = () => {
    periodoMetricas = btn.dataset.periodo;
    document.querySelectorAll('#tabs-periodo-metricas button').forEach(b => b.classList.toggle('activa', b === btn));
    cargarMetricas();
  };
});

document.querySelectorAll('#tabs-turno-metricas button').forEach(btn => {
  btn.onclick = () => {
    turnoFiltro = btn.dataset.turno;
    document.querySelectorAll('#tabs-turno-metricas button').forEach(b => b.classList.toggle('activa', b === btn));
    cargarMetricas();
    cargarComparativas();
  };
});

function reubicarBloquePeriodo(vista) {
  const bloque = document.getElementById('bloque-periodo');
  if (vista === 'detalle') {
    document.getElementById('filtros-reportes-fila').insertAdjacentElement('afterend', bloque);
    bloque.classList.add('bloque-periodo-fijo');
  } else {
    document.getElementById('comparativas-rapidas').insertAdjacentElement('afterend', bloque);
    bloque.classList.remove('bloque-periodo-fijo');
  }
}

document.querySelectorAll('#tabs-vista-reportes button').forEach(btn => {
  btn.onclick = () => {
    const vista = btn.dataset.vista;
    document.querySelectorAll('#tabs-vista-reportes button').forEach(b => b.classList.toggle('activa', b === btn));
    document.getElementById('reportes-vista-general').classList.toggle('oculto', vista !== 'general');
    document.getElementById('reportes-vista-detalle').classList.toggle('oculto', vista !== 'detalle');
    reubicarBloquePeriodo(vista);
    document.querySelector('#modal-dashboard .modal-caja').scrollTop = 0;
  };
});

function inicioPeriodo(periodo) {
  const ahora = new Date();
  if (periodo === 'hoy') return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  if (periodo === 'semana') return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 6);
  if (periodo === 'mes') return new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  if (periodo === 'año') return new Date(ahora.getFullYear(), 0, 1);
  return null;
}

let ventasCache = [];
let mapaMesasCache = {};

async function cargarMetricas() {
  const desde = inicioPeriodo(periodoMetricas);
  let query = sb.from('ventas').select('id, mesa_id, items, total, creado_en, duracion_minutos, metodo_pago').order('creado_en', { ascending: true });
  if (desde) query = query.gte('creado_en', desde.toISOString());
  if (turnoFiltro !== 'ambos') query = query.eq('turno', Number(turnoFiltro));
  const [{ data }, { data: mesasData }] = await Promise.all([
    query,
    sb.from('mesas').select('id, nombre'),
  ]);
  const mapaMesas = Object.fromEntries((mesasData || []).map(m => [m.id, m.nombre || `Mesa ${m.id}`]));
  renderMetricas(data || [], mapaMesas);
}

function toggleColapso(contenidoId, tituloEl) {
  const contenido = document.getElementById(contenidoId);
  const colapsado = contenido.classList.toggle('oculto');
  tituloEl.classList.toggle('expandido', !colapsado);
}

function renderMetricas(ventas, mapaMesas) {
  const totalVendido = ventas.reduce((s, v) => s + Number(v.total), 0);
  const nVentas = ventas.length;
  const ticketPromedio = nVentas > 0 ? totalVendido / nVentas : 0;

  const duraciones = ventas.map(v => v.duracion_minutos).filter(d => d != null && d >= 0);
  const duracionPromedio = duraciones.length > 0 ? duraciones.reduce((s, d) => s + d, 0) / duraciones.length : null;

  const mapaProductos = Object.fromEntries(MENU.map(p => [p.id, p]));
  let ganancia = 0;
  const tallyProductos = {};
  const tallyCategorias = {};
  const tallyMesas = {};
  const tallyDiaSemana = {};
  const tallyHora = {};
  const tallyMetodoPago = {};

  ventas.forEach(v => {
    const etiquetaMesa = mapaMesas[v.mesa_id] || `Mesa ${v.mesa_id}`;
    if (!tallyMesas[v.mesa_id]) tallyMesas[v.mesa_id] = { etiqueta: etiquetaMesa, veces: 0, monto: 0 };
    tallyMesas[v.mesa_id].veces += 1;
    tallyMesas[v.mesa_id].monto += Number(v.total);

    const etiquetasMetodoReporte = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
    const metodoPago = etiquetasMetodoReporte[v.metodo_pago] || 'Sin especificar';
    tallyMetodoPago[metodoPago] = (tallyMetodoPago[metodoPago] || 0) + Number(v.total);

    const fecha = new Date(v.creado_en);
    const diaSemana = fecha.getDay();
    const fechaStr = v.creado_en.slice(0, 10);
    if (!tallyDiaSemana[diaSemana]) tallyDiaSemana[diaSemana] = { total: 0, fechas: new Set() };
    tallyDiaSemana[diaSemana].total += Number(v.total);
    tallyDiaSemana[diaSemana].fechas.add(fechaStr);

    const hora = fecha.getHours();
    if (!tallyHora[hora]) tallyHora[hora] = { total: 0, fechas: new Set() };
    tallyHora[hora].total += Number(v.total);
    tallyHora[hora].fechas.add(fechaStr);

    (v.items || []).forEach(item => {
      const producto = mapaProductos[item.id];
      const costo = producto ? Number(producto.costo || 0) : 0;
      ganancia += (Number(item.precio) - costo) * item.cantidad;

      if (!tallyProductos[item.id]) tallyProductos[item.id] = { nombre: item.nombre, cantidad: 0, monto: 0 };
      tallyProductos[item.id].cantidad += item.cantidad;
      tallyProductos[item.id].monto += item.precio * item.cantidad;

      const catNombre = (producto && producto.categoria) || 'Sin categoría';
      tallyCategorias[catNombre] = (tallyCategorias[catNombre] || 0) + item.precio * item.cantidad;
    });
  });

  document.getElementById('metrica-total-vendido').textContent = formatoMonedaCompacto(Math.round(totalVendido));
  document.getElementById('metrica-n-ventas').textContent = nVentas;
  document.getElementById('metrica-ticket-promedio').textContent = formatoMonedaCompacto(Math.round(ticketPromedio));
  document.getElementById('metrica-ganancia').textContent = formatoMonedaCompacto(Math.round(ganancia));
  document.getElementById('metrica-tiempo-mesa').textContent = formatoDuracion(duracionPromedio);

  const todasLasMesas = Object.values(tallyMesas).sort((a, b) => b.veces - a.veces);
  document.getElementById('metrica-mesa-top').textContent = todasLasMesas.length > 0 ? todasLasMesas[0].etiqueta : '—';
  document.getElementById('metrica-mesa-top-monto').textContent = todasLasMesas.length > 0
    ? `${formatoMoneda(Math.round(todasLasMesas[0].monto))} acum.`
    : '';
  document.getElementById('resumen-mesas-top').textContent = todasLasMesas.length > 0
    ? `${todasLasMesas[0].etiqueta} · ${todasLasMesas[0].veces} ${todasLasMesas[0].veces === 1 ? 'vez' : 'veces'} · ${formatoMoneda(Math.round(todasLasMesas[0].monto))}`
    : 'Sin ventas en este período';
  const topMesas = todasLasMesas.slice(0, 10);
  const listaMesas = document.getElementById('lista-mesas-metricas');
  listaMesas.innerHTML = topMesas.length === 0
    ? '<p class="texto-vacio">Sin ventas en este período</p>'
    : topMesas.map((m, i) => `
      <div class="fila-admin">
        <span class="miniatura">${i + 1}</span>
        <div class="info-admin">
          <strong>${m.etiqueta}</strong>
          <span>${m.veces} ${m.veces === 1 ? 'vez' : 'veces'} · ${formatoMoneda(Math.round(m.monto))}</span>
        </div>
      </div>`).join('');

  const horasOrdenadas = Object.entries(tallyHora)
    .map(([hora, h]) => ({ hora: Number(hora), promedio: h.total / h.fechas.size }))
    .sort((a, b) => a.hora - b.hora);
  const maxHora = horasOrdenadas.length > 0 ? Math.max(...horasOrdenadas.map(h => h.promedio)) : 0;
  const horaTop = horasOrdenadas.length > 0
    ? horasOrdenadas.reduce((max, h) => h.promedio > max.promedio ? h : max, horasOrdenadas[0])
    : null;
  document.getElementById('metrica-hora-top').textContent = horaTop ? `${String(horaTop.hora).padStart(2, '0')}:00` : '—';
  const graficoHora = document.getElementById('grafico-hora-metricas');
  graficoHora.innerHTML = horasOrdenadas.length === 0
    ? '<p class="texto-vacio">Sin ventas en este período</p>'
    : horasOrdenadas.map(h => `
      <div class="barra-dia" title="${formatoMoneda(Math.round(h.promedio))}">
        <div class="barra-dia-relleno" style="height:${maxHora ? (h.promedio / maxHora * 100) : 0}%"></div>
        <span class="barra-dia-etiqueta">${String(h.hora).padStart(2, '0')}h</span>
      </div>`).join('');

  const nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const diasOrdenados = Object.entries(tallyDiaSemana)
    .map(([dia, d]) => ({ nombre: nombresDias[dia], promedio: d.total / d.fechas.size }))
    .sort((a, b) => b.promedio - a.promedio);
  const maxDiaSemana = diasOrdenados.length > 0 ? diasOrdenados[0].promedio : 0;
  document.getElementById('metrica-dia-top').textContent = diasOrdenados.length > 0 ? diasOrdenados[0].nombre : '—';
  document.getElementById('metrica-dia-top-monto').textContent = diasOrdenados.length > 0
    ? `${formatoMoneda(Math.round(diasOrdenados[0].promedio))} prom.`
    : '';
  const listaDiaSemana = document.getElementById('lista-dia-semana-metricas');
  listaDiaSemana.innerHTML = diasOrdenados.length === 0
    ? '<p class="texto-vacio">Sin ventas en este período</p>'
    : diasOrdenados.map(d => `
      <div class="barra-categoria">
        <div class="barra-categoria-etiqueta"><span>${d.nombre}</span><span>${formatoMoneda(Math.round(d.promedio))}</span></div>
        <div class="barra-categoria-fondo"><div class="barra-categoria-relleno" style="width:${maxDiaSemana ? (d.promedio / maxDiaSemana * 100) : 0}%"></div></div>
      </div>`).join('');

  const topProductos = Object.values(tallyProductos).sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);
  document.getElementById('resumen-productos-top').textContent = topProductos.length > 0
    ? `${topProductos[0].nombre} · ${topProductos[0].cantidad} vendidos · ${formatoMoneda(Math.round(topProductos[0].monto))}`
    : 'Sin ventas en este período';
  const listaTop = document.getElementById('lista-top-productos-metricas');
  listaTop.innerHTML = topProductos.length === 0
    ? '<p class="texto-vacio">Sin ventas en este período</p>'
    : topProductos.map((p, i) => `
      <div class="fila-admin">
        <span class="miniatura">${i + 1}</span>
        <div class="info-admin">
          <strong>${p.nombre}</strong>
          <span>${p.cantidad} vendidos · ${formatoMoneda(Math.round(p.monto))}</span>
        </div>
      </div>`).join('');

  const categoriasOrdenadas = Object.entries(tallyCategorias).sort((a, b) => b[1] - a[1]);
  const maxCategoria = categoriasOrdenadas.length > 0 ? categoriasOrdenadas[0][1] : 0;
  const totalCategorias = categoriasOrdenadas.reduce((s, [, monto]) => s + monto, 0);
  const listaCats = document.getElementById('lista-categorias-metricas');
  listaCats.innerHTML = categoriasOrdenadas.length === 0
    ? '<p class="texto-vacio">Sin ventas en este período</p>'
    : categoriasOrdenadas.map(([nombre, monto]) => `
      <div class="barra-categoria">
        <div class="barra-categoria-etiqueta"><span>${nombre}</span><span>${formatoMoneda(Math.round(monto))}</span></div>
        <div class="barra-categoria-fondo"><div class="barra-categoria-relleno" style="width:${maxCategoria ? (monto / maxCategoria * 100) : 0}%"></div></div>
      </div>`).join('') + `
      <div class="categoria-total-fila"><span>Total</span><span>${formatoMoneda(Math.round(totalCategorias))}</span></div>`;

  const metodosOrdenados = Object.entries(tallyMetodoPago).sort((a, b) => b[1] - a[1]);
  const maxMetodo = metodosOrdenados.length > 0 ? metodosOrdenados[0][1] : 0;
  const totalMetodos = metodosOrdenados.reduce((s, [, monto]) => s + monto, 0);
  const listaMetodos = document.getElementById('lista-metodos-pago-metricas');
  listaMetodos.innerHTML = metodosOrdenados.length === 0
    ? '<p class="texto-vacio">Sin ventas en este período</p>'
    : metodosOrdenados.map(([nombre, monto]) => `
      <div class="barra-categoria">
        <div class="barra-categoria-etiqueta"><span>${nombre}</span><span>${formatoMoneda(Math.round(monto))}</span></div>
        <div class="barra-categoria-fondo"><div class="barra-categoria-relleno" style="width:${maxMetodo ? (monto / maxMetodo * 100) : 0}%"></div></div>
      </div>`).join('') + `
      <div class="categoria-total-fila"><span>Total</span><span>${formatoMoneda(Math.round(totalMetodos))}</span></div>`;

  const tallyDias = {};
  ventas.forEach(v => {
    const dia = v.creado_en.slice(0, 10);
    tallyDias[dia] = (tallyDias[dia] || 0) + Number(v.total);
  });
  const dias = Object.entries(tallyDias).sort((a, b) => a[0].localeCompare(b[0])).slice(-14);
  const maxDia = dias.length > 0 ? Math.max(...dias.map(d => d[1])) : 0;
  const grafico = document.getElementById('grafico-ventas-dia');
  grafico.innerHTML = dias.length === 0
    ? '<p class="texto-vacio">Sin ventas en este período</p>'
    : dias.map(([fecha, monto]) => {
        const [, mes, dia] = fecha.split('-');
        return `
      <div class="barra-dia" title="${formatoMoneda(Math.round(monto))}">
        <div class="barra-dia-relleno" style="height:${maxDia ? (monto / maxDia * 100) : 0}%"></div>
        <span class="barra-dia-etiqueta">${dia}/${mes}</span>
      </div>`;
      }).join('');

  ventasCache = ventas;
  mapaMesasCache = mapaMesas;
  const etiquetasMetodoHistorial = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
  const MAX_HISTORIAL = 50;
  const recientes = [...ventas].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en)).slice(0, MAX_HISTORIAL);
  document.getElementById('resumen-historial-ventas').textContent = nVentas > 0
    ? `${nVentas} venta${nVentas === 1 ? '' : 's'} en este período`
    : 'Sin ventas en este período';
  const listaHistorial = document.getElementById('lista-historial-ventas');
  listaHistorial.innerHTML = (recientes.length === 0
    ? '<p class="texto-vacio">Sin ventas en este período</p>'
    : recientes.map(v => {
        const fecha = new Date(v.creado_en);
        const fechaTexto = `${fecha.toLocaleDateString('es-CL')} · ${fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
        const etiquetaMesa = mapaMesas[v.mesa_id] || `Mesa ${v.mesa_id}`;
        const metodo = etiquetasMetodoHistorial[v.metodo_pago] || 'Sin especificar';
        return `
      <div class="fila-admin">
        <span class="miniatura">🧾</span>
        <div class="info-admin">
          <strong>${etiquetaMesa} · ${formatoMoneda(Math.round(Number(v.total)))}</strong>
          <span>${fechaTexto} · ${metodo}</span>
        </div>
        <div class="acciones-fila-admin">
          <button class="btn-editar-admin" onclick="reimprimirVenta(${v.id})" title="Reimprimir recibo">🖨️</button>
        </div>
      </div>`;
      }).join('')) + (nVentas > recientes.length ? `<p class="texto-ayuda">Mostrando las ${recientes.length} ventas más recientes de ${nVentas}.</p>` : '');
}

function inicioDia(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

async function cargarComparativas() {
  const ahora = new Date();
  const hoyIni = inicioDia(ahora);
  const ayerIni = new Date(hoyIni); ayerIni.setDate(ayerIni.getDate() - 1);
  const semanaActualIni = new Date(hoyIni); semanaActualIni.setDate(semanaActualIni.getDate() - 6);
  const semanaAnteriorIni = new Date(hoyIni); semanaAnteriorIni.setDate(semanaAnteriorIni.getDate() - 13);
  const mesActualIni = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const diaDelMes = ahora.getDate();
  const mesAnteriorIni = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const ultimoDiaMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0).getDate();
  const mesAnteriorFin = new Date(ahora.getFullYear(), ahora.getMonth() - 1, Math.min(diaDelMes, ultimoDiaMesAnterior) + 1);

  const desde = mesAnteriorIni < semanaAnteriorIni ? mesAnteriorIni : semanaAnteriorIni;
  let query = sb.from('ventas').select('items, total, creado_en').gte('creado_en', desde.toISOString());
  if (turnoFiltro !== 'ambos') query = query.eq('turno', Number(turnoFiltro));
  const { data } = await query;
  const ventas = data || [];

  const sumaEntre = (ini, fin) => ventas
    .filter(v => { const t = new Date(v.creado_en); return t >= ini && (!fin || t < fin); })
    .reduce((s, v) => s + Number(v.total), 0);

  const hoy = sumaEntre(hoyIni, null);
  const ayer = sumaEntre(ayerIni, hoyIni);
  const semanaActual = sumaEntre(semanaActualIni, null);
  const semanaAnterior = sumaEntre(semanaAnteriorIni, semanaActualIni);
  const mesActual = sumaEntre(mesActualIni, null);
  const mesAnterior = sumaEntre(mesAnteriorIni, mesAnteriorFin);

  const nombreMes = f => f.toLocaleDateString('es-CL', { month: 'long' }).replace(/^./, c => c.toUpperCase());

  renderComparativas([
    { titulo: 'Ayer vs. Hoy', anteriorLabel: 'Ayer', anterior: ayer, actualLabel: 'Hoy', actual: hoy },
    { titulo: 'Semana anterior vs. Esta semana', anteriorLabel: 'Sem. anterior', anterior: semanaAnterior, actualLabel: 'Esta semana', actual: semanaActual },
    { titulo: `${nombreMes(mesAnteriorIni)} vs. ${nombreMes(mesActualIni)} (mismos días)`, anteriorLabel: nombreMes(mesAnteriorIni), anterior: mesAnterior, actualLabel: nombreMes(mesActualIni), actual: mesActual },
  ]);

  const ventasHoy = ventas.filter(v => new Date(v.creado_en) >= hoyIni);
  const tallyHoy = {};
  ventasHoy.forEach(v => (v.items || []).forEach(it => { tallyHoy[it.nombre] = (tallyHoy[it.nombre] || 0) + it.cantidad; }));
  const rankingHoy = Object.entries(tallyHoy).sort((a, b) => b[1] - a[1]);
  const destacado = document.getElementById('destacado-producto-dia');
  destacado.innerHTML = rankingHoy.length > 0
    ? `<span class="destacado-icono">🔥</span> Más vendido hoy: <strong>${rankingHoy[0][0]}</strong> (${rankingHoy[0][1]} vendidos)`
    : `<span class="destacado-icono">📋</span> Aún no hay ventas registradas hoy`;
}

// ---------- Reporte de Caja diario ----------
const DENOMINACIONES_REPORTE = [20000, 10000, 5000, 2000, 1000];
const DENOMINACIONES_CAJA_CHICA = [20000, 10000, 5000, 2000, 1000, 500, 100, 50, 10];
const CLAVE_BORRADOR_REPORTE_CAJA = 'comanda_reporte_caja_borrador';
let gastosReporteCaja = [];
let reporteCajaVentasEfectivo = 0;
let reporteCajaInicializado = false;

function iniciarReporteCaja() {
  if (!reporteCajaInicializado) {
    renderDenominacionesCajaChica();
    renderDenominacionesReporte();
    restaurarBorradorReporteCaja();
    reporteCajaInicializado = true;
  }
  renderMenuGastosRapidos();
  cargarDatosReporteCaja();
}

function guardarBorradorReporteCaja() {
  try {
    const borrador = {
      turno: document.getElementById('reporte-caja-turno').value,
      cajaChica: DENOMINACIONES_CAJA_CHICA.map(d => document.getElementById(`denom-caja-cant-${d}`).value),
      efectivo: DENOMINACIONES_REPORTE.map(d => document.getElementById(`denom-cant-${d}`).value),
      otros: document.getElementById('denom-otros').value,
      tarjeta: document.getElementById('reporte-caja-tarjeta').value,
      gastos: gastosReporteCaja,
    };
    localStorage.setItem(CLAVE_BORRADOR_REPORTE_CAJA, JSON.stringify(borrador));
  } catch (e) { /* localStorage no disponible: el conteo sigue funcionando, solo no sobrevive a una recarga */ }
}

function restaurarBorradorReporteCaja() {
  let borrador;
  try {
    const raw = localStorage.getItem(CLAVE_BORRADOR_REPORTE_CAJA);
    if (!raw) return;
    borrador = JSON.parse(raw);
  } catch (e) { return; }
  if (borrador.turno) document.getElementById('reporte-caja-turno').value = borrador.turno;
  DENOMINACIONES_CAJA_CHICA.forEach((d, i) => {
    const valor = borrador.cajaChica?.[i];
    if (valor) document.getElementById(`denom-caja-cant-${d}`).value = valor;
  });
  DENOMINACIONES_REPORTE.forEach((d, i) => {
    const valor = borrador.efectivo?.[i];
    if (valor) document.getElementById(`denom-cant-${d}`).value = valor;
  });
  if (borrador.otros) document.getElementById('denom-otros').value = borrador.otros;
  if (borrador.tarjeta) document.getElementById('reporte-caja-tarjeta').value = borrador.tarjeta;
  if (Array.isArray(borrador.gastos)) gastosReporteCaja = borrador.gastos;
}

function limpiarBorradorReporteCaja() {
  try { localStorage.removeItem(CLAVE_BORRADOR_REPORTE_CAJA); } catch (e) { /* nada que limpiar */ }
}

function renderDenominacionesCajaChica() {
  const cont = document.getElementById('lista-denominaciones-caja-chica');
  cont.innerHTML = DENOMINACIONES_CAJA_CHICA.map(d => `
    <div class="fila-denominacion-reporte">
      <span class="denominacion-etiqueta">${formatoMoneda(d)}</span>
      <span>x</span>
      <input type="number" class="denominacion-cantidad" id="denom-caja-cant-${d}" min="0" placeholder="0" oninput="actualizarReporteCaja()">
      <span class="denominacion-subtotal" id="denom-caja-subtotal-${d}">$0</span>
    </div>`).join('');
}

function renderDenominacionesReporte() {
  const cont = document.getElementById('lista-denominaciones-reporte');
  cont.innerHTML = DENOMINACIONES_REPORTE.map(d => `
    <div class="fila-denominacion-reporte">
      <span class="denominacion-etiqueta">${formatoMoneda(d)}</span>
      <span>x</span>
      <input type="number" class="denominacion-cantidad" id="denom-cant-${d}" min="0" placeholder="0" oninput="actualizarReporteCaja()">
      <span class="denominacion-subtotal" id="denom-subtotal-${d}">$0</span>
    </div>`).join('') + `
    <div class="fila-denominacion-reporte">
      <span class="denominacion-etiqueta">Monedas</span>
      <input type="text" inputmode="numeric" id="denom-otros" placeholder="$0" style="flex:1;padding:8px 10px;border:1px solid #ccc;border-radius:6px;" oninput="formatearMilesEnInput(event); actualizarReporteCaja()">
    </div>`;
}

function renderMenuGastosRapidos() {
  const sel = document.getElementById('select-gastos-rapidos');
  if (!sel) return;
  sel.innerHTML = '<option value="">+ Elegir ítem de gasto...</option>' +
    gastosRapidos.map(g => `<option value="${escaparHtmlReporte(g.texto)}">${escaparHtmlReporte(g.texto)}</option>`).join('');
}

function seleccionarGastoRapido(nombre) {
  if (!nombre) return;
  document.getElementById('gasto-desc-nuevo').value = nombre;
  document.getElementById('select-gastos-rapidos').value = '';
  document.getElementById('gasto-monto-nuevo').focus();
}

async function cargarDatosReporteCaja() {
  const turno = Number(document.getElementById('reporte-caja-turno').value);
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
  const { data, error } = await sb.from('ventas').select('total, metodo_pago').gte('creado_en', inicioHoy).eq('turno', turno);
  if (error) {
    console.error(error);
    alert('No se pudieron cargar las ventas del turno (problema de conexión). Puedes escribirlas a mano.');
    return;
  }
  const ventas = data || [];
  const totalVentas = ventas.reduce((s, v) => s + Number(v.total), 0);
  const totalTarjeta = ventas.filter(v => v.metodo_pago === 'tarjeta').reduce((s, v) => s + Number(v.total), 0);
  const totalTransferencia = ventas.filter(v => v.metodo_pago === 'transferencia').reduce((s, v) => s + Number(v.total), 0);
  reporteCajaVentasEfectivo = totalVentas - totalTarjeta - totalTransferencia;
  document.getElementById('reporte-caja-tarjeta').value = totalTarjeta.toLocaleString('es-CO');
  actualizarReporteCaja();
}

function escaparHtmlReporte(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function renderGastosReporte(totalGastos) {
  const cont = document.getElementById('lista-gastos-reporte');
  cont.innerHTML = gastosReporteCaja.length === 0
    ? '<p class="texto-vacio">Sin gastos registrados.</p>'
    : `<table class="tabla-gastos-reporte">
        <thead><tr><th>Descripción</th><th>Monto</th><th></th></tr></thead>
        <tbody>
          ${gastosReporteCaja.map((g, i) => `
          <tr>
            <td>${escaparHtmlReporte(g.desc)}</td>
            <td class="tabla-gastos-monto">${formatoMoneda(g.monto)}</td>
            <td><button type="button" class="fila-gasto-quitar" onclick="quitarGastoReporte(${i})" title="Quitar">🗑️</button></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  document.getElementById('total-gastos-reporte').textContent = formatoMoneda(totalGastos);
}

function agregarGastoReporte() {
  const desc = document.getElementById('gasto-desc-nuevo').value.trim();
  const monto = valorNumericoInput('gasto-monto-nuevo');
  if (!desc || !monto) { alert('Escribe una descripción y un monto válido para el gasto.'); return; }
  gastosReporteCaja.push({ desc, monto });
  document.getElementById('gasto-desc-nuevo').value = '';
  document.getElementById('gasto-monto-nuevo').value = '';
  actualizarReporteCaja();
}

function quitarGastoReporte(i) {
  gastosReporteCaja.splice(i, 1);
  actualizarReporteCaja();
}

function fechaReporteCajaTexto() {
  return new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function actualizarReporteCaja() {
  let cajaChica = 0;
  DENOMINACIONES_CAJA_CHICA.forEach(d => {
    const cantidad = Number(document.getElementById(`denom-caja-cant-${d}`).value) || 0;
    const subtotal = cantidad * d;
    document.getElementById(`denom-caja-subtotal-${d}`).textContent = formatoMoneda(subtotal);
    cajaChica += subtotal;
  });
  document.getElementById('total-caja-chica').textContent = formatoMoneda(cajaChica);

  let totalEfectivoContado = 0;
  DENOMINACIONES_REPORTE.forEach(d => {
    const cantidad = Number(document.getElementById(`denom-cant-${d}`).value) || 0;
    const subtotal = cantidad * d;
    document.getElementById(`denom-subtotal-${d}`).textContent = formatoMoneda(subtotal);
    totalEfectivoContado += subtotal;
  });
  const otros = valorNumericoInput('denom-otros');
  totalEfectivoContado += otros;
  document.getElementById('total-efectivo-contado').textContent = formatoMoneda(totalEfectivoContado);

  const tarjeta = valorNumericoInput('reporte-caja-tarjeta');
  const totalGastos = gastosReporteCaja.reduce((s, g) => s + g.monto, 0);
  const turno = document.getElementById('reporte-caja-turno').value;

  renderGastosReporte(totalGastos);

  const ventaTotal = totalEfectivoContado + tarjeta + totalGastos;
  document.getElementById('reporte-caja-venta-total').textContent = formatoMoneda(ventaTotal);

  const efectivoEsperado = reporteCajaVentasEfectivo - totalGastos;
  const diferencia = totalEfectivoContado - efectivoEsperado;
  document.getElementById('cuadratura-esperado').textContent = formatoMoneda(efectivoEsperado);
  document.getElementById('cuadratura-contado').textContent = formatoMoneda(totalEfectivoContado);
  document.getElementById('cuadratura-diferencia').textContent = (diferencia > 0 ? '+' : '') + formatoMoneda(diferencia);
  const filaDif = document.getElementById('cuadratura-diferencia').parentElement;
  filaDif.classList.toggle('cuadra', diferencia === 0);
  filaDif.classList.toggle('no-cuadra', diferencia !== 0);

  renderVistaPreviaReporte({ cajaChica, totalEfectivoContado, otros, tarjeta, totalGastos, ventaTotal, turno });
  guardarBorradorReporteCaja();
}

function renderVistaPreviaReporte({ cajaChica, totalEfectivoContado, otros, tarjeta, totalGastos, ventaTotal, turno }) {
  const cont = document.getElementById('vista-previa-reporte-caja');
  const filasCajaChica = DENOMINACIONES_CAJA_CHICA.map(d => {
    const cantidad = Number(document.getElementById(`denom-caja-cant-${d}`).value) || 0;
    if (cantidad === 0) return '';
    return `<div class="vp-fila"><span>${formatoMoneda(d)} x ${cantidad}</span><span>${formatoMoneda(d * cantidad)}</span></div>`;
  }).join('');
  const filasDenom = DENOMINACIONES_REPORTE.map(d => {
    const cantidad = Number(document.getElementById(`denom-cant-${d}`).value) || 0;
    if (cantidad === 0) return '';
    return `<div class="vp-fila"><span>${formatoMoneda(d)} x ${cantidad}</span><span>${formatoMoneda(d * cantidad)}</span></div>`;
  }).join('');
  const filaOtros = otros > 0 ? `<div class="vp-fila"><span>Monedas</span><span>${formatoMoneda(otros)}</span></div>` : '';
  const filasGastos = gastosReporteCaja.length === 0
    ? '<div class="vp-fila vp-vacio"><span>(sin gastos)</span><span></span></div>'
    : gastosReporteCaja.map(g => `<div class="vp-fila"><span>${escaparHtmlReporte(g.desc)}</span><span>${formatoMoneda(g.monto)}</span></div>`).join('');

  cont.innerHTML = `
    <div class="vp-header">
      <div class="vp-negocio">${NEGOCIO_NOMBRE}</div>
      <div class="vp-reporte-titulo">🧾 REPORTE DE CAJA</div>
      <div class="vp-reporte-sub">${turno}° Turno · ${fechaReporteCajaTexto()}</div>
    </div>
    <div class="vp-cuerpo">
      <div class="vp-seccion">
        <div class="vp-seccion-titulo">🪙 Caja chica inicial</div>
        ${filasCajaChica}
        <div class="vp-fila vp-subtotal"><span>Total caja chica</span><span>${formatoMoneda(cajaChica)}</span></div>
      </div>
      <div class="vp-seccion">
        <div class="vp-seccion-titulo">💵 Efectivo contado</div>
        ${filasDenom}
        ${filaOtros}
        <div class="vp-fila vp-subtotal"><span>Total efectivo</span><span>${formatoMoneda(totalEfectivoContado)}</span></div>
      </div>
      <div class="vp-seccion">
        <div class="vp-fila vp-fila-destacada"><span>💳 Venta con tarjeta</span><span>${formatoMoneda(tarjeta)}</span></div>
      </div>
      <div class="vp-seccion">
        <div class="vp-seccion-titulo">🧾 Gastos</div>
        ${filasGastos}
        <div class="vp-fila vp-subtotal"><span>Total gastos</span><span>${formatoMoneda(totalGastos)}</span></div>
      </div>
      <div class="vp-final">
        <span>VENTA ${turno}° TURNO</span>
        <span>${formatoMoneda(ventaTotal)}</span>
      </div>
    </div>
  `;
}

function formatoMonedaTxtReporte(n) {
  return '$' + Math.round(n).toLocaleString('es-CO');
}

function crearFormateadorTicket() {
  const ANCHO = 32;
  const centrar = (linea) => {
    const relleno = Math.max(0, Math.floor((ANCHO - linea.length) / 2));
    return ' '.repeat(relleno) + linea;
  };
  const fila = (izq, der) => {
    const disponible = ANCHO - der.length;
    if (izq.length <= disponible - 1) return `${izq.padEnd(disponible)}${der}\n`;
    return `${izq}\n${der.padStart(ANCHO)}\n`;
  };
  const separador = '-'.repeat(ANCHO) + '\n';
  const BOLD_ON = '\x1B\x45\x01', BOLD_OFF = '\x1B\x45\x00';
  return { ANCHO, centrar, fila, separador, BOLD_ON, BOLD_OFF };
}

function enviarARawBT(texto) {
  const textoCodificado = encodeURI(texto);
  window.location.href = `intent:${textoCodificado}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
}

function imprimirCajaChicaRawBT() {
  const turno = document.getElementById('reporte-caja-turno').value;
  let cajaChica = 0;
  const lineasCajaChica = [];
  DENOMINACIONES_CAJA_CHICA.forEach(d => {
    const cantidad = Number(document.getElementById(`denom-caja-cant-${d}`).value) || 0;
    if (cantidad > 0) {
      const subtotal = cantidad * d;
      cajaChica += subtotal;
      lineasCajaChica.push({ d, cantidad, subtotal });
    }
  });

  const { centrar, fila, separador, BOLD_ON, BOLD_OFF } = crearFormateadorTicket();
  let t = `${BOLD_ON}${centrar('CAJA CHICA INICIAL')}${BOLD_OFF}\n`;
  t += `${centrar(`${turno} Turno - ${fechaReporteCajaTexto()}`)}\n`;
  t += separador;
  if (lineasCajaChica.length === 0) t += '  (sin desglose)\n';
  lineasCajaChica.forEach(l => { t += fila(`  $${l.d.toLocaleString('es-CO')} x ${l.cantidad}`, formatoMonedaTxtReporte(l.subtotal)); });
  t += separador;
  t += `${BOLD_ON}${fila('Total caja chica', formatoMonedaTxtReporte(cajaChica))}${BOLD_OFF}`;
  t += separador;

  enviarARawBT(t);
}

function imprimirReporteCajaRawBT() {
  const tarjeta = valorNumericoInput('reporte-caja-tarjeta');
  const turno = document.getElementById('reporte-caja-turno').value;

  let totalEfectivoContado = 0;
  const lineasDenom = [];
  DENOMINACIONES_REPORTE.forEach(d => {
    const cantidad = Number(document.getElementById(`denom-cant-${d}`).value) || 0;
    if (cantidad > 0) {
      const subtotal = cantidad * d;
      totalEfectivoContado += subtotal;
      lineasDenom.push({ d, cantidad, subtotal });
    }
  });
  const otros = valorNumericoInput('denom-otros');
  totalEfectivoContado += otros;
  const totalGastos = gastosReporteCaja.reduce((s, g) => s + g.monto, 0);
  const ventaTotal = totalEfectivoContado + tarjeta + totalGastos;

  const { centrar, fila, separador, BOLD_ON, BOLD_OFF } = crearFormateadorTicket();

  let t = `${BOLD_ON}${centrar('REPORTE DE CAJA')}${BOLD_OFF}\n`;
  t += `${centrar(`${turno} Turno - ${fechaReporteCajaTexto()}`)}\n`;
  t += separador;
  t += `${BOLD_ON}Efectivo contado:${BOLD_OFF}\n`;
  lineasDenom.forEach(l => { t += fila(`  $${l.d.toLocaleString('es-CO')} x ${l.cantidad}`, formatoMonedaTxtReporte(l.subtotal)); });
  if (otros > 0) t += fila('  Monedas', formatoMonedaTxtReporte(otros));
  t += separador;
  t += `${BOLD_ON}${fila('Total efectivo', formatoMonedaTxtReporte(totalEfectivoContado))}${BOLD_OFF}`;
  t += separador;
  t += `${BOLD_ON}${fila('Venta tarjeta', formatoMonedaTxtReporte(tarjeta))}${BOLD_OFF}`;
  t += separador;
  t += `${BOLD_ON}Gastos:${BOLD_OFF}\n`;
  if (gastosReporteCaja.length === 0) t += '  (sin gastos)\n';
  gastosReporteCaja.forEach(g => { t += fila(`  ${g.desc}`, formatoMonedaTxtReporte(g.monto)); });
  t += separador;
  t += `${BOLD_ON}${fila('Total gastos', formatoMonedaTxtReporte(totalGastos))}${BOLD_OFF}`;
  t += separador;
  t += `${BOLD_ON}${fila('TOTAL VENTA', formatoMonedaTxtReporte(ventaTotal))}${BOLD_OFF}`;
  t += separador;

  enviarARawBT(t);
}

async function limpiarConteoReporteCaja() {
  if (!(await confirmarApp('¿Limpiar caja chica, efectivo contado y gastos para empezar un conteo nuevo?'))) return;
  DENOMINACIONES_CAJA_CHICA.forEach(d => { document.getElementById(`denom-caja-cant-${d}`).value = ''; });
  DENOMINACIONES_REPORTE.forEach(d => { document.getElementById(`denom-cant-${d}`).value = ''; });
  document.getElementById('denom-otros').value = '';
  document.getElementById('reporte-caja-tarjeta').value = '0';
  gastosReporteCaja = [];
  limpiarBorradorReporteCaja();
  actualizarReporteCaja();
}

async function compartirReporteCajaImagen() {
  const elemento = document.getElementById('vista-previa-reporte-caja');
  if (typeof html2canvas === 'undefined') {
    alert('No se pudo cargar la herramienta para generar la imagen. Revisa tu conexión e intenta de nuevo.');
    return;
  }
  const estabaColapsada = elemento.classList.contains('oculto');
  if (estabaColapsada) elemento.classList.remove('oculto');
  try {
    const canvas = await html2canvas(elemento, { backgroundColor: '#ffffff', scale: 2 });
    if (estabaColapsada) elemento.classList.add('oculto');
    canvas.toBlob(async (blob) => {
      if (!blob) { alert('No se pudo generar la imagen.'); return; }
      const nombreArchivo = `reporte-caja-${fechaReporteCajaTexto().replace(/\//g, '-')}.png`;
      const archivo = new File([blob], nombreArchivo, { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [archivo] })) {
        try {
          await navigator.share({ files: [archivo], title: 'Reporte de Caja' });
        } catch (e) {
          // El usuario cancelo el cuadro de compartir -- no hacer nada.
        }
      } else {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    }, 'image/png');
  } catch (e) {
    if (estabaColapsada) elemento.classList.add('oculto');
    console.error(e);
    alert('No se pudo generar la imagen del reporte.');
  }
}

const COMPARATIVA_ICONOS = ['📅', '📆', '🗓️'];
const COMPARATIVA_COLORES = ['#2980b9', '#8e44ad', '#16a085'];

function renderComparativas(filas) {
  const cont = document.getElementById('comparativas-rapidas');
  cont.innerHTML = filas.map((f, i) => {
    const sinDatos = f.anterior === 0 && f.actual === 0;
    const delta = f.anterior > 0 ? ((f.actual - f.anterior) / f.anterior * 100) : (f.actual > 0 ? 100 : 0);
    const sinCambio = sinDatos || delta === 0;
    const positivo = delta > 0;
    const deltaTexto = sinCambio ? '—' : `${positivo ? '▲' : '▼'} ${Math.abs(delta).toFixed(1).replace('.', ',')}%`;
    const max = Math.max(f.anterior, f.actual, 1);
    const pctAnterior = (f.anterior / max * 100).toFixed(1);
    const pctActual = (f.actual / max * 100).toFixed(1);
    return `
      <div class="comparativa-fila" style="--color-comp:${COMPARATIVA_COLORES[i % 3]}">
        <div class="comparativa-cabecera">
          <span class="comparativa-titulo"><span class="comparativa-icono">${COMPARATIVA_ICONOS[i % 3]}</span>${f.titulo}</span>
          <span class="comparativa-delta ${sinCambio ? 'neutro' : (positivo ? 'positivo' : 'negativo')}">${deltaTexto}</span>
        </div>
        <div class="comparativa-barra-linea">
          <span class="comparativa-barra-etq">${f.anteriorLabel}</span>
          <div class="comparativa-barra-pista"><div class="comparativa-barra-relleno" data-ancho="${pctAnterior}" style="width:0%"></div></div>
          <span class="comparativa-barra-valor">${formatoMoneda(Math.round(f.anterior))}</span>
        </div>
        <div class="comparativa-barra-linea actual">
          <span class="comparativa-barra-etq">${f.actualLabel}</span>
          <div class="comparativa-barra-pista"><div class="comparativa-barra-relleno" data-ancho="${pctActual}" style="width:0%"></div></div>
          <span class="comparativa-barra-valor">${formatoMoneda(Math.round(f.actual))}</span>
        </div>
      </div>`;
  }).join('');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    cont.querySelectorAll('.comparativa-barra-relleno').forEach(el => {
      el.style.width = `${el.dataset.ancho}%`;
    });
  }));
}

let mesasAdminCache = [];
let mesaEditandoId = null;

async function cargarMesasAdmin() {
  const { data } = await sb.from('mesas').select('*').order('orden');
  mesasAdminCache = data || [];
  renderMesasAdmin();
}

function etiquetaMesa(mesa) {
  return mesa.nombre || `Mesa ${mesa.id}`;
}

function listaMesasAdminFiltrada() {
  const ordenadas = [...mesasAdminCache].sort((a, b) => (a.orden ?? a.id) - (b.orden ?? b.id));
  const q = normalizarTexto(document.getElementById('buscar-mesa').value.trim());
  if (!q) return ordenadas;
  return ordenadas.filter(m => normalizarTexto(etiquetaMesa(m)).includes(q));
}

document.getElementById('buscar-mesa').addEventListener('input', renderMesasAdmin);

function renderMesasAdmin() {
  const cont = document.getElementById('lista-admin-mesas');
  cont.innerHTML = '';
  const lista = listaMesasAdminFiltrada();
  lista.forEach((mesa, i) => {
    const fila = document.createElement('div');
    fila.className = 'fila-admin' + (mesa.visible ? '' : ' oculta-item');
    fila.innerHTML = `
      <div class="miniatura">${mesa.nombre ? '🏷️' : mesa.id}</div>
      <div class="info-admin">
        <strong>${etiquetaMesa(mesa)}</strong>
        <span>${mesa.pedido.length > 0 ? 'Ocupada' : 'Libre'}</span>
      </div>
      <div class="acciones-fila-admin">
        <button class="btn-editar-admin" ${i === 0 ? 'disabled' : ''} onclick="moverMesa(${mesa.id}, -1)">▲</button>
        <button class="btn-editar-admin" ${i === lista.length - 1 ? 'disabled' : ''} onclick="moverMesa(${mesa.id}, 1)">▼</button>
        <button class="btn-editar-admin" onclick="editarMesa(${mesa.id})">✏️</button>
        <button class="btn-toggle-visible" onclick="toggleVisibleMesa(${mesa.id}, ${mesa.visible})">${mesa.visible ? '👁️ Visible' : '🚫 Oculta'}</button>
        <button class="btn-toggle-visible" onclick="eliminarMesa(${mesa.id})">🗑️</button>
      </div>`;
    cont.appendChild(fila);
  });
}

async function moverMesa(id, direccion) {
  const lista = listaMesasAdminFiltrada();
  const i = lista.findIndex(m => m.id === id);
  const j = i + direccion;
  if (j < 0 || j >= lista.length) return;
  const a = lista[i], b = lista[j];
  const ordenA = a.orden ?? a.id, ordenB = b.orden ?? b.id;
  await sb.from('mesas').update({ orden: ordenB }).eq('id', a.id);
  await sb.from('mesas').update({ orden: ordenA }).eq('id', b.id);
  await cargarMesasAdmin();
  cargarMesas();
}

async function eliminarMesa(id) {
  const mesa = mesasAdminCache.find(m => m.id === id);
  if (!mesa) return;
  const ocupada = mesa.pedido.length > 0;
  const aviso = ocupada
    ? `¡Atención! "${etiquetaMesa(mesa)}" tiene un pedido activo sin cobrar. ¿Eliminarla de todas formas? Se perderá ese pedido.`
    : `¿Eliminar definitivamente "${etiquetaMesa(mesa)}"? Esta acción no se puede deshacer.`;
  if (!(await confirmarApp(aviso))) return;
  try {
    const { data, error } = await sb.from('mesas').delete().eq('id', id).select();
    if (error) {
      alert('No se pudo eliminar: ' + error.message);
      return;
    }
    if (!data || data.length === 0) {
      alert(`No se pudo eliminar "${etiquetaMesa(mesa)}": el servidor no confirmó el borrado (puede ser un problema de conexión). Intenta de nuevo.`);
      return;
    }
  } catch (err) {
    alert(`No se pudo eliminar "${etiquetaMesa(mesa)}" por un problema de conexión. Revisa tu internet/WiFi e intenta de nuevo.`);
  } finally {
    await cargarMesasAdmin();
    cargarMesas();
  }
}

async function toggleVisibleMesa(id, actual) {
  await sb.from('mesas').update({ visible: !actual }).eq('id', id);
  cargarMesasAdmin();
  cargarMesas();
}

function editarMesa(id) {
  const mesa = mesasAdminCache.find(m => m.id === id);
  if (!mesa) return;
  mesaEditandoId = id;
  document.getElementById('nueva-mesa-nombre').value = mesa.nombre || '';
  document.getElementById('titulo-form-mesa').textContent = `Editando: ${mesa.nombre || `Mesa ${mesa.id}`}`;
  document.getElementById('btn-guardar-mesa').textContent = '💾 Guardar cambios';
  document.getElementById('btn-cancelar-mesa').classList.remove('oculto');
  document.getElementById('form-nueva-mesa').scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('nueva-mesa-nombre').focus();
}

function cancelarEdicionMesa() {
  mesaEditandoId = null;
  document.getElementById('nueva-mesa-nombre').value = '';
  document.getElementById('titulo-form-mesa').textContent = 'Nueva mesa';
  document.getElementById('btn-guardar-mesa').textContent = '+ Agregar mesa';
  document.getElementById('btn-cancelar-mesa').classList.add('oculto');
}

document.getElementById('form-nueva-mesa').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombreInput = document.getElementById('nueva-mesa-nombre');
  const nombre = nombreInput.value.trim() || null;

  if (mesaEditandoId) {
    await sb.from('mesas').update({ nombre }).eq('id', mesaEditandoId);
  } else {
    const siguienteOrden = Math.max(0, ...mesasAdminCache.map(m => m.orden ?? 0)) + 1;
    await sb.from('mesas').insert({ nombre, pedido: [], orden: siguienteOrden });
  }
  cancelarEdicionMesa();
  cargarMesas();
  cerrarDashboard();
});

let productosAdminCache = [];
let productoEditandoId = null;
let productoEditandoFotoUrl = null;

async function cargarProductosAdmin() {
  const { data } = await sb.from('productos').select('*, categorias(nombre)').order('id');
  productosAdminCache = data || [];
  renderProductosAdmin(filtrarProductosAdmin());
}

function normalizarTexto(t) {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function filtrarProductosAdmin() {
  const q = normalizarTexto(document.getElementById('buscar-producto').value.trim());
  if (!q) return productosAdminCache;
  return productosAdminCache.filter(p => normalizarTexto(p.nombre).includes(q));
}

document.getElementById('buscar-producto').addEventListener('input', () => {
  renderProductosAdmin(filtrarProductosAdmin());
});

function textoStockProducto(p) {
  if (p.insumo_id) {
    const insumo = insumosCache.find(i => i.id === p.insumo_id);
    if (!insumo) return '';
    return ` · 🍷 Consume ${p.consumo_insumo}${insumo.unidad === 'ml' ? 'ml' : 'u.'} de ${insumo.nombre}`;
  }
  if (p.controla_stock) {
    const clase = p.inventario <= 0 ? 'texto-stock-agotado' : (p.inventario <= 5 ? 'texto-stock-bajo' : '');
    return ` · <span class="${clase}">Stock ${p.inventario}</span>`;
  }
  return '';
}

function filaProductoAdminHtml(p) {
  const utilidad = p.precio - p.costo;
  const miniatura = p.foto_url ? `<img class="foto-producto" src="${p.foto_url}" alt="">` : (p.icono || '🍽️');
  const fila = document.createElement('div');
  fila.className = 'fila-admin' + (p.visible ? '' : ' oculta-item');
  fila.innerHTML = `
    <div class="miniatura">${miniatura}</div>
    <div class="info-admin">
      <strong>${p.nombre}</strong>
      <span>Costo ${formatoMoneda(p.costo)} · Venta ${formatoMoneda(p.precio)} · Utilidad ${formatoMoneda(utilidad)}${textoStockProducto(p)}</span>
    </div>
    <div class="acciones-fila-admin">
      <button class="btn-editar-admin" onclick="editarProducto(${p.id})">✏️</button>
      <button class="btn-toggle-cocina${p.prepara_cocina ? ' activo' : ''}" onclick="toggleCocinaProducto(${p.id}, ${p.prepara_cocina})" title="${p.prepara_cocina ? 'Va a cocina' : 'No va a cocina'}">🍳</button>
      <button class="btn-toggle-visible" onclick="toggleVisibleProducto(${p.id}, ${p.visible})">${p.visible ? '👁️ Visible' : '🚫 Oculto'}</button>
      <button class="btn-toggle-visible" onclick="eliminarProducto(${p.id})">🗑️</button>
    </div>`;
  return fila;
}

function rutaStorageProducto(url) {
  if (!url) return null;
  const marcador = '/object/public/productos/';
  const i = url.indexOf(marcador);
  return i === -1 ? null : url.slice(i + marcador.length);
}

async function eliminarProducto(id) {
  const p = productosAdminCache.find(x => x.id === id);
  if (!p) return;
  if (!(await confirmarApp(`¿Eliminar definitivamente "${p.nombre}"?\n\nEsta acción no se puede deshacer. Las ventas ya registradas conservan su historial igual, pero el producto dejará de existir en el catálogo (Top20, Orden Menú, etc).`))) return;
  const { error } = await sb.from('productos').delete().eq('id', id);
  if (error) {
    alert('No se pudo eliminar: ' + error.message);
    return;
  }
  const rutaFoto = rutaStorageProducto(p.foto_url);
  if (rutaFoto) sb.storage.from('productos').remove([rutaFoto]);
  await cargarProductosAdmin();
  cargarCategoriasYProductos();
}

function renderProductosAdmin(lista) {
  const cont = document.getElementById('lista-admin-productos');
  cont.innerHTML = '';
  const grupos = new Map();
  lista.forEach(p => {
    const nombreCat = p.categorias?.nombre || 'Sin categoría';
    if (!grupos.has(nombreCat)) grupos.set(nombreCat, []);
    grupos.get(nombreCat).push(p);
  });
  const ordenCategoria = Object.fromEntries(categoriasDb.map(c => [c.nombre, c.orden ?? 0]));
  const nombresCategorias = [...grupos.keys()].sort((a, b) => (ordenCategoria[a] ?? 999) - (ordenCategoria[b] ?? 999));

  nombresCategorias.forEach(nombreCat => {
    const encabezado = document.createElement('h4');
    encabezado.className = 'encabezado-grupo-productos';
    encabezado.textContent = nombreCat;
    cont.appendChild(encabezado);
    grupos.get(nombreCat).forEach(p => cont.appendChild(filaProductoAdminHtml(p)));
  });
}

async function toggleVisibleProducto(id, actual) {
  await sb.from('productos').update({ visible: !actual }).eq('id', id);
  cargarProductosAdmin();
}

async function toggleCocinaProducto(id, actual) {
  await sb.from('productos').update({ prepara_cocina: !actual }).eq('id', id);
  cargarProductosAdmin();
  cargarCategoriasYProductos();
}

let usuariosAdminCache = [];
const ETIQUETAS_ROL = { admin: 'Admin', cajero: 'Cajero', mesero: 'Mesero', dueno: 'Admin Dueño' };
const ICONO_ROL = { admin: '👑', cajero: '💵', mesero: '🧑‍🍳', dueno: '🏆' };

async function cargarUsuariosAdmin() {
  const { data, error } = await sb.from('perfiles').select('*');
  if (error) { console.error(error); return; }
  usuariosAdminCache = data || [];
  renderUsuariosAdmin();
}

function listaUsuariosFiltrada() {
  const ordenados = [...usuariosAdminCache].sort((a, b) => {
    if (a.activo !== b.activo) return a.activo ? 1 : -1;
    return (a.email || '').localeCompare(b.email || '');
  });
  const q = normalizarTexto(document.getElementById('buscar-usuario').value.trim());
  if (!q) return ordenados;
  return ordenados.filter(u => normalizarTexto(u.email || '').includes(q));
}

document.getElementById('buscar-usuario').addEventListener('input', renderUsuariosAdmin);

function renderUsuariosAdmin() {
  const cont = document.getElementById('lista-admin-usuarios');
  const lista = listaUsuariosFiltrada();
  cont.innerHTML = lista.length === 0
    ? '<p class="texto-vacio">No hay usuarios que coincidan.</p>'
    : lista.map(u => {
      const esUnoMismo = u.id === usuarioActualId;
      const pendiente = !u.activo;
      return `
      <div class="fila-admin${pendiente ? ' fila-usuario-pendiente' : ''}">
        <div class="miniatura">${pendiente ? '⏳' : (ICONO_ROL[u.rol] || '👤')}</div>
        <div class="info-admin">
          <strong>${u.email || '(sin correo)'}</strong>
          <span>${pendiente ? '<span class="texto-stock-agotado">Pendiente de activar</span>' : (ETIQUETAS_ROL[u.rol] || u.rol)}${esUnoMismo ? ' · Tu cuenta' : ''}</span>
        </div>
        <div class="acciones-fila-admin">
          ${pendiente ? `<button class="btn-editar-admin" onclick="activarUsuario('${u.id}')" title="Activar cuenta">✅</button>` : ''}
          <select class="selector-rol-usuario" onchange="cambiarRolUsuario('${u.id}', this.value)" ${esUnoMismo ? 'disabled title="No puedes cambiar tu propio rol"' : ''}>
            <option value="mesero" ${u.rol === 'mesero' ? 'selected' : ''}>Mesero</option>
            <option value="cajero" ${u.rol === 'cajero' ? 'selected' : ''}>Cajero</option>
            <option value="admin" ${u.rol === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="dueno" ${u.rol === 'dueno' ? 'selected' : ''}>Admin Dueño</option>
          </select>
          ${!pendiente && !esUnoMismo ? `<button class="btn-toggle-visible" onclick="desactivarUsuario('${u.id}')" title="Desactivar cuenta">🚫</button>` : ''}
        </div>
      </div>`;
    }).join('');
}

async function activarUsuario(id) {
  const usuario = usuariosAdminCache.find(u => u.id === id);
  if (!usuario) return;
  const { error } = await sb.from('perfiles').update({ activo: true }).eq('id', id);
  if (error) { alert('No se pudo activar: ' + error.message); return; }
  await cargarUsuariosAdmin();
}

async function desactivarUsuario(id) {
  const usuario = usuariosAdminCache.find(u => u.id === id);
  if (!usuario) return;
  if (!(await confirmarApp(`¿Desactivar la cuenta de "${usuario.email}"? No va a poder usar la app hasta que la vuelvas a activar.`))) return;
  const { error } = await sb.from('perfiles').update({ activo: false }).eq('id', id);
  if (error) { alert('No se pudo desactivar: ' + error.message); return; }
  await cargarUsuariosAdmin();
}

async function cambiarRolUsuario(id, nuevoRol) {
  const usuario = usuariosAdminCache.find(u => u.id === id);
  if (!usuario) return;
  if (!(await confirmarApp(`¿Cambiar el rol de "${usuario.email}" a "${ETIQUETAS_ROL[nuevoRol]}"?`))) {
    renderUsuariosAdmin();
    return;
  }
  const { error } = await sb.from('perfiles').update({ rol: nuevoRol }).eq('id', id);
  if (error) alert('No se pudo cambiar el rol: ' + error.message);
  cargarUsuariosAdmin();
}

let insumosCache = [];
let insumoEditandoId = null;

async function cargarInsumosAdmin() {
  const { data, error } = await sb.from('insumos').select('*').order('nombre');
  if (error) { console.error(error); return; }
  insumosCache = data || [];
  renderInsumosAdmin();
}

function poblarSelectInsumos() {
  const select = document.getElementById('nuevo-producto-insumo');
  if (!select) return;
  const actual = select.value;
  select.innerHTML = insumosCache.map(i => `<option value="${i.id}">${i.nombre} (${i.unidad})</option>`).join('');
  if (actual) select.value = actual;
}

function etiquetaEmpaqueInsumo(i) {
  if (!i.unidades_por_caja) return '';
  return i.unidad === 'ml' && i.contenido_por_unidad
    ? ` · caja de ${i.unidades_por_caja} x ${i.contenido_por_unidad}ml`
    : ` · caja de ${i.unidades_por_caja}`;
}

function cantidadDesdeCajas(i, cajas, sueltas) {
  const totalUnidades = (Number(cajas) || 0) * (Number(i.unidades_por_caja) || 0) + (Number(sueltas) || 0);
  return i.unidad === 'ml' ? totalUnidades * (Number(i.contenido_por_unidad) || 0) : totalUnidades;
}

async function pedirCantidadInsumo(i, tituloAccion) {
  const unidadTexto = i.unidad === 'ml' ? 'ml' : (i.unidad === 'kg' ? 'kg' : 'unidades');
  if (!i.unidades_por_caja) {
    const defecto = i.unidad === 'ml' ? '750' : (i.unidad === 'kg' ? '5' : '1');
    const cantidad = prompt(`${tituloAccion} de "${i.nombre}" (en ${unidadTexto}):`, defecto);
    if (cantidad === null) return null;
    const monto = Number(cantidad);
    if (!monto || monto <= 0) { alert('Ingresa una cantidad válida.'); return null; }
    return monto;
  }
  const cajasStr = prompt(`${tituloAccion} de "${i.nombre}" — ¿cuántas CAJAS completas (de ${i.unidades_por_caja})?`, '0');
  if (cajasStr === null) return null;
  const sueltasStr = prompt('¿Y cuántas unidades SUELTAS, fuera de caja?', '0');
  if (sueltasStr === null) return null;
  const cajas = Number(cajasStr) || 0;
  const sueltas = Number(sueltasStr) || 0;
  const total = cantidadDesdeCajas(i, cajas, sueltas);
  if (total <= 0) { alert('La cantidad debe ser mayor a cero.'); return null; }
  if (!(await confirmarApp(`${cajas} caja(s) x ${i.unidades_por_caja} + ${sueltas} suelta(s) = ${total}${unidadTexto}. ¿Confirmar?`))) return null;
  return total;
}

function renderInsumosAdmin() {
  const cont = document.getElementById('lista-admin-insumos');
  if (!cont) return;
  cont.innerHTML = insumosCache.length === 0
    ? '<p class="texto-vacio">Sin insumos registrados todavía.</p>'
    : insumosCache.map(i => {
        const bajo = Number(i.stock_barra) <= Number(i.stock_minimo);
        const agotado = Number(i.stock_barra) <= 0;
        const claseStock = agotado ? 'texto-stock-agotado' : (bajo ? 'texto-stock-bajo' : '');
        const unidadTexto = i.unidad === 'ml' ? 'ml' : (i.unidad === 'kg' ? 'kg' : 'u.');
        return `
      <div class="fila-admin">
        <div class="miniatura">${agotado ? '🔴' : (bajo ? '🟡' : '📦')}</div>
        <div class="info-admin">
          <strong>${i.nombre}</strong><small>${etiquetaEmpaqueInsumo(i)}</small>
          <span>🏬 Bodega: ${i.stock_bodega}${unidadTexto} · <span class="${claseStock}">🍾 Barra: ${i.stock_barra}${unidadTexto}${bajo ? ' · ¡reponer!' : ''}</span></span>
        </div>
        <div class="acciones-fila-admin">
          <button class="btn-editar-admin" onclick="traspasarInsumo(${i.id})" title="Traspasar de bodega a barra">🔄</button>
          <button class="btn-editar-admin" onclick="reponerInsumo(${i.id})" title="Reponer bodega (compra)">📥</button>
          <button class="btn-editar-admin" onclick="editarInsumo(${i.id})" title="Editar">✏️</button>
          <button class="btn-toggle-visible" onclick="eliminarInsumoAdmin(${i.id})" title="Eliminar">🗑️</button>
        </div>
      </div>`;
      }).join('');
}

function actualizarCampoContenidoInsumo() {
  const esMl = document.getElementById('nuevo-insumo-unidad').value === 'ml';
  document.getElementById('campo-insumo-contenido-wrap').classList.toggle('oculto', !esMl);
  actualizarTotalStockInicialInsumo();
}

function insumoDesdeFormularioInsumo() {
  return {
    unidad: document.getElementById('nuevo-insumo-unidad').value,
    unidades_por_caja: Number(document.getElementById('nuevo-insumo-unidades-caja').value) || null,
    contenido_por_unidad: Number(document.getElementById('nuevo-insumo-contenido').value) || null,
  };
}

function actualizarModoStockInicialInsumo() {
  if (insumoEditandoId) return;
  const tieneCaja = !!Number(document.getElementById('nuevo-insumo-unidades-caja').value);
  document.getElementById('campo-insumo-stock-wrap').classList.toggle('oculto', tieneCaja);
  document.getElementById('campo-insumo-stock-cajas-wrap').classList.toggle('oculto', !tieneCaja);
  document.getElementById('texto-stock-inicial-calculado').classList.toggle('oculto', !tieneCaja);
  if (tieneCaja) actualizarTotalStockInicialInsumo();
}

function actualizarTotalStockInicialInsumo() {
  const i = insumoDesdeFormularioInsumo();
  if (!i.unidades_por_caja) return;
  const cajas = Number(document.getElementById('nuevo-insumo-stock-cajas').value) || 0;
  const sueltas = Number(document.getElementById('nuevo-insumo-stock-sueltas').value) || 0;
  const total = cantidadDesdeCajas(i, cajas, sueltas);
  const unidadTexto = i.unidad === 'ml' ? 'ml' : 'unidades';
  document.getElementById('texto-stock-inicial-calculado').textContent = `= ${total}${unidadTexto} en bodega`;
}

function editarInsumo(id) {
  const i = insumosCache.find(x => x.id === id);
  if (!i) return;
  insumoEditandoId = id;
  document.getElementById('nuevo-insumo-nombre').value = i.nombre;
  document.getElementById('nuevo-insumo-unidad').value = i.unidad;
  document.getElementById('nuevo-insumo-stock-minimo').value = i.stock_minimo;
  document.getElementById('nuevo-insumo-unidades-caja').value = i.unidades_por_caja ?? '';
  document.getElementById('nuevo-insumo-contenido').value = i.contenido_por_unidad ?? '';
  document.getElementById('campo-insumo-stock-wrap').classList.add('oculto');
  document.getElementById('campo-insumo-stock-cajas-wrap').classList.add('oculto');
  document.getElementById('texto-stock-inicial-calculado').classList.add('oculto');
  actualizarCampoContenidoInsumo();
  document.getElementById('titulo-form-insumo').textContent = `✏️ Editando: ${i.nombre}`;
  document.getElementById('btn-guardar-insumo').textContent = '💾 Guardar cambios';
  document.getElementById('btn-cancelar-insumo').classList.remove('oculto');
  document.getElementById('nuevo-insumo-nombre').focus();
}

function cancelarEdicionInsumo() {
  insumoEditandoId = null;
  document.getElementById('form-nuevo-insumo').reset();
  document.getElementById('campo-insumo-stock-cajas-wrap').classList.add('oculto');
  document.getElementById('texto-stock-inicial-calculado').classList.add('oculto');
  document.getElementById('campo-insumo-stock-wrap').classList.remove('oculto');
  actualizarCampoContenidoInsumo();
  document.getElementById('titulo-form-insumo').textContent = '📦 Nuevo insumo';
  document.getElementById('btn-guardar-insumo').textContent = '+ Agregar insumo';
  document.getElementById('btn-cancelar-insumo').classList.add('oculto');
}

async function reponerInsumo(id) {
  const i = insumosCache.find(x => x.id === id);
  if (!i) return;
  const monto = await pedirCantidadInsumo(i, 'Reposición a BODEGA');
  if (monto === null) return;
  const { error } = await sb.rpc('reponer_insumo', { p_insumo_id: id, p_cantidad: monto });
  if (error) { alert('No se pudo reponer: ' + error.message); return; }
  await cargarInsumosAdmin();
  await cargarHistorialCompras();
}

async function traspasarInsumo(id) {
  const i = insumosCache.find(x => x.id === id);
  if (!i) return;
  const monto = await pedirCantidadInsumo(i, 'Traspaso de BODEGA a BARRA');
  if (monto === null) return;
  const { error } = await sb.rpc('traspasar_insumo', { p_insumo_id: id, p_cantidad: monto });
  if (error) { alert('No se pudo traspasar: ' + error.message); return; }
  await cargarInsumosAdmin();
}

async function eliminarInsumoAdmin(id) {
  const i = insumosCache.find(x => x.id === id);
  if (!i) return;
  const enUso = productosAdminCache.filter(p => p.insumo_id === id);
  if (enUso.length > 0) {
    alert(`No se puede eliminar "${i.nombre}": está vinculado a ${enUso.length} producto(s) (${enUso.map(p => p.nombre).join(', ')}). Cámbialos de insumo primero desde Productos.`);
    return;
  }
  if (!(await confirmarApp(`¿Eliminar el insumo "${i.nombre}"?`))) return;
  await sb.from('insumos').delete().eq('id', id);
  if (insumoEditandoId === id) cancelarEdicionInsumo();
  await cargarInsumosAdmin();
}

document.getElementById('form-nuevo-insumo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = document.getElementById('nuevo-insumo-nombre').value.trim();
  const unidad = document.getElementById('nuevo-insumo-unidad').value;
  const stockMinimo = Number(document.getElementById('nuevo-insumo-stock-minimo').value) || 0;
  const unidadesPorCaja = Number(document.getElementById('nuevo-insumo-unidades-caja').value) || null;
  const contenidoPorUnidad = unidad === 'ml' ? (Number(document.getElementById('nuevo-insumo-contenido').value) || null) : null;
  if (!nombre) return;
  if (insumoEditandoId) {
    await sb.from('insumos').update({ nombre, unidad, stock_minimo: stockMinimo, unidades_por_caja: unidadesPorCaja, contenido_por_unidad: contenidoPorUnidad }).eq('id', insumoEditandoId);
  } else {
    const stockInicial = unidadesPorCaja
      ? cantidadDesdeCajas({ unidad, unidades_por_caja: unidadesPorCaja, contenido_por_unidad: contenidoPorUnidad },
          Number(document.getElementById('nuevo-insumo-stock-cajas').value) || 0,
          Number(document.getElementById('nuevo-insumo-stock-sueltas').value) || 0)
      : Number(document.getElementById('nuevo-insumo-stock').value) || 0;
    await sb.from('insumos').insert({ nombre, unidad, stock_minimo: stockMinimo, stock_bodega: stockInicial, unidades_por_caja: unidadesPorCaja, contenido_por_unidad: contenidoPorUnidad });
  }
  cancelarEdicionInsumo();
  await cargarInsumosAdmin();
  poblarSelectInsumos();
});

// --- Auditoria / conteo fisico de insumos ---
let conteoUbicacionActual = null;

function iniciarConteo(ubicacion) {
  if (insumosCache.length === 0) { alert('No hay insumos registrados todavía.'); return; }
  conteoUbicacionActual = ubicacion;
  const etiqueta = ubicacion === 'bodega' ? '🏬 Bodega' : '🍾 Barra';
  document.getElementById('titulo-panel-conteo').textContent = `Conteo físico — ${etiqueta}`;
  document.getElementById('conteo-insumo-nota').value = '';
  const campo = ubicacion === 'bodega' ? 'stock_bodega' : 'stock_barra';
  document.getElementById('lista-conteo-insumos').innerHTML = insumosCache.map(i => {
    const unidadTexto = i.unidad === 'ml' ? 'ml' : 'u.';
    if (i.unidades_por_caja) {
      return `
    <div class="fila-conteo-insumo fila-conteo-cajas">
      <span class="fila-conteo-nombre">${i.nombre} <small>(teórico: ${i[campo]}${unidadTexto}${etiquetaEmpaqueInsumo(i)})</small></span>
      <div class="conteo-cajas-inputs">
        <input type="number" class="campo-conteo-cajas" id="conteo-cajas-${i.id}" placeholder="Cajas" value="0" min="0" step="1" oninput="actualizarTotalConteoCaja(${i.id})">
        <input type="number" class="campo-conteo-sueltas" id="conteo-sueltas-${i.id}" placeholder="Sueltas" value="0" min="0" step="1" oninput="actualizarTotalConteoCaja(${i.id})">
        <span class="conteo-total-calculado" id="conteo-total-${i.id}">= 0${unidadTexto}</span>
      </div>
    </div>`;
    }
    return `
    <div class="fila-conteo-insumo">
      <span class="fila-conteo-nombre">${i.nombre} <small>(teórico: ${i[campo]}${unidadTexto})</small></span>
      <input type="number" class="campo-conteo-fisico" id="conteo-fisico-${i.id}" value="${i[campo]}" min="0" step="0.01">
    </div>`;
  }).join('');
  document.getElementById('panel-conteo-insumos').classList.remove('oculto');
  document.getElementById('panel-conteo-insumos').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function actualizarTotalConteoCaja(insumoId) {
  const i = insumosCache.find(x => x.id === insumoId);
  if (!i) return;
  const cajas = Number(document.getElementById(`conteo-cajas-${insumoId}`).value) || 0;
  const sueltas = Number(document.getElementById(`conteo-sueltas-${insumoId}`).value) || 0;
  const total = cantidadDesdeCajas(i, cajas, sueltas);
  const unidadTexto = i.unidad === 'ml' ? 'ml' : 'u.';
  document.getElementById(`conteo-total-${insumoId}`).textContent = `= ${total}${unidadTexto}`;
}

function cancelarConteo() {
  conteoUbicacionActual = null;
  document.getElementById('panel-conteo-insumos').classList.add('oculto');
}

async function guardarConteoInsumos() {
  if (!conteoUbicacionActual) return;
  const items = insumosCache.map(i => {
    let cantidadFisica;
    if (i.unidades_por_caja) {
      const cajas = Number(document.getElementById(`conteo-cajas-${i.id}`).value) || 0;
      const sueltas = Number(document.getElementById(`conteo-sueltas-${i.id}`).value) || 0;
      cantidadFisica = cantidadDesdeCajas(i, cajas, sueltas);
    } else {
      cantidadFisica = Number(document.getElementById(`conteo-fisico-${i.id}`).value) || 0;
    }
    return { insumo_id: i.id, cantidad_fisica: cantidadFisica };
  });
  const nota = document.getElementById('conteo-insumo-nota').value.trim() || null;
  const { error } = await sb.rpc('guardar_conteo_insumo', { p_ubicacion: conteoUbicacionActual, p_items: items, p_nota: nota });
  if (error) { alert('No se pudo guardar el conteo: ' + error.message); return; }
  cancelarConteo();
  await cargarInsumosAdmin();
  await cargarHistorialConteos();
}

async function cargarHistorialConteos() {
  const cont = document.getElementById('lista-historial-conteos');
  if (!cont) return;
  const { data: conteos, error } = await sb.from('conteos_insumo').select('*').order('creado_en', { ascending: false }).limit(20);
  if (error) { console.error(error); return; }
  if (!conteos || conteos.length === 0) {
    document.getElementById('resumen-historial-conteos').textContent = 'Sin auditorías registradas';
    cont.innerHTML = '<p class="texto-vacio">Todavía no se ha hecho ningún conteo.</p>';
    return;
  }
  document.getElementById('resumen-historial-conteos').textContent = `${conteos.length} conteo${conteos.length === 1 ? '' : 's'} registrados`;

  const { data: detalles } = await sb.from('conteos_insumo_detalle').select('*').in('conteo_id', conteos.map(c => c.id));
  const mapaInsumosNombre = Object.fromEntries(insumosCache.map(i => [i.id, i]));
  const numero = (n) => Math.round(Number(n) * 100) / 100;

  cont.innerHTML = conteos.map(c => {
    const fecha = new Date(c.creado_en);
    const fechaTexto = `${fecha.toLocaleDateString('es-CL')} · ${fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
    const misDetalles = (detalles || []).filter(d => d.conteo_id === c.id);
    const conDiferencia = misDetalles
      .filter(d => Number(d.diferencia) !== 0)
      .map(d => ({ ...d, nombre: mapaInsumosNombre[d.insumo_id]?.nombre || `Insumo #${d.insumo_id}` }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    const etiqueta = c.ubicacion === 'bodega' ? '🏬 Bodega' : '🍾 Barra';
    const filasDiferencia = conDiferencia.length === 0
      ? '<p class="texto-vacio">Sin diferencias — el conteo coincidió con el teórico.</p>'
      : conDiferencia.map(d => {
          const insumo = mapaInsumosNombre[d.insumo_id];
          const unidadTexto = insumo ? (insumo.unidad === 'unidades' ? 'u.' : insumo.unidad) : 'ml';
          const signo = Number(d.diferencia) > 0 ? '+' : '';
          const clase = Number(d.diferencia) < 0 ? 'texto-stock-agotado' : 'texto-stock-bajo';
          return `<div class="fila-diferencia-conteo">
            <div class="diferencia-cabecera">
              <span class="diferencia-nombre">${d.nombre}</span>
              <span class="${clase}">${signo}${numero(d.diferencia)}${unidadTexto}</span>
            </div>
            <div class="diferencia-detalle">teórico ${numero(d.cantidad_teorica)} → físico ${numero(d.cantidad_fisica)}</div>
          </div>`;
        }).join('');
    return `
      <div class="fila-admin fila-historial-conteo">
        <div class="miniatura">${conDiferencia.length > 0 ? '⚠️' : '✅'}</div>
        <div class="info-admin">
          <strong>${etiqueta} · ${fechaTexto}</strong>
          <span>${misDetalles.length} insumo${misDetalles.length === 1 ? '' : 's'} contados · ${conDiferencia.length} con diferencia${c.nota ? ` · "${c.nota}"` : ''}</span>
          ${filasDiferencia}
        </div>
      </div>`;
  }).join('');
}

async function cargarHistorialCompras() {
  const cont = document.getElementById('lista-historial-compras');
  if (!cont) return;
  const { data: compras, error } = await sb.from('compras_insumo').select('*').order('creado_en', { ascending: false }).limit(30);
  if (error) { console.error(error); return; }
  if (!compras || compras.length === 0) {
    document.getElementById('resumen-historial-compras').textContent = 'Sin compras registradas';
    cont.innerHTML = '<p class="texto-vacio">Todavía no se ha registrado ninguna reposición de bodega.</p>';
    return;
  }
  document.getElementById('resumen-historial-compras').textContent = `${compras.length} reposición${compras.length === 1 ? '' : 'es'} registrada${compras.length === 1 ? '' : 's'}`;
  const mapaInsumosNombre = Object.fromEntries(insumosCache.map(i => [i.id, i]));
  const numero = (n) => Math.round(Number(n) * 100) / 100;
  cont.innerHTML = compras.map(c => {
    const insumo = mapaInsumosNombre[c.insumo_id];
    const unidadTexto = insumo ? (insumo.unidad === 'unidades' ? 'u.' : insumo.unidad) : '';
    const fecha = new Date(c.creado_en);
    const fechaTexto = `${fecha.toLocaleDateString('es-CL')} · ${fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
    return `
      <div class="fila-admin">
        <div class="miniatura">📥</div>
        <div class="info-admin">
          <strong>${insumo ? insumo.nombre : `Insumo #${c.insumo_id}`}</strong>
          <span>+${numero(c.cantidad)}${unidadTexto} · ${fechaTexto}</span>
        </div>
      </div>`;
  }).join('');
}

function actualizarModoStockProducto() {
  const modo = document.getElementById('nuevo-producto-modo-stock').value;
  document.getElementById('campo-producto-inventario-wrap').classList.toggle('oculto', modo !== 'propio');
  document.getElementById('campo-producto-insumo-wrap').classList.toggle('oculto', modo !== 'insumo');
}

function editarProducto(id) {
  const p = productosAdminCache.find(x => x.id === id);
  if (!p) return;
  productoEditandoId = id;
  productoEditandoFotoUrl = p.foto_url;
  document.getElementById('nuevo-producto-nombre').value = p.nombre;
  document.getElementById('nuevo-producto-categoria').value = p.categoria_id;
  document.getElementById('nuevo-producto-cocina').checked = p.prepara_cocina !== false;
  document.getElementById('nuevo-producto-costo').value = p.costo ? Number(p.costo).toLocaleString('es-CO') : '';
  document.getElementById('nuevo-producto-precio').value = p.precio ? Number(p.precio).toLocaleString('es-CO') : '';
  document.getElementById('nuevo-producto-inventario').value = p.inventario;
  const modoStock = p.insumo_id ? 'insumo' : (p.controla_stock ? 'propio' : 'ninguno');
  document.getElementById('nuevo-producto-modo-stock').value = modoStock;
  poblarSelectInsumos();
  if (p.insumo_id) document.getElementById('nuevo-producto-insumo').value = p.insumo_id;
  document.getElementById('nuevo-producto-consumo').value = p.consumo_insumo ?? '';
  actualizarModoStockProducto();
  document.getElementById('titulo-form-producto').textContent = `✏️ Editando: ${p.nombre}`;
  document.getElementById('btn-guardar-producto').textContent = '💾 Guardar cambios';
  document.getElementById('btn-cancelar-producto').classList.remove('oculto');
  actualizarMargenProducto();
  actualizarCalculadoraPrecio();
  const previewWrap = document.getElementById('preview-foto-producto-wrap');
  if (p.foto_url) {
    document.getElementById('preview-foto-producto').src = p.foto_url;
    previewWrap.classList.remove('oculto');
  } else {
    previewWrap.classList.add('oculto');
  }
  document.getElementById('form-nuevo-producto').scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('nuevo-producto-nombre').focus();
}

function cancelarEdicionProducto() {
  productoEditandoId = null;
  productoEditandoFotoUrl = null;
  archivoFotoAjustado = null;
  document.getElementById('form-nuevo-producto').reset();
  document.getElementById('titulo-form-producto').textContent = '🍽️ Nuevo producto';
  document.getElementById('btn-guardar-producto').textContent = '+ Agregar producto';
  document.getElementById('btn-cancelar-producto').classList.add('oculto');
  document.getElementById('preview-foto-producto-wrap').classList.add('oculto');
  document.getElementById('margen-producto-info').classList.add('oculto');
  document.getElementById('nuevo-producto-modo-stock').value = 'ninguno';
  actualizarModoStockProducto();
  actualizarCalculadoraPrecio();
}

function valorNumericoInput(id) {
  return Number(document.getElementById(id).value.replace(/\D/g, '')) || 0;
}

function formatearMilesEnInput(e) {
  const input = e.target;
  const cursor = input.selectionStart;
  const digitosAntes = input.value.slice(0, cursor).replace(/\D/g, '').length;
  const soloDigitos = input.value.replace(/\D/g, '');
  input.value = soloDigitos ? Number(soloDigitos).toLocaleString('es-CO') : '';
  let contados = 0, nuevaPos = input.value.length;
  for (let i = 0; i < input.value.length; i++) {
    if (/\d/.test(input.value[i])) contados++;
    if (contados === digitosAntes) { nuevaPos = i + 1; break; }
  }
  if (digitosAntes === 0) nuevaPos = 0;
  input.setSelectionRange(nuevaPos, nuevaPos);
}

function actualizarMargenProducto() {
  const costo = valorNumericoInput('nuevo-producto-costo');
  const precio = valorNumericoInput('nuevo-producto-precio');
  const info = document.getElementById('margen-producto-info');
  if (!costo && !precio) { info.classList.add('oculto'); return; }
  const margen = precio - costo;
  const pct = precio > 0 ? Math.round((margen / precio) * 100) : 0;
  document.getElementById('margen-producto-monto').textContent = formatoMoneda(margen);
  document.getElementById('margen-producto-pct').textContent = `(${pct}%)`;
  info.classList.remove('oculto');
  info.classList.toggle('margen-negativo', margen <= 0);
}

function alEscribirMontoProducto(e) {
  formatearMilesEnInput(e);
  actualizarMargenProducto();
}
document.getElementById('nuevo-producto-costo').addEventListener('input', alEscribirMontoProducto);
document.getElementById('nuevo-producto-precio').addEventListener('input', alEscribirMontoProducto);

function actualizarCalculadoraPrecio() {
  const costo = valorNumericoInput('nuevo-producto-costo');
  const pct = Number(document.getElementById('calc-precio-pct').value);
  const btnUsarPrecio = document.getElementById('btn-usar-precio-sugerido');
  document.getElementById('calc-precio-pct-valor').textContent = `${pct}%`;
  if (!costo) {
    document.getElementById('calc-precio-sugerido').textContent = 'Ingresa el costo para ver el precio sugerido';
    btnUsarPrecio.disabled = true;
    delete btnUsarPrecio.dataset.precio;
    return;
  }
  const precioSugerido = Math.round(costo / (1 - pct / 100));
  document.getElementById('calc-precio-sugerido').innerHTML = `Precio sugerido: <strong>${formatoMoneda(precioSugerido)}</strong>`;
  btnUsarPrecio.disabled = false;
  btnUsarPrecio.dataset.precio = precioSugerido;
}
document.getElementById('calc-precio-pct').addEventListener('input', actualizarCalculadoraPrecio);
document.getElementById('nuevo-producto-costo').addEventListener('input', actualizarCalculadoraPrecio);
document.getElementById('btn-usar-precio-sugerido').addEventListener('click', function () {
  if (!this.dataset.precio) return;
  document.getElementById('nuevo-producto-precio').value = Number(this.dataset.precio).toLocaleString('es-CO');
  actualizarMargenProducto();
});

// Encuentra el grupo de pixeles "contenido" conectados entre si mas grande dentro
// de la mascara, y devuelve su recuadro. Usa una pila en vez de recursion para
// no desbordar el stack con fotos grandes.
function componenteMasGrande(mascara, w, h) {
  const visitado = new Uint8Array(w * h);
  let mejorTam = 0;
  let mejor = null;
  const pila = [];
  for (let inicio = 0; inicio < mascara.length; inicio++) {
    if (!mascara[inicio] || visitado[inicio]) continue;
    let minX = w, maxX = -1, minY = h, maxY = -1, tam = 0;
    pila.length = 0;
    pila.push(inicio);
    visitado[inicio] = 1;
    while (pila.length) {
      const idx = pila.pop();
      const x = idx % w, y = (idx / w) | 0;
      tam++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && mascara[idx - 1] && !visitado[idx - 1]) { visitado[idx - 1] = 1; pila.push(idx - 1); }
      if (x < w - 1 && mascara[idx + 1] && !visitado[idx + 1]) { visitado[idx + 1] = 1; pila.push(idx + 1); }
      if (y > 0 && mascara[idx - w] && !visitado[idx - w]) { visitado[idx - w] = 1; pila.push(idx - w); }
      if (y < h - 1 && mascara[idx + w] && !visitado[idx + w]) { visitado[idx + w] = 1; pila.push(idx + w); }
    }
    if (tam > mejorTam) { mejorTam = tam; mejor = { minX, maxX, minY, maxY }; }
  }
  return mejor;
}

// Recorta la foto al contenido real (ignorando fondo blanco/transparente) y la centra
// en un lienzo de proporcion 1.25 con relleno parejo, para que todas las fotos del
// menu se vean con el mismo tamano relativo sin importar el encuadre original.
async function ajustarFotoProducto(archivo) {
  try {
    const bitmap = await createImageBitmap(archivo);
    const w = bitmap.width, h = bitmap.height;
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = w; srcCanvas.height = h;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.drawImage(bitmap, 0, 0);
    const { data } = srcCtx.getImageData(0, 0, w, h);

    const esquinas = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4];
    const alphaProm = esquinas.reduce((s, i) => s + data[i + 3], 0) / 4;
    const esTransparente = alphaProm < 200;
    const refR = data[0], refG = data[1], refB = data[2];

    const umbralAlpha = 20;
    const umbralColor = 22;
    const mascara = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const esContenido = esTransparente
          ? data[i + 3] > umbralAlpha
          : (Math.abs(data[i] - refR) + Math.abs(data[i + 1] - refG) + Math.abs(data[i + 2] - refB)) > umbralColor;
        if (esContenido) mascara[y * w + x] = 1;
      }
    }

    // Se queda solo con el grupo de pixeles conectados mas grande, para ignorar
    // elementos sueltos y chicos (marcas de agua, insignias, manchas) que no son
    // el producto en si.
    const bbox = componenteMasGrande(mascara, w, h);
    if (!bbox) return archivo;
    const { minX, maxX, minY, maxY } = bbox;

    const bboxW = maxX - minX + 1;
    const bboxH = maxY - minY + 1;
    const RATIO_OBJETIVO = 1.25;
    const RELLENO_MIN = 0.86; // el producto ocupa como maximo ~86% de cada lado, dejando margen
    // Calcula el lienzo final segun el lado que necesite mas espacio (alto o ancho),
    // para que funcione igual de bien con productos angostos (botellas) y anchos (sanguches).
    const finalH = Math.round(Math.max(bboxH / RELLENO_MIN, bboxW / (RELLENO_MIN * RATIO_OBJETIVO)));
    const finalW = Math.round(finalH * RATIO_OBJETIVO);

    // Tope de resolucion de salida: en la app nunca se muestra una foto de producto
    // a mas de unos cientos de px, asi que subir el original a resolucion completa
    // del celular (varios MB) solo gasta espacio de almacenamiento y datos moviles.
    const MAX_LADO = 1000;
    const escala = finalW > MAX_LADO ? MAX_LADO / finalW : 1;
    const finalWSalida = Math.round(finalW * escala);
    const finalHSalida = Math.round(finalH * escala);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = finalWSalida; outCanvas.height = finalHSalida;
    const outCtx = outCanvas.getContext('2d');
    if (!esTransparente) {
      // Si el fondo detectado se aleja bastante del blanco puro, se usa blanco puro
      // igual (el mismo que el fondo de las tarjetas del menu), para que todas las
      // fotos se vean sobre el mismo tono en vez de cada una con su propio matiz.
      const desvioDeBlanco = Math.abs(refR - 255) + Math.abs(refG - 255) + Math.abs(refB - 255);
      const colorRelleno = desvioDeBlanco < 30 ? [refR, refG, refB] : [255, 255, 255];
      outCtx.fillStyle = `rgb(${colorRelleno[0]},${colorRelleno[1]},${colorRelleno[2]})`;
      outCtx.fillRect(0, 0, finalWSalida, finalHSalida);
    }
    const destW = Math.round(bboxW * escala);
    const destH = Math.round(bboxH * escala);
    const destX = Math.round((finalWSalida - destW) / 2);
    const destY = Math.round((finalHSalida - destH) / 2);
    outCtx.drawImage(srcCanvas, minX, minY, bboxW, bboxH, destX, destY, destW, destH);

    const tipoSalida = esTransparente ? 'image/png' : 'image/jpeg';
    const blob = await new Promise(res => outCanvas.toBlob(res, tipoSalida, 0.85));
    if (!blob) return archivo;
    const nombreBase = archivo.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${nombreBase}.${esTransparente ? 'png' : 'jpg'}`, { type: tipoSalida });
  } catch (err) {
    console.error('No se pudo ajustar la foto automaticamente, se sube tal cual:', err);
    return archivo;
  }
}

async function limitarResolucionImagen(archivo, maxLado) {
  try {
    const bitmap = await createImageBitmap(archivo);
    const w = bitmap.width, h = bitmap.height;
    const ladoMayor = Math.max(w, h);
    if (ladoMayor <= maxLado) return archivo;
    const escala = maxLado / ladoMayor;
    const nuevoW = Math.round(w * escala);
    const nuevoH = Math.round(h * escala);
    const canvas = document.createElement('canvas');
    canvas.width = nuevoW; canvas.height = nuevoH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, nuevoW, nuevoH);
    const tipo = archivo.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise(res => canvas.toBlob(res, tipo, 0.85));
    if (!blob) return archivo;
    return new File([blob], archivo.name, { type: tipo });
  } catch (err) {
    console.error('No se pudo reducir la imagen', err);
    return archivo;
  }
}

document.getElementById('btn-limpiar-fotos').addEventListener('click', async () => {
  const btn = document.getElementById('btn-limpiar-fotos');
  const resultado = document.getElementById('resultado-limpieza-fotos');
  if (!(await confirmarApp('Esto va a borrar fotos de productos que ya no se usan y a reducir el tamaño de las que sí. Puede tardar unos minutos si hay muchas fotos. ¿Continuar?'))) return;

  btn.disabled = true;
  btn.textContent = 'Procesando...';
  resultado.classList.add('oculto', 'mensaje-error');

  try {
    const { data: archivos, error: errorListar } = await sb.storage.from('productos').list('', { limit: 1000 });
    if (errorListar) throw errorListar;
    const { data: productosConFoto, error: errorProductos } = await sb.from('productos').select('id, foto_url').not('foto_url', 'is', null);
    if (errorProductos) throw errorProductos;

    const rutasEnUso = new Set(productosConFoto.map(p => rutaStorageProducto(p.foto_url)).filter(Boolean));
    const huerfanos = (archivos || []).map(a => a.name).filter(nombre => !rutasEnUso.has(nombre));

    let huerfanosEliminados = 0;
    if (huerfanos.length > 0) {
      const { error: errorBorrar } = await sb.storage.from('productos').remove(huerfanos);
      if (!errorBorrar) huerfanosEliminados = huerfanos.length;
    }

    let fotosOptimizadas = 0;
    let pesoAntes = 0;
    let pesoDespues = 0;
    for (const p of productosConFoto) {
      const ruta = rutaStorageProducto(p.foto_url);
      if (!ruta || !rutasEnUso.has(ruta)) continue;
      try {
        const { data: blobOriginal, error: errorDescarga } = await sb.storage.from('productos').download(ruta);
        if (errorDescarga || !blobOriginal) continue;
        if (blobOriginal.size < 150 * 1024) continue;
        const archivoOriginal = new File([blobOriginal], ruta.split('/').pop(), { type: blobOriginal.type });
        const reducido = await limitarResolucionImagen(archivoOriginal, 1000);
        if (!reducido || reducido.size >= blobOriginal.size) continue;
        const nuevaRuta = `${Date.now()}-${archivoOriginal.name}`;
        const { error: errorSubida } = await sb.storage.from('productos').upload(nuevaRuta, reducido);
        if (errorSubida) continue;
        const nuevaUrl = sb.storage.from('productos').getPublicUrl(nuevaRuta).data.publicUrl;
        const { error: errorUpdate } = await sb.from('productos').update({ foto_url: nuevaUrl }).eq('id', p.id);
        if (errorUpdate) { sb.storage.from('productos').remove([nuevaRuta]); continue; }
        await sb.storage.from('productos').remove([ruta]);
        fotosOptimizadas++;
        pesoAntes += blobOriginal.size;
        pesoDespues += reducido.size;
      } catch (err) { console.error('Error optimizando foto', ruta, err); }
    }

    const ahorradoKB = Math.round((pesoAntes - pesoDespues) / 1024);
    resultado.textContent = `Listo: ${huerfanosEliminados} foto(s) huérfana(s) eliminada(s), ${fotosOptimizadas} foto(s) optimizada(s)` + (ahorradoKB > 0 ? ` (ahorraste ${ahorradoKB} KB)` : '') + '.';
    resultado.classList.remove('oculto');
    await cargarProductosAdmin();
    cargarCategoriasYProductos();
  } catch (err) {
    resultado.textContent = 'Ocurrió un problema: ' + (err.message || err);
    resultado.classList.remove('oculto');
    resultado.classList.add('mensaje-error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Limpiar y optimizar fotos';
  }
});

function poblarSelectCategorias() {
  const select = document.getElementById('nuevo-producto-categoria');
  select.innerHTML = categoriasDb.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
}

let archivoFotoAjustado = null;

document.getElementById('nuevo-producto-foto').addEventListener('change', async (e) => {
  const archivo = e.target.files[0];
  archivoFotoAjustado = null;
  if (!archivo) return;
  const previewWrap = document.getElementById('preview-foto-producto-wrap');
  archivoFotoAjustado = await ajustarFotoProducto(archivo);
  document.getElementById('preview-foto-producto').src = URL.createObjectURL(archivoFotoAjustado);
  previewWrap.classList.remove('oculto');
});

document.getElementById('form-nuevo-producto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = document.getElementById('nuevo-producto-nombre').value.trim();
  const categoriaId = document.getElementById('nuevo-producto-categoria').value;
  const costo = valorNumericoInput('nuevo-producto-costo');
  const precio = valorNumericoInput('nuevo-producto-precio');
  const inventario = Number(document.getElementById('nuevo-producto-inventario').value) || 0;
  const preparaCocina = document.getElementById('nuevo-producto-cocina').checked;
  const archivoFoto = document.getElementById('nuevo-producto-foto').files[0];
  const modoStock = document.getElementById('nuevo-producto-modo-stock').value;
  const controlaStock = modoStock === 'propio';
  const insumoId = modoStock === 'insumo' ? Number(document.getElementById('nuevo-producto-insumo').value) || null : null;
  const consumoInsumo = modoStock === 'insumo' ? (Number(document.getElementById('nuevo-producto-consumo').value) || null) : null;
  if (modoStock === 'insumo' && (!insumoId || !consumoInsumo)) {
    alert('Elige el insumo y la cantidad que consume por unidad vendida.');
    return;
  }

  if (precio > 0 && precio <= costo) {
    const continuar = await confirmarApp(`El precio de venta (${formatoMoneda(precio)}) es menor o igual al costo (${formatoMoneda(costo)}). ¿Guardar de todas formas? Por ejemplo, si es una promoción.`);
    if (!continuar) return;
  }

  let fotoUrl = productoEditandoId ? productoEditandoFotoUrl : null;
  if (archivoFoto) {
    const fotoUrlAnterior = fotoUrl;
    const archivoParaSubir = archivoFotoAjustado || archivoFoto;
    const ruta = `${Date.now()}-${archivoParaSubir.name}`;
    const { error: errorSubida } = await sb.storage.from('productos').upload(ruta, archivoParaSubir);
    if (!errorSubida) {
      fotoUrl = sb.storage.from('productos').getPublicUrl(ruta).data.publicUrl;
      const rutaAnterior = rutaStorageProducto(fotoUrlAnterior);
      if (rutaAnterior) sb.storage.from('productos').remove([rutaAnterior]);
    }
  }

  const datos = {
    nombre, categoria_id: categoriaId, costo, precio, inventario, foto_url: fotoUrl, prepara_cocina: preparaCocina,
    controla_stock: controlaStock, insumo_id: insumoId, consumo_insumo: consumoInsumo,
  };
  if (productoEditandoId) {
    const original = productosAdminCache.find(p => p.id === productoEditandoId);
    const cambioDeCategoria = original && String(original.categoria_id) !== String(categoriaId);
    if (cambioDeCategoria) {
      const enNuevaCategoria = productosAdminCache.filter(p => String(p.categoria_id) === String(categoriaId));
      datos.orden_categoria = Math.max(0, ...enNuevaCategoria.map(p => p.orden_categoria ?? 0)) + 1;
    }
    await sb.from('productos').update(datos).eq('id', productoEditandoId);
  } else {
    const enMismaCategoria = productosAdminCache.filter(p => String(p.categoria_id) === String(categoriaId));
    datos.orden_categoria = Math.max(0, ...enMismaCategoria.map(p => p.orden_categoria ?? 0)) + 1;
    await sb.from('productos').insert(datos);
  }

  cancelarEdicionProducto();
  cargarCategoriasYProductos();
  cerrarDashboard();
});

let categoriaEditandoId = null;

function renderCategoriasAdmin() {
  const cont = document.getElementById('lista-admin-categorias');
  cont.innerHTML = '';
  const ordenadas = [...categoriasDb].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  ordenadas.forEach((c, i) => {
    const fila = document.createElement('div');
    fila.className = 'fila-admin';
    fila.innerHTML = `
      <div class="miniatura">📂</div>
      <div class="info-admin"><strong>${c.nombre}</strong></div>
      <div class="acciones-fila-admin">
        <button class="btn-editar-admin" ${i === 0 ? 'disabled' : ''} onclick="moverCategoria(${c.id}, -1)">▲</button>
        <button class="btn-editar-admin" ${i === ordenadas.length - 1 ? 'disabled' : ''} onclick="moverCategoria(${c.id}, 1)">▼</button>
        <button class="btn-editar-admin" onclick="editarCategoria(${c.id})">✏️</button>
        <button class="btn-toggle-visible" onclick="eliminarCategoria(${c.id})">🗑️</button>
      </div>`;
    cont.appendChild(fila);
  });
}

function editarCategoria(id) {
  const c = categoriasDb.find(x => x.id === id);
  if (!c) return;
  categoriaEditandoId = id;
  document.getElementById('nueva-categoria-nombre').value = c.nombre;
  document.getElementById('btn-guardar-categoria').textContent = '💾 Guardar cambios';
  document.getElementById('btn-cancelar-categoria').classList.remove('oculto');
  document.getElementById('nueva-categoria-nombre').focus();
}

function cancelarEdicionCategoria() {
  categoriaEditandoId = null;
  document.getElementById('nueva-categoria-nombre').value = '';
  document.getElementById('btn-guardar-categoria').textContent = '+ Agregar categoría';
  document.getElementById('btn-cancelar-categoria').classList.add('oculto');
}

async function moverCategoria(id, direccion) {
  const ordenadas = [...categoriasDb].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const i = ordenadas.findIndex(c => c.id === id);
  const j = i + direccion;
  if (j < 0 || j >= ordenadas.length) return;
  const a = ordenadas[i], b = ordenadas[j];
  const ordenA = a.orden ?? 0, ordenB = b.orden ?? 0;
  await sb.from('categorias').update({ orden: ordenB }).eq('id', a.id);
  await sb.from('categorias').update({ orden: ordenA }).eq('id', b.id);
  await cargarCategoriasYProductos();
  renderCategoriasAdmin();
}

async function eliminarCategoria(id) {
  const c = categoriasDb.find(x => x.id === id);
  if (!c) return;
  const { count } = await sb.from('productos').select('id', { count: 'exact', head: true }).eq('categoria_id', id);
  if (count > 0) {
    alert(`No se puede eliminar "${c.nombre}": todavía tiene ${count} producto(s) asignado(s). Cámbialos de categoría primero desde Productos.`);
    return;
  }
  if (!(await confirmarApp(`¿Eliminar la categoría "${c.nombre}"?`))) return;
  await sb.from('categorias').delete().eq('id', id);
  if (categoriaEditandoId === id) cancelarEdicionCategoria();
  await cargarCategoriasYProductos();
  renderCategoriasAdmin();
  poblarSelectCategorias();
}

document.getElementById('form-nueva-categoria').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombreInput = document.getElementById('nueva-categoria-nombre');
  const nombre = nombreInput.value.trim();
  if (!nombre) return;
  if (categoriaEditandoId) {
    await sb.from('categorias').update({ nombre }).eq('id', categoriaEditandoId);
  } else {
    const siguienteOrden = categoriasDb.length > 0 ? Math.max(...categoriasDb.map(c => c.orden)) + 1 : 1;
    await sb.from('categorias').insert({ nombre, orden: siguienteOrden });
  }
  cancelarEdicionCategoria();
  await cargarCategoriasYProductos();
  renderCategoriasAdmin();
  poblarSelectCategorias();
});

let notaRapidaEditandoId = null;

function renderNotasRapidasAdmin() {
  const cont = document.getElementById('lista-admin-notas-rapidas');
  if (!cont) return;
  cont.innerHTML = '';
  notasRapidas.forEach((n, i) => {
    const fila = document.createElement('div');
    fila.className = 'fila-admin';
    fila.innerHTML = `
      <div class="miniatura">📝</div>
      <div class="info-admin"><strong>${n.texto}</strong></div>
      <div class="acciones-fila-admin">
        <button class="btn-editar-admin" ${i === 0 ? 'disabled' : ''} onclick="moverNotaRapida(${n.id}, -1)">▲</button>
        <button class="btn-editar-admin" ${i === notasRapidas.length - 1 ? 'disabled' : ''} onclick="moverNotaRapida(${n.id}, 1)">▼</button>
        <button class="btn-editar-admin" onclick="editarNotaRapidaAdmin(${n.id})">✏️</button>
        <button class="btn-toggle-visible" onclick="eliminarNotaRapidaAdmin(${n.id})">🗑️</button>
      </div>`;
    cont.appendChild(fila);
  });
}

function editarNotaRapidaAdmin(id) {
  const n = notasRapidas.find(x => x.id === id);
  if (!n) return;
  notaRapidaEditandoId = id;
  document.getElementById('nueva-nota-rapida-texto').value = n.texto;
  document.getElementById('btn-guardar-nota-rapida').textContent = '💾 Guardar cambios';
  document.getElementById('btn-cancelar-nota-rapida').classList.remove('oculto');
  document.getElementById('nueva-nota-rapida-texto').focus();
}

function cancelarEdicionNotaRapida() {
  notaRapidaEditandoId = null;
  document.getElementById('nueva-nota-rapida-texto').value = '';
  document.getElementById('btn-guardar-nota-rapida').textContent = '+ Agregar';
  document.getElementById('btn-cancelar-nota-rapida').classList.add('oculto');
}

async function moverNotaRapida(id, direccion) {
  const i = notasRapidas.findIndex(n => n.id === id);
  const j = i + direccion;
  if (j < 0 || j >= notasRapidas.length) return;
  const a = notasRapidas[i], b = notasRapidas[j];
  const ordenA = a.orden ?? 0, ordenB = b.orden ?? 0;
  await sb.from('notas_rapidas').update({ orden: ordenB }).eq('id', a.id);
  await sb.from('notas_rapidas').update({ orden: ordenA }).eq('id', b.id);
  await cargarNotasRapidas();
  renderNotasRapidasAdmin();
}

async function eliminarNotaRapidaAdmin(id) {
  const n = notasRapidas.find(x => x.id === id);
  if (!n) return;
  if (!(await confirmarApp(`¿Eliminar la nota rápida "${n.texto}"?`))) return;
  await sb.from('notas_rapidas').delete().eq('id', id);
  if (notaRapidaEditandoId === id) cancelarEdicionNotaRapida();
  await cargarNotasRapidas();
  renderNotasRapidasAdmin();
}

document.getElementById('form-nueva-nota-rapida').addEventListener('submit', async (e) => {
  e.preventDefault();
  const textoInput = document.getElementById('nueva-nota-rapida-texto');
  const texto = textoInput.value.trim();
  if (!texto) return;
  if (notaRapidaEditandoId) {
    await sb.from('notas_rapidas').update({ texto }).eq('id', notaRapidaEditandoId);
  } else {
    const siguienteOrden = notasRapidas.length > 0 ? Math.max(...notasRapidas.map(n => n.orden)) + 1 : 1;
    await sb.from('notas_rapidas').insert({ texto, orden: siguienteOrden });
  }
  cancelarEdicionNotaRapida();
  await cargarNotasRapidas();
  renderNotasRapidasAdmin();
});

let gastoRapidoEditandoId = null;

function renderGastosRapidosAdmin() {
  const cont = document.getElementById('lista-admin-gastos-rapidos');
  if (!cont) return;
  cont.innerHTML = '';
  gastosRapidos.forEach((g, i) => {
    const fila = document.createElement('div');
    fila.className = 'fila-admin';
    fila.innerHTML = `
      <div class="miniatura">🧾</div>
      <div class="info-admin"><strong>${g.texto}</strong></div>
      <div class="acciones-fila-admin">
        <button class="btn-editar-admin" ${i === 0 ? 'disabled' : ''} onclick="moverGastoRapido(${g.id}, -1)">▲</button>
        <button class="btn-editar-admin" ${i === gastosRapidos.length - 1 ? 'disabled' : ''} onclick="moverGastoRapido(${g.id}, 1)">▼</button>
        <button class="btn-editar-admin" onclick="editarGastoRapidoAdmin(${g.id})">✏️</button>
        <button class="btn-toggle-visible" onclick="eliminarGastoRapidoAdmin(${g.id})">🗑️</button>
      </div>`;
    cont.appendChild(fila);
  });
}

function editarGastoRapidoAdmin(id) {
  const g = gastosRapidos.find(x => x.id === id);
  if (!g) return;
  gastoRapidoEditandoId = id;
  document.getElementById('nuevo-gasto-rapido-texto').value = g.texto;
  document.getElementById('btn-guardar-gasto-rapido').textContent = '💾 Guardar cambios';
  document.getElementById('btn-cancelar-gasto-rapido').classList.remove('oculto');
  document.getElementById('nuevo-gasto-rapido-texto').focus();
}

function cancelarEdicionGastoRapido() {
  gastoRapidoEditandoId = null;
  document.getElementById('nuevo-gasto-rapido-texto').value = '';
  document.getElementById('btn-guardar-gasto-rapido').textContent = '+ Agregar';
  document.getElementById('btn-cancelar-gasto-rapido').classList.add('oculto');
}

async function moverGastoRapido(id, direccion) {
  const i = gastosRapidos.findIndex(g => g.id === id);
  const j = i + direccion;
  if (j < 0 || j >= gastosRapidos.length) return;
  const a = gastosRapidos[i], b = gastosRapidos[j];
  const ordenA = a.orden ?? 0, ordenB = b.orden ?? 0;
  await sb.from('gastos_rapidos').update({ orden: ordenB }).eq('id', a.id);
  await sb.from('gastos_rapidos').update({ orden: ordenA }).eq('id', b.id);
  await cargarGastosRapidos();
  renderGastosRapidosAdmin();
}

async function eliminarGastoRapidoAdmin(id) {
  const g = gastosRapidos.find(x => x.id === id);
  if (!g) return;
  if (!(await confirmarApp(`¿Eliminar el gasto rápido "${g.texto}"?`))) return;
  await sb.from('gastos_rapidos').delete().eq('id', id);
  if (gastoRapidoEditandoId === id) cancelarEdicionGastoRapido();
  await cargarGastosRapidos();
  renderGastosRapidosAdmin();
}

document.getElementById('form-nuevo-gasto-rapido').addEventListener('submit', async (e) => {
  e.preventDefault();
  const textoInput = document.getElementById('nuevo-gasto-rapido-texto');
  const texto = textoInput.value.trim();
  if (!texto) return;
  if (gastoRapidoEditandoId) {
    await sb.from('gastos_rapidos').update({ texto }).eq('id', gastoRapidoEditandoId);
  } else {
    const siguienteOrden = gastosRapidos.length > 0 ? Math.max(...gastosRapidos.map(g => g.orden)) + 1 : 1;
    await sb.from('gastos_rapidos').insert({ texto, orden: siguienteOrden });
  }
  cancelarEdicionGastoRapido();
  await cargarGastosRapidos();
  renderGastosRapidosAdmin();
});

let top20AdminCache = [];

document.getElementById('buscar-top20-disponible').addEventListener('input', renderTop20Admin);

async function cargarTop20Admin() {
  const { data } = await sb.from('productos').select('*, categorias(nombre)').eq('visible', true).order('id');
  top20AdminCache = data || [];
  renderTop20Admin();
}

function renderTop20Admin() {
  const enTop20 = top20AdminCache
    .filter(p => p.top20)
    .sort((a, b) => (a.orden_top20 ?? 0) - (b.orden_top20 ?? 0));
  let disponibles = top20AdminCache.filter(p => !p.top20);
  const q = normalizarTexto(document.getElementById('buscar-top20-disponible').value.trim());
  if (q) disponibles = disponibles.filter(p => normalizarTexto(p.nombre).includes(q));

  const contActual = document.getElementById('lista-top20-actual');
  contActual.innerHTML = enTop20.length
    ? ''
    : '<p style="color:#666">Aún no has agregado productos al Top20.</p>';
  enTop20.forEach((p, i) => {
    const miniatura = p.foto_url ? `<img class="foto-producto" src="${p.foto_url}" alt="">` : (p.icono || '🍽️');
    const fila = document.createElement('div');
    fila.className = 'fila-admin';
    fila.innerHTML = `
      <div class="miniatura">${miniatura}</div>
      <div class="info-admin"><strong>${p.nombre}</strong><span>${p.categorias?.nombre || ''}</span></div>
      <div class="acciones-fila-admin">
        <button class="btn-editar-admin" ${i === 0 ? 'disabled' : ''} onclick="moverTop20(${p.id}, -1)">▲</button>
        <button class="btn-editar-admin" ${i === enTop20.length - 1 ? 'disabled' : ''} onclick="moverTop20(${p.id}, 1)">▼</button>
        <button class="btn-toggle-visible" onclick="quitarDeTop20(${p.id})">✕ Quitar</button>
      </div>`;
    contActual.appendChild(fila);
  });

  const contDisponibles = document.getElementById('lista-top20-disponibles');
  contDisponibles.innerHTML = '';
  disponibles.forEach(p => {
    const miniatura = p.foto_url ? `<img class="foto-producto" src="${p.foto_url}" alt="">` : (p.icono || '🍽️');
    const fila = document.createElement('div');
    fila.className = 'fila-admin';
    fila.innerHTML = `
      <div class="miniatura">${miniatura}</div>
      <div class="info-admin"><strong>${p.nombre}</strong><span>${p.categorias?.nombre || ''}</span></div>
      <button class="btn-toggle-visible" onclick="agregarATop20(${p.id})">+ Agregar</button>`;
    contDisponibles.appendChild(fila);
  });

  const encabezado = document.querySelector('#modal-dashboard .dashboard-fijo');
  const buscadorFijo = document.getElementById('buscador-fijo-top20');
  if (encabezado && buscadorFijo) buscadorFijo.style.top = `${encabezado.offsetHeight}px`;
}

async function agregarATop20(id) {
  const siguienteOrden = Math.max(0, ...top20AdminCache.filter(p => p.top20).map(p => p.orden_top20 ?? 0)) + 1;
  await sb.from('productos').update({ top20: true, orden_top20: siguienteOrden }).eq('id', id);
  await cargarTop20Admin();
  cargarCategoriasYProductos();
}

async function quitarDeTop20(id) {
  await sb.from('productos').update({ top20: false, orden_top20: null }).eq('id', id);
  await cargarTop20Admin();
  cargarCategoriasYProductos();
}

async function moverTop20(id, direccion) {
  const enTop20 = top20AdminCache.filter(p => p.top20).sort((a, b) => (a.orden_top20 ?? 0) - (b.orden_top20 ?? 0));
  const i = enTop20.findIndex(p => p.id === id);
  const j = i + direccion;
  if (j < 0 || j >= enTop20.length) return;
  const a = enTop20[i], b = enTop20[j];
  const ordenA = a.orden_top20 ?? 0, ordenB = b.orden_top20 ?? 0;
  await sb.from('productos').update({ orden_top20: ordenB }).eq('id', a.id);
  await sb.from('productos').update({ orden_top20: ordenA }).eq('id', b.id);
  await cargarTop20Admin();
  cargarCategoriasYProductos();
}

let ordenAdminCache = [];
let categoriaOrdenActiva = null;

async function cargarOrdenAdmin() {
  const { data } = await sb.from('productos').select('*, categorias(nombre)').eq('visible', true).order('orden_categoria');
  ordenAdminCache = data || [];
  if (!categoriaOrdenActiva || !categoriasDb.some(c => c.nombre === categoriaOrdenActiva)) {
    categoriaOrdenActiva = categoriasDb[0]?.nombre || null;
  }
  renderTabsOrdenAdmin();
  renderOrdenAdmin();
}

function renderTabsOrdenAdmin() {
  const tabs = document.getElementById('tabs-orden-categorias');
  tabs.innerHTML = '';
  categoriasDb.forEach(c => {
    const btn = document.createElement('button');
    btn.textContent = c.nombre;
    btn.className = c.nombre === categoriaOrdenActiva ? 'activa' : '';
    btn.onclick = () => { categoriaOrdenActiva = c.nombre; renderTabsOrdenAdmin(); renderOrdenAdmin(); };
    tabs.appendChild(btn);
  });
}

function listaOrdenCategoriaActiva() {
  return ordenAdminCache
    .filter(p => p.categorias?.nombre === categoriaOrdenActiva)
    .sort((a, b) => (a.orden_categoria ?? a.id) - (b.orden_categoria ?? b.id));
}

function renderOrdenAdmin() {
  const cont = document.getElementById('lista-orden-productos');
  cont.innerHTML = '';
  const lista = listaOrdenCategoriaActiva();
  if (!lista.length) {
    cont.innerHTML = '<p style="color:#666">No hay productos visibles en esta categoría.</p>';
    return;
  }
  lista.forEach((p, i) => {
    const miniatura = p.foto_url ? `<img class="foto-producto" src="${p.foto_url}" alt="">` : (p.icono || '🍽️');
    const fila = document.createElement('div');
    fila.className = 'fila-admin';
    fila.innerHTML = `
      <div class="miniatura">${miniatura}</div>
      <div class="info-admin"><strong>${p.nombre}</strong></div>
      <div class="acciones-fila-admin">
        <button class="btn-editar-admin" ${i === 0 ? 'disabled' : ''} onclick="moverOrdenCategoria(${p.id}, -1)">▲</button>
        <button class="btn-editar-admin" ${i === lista.length - 1 ? 'disabled' : ''} onclick="moverOrdenCategoria(${p.id}, 1)">▼</button>
      </div>`;
    cont.appendChild(fila);
  });
}

async function moverOrdenCategoria(id, direccion) {
  const lista = listaOrdenCategoriaActiva();
  const i = lista.findIndex(p => p.id === id);
  const j = i + direccion;
  if (j < 0 || j >= lista.length) return;
  const a = lista[i], b = lista[j];
  const ordenA = a.orden_categoria ?? a.id, ordenB = b.orden_categoria ?? b.id;
  await sb.from('productos').update({ orden_categoria: ordenB }).eq('id', a.id);
  await sb.from('productos').update({ orden_categoria: ordenA }).eq('id', b.id);
  await cargarOrdenAdmin();
  cargarCategoriasYProductos();
}
