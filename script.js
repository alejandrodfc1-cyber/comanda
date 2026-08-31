const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const MENU = [
  { id: 1, categoria: 'Entradas', nombre: 'Papas fritas', precio: 8000, icono: '🍟' },
  { id: 2, categoria: 'Entradas', nombre: 'Empanadas (3u)', precio: 9000, icono: '🥟' },
  { id: 3, categoria: 'Entradas', nombre: 'Nachos con queso', precio: 10000, icono: '🧀' },
  { id: 4, categoria: 'Entradas', nombre: 'Alitas BBQ', precio: 12000, icono: '🍗' },
  { id: 5, categoria: 'Entradas', nombre: 'Croquetas de jamón', precio: 9000, icono: '🥘' },
  { id: 6, categoria: 'Entradas', nombre: 'Patacones', precio: 7000, icono: '🍌' },
  { id: 7, categoria: 'Entradas', nombre: 'Tequeños (6u)', precio: 11000, icono: '🧈' },
  { id: 8, categoria: 'Entradas', nombre: 'Ceviche de camarón', precio: 15000, icono: '🍤' },
  { id: 9, categoria: 'Entradas', nombre: 'Ensalada César', precio: 10000, icono: '🥗' },
  { id: 10, categoria: 'Entradas', nombre: 'Sopa del día', precio: 8000, icono: '🍲' },
  { id: 11, categoria: 'Entradas', nombre: 'Arepas rellenas', precio: 9000, icono: '🌽' },
  { id: 12, categoria: 'Entradas', nombre: 'Chorizo a la parrilla', precio: 10000, icono: '🌭' },
  { id: 13, categoria: 'Entradas', nombre: 'Yuca frita', precio: 6000, icono: '🥔' },
  { id: 14, categoria: 'Entradas', nombre: 'Rollitos primavera', precio: 9000, icono: '🥢' },
  { id: 15, categoria: 'Entradas', nombre: 'Tabla de quesos', precio: 18000, icono: '🧀' },

  { id: 16, categoria: 'Platos fuertes', nombre: 'Bandeja paisa', precio: 25000, icono: '🍛' },
  { id: 17, categoria: 'Platos fuertes', nombre: 'Pechuga a la plancha', precio: 22000, icono: '🍗' },
  { id: 18, categoria: 'Platos fuertes', nombre: 'Pasta alfredo', precio: 20000, icono: '🍝' },
  { id: 19, categoria: 'Platos fuertes', nombre: 'Lomo saltado', precio: 26000, icono: '🥩' },
  { id: 20, categoria: 'Platos fuertes', nombre: 'Pescado frito', precio: 24000, icono: '🐟' },
  { id: 21, categoria: 'Platos fuertes', nombre: 'Arroz con pollo', precio: 18000, icono: '🍚' },
  { id: 22, categoria: 'Platos fuertes', nombre: 'Costillas BBQ', precio: 28000, icono: '🍖' },
  { id: 23, categoria: 'Platos fuertes', nombre: 'Hamburguesa clásica', precio: 17000, icono: '🍔' },
  { id: 24, categoria: 'Platos fuertes', nombre: 'Pizza margarita', precio: 22000, icono: '🍕' },
  { id: 25, categoria: 'Platos fuertes', nombre: 'Fajitas de res', precio: 23000, icono: '🌯' },
  { id: 26, categoria: 'Platos fuertes', nombre: 'Salmón a la parrilla', precio: 27000, icono: '🐠' },
  { id: 27, categoria: 'Platos fuertes', nombre: 'Risotto de champiñones', precio: 21000, icono: '🍄' },
  { id: 28, categoria: 'Platos fuertes', nombre: 'Milanesa napolitana', precio: 24000, icono: '🍽️' },
  { id: 29, categoria: 'Platos fuertes', nombre: 'Tacos de carnitas (3u)', precio: 16000, icono: '🌮' },
  { id: 30, categoria: 'Platos fuertes', nombre: 'Sancocho', precio: 19000, icono: '🍲' },

  { id: 31, categoria: 'Bebidas', nombre: 'Gaseosa', precio: 5000, icono: '🥤' },
  { id: 32, categoria: 'Bebidas', nombre: 'Jugo natural', precio: 6000, icono: '🧃' },
  { id: 33, categoria: 'Bebidas', nombre: 'Limonada', precio: 5000, icono: '🍋' },
  { id: 34, categoria: 'Bebidas', nombre: 'Agua mineral', precio: 4000, icono: '💧' },
  { id: 35, categoria: 'Bebidas', nombre: 'Café', precio: 4000, icono: '☕' },
  { id: 36, categoria: 'Bebidas', nombre: 'Té helado', precio: 5000, icono: '🧊' },
  { id: 37, categoria: 'Bebidas', nombre: 'Malteada de chocolate', precio: 8000, icono: '🥛' },
  { id: 38, categoria: 'Bebidas', nombre: 'Cerveza', precio: 9000, icono: '🍺' },
  { id: 39, categoria: 'Bebidas', nombre: 'Copa de vino', precio: 12000, icono: '🍷' },
  { id: 40, categoria: 'Bebidas', nombre: 'Mojito', precio: 14000, icono: '🍹' },
  { id: 41, categoria: 'Bebidas', nombre: 'Margarita', precio: 14000, icono: '🍸' },
  { id: 42, categoria: 'Bebidas', nombre: 'Piña colada', precio: 13000, icono: '🍍' },
  { id: 43, categoria: 'Bebidas', nombre: 'Chocolate caliente', precio: 6000, icono: '☕' },
  { id: 44, categoria: 'Bebidas', nombre: 'Smoothie de fresa', precio: 9000, icono: '🍓' },
  { id: 45, categoria: 'Bebidas', nombre: 'Agua de panela', precio: 4000, icono: '🫖' },

  { id: 46, categoria: 'Postres', nombre: 'Flan', precio: 7000, icono: '🍮' },
  { id: 47, categoria: 'Postres', nombre: 'Tres leches', precio: 8000, icono: '🍰' },
  { id: 48, categoria: 'Postres', nombre: 'Brownie con helado', precio: 9000, icono: '🍫' },
  { id: 49, categoria: 'Postres', nombre: 'Helado (2 bolas)', precio: 6000, icono: '🍨' },
  { id: 50, categoria: 'Postres', nombre: 'Cheesecake', precio: 9000, icono: '🍰' },
  { id: 51, categoria: 'Postres', nombre: 'Torta de chocolate', precio: 8000, icono: '🎂' },
  { id: 52, categoria: 'Postres', nombre: 'Arroz con leche', precio: 6000, icono: '🍚' },
  { id: 53, categoria: 'Postres', nombre: 'Churros con chocolate', precio: 8000, icono: '🥐' },
  { id: 54, categoria: 'Postres', nombre: 'Gelatina', precio: 4000, icono: '🍮' },
  { id: 55, categoria: 'Postres', nombre: 'Frutas frescas', precio: 6000, icono: '🍓' },
  { id: 56, categoria: 'Postres', nombre: 'Postre de limón', precio: 7000, icono: '🍋' },
  { id: 57, categoria: 'Postres', nombre: 'Milhojas', precio: 8000, icono: '🥮' },
  { id: 58, categoria: 'Postres', nombre: 'Cupcake', precio: 5000, icono: '🧁' },
  { id: 59, categoria: 'Postres', nombre: 'Waffle con miel', precio: 9000, icono: '🧇' },
  { id: 60, categoria: 'Postres', nombre: 'Copa de frutas con crema', precio: 7000, icono: '🍨' },
];

