const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let MENU = [];
let CATEGORIAS = ['Top20'];
let categoriasDb = [];

const TOP20_IDS = [1, 5, 16, 17, 46, 7, 2, 20, 47, 31, 9, 21, 48, 3, 34, 11, 25, 49, 8, 22];

async function cargarCategoriasYProductos() {
  const { data: cats } = await sb.from('categorias').select('*').order('orden');
  categoriasDb = cats || [];
  CATEGORIAS = ['Top20', ...categoriasDb.map(c => c.nombre)];

  const { data: productos } = await sb.from('productos').select('*').eq('visible', true).order('id');
  const mapaCategorias = Object.fromEntries(categoriasDb.map(c => [c.id, c.nombre]));
  MENU = (productos || []).map(p => ({
    id: p.id,
    nombre: p.nombre,
    precio: p.precio,
    icono: p.icono,
    foto_url: p.foto_url,
    categoria: mapaCategorias[p.categoria_id],
  }));

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

sb.auth.onAuthStateChange((_event, session) => {
  const haySesion = !!session;
  document.getElementById('vista-login').classList.toggle('oculto', haySesion);
  document.getElementById('vista-mesas').classList.toggle('oculto', !haySesion);
  if (haySesion) { cargarMesas(); cargarCategoriasYProductos(); }
});

async function cargarMesas() {
  const { data, error } = await sb.from('mesas').select('*').eq('visible', true).order('id');
  if (error) { console.error(error); return; }
  mesas = data;
  renderMesas();
}

sb
  .channel('mesas-cambios')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, cargarMesas)
  .subscribe();

function totalMesa(mesa) {
  return mesa.pedido.reduce((s, i) => s + i.precio * i.cantidad, 0);
}

function formatoMoneda(n) {
  return '$' + n.toLocaleString('es-CO');
}

