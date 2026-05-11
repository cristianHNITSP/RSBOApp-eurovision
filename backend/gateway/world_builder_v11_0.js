/**
 * RSBOApp "THE WORLD BUILDER" v11.0
 * Simulador de Ecosistema Completo: Ventas, Mermas, Devoluciones, Backorders y Lab.
 */
const http = require('http');

const CONFIG = {
    hostname: 'localhost', port: 3000, basePath: '/api',
    batch_size: 50
};

const STATS = { ok: 0, fail: 0, items: 0, sales: 0, lab: 0, bo: 0, dev: 0, merma: 0 };

function log(m, msg, t = 'INFO') {
    const ts = new Date().toLocaleTimeString();
    const colors = { ERROR: '\x1b[31m', SUCCESS: '\x1b[32m', INFO: '\x1b[36m', WARN: '\x1b[33m', TITLE: '\x1b[1;34m', SEED: '\x1b[35m' };
    console.log(`${colors[t] || colors.INFO}[${ts}][${m}][${t}] ${msg}\x1b[0m`);
}

function request(method, path, body = null, session = null) {
    return new Promise((resolve) => {
        const options = {
            method, hostname: CONFIG.hostname, port: CONFIG.port, path: CONFIG.basePath + path,
            headers: { 'Content-Type': 'application/json' }, timeout: 15000
        };
        if (session && session.cookie) {
            options.headers['Cookie'] = session.cookie;
            if (session.csrf) options.headers['x-csrf-token'] = session.csrf;
        }
        const req = http.request(options, (res) => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => {
                let p = null; try { p = d ? JSON.parse(d) : null; } catch(e) {}
                const isOk = res.statusCode < 400 && (!p || (p.ok !== false && !p.error));
                if (isOk) STATS.ok++; else STATS.fail++;
                const setC = res.headers['set-cookie'] || [];
                let csrf = session?.csrf || null;
                setC.forEach(c => { if (c.includes('csrf_token=')) csrf = c.split('csrf_token=')[1].split(';')[0]; });
                resolve({ status: res.statusCode, data: p, cookie: setC.length ? setC[0].split(';')[0] : session?.cookie, csrf });
            });
        });
        req.on('error', () => { STATS.fail++; resolve({ status: 500 }); });
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

const randomArr = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomPrice = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

async function run() {
    try {
        console.clear();
        log('WORLD-BUILDER', '🚀 INICIANDO CONSTRUCCIÓN DE ECOSISTEMA v11.0 🚀', 'TITLE');

        // 1. Auth
        const login = await request('POST', '/access/login', { username: 'eurovision', password: 'euro1234' });
        if (login.status !== 200) throw new Error("Fallo login");
        const admin = { cookie: login.cookie, csrf: login.csrf };
        log('AUTH', '✅ Sesión Administrativa Iniciada');

        // 2. Siembra Masiva de Óptica
        log('SEED', 'Sembrando Catálogo de Óptica (50 items)...', 'SEED');
        const brands = ['Ray-Ban', 'Oakley', 'Vogue', 'Prada', 'Gucci', 'Carrera'];
        const materials = ['Acetato', 'Metal', 'TR-90', 'Titanio'];
        const types = ['Completo', 'Ranurado', 'Tres Piezas'];
        const armazones = [];

        for (let i = 0; i < 50; i++) {
            const res = await request('POST', '/optica/armazones', {
                sku: `ARM-${1000 + i}`, marca: randomArr(brands), modelo: `Mod-${i}`,
                precio: randomPrice(800, 4500), stock: randomPrice(5, 20),
                material: randomArr(materials), tipo: randomArr(types), genero: randomArr(['Masculino', 'Femenino', 'Unisex'])
            }, admin);
            if (res.data?.data) { armazones.push(res.data.data); STATS.items++; }
        }

        // 3. Siembra de Inventario (Micas)
        log('SEED', 'Sembrando Hojas de Inventario y Matrices...', 'SEED');
        const sheets = [];
        for (let i = 0; i < 8; i++) {
            const s = await request('POST', '/inventory/sheets', {
                nombre: `Mica ${randomArr(['Anti-Reflejante', 'Blue Free', 'Fotocromático'])} G${i}`,
                baseKey: `SH-${i}`, material: 'CR-39', tipo_matriz: 'SPH_CYL',
                precioVenta: randomPrice(400, 1200), precioCompra: 150
            }, admin);
            if (s.data?.data?.sheet) {
                const sid = s.data.data.sheet._id;
                const rows = [];
                for (let j = 0; j < 5; j++) {
                    rows.push({ sph: (j * 0.25).toFixed(2), cyl: 0.00, existencias: 20, codebar: `CB-MICA-${sid.slice(-4)}-${j}` });
                }
                await request('POST', `/inventory/sheets/${sid}/chunk`, { rows }, admin);
                sheets.push({ id: sid, rows, price: s.data.data.sheet.precioVenta });
                STATS.items++;
            }
        }

        // 4. Ciclo de Vida: Ventas y Lab
        log('WORLD', 'Simulando 100 Ventas y 40 Pedidos de Lab...', 'INFO');
        const sales = [];
        for (let i = 0; i < 100; i++) {
            const arm = randomArr(armazones);
            const res = await request('POST', '/optica/sales', {
                cliente: `Cliente ${i}`, total: arm.precio,
                items: [{ collection: 'armazones', documentId: arm._id, qty: 1, precio: arm.precio, sku: arm.sku }]
            }, admin);
            if (res.data?.data) {
                sales.push(res.data.data);
                STATS.sales++;
                // Sync a inventario
                await request('POST', '/inventory/sales', { cliente: `Cliente ${i}`, total: arm.precio, isReplica: true, items: [{ sku: arm.sku, qty: 1, precio: arm.precio, collection: 'armazones' }] }, admin);
            }
            
            if (i % 2 === 0 && sheets.length > 0) { // Crear pedido de lab cada 2 ventas
                const sh = randomArr(sheets);
                const l = await request('POST', '/laboratory/orders', {
                    sheetId: sh.id, cliente: `Cliente Lab ${i}`, totalMonto: sh.price,
                    lines: [{ codebar: sh.rows[0].codebar, qty: 1, precio: sh.price }]
                }, admin);
                if (l.data?.data) STATS.lab++;
            }
        }

        // 5. Devoluciones y Mermas
        log('WORLD', 'Generando 20 Devoluciones y 30 Mermas...', 'WARN');
        for (let i = 0; i < 20; i++) {
            const sale = sales[i];
            await request('POST', '/optica/devolutions', {
                cliente: sale.cliente, reason: 'Cambio de opinión',
                items: sale.items.map(it => ({ ...it, restoreStock: true })),
                isReplica: false
            }, admin);
            STATS.dev++;
        }

        for (let i = 0; i < 30; i++) {
            const arm = randomArr(armazones);
            await request('POST', '/optica/mermas', {
                collection: 'armazones', documentId: arm._id, sku: arm.sku,
                qty: 1, reason: randomArr(['ROTURA', 'DEFECTO', 'EXTRAVIO'])
            }, admin);
            STATS.merma++;
        }

        // 6. Backorders
        log('WORLD', 'Creando 15 Backorders...', 'INFO');
        for (let i = 0; i < 15; i++) {
            const arm = randomArr(armazones);
            await request('POST', '/backorders/optica', {
                cliente: { nombre: `Cliente Espera ${i}`, telefono: '555-1234' },
                item: { sku: arm.sku, description: `${arm.marca} ${arm.modelo}`, collection: 'armazones', documentId: arm._id },
                proveedor: { nombre: 'Proveedor Central' },
                precioEstimado: arm.precio,
                abonos: [{ monto: 500, metodo: 'Efectivo', fecha: new Date() }]
            }, admin);
            STATS.bo++;
        }

        console.log("\n" + "=".repeat(60));
        log('FINAL', ' 🏁 ECOSISTEMA CONSTRUIDO CON ÉXITO 🏁', 'TITLE');
        console.log(`Items Sembrados: ${STATS.items}`);
        console.log(`Ventas Totales: ${STATS.sales}`);
        console.log(`Órdenes Lab: ${STATS.lab}`);
        console.log(`Devoluciones: ${STATS.dev}`);
        console.log(`Mermas: ${STATS.merma}`);
        console.log(`Backorders: ${STATS.bo}`);
        console.log("=".repeat(60));

    } catch (e) { log('SYSTEM', `⛔ ERROR: ${e.message}`, 'ERROR'); }
}

run();