let mesas = [];
let mesaActivaId = null;
let categoriaActiva = MENU[0].categoria;

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

function abrirModalMenu(mesaId) {
  mesaActivaId = mesaId;
  vistaModal = 'menu';
  document.getElementById('titulo-mesa').textContent = `Mesa ${mesaId}`;
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
  actualizarVistaModal();
}

function actualizarVistaModal() {
  const enMenu = vistaModal === 'menu';
  document.getElementById('vista-menu-platos').classList.toggle('oculto', !enMenu);
  document.getElementById('vista-detalle-mesa').classList.toggle('oculto', enMenu);
  const mesa = mesaActiva();
  const cantidadItems = mesa.pedido.reduce((s, i) => s + i.cantidad, 0);
  document.getElementById('btn-alternar-vista').textContent = enMenu
    ? `🧾 Detalle (${cantidadItems})`
    : '← Menú';
}

function renderTabsMenu() {
  const tabs = document.getElementById('tabs-menu');
  tabs.innerHTML = '';
  const categorias = [...new Set(MENU.map(p => p.categoria))];
  categorias.forEach(cat => {
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
  MENU.filter(p => p.categoria === categoriaActiva).forEach(plato => {
    const el = document.createElement('div');
    el.className = 'plato';
    el.innerHTML = `
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
    const el = document.createElement('div');
    el.className = 'item-pedido';
    el.innerHTML = `
      <span class="item-icono">${item.icono || '🍽️'}</span>
      <div class="item-info">
        <span class="item-nombre">${item.nombre}</span>
        <span class="item-detalle">🛒 Cant: ${item.cantidad} x ${formatoMoneda(item.precio)}  Subtotal: ${formatoMoneda(subtotal)}</span>
      </div>
      <div class="item-acciones">
        <button class="btn-icono" onclick="cambiarCantidad(${item.id}, 1)" title="Agregar uno más">+</button>
        <button class="btn-icono btn-eliminar" onclick="eliminarDelPedido(${item.id})" title="Quitar">🗑️</button>
      </div>`;
    cont.appendChild(el);
  });
  document.getElementById('total-pedido').textContent = formatoMoneda(totalMesa(mesa));
  actualizarVistaModal();
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
  texto += `--------------------------------\n`;
  texto += `TOTAL: ${formatoMoneda(totalMesa(mesa))}\n`;
  texto += `--------------------------------\n`;
  texto += `      ¡Gracias por su visita!`;
  document.getElementById('recibo').textContent = texto;
  document.getElementById('modal-recibo').classList.remove('oculto');
}

function cerrarRecibo() {
  document.getElementById('modal-recibo').classList.add('oculto');
}
