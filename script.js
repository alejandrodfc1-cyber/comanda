const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const MENU = [
  { id: 1, categoria: 'Comidas', nombre: 'Completo Italiano', precio: 2800, icono: '🌭' },
  { id: 2, categoria: 'Comidas', nombre: 'Completo Dinámico', precio: 3000, icono: '🌭' },
  { id: 3, categoria: 'Comidas', nombre: 'Completo Especial', precio: 3200, icono: '🌭' },
  { id: 4, categoria: 'Comidas', nombre: 'As Completo', precio: 3400, icono: '🌭' },
  { id: 5, categoria: 'Comidas', nombre: 'Barros Luco', precio: 3800, icono: '🥪' },
  { id: 6, categoria: 'Comidas', nombre: 'Barros Jarpa', precio: 3800, icono: '🥪' },
  { id: 7, categoria: 'Comidas', nombre: 'Chacarero', precio: 4000, icono: '🥪' },
  { id: 8, categoria: 'Comidas', nombre: 'Churrasco Italiano', precio: 4200, icono: '🥪' },
  { id: 9, categoria: 'Comidas', nombre: 'Ave Palta Mayo', precio: 3600, icono: '🥪' },
  { id: 10, categoria: 'Comidas', nombre: 'Chemilico', precio: 3500, icono: '🌭' },
  { id: 11, categoria: 'Comidas', nombre: 'Hot Dog Simple', precio: 2200, icono: '🌭' },
  { id: 12, categoria: 'Comidas', nombre: 'Completo a lo Pobre', precio: 3900, icono: '🌭' },
  { id: 13, categoria: 'Comidas', nombre: 'Sánguche de Pernil', precio: 4300, icono: '🥪' },
  { id: 14, categoria: 'Comidas', nombre: 'Lomito Completo', precio: 4500, icono: '🥪' },
  { id: 15, categoria: 'Comidas', nombre: 'Papas Fritas con Salsas', precio: 3000, icono: '🍟' },

  { id: 16, categoria: 'Cervezas', nombre: '1/2 Royal Shop', precio: 3500, icono: '🍺' },
  { id: 17, categoria: 'Cervezas', nombre: '1/2 Escudo Shop', precio: 3000, icono: '🍺' },
  { id: 18, categoria: 'Cervezas', nombre: '1/2 Cristal Shop', precio: 3000, icono: '🍺' },
  { id: 19, categoria: 'Cervezas', nombre: 'Litro Cristal Shop', precio: 5500, icono: '🍺' },
  { id: 20, categoria: 'Cervezas', nombre: 'Escudo Botella', precio: 2500, icono: '🍺' },
  { id: 21, categoria: 'Cervezas', nombre: 'Cristal Botella', precio: 2500, icono: '🍺' },
  { id: 22, categoria: 'Cervezas', nombre: 'Royal Guard Botella', precio: 2800, icono: '🍺' },
  { id: 23, categoria: 'Cervezas', nombre: 'Heineken Botella', precio: 3200, icono: '🍺' },
  { id: 24, categoria: 'Cervezas', nombre: 'Corona Botella', precio: 3200, icono: '🍺' },
  { id: 25, categoria: 'Cervezas', nombre: 'Austral Lata', precio: 2800, icono: '🍺' },
  { id: 26, categoria: 'Cervezas', nombre: 'Kunstmann Lata', precio: 3000, icono: '🍺' },
  { id: 27, categoria: 'Cervezas', nombre: 'Sin Alcohol Lata', precio: 2500, icono: '🍺' },
  { id: 28, categoria: 'Cervezas', nombre: 'Artesanal IPA', precio: 3800, icono: '🍺' },
  { id: 29, categoria: 'Cervezas', nombre: 'Artesanal Stout', precio: 3800, icono: '🍺' },
  { id: 30, categoria: 'Cervezas', nombre: 'Jarra de Cerveza', precio: 8000, icono: '🍺' },

  { id: 31, categoria: 'Vinos', nombre: 'Copa Vino Tinto', precio: 3000, icono: '🍷' },
  { id: 32, categoria: 'Vinos', nombre: 'Copa Vino Blanco', precio: 3000, icono: '🍷' },
  { id: 33, categoria: 'Vinos', nombre: 'Copa Vino Rosado', precio: 3000, icono: '🍷' },
  { id: 34, categoria: 'Vinos', nombre: 'Botella Cabernet Sauvignon', precio: 15000, icono: '🍷' },
  { id: 35, categoria: 'Vinos', nombre: 'Botella Carmenere', precio: 16000, icono: '🍷' },
  { id: 36, categoria: 'Vinos', nombre: 'Botella Merlot', precio: 15000, icono: '🍷' },
  { id: 37, categoria: 'Vinos', nombre: 'Botella Sauvignon Blanc', precio: 14000, icono: '🍷' },
  { id: 38, categoria: 'Vinos', nombre: 'Botella Chardonnay', precio: 14000, icono: '🍷' },
  { id: 39, categoria: 'Vinos', nombre: 'Botella Pinot Noir', precio: 17000, icono: '🍷' },
  { id: 40, categoria: 'Vinos', nombre: 'Copa Espumante', precio: 4000, icono: '🥂' },
  { id: 41, categoria: 'Vinos', nombre: 'Botella Espumante', precio: 18000, icono: '🥂' },
  { id: 42, categoria: 'Vinos', nombre: 'Botella Malbec', precio: 16000, icono: '🍷' },
  { id: 43, categoria: 'Vinos', nombre: 'Copa Vino de la Casa', precio: 2500, icono: '🍷' },
  { id: 44, categoria: 'Vinos', nombre: 'Botella Vino de la Casa', precio: 12000, icono: '🍷' },
  { id: 45, categoria: 'Vinos', nombre: 'Copa Sangría', precio: 3500, icono: '🍷' },

  { id: 46, categoria: 'Combinados', nombre: 'Piscola', precio: 3500, icono: '🥃' },
  { id: 47, categoria: 'Combinados', nombre: 'Pisco Sour', precio: 4500, icono: '🍹' },
  { id: 48, categoria: 'Combinados', nombre: 'Cuba Libre', precio: 4000, icono: '🥃' },
  { id: 49, categoria: 'Combinados', nombre: 'Mojito', precio: 4500, icono: '🍹' },
  { id: 50, categoria: 'Combinados', nombre: 'Ron Cola', precio: 4000, icono: '🥃' },
  { id: 51, categoria: 'Combinados', nombre: 'Whisky Cola', precio: 4500, icono: '🥃' },
  { id: 52, categoria: 'Combinados', nombre: 'Gin Tonic', precio: 4800, icono: '🍸' },
  { id: 53, categoria: 'Combinados', nombre: 'Vodka Naranja', precio: 4200, icono: '🍹' },
  { id: 54, categoria: 'Combinados', nombre: 'Fernet Cola', precio: 4300, icono: '🥃' },
  { id: 55, categoria: 'Combinados', nombre: 'Terremoto', precio: 4000, icono: '🌋' },
  { id: 56, categoria: 'Combinados', nombre: 'Borgoña', precio: 3500, icono: '🍷' },
  { id: 57, categoria: 'Combinados', nombre: 'Whisky Solo', precio: 5000, icono: '🥃' },
  { id: 58, categoria: 'Combinados', nombre: 'Pisco Solo', precio: 3200, icono: '🥃' },
  { id: 59, categoria: 'Combinados', nombre: 'Vodka Solo', precio: 3800, icono: '🥃' },
  { id: 60, categoria: 'Combinados', nombre: 'Ron Solo', precio: 3800, icono: '🥃' },
];

const CATEGORIAS = ['Top20', 'Comidas', 'Cervezas', 'Vinos', 'Combinados'];

const TOP20_IDS = [1, 5, 16, 17, 46, 7, 2, 20, 47, 31, 9, 21, 48, 3, 34, 11, 25, 49, 8, 22];

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
  if (haySesion) cargarMesas();
});

async function cargarMesas() {
  const { data, error } = await sb.from('mesas').select('*').order('id');
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
    btn.innerHTML = `Mesa ${mesa.id}` + (ocupada ? `<small>${formatoMoneda(totalMesa(mesa))}</small>` : '<small>Libre</small>');
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
    el.innerHTML = `
      ${enPedido ? `<span class="badge-cantidad">${enPedido.cantidad}</span>` : ''}
      <span class="icono">${plato.icono}</span>
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
  else mesa.pedido.push({ id: plato.id, nombre: plato.nombre, precio: plato.precio, icono: plato.icono, cantidad: 1 });
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
    el.innerHTML = `
      <span class="item-icono">${item.icono || '🍽️'}</span>
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
