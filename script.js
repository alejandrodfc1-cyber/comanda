const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const NEGOCIO_NOMBRE = 'La Españita';
const NEGOCIO_DIRECCION = 'Av. Francia 512 - Valparaíso';
let negocioTelefono = '';

async function cargarConfiguracion() {
  const { data } = await sb.from('configuracion').select('valor').eq('clave', 'telefono').single();
  negocioTelefono = data?.valor || '';
  const input = document.getElementById('config-telefono');
  if (input) input.value = negocioTelefono;
}

document.getElementById('form-telefono-negocio').addEventListener('submit', async (e) => {
  e.preventDefault();
  const valor = document.getElementById('config-telefono').value.trim();
  await sb.from('configuracion').update({ valor }).eq('clave', 'telefono');
  negocioTelefono = valor;
});

let MENU = [];
let CATEGORIAS = ['Top20'];
let categoriasDb = [];
let TOP20_IDS = [];

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

  TOP20_IDS = (productos || [])
    .filter(p => p.top20)
    .sort((a, b) => (a.orden_top20 ?? 0) - (b.orden_top20 ?? 0))
    .map(p => p.id);

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
  if (haySesion) { cargarMesas(); cargarCategoriasYProductos(); cargarConfiguracion(); }
});

async function cargarMesas() {
  const { data, error } = await sb.from('mesas').select('*').eq('visible', true).order('id');
  if (error) { console.error(error); return; }
  mesas = data;
  if (mesaActivaId && !mesaActiva()) {
    cerrarModalMenu();
  }
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
    btn.onclick = () => { categoriaActiva = cat; renderTabsMenu(); renderGaleriaMenu(); };
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
  const { error } = await sb.from('mesas').update({ pedido: mesa.pedido }).eq('id', mesa.id);
  if (error) console.error(error);
}

function agregarPlato(platoId) {
  const mesa = mesaActiva();
  if (!mesa) return;
  const plato = MENU.find(p => p.id === platoId);
  const item = mesa.pedido.find(i => i.id === platoId);
  if (item) item.cantidad++;
  else mesa.pedido.push({ id: plato.id, nombre: plato.nombre, precio: plato.precio, icono: plato.icono, foto_url: plato.foto_url, cantidad: 1 });
  renderPedido();
  guardarPedido(mesa);
}

function cambiarCantidad(platoId, delta) {
  const mesa = mesaActiva();
  if (!mesa) return;
  const item = mesa.pedido.find(i => i.id === platoId);
  item.cantidad += delta;
  if (item.cantidad <= 0) mesa.pedido = mesa.pedido.filter(i => i.id !== platoId);
  renderPedido();
  guardarPedido(mesa);
}

function eliminarDelPedido(platoId) {
  const mesa = mesaActiva();
  if (!mesa) return;
  mesa.pedido = mesa.pedido.filter(i => i.id !== platoId);
  renderPedido();
  guardarPedido(mesa);
}

function renderPedido() {
  const mesa = mesaActiva();
  if (!mesa) return;
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
  if (!mesa) return;
  if (mesa.pedido.length === 0) {
    alert('La mesa no tiene pedidos.');
    return;
  }

  const { data: venta } = await sb.from('ventas').insert({
    mesa_id: mesa.id, items: mesa.pedido, total: totalMesa(mesa)
  }).select().single();

  mostrarRecibo(mesa, venta?.id);

  mesa.pedido.forEach(item => sb.rpc('incrementar_conteo', { p_id: item.id, cant: item.cantidad }));
  mesa.pedido = [];
  await guardarPedido(mesa);

  cerrarModalMenu();
}

let reciboActual = null;

