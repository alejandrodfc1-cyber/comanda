const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const MENU = [
  { id: 1, categoria: 'Entradas', nombre: 'Papas fritas', precio: 8000, icono: '🍟' },
  { id: 2, categoria: 'Entradas', nombre: 'Empanadas (3u)', precio: 9000, icono: '🥟' },
  { id: 3, categoria: 'Platos fuertes', nombre: 'Bandeja paisa', precio: 25000, icono: '🍛' },
  { id: 4, categoria: 'Platos fuertes', nombre: 'Pechuga a la plancha', precio: 22000, icono: '🍗' },
  { id: 5, categoria: 'Platos fuertes', nombre: 'Pasta alfredo', precio: 20000, icono: '🍝' },
  { id: 6, categoria: 'Bebidas', nombre: 'Gaseosa', precio: 5000, icono: '🥤' },
  { id: 7, categoria: 'Bebidas', nombre: 'Jugo natural', precio: 6000, icono: '🧃' },
  { id: 8, categoria: 'Postres', nombre: 'Flan', precio: 7000, icono: '🍮' },
];

let mesas = [];
let mesaActivaId = null;

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

function abrirModalMenu(mesaId) {
  mesaActivaId = mesaId;
  document.getElementById('titulo-mesa').textContent = `Mesa ${mesaId}`;
  renderListaMenu();
  renderPedido();
  document.getElementById('modal-menu').classList.remove('oculto');
}

function cerrarModalMenu() {
  document.getElementById('modal-menu').classList.add('oculto');
  mesaActivaId = null;
}

function renderListaMenu() {
  const cont = document.getElementById('lista-menu');
  cont.innerHTML = '';
  const categorias = [...new Set(MENU.map(p => p.categoria))];
  categorias.forEach(cat => {
    const bloque = document.createElement('div');
    bloque.className = 'menu-categoria';
    const galeria = document.createElement('div');
    galeria.className = 'galeria-platos';
    MENU.filter(p => p.categoria === cat).forEach(plato => {
      const el = document.createElement('div');
      el.className = 'plato';
      el.innerHTML = `
        <span class="icono">${plato.icono}</span>
        <span class="nombre">${plato.nombre}</span>
        <span class="precio">${formatoMoneda(plato.precio)}</span>`;
      el.onclick = () => agregarPlato(plato.id);
      galeria.appendChild(el);
    });
    bloque.innerHTML = `<h4>${cat}</h4>`;
    bloque.appendChild(galeria);
    cont.appendChild(bloque);
  });
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
  else mesa.pedido.push({ id: plato.id, nombre: plato.nombre, precio: plato.precio, cantidad: 1 });
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

function renderPedido() {
  const mesa = mesaActiva();
  const cont = document.getElementById('lista-pedido');
  cont.innerHTML = '';
  mesa.pedido.forEach(item => {
    const el = document.createElement('div');
    el.className = 'item-pedido';
    el.innerHTML = `
      <span>${item.nombre}</span>
      <div class="controles">
        <button onclick="cambiarCantidad(${item.id}, -1)">-</button>
        ${item.cantidad}
        <button onclick="cambiarCantidad(${item.id}, 1)">+</button>
      </div>`;
    cont.appendChild(el);
  });
  document.getElementById('total-pedido').textContent = formatoMoneda(totalMesa(mesa));
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