function renderMesas() {
  const grid = document.getElementById('grid-mesas');
  grid.innerHTML = '';
  mesas.forEach(mesa => {
    const ocupada = mesa.pedido.length > 0;
    const btn = document.createElement('button');
    btn.className = 'mesa' + (ocupada ? ' ocupada' : '');
    const etiqueta = mesa.nombre || mesa.id;
    const claseEtiqueta = mesa.nombre ? 'numero-mesa etiqueta-texto' : 'numero-mesa';
    btn.innerHTML = `<span class="${claseEtiqueta}">${etiqueta}</span>` +
      (ocupada ? `<small>${formatoMoneda(totalMesa(mesa))}</small>` : '<small>Libre</small>');
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

function abrirModalMenu(mesaId) {
  mesaActivaId = mesaId;
  itemExpandidoId = null;
  categoriaActiva = 'Top20';
  vistaModal = mesaActiva().pedido.length > 0 ? 'detalle' : 'menu';
  document.getElementById('titulo-mesa').textContent = `Mesa ${mesaId}`;
  if (USAR_TOP20_AUTOMATICO) cargarTop20Automatico().then(renderGaleriaMenu);
  renderListaMenu();
  renderPedido();
  document.getElementById('modal-menu').classList.remove('oculto');
}

function cerrarModalMenu() {
  document.getElementById('modal-menu').classList.add('oculto');
  mesaActivaId = null;
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
  const enMenu = vistaModal === 'menu';
  document.getElementById('vista-menu-platos').classList.toggle('oculto', !enMenu);
  document.getElementById('vista-detalle-mesa').classList.toggle('oculto', enMenu);
  const mesa = mesaActiva();
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
    btn.onclick = () => { categoriaActiva = cat; renderTabsMenu(); renderGaleriaMenu(); };
    tabs.appendChild(btn);
  });
}

function renderGaleriaMenu() {
  const galeria = document.getElementById('galeria-menu');
  galeria.innerHTML = '';
  const mesa = mesaActiva();
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
  const { error } = await sb.from('mesas').update({ pedido: mesa.pedido }).eq('id', mesa.id);
  if (error) console.error(error);
}

function agregarPlato(platoId) {
  const mesa = mesaActiva();
  const plato = MENU.find(p => p.id === platoId);
  const item = mesa.pedido.find(i => i.id === platoId);
  if (item) item.cantidad++;
  else mesa.pedido.push({ id: plato.id, nombre: plato.nombre, precio: plato.precio, icono: plato.icono, foto_url: plato.foto_url, cantidad: 1 });
  renderPedido();
  guardarPedido(mesa);
}

function cambiarCantidad(platoId, delta) {
  const mesa = mesaActiva();
  const item = mesa.pedido.find(i => i.id === platoId);
  item.cantidad += delta;
  if (item.cantidad <= 0) mesa.pedido = mesa.pedido.filter(i => i.id !== platoId);
  renderPedido();
  guardarPedido(mesa);
}

function eliminarDelPedido(platoId) {
  const mesa = mesaActiva();
  mesa.pedido = mesa.pedido.filter(i => i.id !== platoId);
  renderPedido();
  guardarPedido(mesa);
}

function renderPedido() {
  const mesa = mesaActiva();
  const cont = document.getElementById('lista-pedido');
  cont.innerHTML = '';
  mesa.pedido.forEach(item => {
    const subtotal = item.precio * item.cantidad;
    const expandido = item.id === itemExpandidoId;
    const el = document.createElement('div');
    el.className = 'item-pedido';
    el.onclick = () => toggleExpandido(item.id);
    const iconoItemHtml = item.foto_url ? `<img src="${item.foto_url}" alt="">` : (item.icono || '🍽️');
    el.innerHTML = `
      <span class="item-icono">${iconoItemHtml}</span>
      <div class="item-info">
        <span class="item-nombre">${item.nombre}</span>
        <span class="item-detalle">${item.cantidad} x ${formatoMoneda(item.precio)}  Subtotal: ${formatoMoneda(subtotal)}</span>
      </div>
      ${expandido ? `
      <div class="item-acciones" onclick="event.stopPropagation()">
        <button class="btn-icono" onclick="cambiarCantidad(${item.id}, -1)">−</button>
        <span class="item-cantidad-num">${item.cantidad}</span>
        <button class="btn-icono" onclick="cambiarCantidad(${item.id}, 1)">+</button>
        <button class="btn-icono btn-eliminar" onclick="eliminarDelPedido(${item.id})" title="Quitar">🗑️</button>
      </div>` : ''}`;
    cont.appendChild(el);
  });
  const total = totalMesa(mesa);
  const propina = Math.round(total * 0.10);
  document.getElementById('total-pedido').textContent = formatoMoneda(total);
  document.getElementById('propina-pedido').textContent = formatoMoneda(propina);
  document.getElementById('total-con-propina').textContent = formatoMoneda(total + propina);
  actualizarVistaModal();
  renderGaleriaMenu();
}

async function cerrarMesa() {
  const mesa = mesaActiva();
  if (mesa.pedido.length === 0) {
    alert('La mesa no tiene pedidos.');
    return;
  }
  mostrarRecibo(mesa);

  await sb.from('ventas').insert({
    mesa_id: mesa.id, items: mesa.pedido, total: totalMesa(mesa)
  });
  mesa.pedido.forEach(item => sb.rpc('incrementar_conteo', { p_id: item.id, cant: item.cantidad }));
  mesa.pedido = [];
  await guardarPedido(mesa);

  document.getElementById('modal-menu').classList.add('oculto');
  mesaActivaId = null;
}

function mostrarRecibo(mesa) {
  const fecha = new Date().toLocaleString('es-CO');
  let texto = `      COMPROBANTE DE PAGO\n`;
  texto += `Mesa: ${mesa.id}\n`;
  texto += `Fecha: ${fecha}\n`;
  texto += `--------------------------------\n`;
  mesa.pedido.forEach(item => {
    const linea = `${item.cantidad}x ${item.nombre}`;
    const precio = formatoMoneda(item.precio * item.cantidad);
    texto += `${linea.padEnd(24)}${precio.padStart(8)}\n`;
  });
  const total = totalMesa(mesa);
  const propina = Math.round(total * 0.10);
  texto += `--------------------------------\n`;
  texto += `TOTAL:            ${formatoMoneda(total)}\n`;
  texto += `Propina (10%):    ${formatoMoneda(propina)}\n`;
  texto += `TOTAL + PROPINA:  ${formatoMoneda(total + propina)}\n`;
  texto += `--------------------------------\n`;
  texto += `      ¡Gracias por su visita!`;
  document.getElementById('recibo').textContent = texto;
  document.getElementById('modal-recibo').classList.remove('oculto');
}

function cerrarRecibo() {
  document.getElementById('modal-recibo').classList.add('oculto');
}

function abrirDashboard() {
  document.getElementById('modal-dashboard').classList.remove('oculto');
  mostrarSeccionDashboard('mesas');
  cargarMesasAdmin();
  cargarProductosAdmin();
  renderCategoriasAdmin();
  poblarSelectCategorias();
}

function cerrarDashboard() {
  document.getElementById('modal-dashboard').classList.add('oculto');
}

function mostrarSeccionDashboard(seccion) {
  ['mesas', 'productos', 'categorias'].forEach(s => {
    document.getElementById(`seccion-admin-${s}`).classList.toggle('oculto', s !== seccion);
    document.getElementById(`tab-admin-${s}`).classList.toggle('activa', s === seccion);
  });
}

async function cargarMesasAdmin() {
  const { data } = await sb.from('mesas').select('*').order('id');
  renderMesasAdmin(data || []);
}

function renderMesasAdmin(lista) {
  const cont = document.getElementById('lista-admin-mesas');
  cont.innerHTML = '';
  lista.forEach(mesa => {
    const fila = document.createElement('div');
    fila.className = 'fila-admin' + (mesa.visible ? '' : ' oculta-item');
    fila.innerHTML = `
      <div class="miniatura">${mesa.nombre ? '🏷️' : mesa.id}</div>
      <div class="info-admin">
        <strong>${mesa.nombre || `Mesa ${mesa.id}`}</strong>
        <span>${mesa.pedido.length > 0 ? 'Ocupada' : 'Libre'}</span>
      </div>
      <button class="btn-toggle-visible" onclick="toggleVisibleMesa(${mesa.id}, ${mesa.visible})">${mesa.visible ? '👁️ Visible' : '🚫 Oculta'}</button>`;
    cont.appendChild(fila);
  });
}

async function toggleVisibleMesa(id, actual) {
  await sb.from('mesas').update({ visible: !actual }).eq('id', id);
  cargarMesasAdmin();
  cargarMesas();
}

document.getElementById('form-nueva-mesa').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombreInput = document.getElementById('nueva-mesa-nombre');
  const nombre = nombreInput.value.trim() || null;
  const { data } = await sb.from('mesas').select('id').order('id', { ascending: false }).limit(1);
  const siguienteId = data && data.length > 0 ? data[0].id + 1 : 1;
  await sb.from('mesas').insert({ id: siguienteId, nombre, pedido: [] });
  nombreInput.value = '';
  cargarMesasAdmin();
  cargarMesas();
});

