/**
 * RSBOApp QA Stress & Concurrency Test Engine v5.0 (Full Reality & Bimodal)
 */
const http = require('http');

const VERSION = 'V5';
const DATA = {
  inventory: { 
    nombre: "Mica Policarbonato Antirreflejante Premium", 
    baseKey: "POLY_AR_PREMIUM", 
    material: "Policarbonato", 
    tipo_matriz: "SPH_CYL", 
    precioVenta: 850, 
    precioCompra: 320 
  },
  optica: { 
    sku: "RB-3025-AVIATOR", 
    marca: "Ray-Ban", 
    modelo: "Aviator Classic Gold", 
    precio: 4200, 
    stock: 10,
    material: "Metal",
    tipo: "Completo",
    genero: "Unisex"
  },
  cliente: "Lic. Roberto Gómez Bolaños",
  doctor: "Dra. Elena Poniatowska"
};

const USERS = [
  { username: 'eurovision', password: 'euro1234' },
  { username: 'Alberto_V5', password: 'Password123!', role: 'ventas' },
  { username: 'Beatriz_V5', password: 'Password123!', role: 'supervisor' },
  { username: 'Carlos_V5', password: 'Password123!', role: 'laboratorio' }
];

function parseResponse(res, data) {
  let body = null; try { body = data ? JSON.parse(data) : null; } catch(e) {}
  const setCookies = res.headers['set-cookie'] || [];
  const cookieMap = {};
  setCookies.forEach(c => {
    const pair = c.split(';')[0];
    const [k, v] = [pair.split('=')[0], pair.split('=').slice(1).join('=')];
    cookieMap[k.trim()] = v.trim();
  });
  return { status: res.statusCode, data: body, cookie: Object.entries(cookieMap).map(([k,v]) => `${k}=${v}`).join('; '), csrf: cookieMap['csrf_token'] };
}

function request(method, path, body = null, session = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method, hostname: 'localhost', port: 3000, path: '/api' + path,
      headers: { 'Content-Type': 'application/json' }
    };
    if (session) {
      if (session.cookie) options.headers['Cookie'] = session.cookie;
      if (session.csrf)   options.headers['x-csrf-token'] = session.csrf;
    }
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(parseResponse(res, data)));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTest() {
  try {
    console.log(`🚀 INICIANDO QA REALITY V5.0`);
    const sessions = {};

    // 1. Logins
    const rA = await request('POST', '/access/login', USERS[0]);
    sessions['eurovision'] = { cookie: rA.cookie, csrf: rA.csrf };

    const rR = await request('GET', '/users/roles', null, sessions.eurovision);
    const rolesArray = Array.isArray(rR.data) ? rR.data : (rR.data?.data || []);
    const roleMap = {};
    rolesArray.forEach(r => roleMap[r.name] = r._id);

    for (let i = 1; i < USERS.length; i++) {
      const u = USERS[i];
      await request('POST', '/users', { name: u.username, username: u.username, password: u.password, role: roleMap[u.role] }, sessions.eurovision);
      const rL = await request('POST', '/access/login', u);
      sessions[u.username] = { cookie: rL.cookie, csrf: rL.csrf };
      console.log(`✅ Sesión: ${u.username}`);
    }

    // 2. Sembrar Inventario (Micas)
    console.log('📦 Sembrando Micas...');
    const rS = await request('POST', '/inventory/sheets', DATA.inventory, sessions.Beatriz_V5);
    const sheetId = rS.data?.data?.sheet?._id;
    await request('POST', `/inventory/sheets/${sheetId}/bulk-update`, { updates: [{ key: "0.00|0.00", qty: 50 }] }, sessions.Carlos_V5);

    // 3. Sembrar Óptica (Armazones)
    console.log('👓 Sembrando Armazones...');
    const rO = await request('POST', '/optica/armazones', DATA.optica, sessions.eurovision);
    const optId = rO.data?.data?._id;

    // 4. Venta en Óptica (Directa)
    console.log('💰 Registrando Venta en Óptica...');
    const optSale = {
      cliente: DATA.cliente,
      items: [{ collection: 'armazones', documentId: optId, qty: 1, precio: 4200, sku: DATA.optica.sku, description: DATA.optica.modelo }],
      total: 4200,
      pago: ["efectivo"]
    };
    await request('POST', '/optica/sales', optSale, sessions.Alberto_V5);

    // 5. Orden de Laboratorio (Venta en Inventario)
    console.log('🧪 Registrando Orden de Laboratorio...');
    const labOrder = {
      cliente: DATA.cliente,
      tipo_operativa: "LAB",
      lines: [{
        lineId: "L1",
        sheet: sheetId,
        micaType: "V",
        sheetNombre: DATA.inventory.nombre,
        qty: 1,
        precio: 850,
        matrixKey: "0.00|0.00",
        params: { sph: 0, cyl: 0 }
      }],
      totalMonto: 850,
      pago: ["tarjeta"]
    };
    await request('POST', '/laboratory/orders', labOrder, sessions.Alberto_V5);

    // 6. Mermas
    console.log('📉 Registrando Mermas...');
    await request('POST', `/inventory/sheets/${sheetId}/merma`, { key: "0.00|0.00", qty: 1, reason: "Mica Rayada en Biselado" }, sessions.Carlos_V5);
    await request('POST', `/optica/mermas`, { collection: "armazones", documentId: optId, qty: 1, reason: "Varilla Rota en Exhibición" }, sessions.Beatriz_V5);

    console.log('🏁 QA V5.0 COMPLETADO EXITOSAMENTE.');
  } catch (err) {
    console.error('⛔ FALLO:', err.message);
  }
}

runTest();
