const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
  if (!confirm(`¿Cambiar a Turno ${siguienteTurno}?`)) return;
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
  if (!confirm('¿Cerrar sesión?')) return;
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
  document.getElementById('barra-superior').classList.toggle('oculto', !haySesion);
  if (haySesion) { cargarMesas(); cargarCategoriasYProductos(); cargarConfiguracion(); }
});

async function cargarMesas() {
  const { data, error } = await sb.from('mesas').select('*').eq('visible', true).order('orden');
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
  if (error) console.error(error);
}

function agregarPlato(platoId) {
  const mesa = mesaActiva();
  if (!mesa) return;
  const plato = MENU.find(p => p.id === platoId);
  const item = mesa.pedido.find(i => i.id === platoId);
  if (mesa.pedido.length === 0 && !mesa.abierta_en) mesa.abierta_en = new Date().toISOString();
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

  const duracionMinutos = mesa.abierta_en
    ? Math.round((Date.now() - new Date(mesa.abierta_en).getTime()) / 60000)
    : null;

  const { data: venta } = await sb.from('ventas').insert({
    mesa_id: mesa.id, items: mesa.pedido, total: totalMesa(mesa), duracion_minutos: duracionMinutos, turno: Number(turnoActivo)
  }).select().single();

  mostrarRecibo(mesa, venta?.id);

  mesa.pedido.forEach(item => sb.rpc('incrementar_conteo', { p_id: item.id, cant: item.cantidad }));
  mesa.pedido = [];
  mesa.abierta_en = null;
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
  const MAX_NOMBRE_PRODUCTO = 18;
  r.pedido.forEach(item => {
    const nombreCorto = item.nombre.length > MAX_NOMBRE_PRODUCTO
      ? item.nombre.slice(0, MAX_NOMBRE_PRODUCTO - 1) + '…'
      : item.nombre;
    const cantidadPrecio = `${item.cantidad} x ${item.precio.toLocaleString('es-CO')}`;
    t += fila(nombreCorto, cantidadPrecio);
  });
  t += separador;
  const MEDIO_ESPACIO = '\x1B\x4A\x0C';
  const soloNumero = (n) => n.toLocaleString('es-CO');
  t += `${BOLD_ON}${fila('Total $', soloNumero(r.total))}${BOLD_OFF}`;
  t += MEDIO_ESPACIO;
  t += fila('Propina sugerida (10%) $', soloNumero(r.propina));
  t += fila('Total con propina $', soloNumero(r.total + r.propina));
  t += separador;
  t += centrar('¡Gracias por tu visita!');

  const textoCodificado = encodeURI(t);
  window.location.href = `intent:${textoCodificado}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
}

function abrirDashboard() {
  document.getElementById('modal-dashboard').classList.remove('oculto');
  mostrarSeccionDashboard('metricas');
  cancelarEdicionMesa();
  cancelarEdicionProducto();
  cancelarEdicionCategoria();
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
  ['mesas', 'productos', 'categorias', 'top20', 'orden', 'metricas', 'config'].forEach(s => {
    document.getElementById(`seccion-admin-${s}`).classList.toggle('oculto', s !== seccion);
    document.getElementById(`tab-admin-${s}`).classList.toggle('activa', s === seccion);
  });
  document.querySelector('#modal-dashboard .modal-caja').scrollTop = 0;
  const fab = document.getElementById('btn-guardar-flotante');
  fab.classList.toggle('oculto', seccion === 'categorias' || seccion === 'top20' || seccion === 'orden' || seccion === 'metricas' || seccion === 'config' || seccion === 'mesas');
  if (seccion === 'top20') cargarTop20Admin();
  if (seccion === 'orden') cargarOrdenAdmin();
  if (seccion === 'metricas') { cargarMetricas(); cargarComparativas(); }
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
    document.getElementById('anchor-periodo-top').insertAdjacentElement('afterend', bloque);
  } else {
    document.getElementById('comparativas-rapidas').insertAdjacentElement('afterend', bloque);
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

async function cargarMetricas() {
  const desde = inicioPeriodo(periodoMetricas);
  let query = sb.from('ventas').select('mesa_id, items, total, creado_en, duracion_minutos').order('creado_en', { ascending: true });
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

  ventas.forEach(v => {
    const etiquetaMesa = mapaMesas[v.mesa_id] || `Mesa ${v.mesa_id}`;
    if (!tallyMesas[v.mesa_id]) tallyMesas[v.mesa_id] = { etiqueta: etiquetaMesa, veces: 0, monto: 0 };
    tallyMesas[v.mesa_id].veces += 1;
    tallyMesas[v.mesa_id].monto += Number(v.total);

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

  document.getElementById('metrica-total-vendido').textContent = formatoMoneda(Math.round(totalVendido));
  document.getElementById('metrica-n-ventas').textContent = nVentas;
  document.getElementById('metrica-ticket-promedio').textContent = formatoMoneda(Math.round(ticketPromedio));
  document.getElementById('metrica-ganancia').textContent = formatoMoneda(Math.round(ganancia));
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
  const listaCats = document.getElementById('lista-categorias-metricas');
  listaCats.innerHTML = categoriasOrdenadas.length === 0
    ? '<p class="texto-vacio">Sin ventas en este período</p>'
    : categoriasOrdenadas.map(([nombre, monto]) => `
      <div class="barra-categoria">
        <div class="barra-categoria-etiqueta"><span>${nombre}</span><span>${formatoMoneda(Math.round(monto))}</span></div>
        <div class="barra-categoria-fondo"><div class="barra-categoria-relleno" style="width:${maxCategoria ? (monto / maxCategoria * 100) : 0}%"></div></div>
      </div>`).join('');

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
  if (!confirm(aviso)) return;
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

function filaProductoAdminHtml(p) {
  const utilidad = p.precio - p.costo;
  const miniatura = p.foto_url ? `<img class="foto-producto" src="${p.foto_url}" alt="">` : (p.icono || '🍽️');
  const fila = document.createElement('div');
  fila.className = 'fila-admin' + (p.visible ? '' : ' oculta-item');
  fila.innerHTML = `
    <div class="miniatura">${miniatura}</div>
    <div class="info-admin">
      <strong>${p.nombre}</strong>
      <span>Costo ${formatoMoneda(p.costo)} · Venta ${formatoMoneda(p.precio)} · Utilidad ${formatoMoneda(utilidad)} · Stock ${p.inventario}</span>
    </div>
    <div class="acciones-fila-admin">
      <button class="btn-editar-admin" onclick="editarProducto(${p.id})">✏️</button>
      <button class="btn-toggle-visible" onclick="toggleVisibleProducto(${p.id}, ${p.visible})">${p.visible ? '👁️ Visible' : '🚫 Oculto'}</button>
      <button class="btn-toggle-visible" onclick="eliminarProducto(${p.id})">🗑️</button>
    </div>`;
  return fila;
}

async function eliminarProducto(id) {
  const p = productosAdminCache.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`¿Eliminar definitivamente "${p.nombre}"?\n\nEsta acción no se puede deshacer. Las ventas ya registradas conservan su historial igual, pero el producto dejará de existir en el catálogo (Top20, Orden Menú, etc).`)) return;
  const { error } = await sb.from('productos').delete().eq('id', id);
  if (error) {
    alert('No se pudo eliminar: ' + error.message);
    return;
  }
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
  archivoFotoAjustado = null;
  document.getElementById('form-nuevo-producto').reset();
  document.getElementById('titulo-form-producto').textContent = 'Nuevo producto';
  document.getElementById('btn-guardar-producto').textContent = '+ Agregar producto';
  document.getElementById('btn-cancelar-producto').classList.add('oculto');
  document.getElementById('preview-foto-producto-wrap').classList.add('oculto');
}

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

    const outCanvas = document.createElement('canvas');
    outCanvas.width = finalW; outCanvas.height = finalH;
    const outCtx = outCanvas.getContext('2d');
    if (!esTransparente) {
      // Si el fondo detectado se aleja bastante del blanco puro, se usa blanco puro
      // igual (el mismo que el fondo de las tarjetas del menu), para que todas las
      // fotos se vean sobre el mismo tono en vez de cada una con su propio matiz.
      const desvioDeBlanco = Math.abs(refR - 255) + Math.abs(refG - 255) + Math.abs(refB - 255);
      const colorRelleno = desvioDeBlanco < 30 ? [refR, refG, refB] : [255, 255, 255];
      outCtx.fillStyle = `rgb(${colorRelleno[0]},${colorRelleno[1]},${colorRelleno[2]})`;
      outCtx.fillRect(0, 0, finalW, finalH);
    }
    const destX = Math.round((finalW - bboxW) / 2);
    const destY = Math.round((finalH - bboxH) / 2);
    outCtx.drawImage(srcCanvas, minX, minY, bboxW, bboxH, destX, destY, bboxW, bboxH);

    const tipoSalida = esTransparente ? 'image/png' : 'image/jpeg';
    const blob = await new Promise(res => outCanvas.toBlob(res, tipoSalida, 0.9));
    if (!blob) return archivo;
    const nombreBase = archivo.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${nombreBase}.${esTransparente ? 'png' : 'jpg'}`, { type: tipoSalida });
  } catch (err) {
    console.error('No se pudo ajustar la foto automaticamente, se sube tal cual:', err);
    return archivo;
  }
}

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
  const costo = Number(document.getElementById('nuevo-producto-costo').value) || 0;
  const precio = Number(document.getElementById('nuevo-producto-precio').value) || 0;
  const inventario = Number(document.getElementById('nuevo-producto-inventario').value) || 0;
  const archivoFoto = document.getElementById('nuevo-producto-foto').files[0];

  let fotoUrl = productoEditandoId ? productoEditandoFotoUrl : null;
  if (archivoFoto) {
    const archivoParaSubir = archivoFotoAjustado || archivoFoto;
    const ruta = `${Date.now()}-${archivoParaSubir.name}`;
    const { error: errorSubida } = await sb.storage.from('productos').upload(ruta, archivoParaSubir);
    if (!errorSubida) {
      fotoUrl = sb.storage.from('productos').getPublicUrl(ruta).data.publicUrl;
    }
  }

  const datos = { nombre, categoria_id: categoriaId, costo, precio, inventario, foto_url: fotoUrl };
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
  if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return;
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