function mostrarRecibo(mesa, numeroRecibo) {
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString('es-CL');
  const hora = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const total = totalMesa(mesa);
  const propina = Math.round(total * 0.10);
  const etiquetaMesa = mesa.nombre || mesa.id;

  reciboActual = { pedido: [...mesa.pedido], numeroRecibo, fecha, hora, total, propina, etiquetaMesa };

  const filasItems = mesa.pedido.map(item => `
    <div class="recibo-fila">
      <span>${item.nombre}</span>
      <span>${item.cantidad} x ${formatoMoneda(item.precio)}</span>
    </div>`).join('');

  document.getElementById('recibo').innerHTML = `
    <div class="recibo-nombre-negocio">${NEGOCIO_NOMBRE}</div>
    <div class="recibo-centrado">${NEGOCIO_DIRECCION}</div>
    <div class="recibo-centrado">${negocioTelefono}</div>
    <div class="recibo-mesa-grande">MESA : ${etiquetaMesa}</div>
    <hr>
    <div>Recibo N.° ${numeroRecibo ?? ''}</div>
    <div>${fecha} · ${hora}</div>
    <hr>
    ${filasItems}
    <hr>
    <div class="recibo-fila recibo-total-grande"><span>Total</span><span>${formatoMoneda(total)}</span></div>
    <div class="recibo-fila"><span>Propina sugerida (10%)</span><span>${formatoMoneda(propina)}</span></div>
    <div class="recibo-fila"><span>Total con propina</span><span>${formatoMoneda(total + propina)}</span></div>
    <hr>
    <div class="recibo-centrado">¡Gracias por tu visita!</div>
  `;
  document.getElementById('modal-recibo').classList.remove('oculto');
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
  t += `${FUENTE_B}Recibo N.° ${r.numeroRecibo ?? ''}\n`;
  t += `${r.fecha} · ${r.hora}${FUENTE_A}\n`;
  t += separador;
  t += FUENTE_B;
  r.pedido.forEach(item => {
    const cantidadPrecio = `${item.cantidad} x ${formatoMoneda(item.precio)}`;
    t += fila(item.nombre, cantidadPrecio, ANCHO_FUENTE_B);
  });
  t += FUENTE_A;
  t += separador;
  t += `${BOLD_ON}${fila('Total', formatoMoneda(r.total))}${BOLD_OFF}`;
  t += fila('Propina sugerida (10%)', formatoMoneda(r.propina));
  t += fila('Total con propina', formatoMoneda(r.total + r.propina));
  t += separador;
  t += centrar('¡Gracias por tu visita!');

  const textoCodificado = encodeURI(t);
  window.location.href = `intent:${textoCodificado}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
}

function abrirDashboard() {
  document.getElementById('modal-dashboard').classList.remove('oculto');
  mostrarSeccionDashboard('mesas');
  cancelarEdicionMesa();
  cancelarEdicionProducto();
  cargarMesasAdmin();
  cargarProductosAdmin();
  renderCategoriasAdmin();
  poblarSelectCategorias();
}

function cerrarDashboard() {
  document.getElementById('modal-dashboard').classList.add('oculto');
}

let seccionActivaDashboard = 'mesas';

function mostrarSeccionDashboard(seccion) {
  seccionActivaDashboard = seccion;
  ['mesas', 'productos', 'categorias', 'top20'].forEach(s => {
    document.getElementById(`seccion-admin-${s}`).classList.toggle('oculto', s !== seccion);
    document.getElementById(`tab-admin-${s}`).classList.toggle('activa', s === seccion);
  });
  const fab = document.getElementById('btn-guardar-flotante');
  fab.classList.toggle('oculto', seccion === 'categorias' || seccion === 'top20');
  if (seccion === 'top20') cargarTop20Admin();
}

function guardarDesdeFlotante() {
  const formId = { mesas: 'form-nueva-mesa', productos: 'form-nuevo-producto' }[seccionActivaDashboard];
  if (formId) document.getElementById(formId).requestSubmit();
}

let mesasAdminCache = [];
let mesaEditandoId = null;

async function cargarMesasAdmin() {
  const { data } = await sb.from('mesas').select('*').order('id');
  mesasAdminCache = data || [];
  renderMesasAdmin(mesasAdminCache);
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
      <div class="acciones-fila-admin">
        <button class="btn-editar-admin" onclick="editarMesa(${mesa.id})">✏️</button>
        <button class="btn-toggle-visible" onclick="toggleVisibleMesa(${mesa.id}, ${mesa.visible})">${mesa.visible ? '👁️ Visible' : '🚫 Oculta'}</button>
      </div>`;
    cont.appendChild(fila);
  });
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
    const { data } = await sb.from('mesas').select('id').order('id', { ascending: false }).limit(1);
    const siguienteId = data && data.length > 0 ? data[0].id + 1 : 1;
    await sb.from('mesas').insert({ id: siguienteId, nombre, pedido: [] });
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
  renderProductosAdmin(productosAdminCache);
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
      <div class="acciones-fila-admin">
        <button class="btn-editar-admin" onclick="editarProducto(${p.id})">✏️</button>
        <button class="btn-toggle-visible" onclick="toggleVisibleProducto(${p.id}, ${p.visible})">${p.visible ? '👁️ Visible' : '🚫 Oculto'}</button>
      </div>`;
    cont.appendChild(fila);
  });
}

async function toggleVisibleProducto(id, actual) {
  await sb.from('productos').update({ visible: !actual }).eq('id', id);
  cargarProductosAdmin();
}

function editarProducto(id) {
  const p = productosAdminCache.find(x => x.id === id);
  if (!p) return;
  productoEditandoId = id;
  productoEditandoFotoUrl = p.foto_url;
  document.getElementById('nuevo-producto-nombre').value = p.nombre;
  document.getElementById('nuevo-producto-categoria').value = p.categoria_id;
  document.getElementById('nuevo-producto-costo').value = p.costo;
  document.getElementById('nuevo-producto-precio').value = p.precio;
  document.getElementById('nuevo-producto-inventario').value = p.inventario;
  document.getElementById('titulo-form-producto').textContent = `Editando: ${p.nombre}`;
  document.getElementById('btn-guardar-producto').textContent = '💾 Guardar cambios';
  document.getElementById('btn-cancelar-producto').classList.remove('oculto');
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
  document.getElementById('form-nuevo-producto').reset();
  document.getElementById('titulo-form-producto').textContent = 'Nuevo producto';
  document.getElementById('btn-guardar-producto').textContent = '+ Agregar producto';
  document.getElementById('btn-cancelar-producto').classList.add('oculto');
  document.getElementById('preview-foto-producto-wrap').classList.add('oculto');
}

function poblarSelectCategorias() {
  const select = document.getElementById('nuevo-producto-categoria');
  select.innerHTML = categoriasDb.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
}

document.getElementById('nuevo-producto-foto').addEventListener('change', (e) => {
  const archivo = e.target.files[0];
  if (!archivo) return;
  const previewWrap = document.getElementById('preview-foto-producto-wrap');
  document.getElementById('preview-foto-producto').src = URL.createObjectURL(archivo);
  previewWrap.classList.remove('oculto');
});

document.getElementById('form-nuevo-producto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = document.getElementById('nuevo-producto-nombre').value.trim();
  const categoriaId = document.getElementById('nuevo-producto-categoria').value;
  const costo = Number(document.getElementById('nuevo-producto-costo').value) || 0;
  const precio = Number(document.getElementById('nuevo-producto-precio').value) || 0;
  const inventario = Number(document.getElementById('nuevo-producto-inventario').value) || 0;
  const archivoFoto = document.getElementById('nuevo-producto-foto').files[0];

  let fotoUrl = productoEditandoId ? productoEditandoFotoUrl : null;
  if (archivoFoto) {
    const ruta = `${Date.now()}-${archivoFoto.name}`;
    const { error: errorSubida } = await sb.storage.from('productos').upload(ruta, archivoFoto);
    if (!errorSubida) {
      fotoUrl = sb.storage.from('productos').getPublicUrl(ruta).data.publicUrl;
    }
  }

  const datos = { nombre, categoria_id: categoriaId, costo, precio, inventario, foto_url: fotoUrl };
  if (productoEditandoId) {
    await sb.from('productos').update(datos).eq('id', productoEditandoId);
  } else {
    await sb.from('productos').insert(datos);
  }

  cancelarEdicionProducto();
  cargarCategoriasYProductos();
  cerrarDashboard();
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

let top20AdminCache = [];

async function cargarTop20Admin() {
  const { data } = await sb.from('productos').select('*, categorias(nombre)').eq('visible', true).order('id');
  top20AdminCache = data || [];
  renderTop20Admin();
}

function renderTop20Admin() {
  const enTop20 = top20AdminCache
    .filter(p => p.top20)
    .sort((a, b) => (a.orden_top20 ?? 0) - (b.orden_top20 ?? 0));
  const disponibles = top20AdminCache.filter(p => !p.top20);

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