async function cargarProductosAdmin() {
  const { data } = await sb.from('productos').select('*, categorias(nombre)').order('id');
  renderProductosAdmin(data || []);
}

function renderProductosAdmin(lista) {
  const cont = document.getElementById('lista-admin-productos');
  cont.innerHTML = '';
  lista.forEach(p => {
    const utilidad = p.precio - p.costo;
    const miniatura = p.foto_url ? `<img class="foto-producto" src="${p.foto_url}" alt="">` : (p.icono || '🍽️');
    const fila = document.createElement('div');
    fila.className = 'fila-admin' + (p.visible ? '' : ' oculta-item');
    fila.innerHTML = `
      <div class="miniatura">${miniatura}</div>
      <div class="info-admin">
        <strong>${p.nombre}</strong>
        <span>${p.categorias?.nombre || ''} · Costo ${formatoMoneda(p.costo)} · Venta ${formatoMoneda(p.precio)} · Utilidad ${formatoMoneda(utilidad)} · Stock ${p.inventario}</span>
      </div>
      <button class="btn-toggle-visible" onclick="toggleVisibleProducto(${p.id}, ${p.visible})">${p.visible ? '👁️ Visible' : '🚫 Oculto'}</button>`;
    cont.appendChild(fila);
  });
}

async function toggleVisibleProducto(id, actual) {
  await sb.from('productos').update({ visible: !actual }).eq('id', id);
  cargarProductosAdmin();
}

function poblarSelectCategorias() {
  const select = document.getElementById('nuevo-producto-categoria');
  select.innerHTML = categoriasDb.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
}

document.getElementById('form-nuevo-producto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = document.getElementById('nuevo-producto-nombre').value.trim();
  const categoriaId = document.getElementById('nuevo-producto-categoria').value;
  const costo = Number(document.getElementById('nuevo-producto-costo').value) || 0;
  const precio = Number(document.getElementById('nuevo-producto-precio').value) || 0;
  const inventario = Number(document.getElementById('nuevo-producto-inventario').value) || 0;
  const archivoFoto = document.getElementById('nuevo-producto-foto').files[0];

  let fotoUrl = null;
  if (archivoFoto) {
    const ruta = `${Date.now()}-${archivoFoto.name}`;
    const { error: errorSubida } = await sb.storage.from('productos').upload(ruta, archivoFoto);
    if (!errorSubida) {
      fotoUrl = sb.storage.from('productos').getPublicUrl(ruta).data.publicUrl;
    }
  }

  await sb.from('productos').insert({
    nombre, categoria_id: categoriaId, costo, precio, inventario, foto_url: fotoUrl
  });

  e.target.reset();
  cargarProductosAdmin();
  cargarCategoriasYProductos();
});

function renderCategoriasAdmin() {
  const cont = document.getElementById('lista-admin-categorias');
  cont.innerHTML = '';
  categoriasDb.forEach(c => {
    const fila = document.createElement('div');
    fila.className = 'fila-admin';
    fila.innerHTML = `
      <div class="miniatura">📂</div>
      <div class="info-admin"><strong>${c.nombre}</strong></div>`;
    cont.appendChild(fila);
  });
}

document.getElementById('form-nueva-categoria').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombreInput = document.getElementById('nueva-categoria-nombre');
  const nombre = nombreInput.value.trim();
  if (!nombre) return;
  const siguienteOrden = categoriasDb.length > 0 ? Math.max(...categoriasDb.map(c => c.orden)) + 1 : 1;
  await sb.from('categorias').insert({ nombre, orden: siguienteOrden });
  nombreInput.value = '';
  await cargarCategoriasYProductos();
  renderCategoriasAdmin();
  poblarSelectCategorias();
});
