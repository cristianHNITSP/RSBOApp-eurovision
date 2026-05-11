/**
 * RSBOApp QA ULTIMATE ENGINE v10.4 (VICTORY EDITION)
 * Auditoría total con Enums validados y sincronización de índices.
 */
const http = require('http');

const CONFIG = {
    hostname: 'localhost', port: 3000, basePath: '/api',
    duration_ms: 30000
};

const STATS = {
    total: 0, ok: 0, fail: 0,
    mod: { AUTH: 0, OPTICA: 0, INVENTORY: 0, LAB: 0, SYNC: 0 }
};

function log(m, msg, t = 'INFO') {
    const ts = new Date().toLocaleTimeString();
    const colors = { ERROR: '\x1b[31m', SUCCESS: '\x1b[32m', INFO: '\x1b[36m', WARN: '\x1b[33m', TITLE: '\x1b[1;34m' };
    console.log(`${colors[t] || colors.INFO}[${ts}][${m}][${t}] ${msg}\x1b[0m`);
}

function cleanCookie(raw) {
    if (!raw) return "";
    if (Array.isArray(raw)) return raw.map(c => c.split(';')[0]).join('; ');
    return raw.split(';')[0];
}

function request(method, path, body = null, session = null) {
    return new Promise((resolve) => {
        const options = {
            method, hostname: CONFIG.hostname, port: CONFIG.port, path: CONFIG.basePath + path,
            headers: { 'Content-Type': 'application/json' }, timeout: 10000
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
                
                const setC = res.headers['set-cookie'] || [];
                let csrf = session?.csrf || null;
                setC.forEach(c => { if (c.includes('csrf_token=')) csrf = c.split('csrf_token=')[1].split(';')[0]; });

                STATS.total++;
                if (isOk) STATS.ok++; else { 
                    STATS.fail++;
                    log('HTTP', `${method} ${path} -> ${res.statusCode} | ${p?.message || p?.error || p?.reason || ''}`, 'ERROR');
                }
                resolve({ status: res.statusCode, data: p, cookie: setC.length ? cleanCookie(setC) : session?.cookie, csrf });
            });
        });
        req.on('error', () => { STATS.fail++; resolve({ status: 500 }); });
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    try {
        console.clear();
        log('SYSTEM', '🔥 INICIANDO QA ULTIMATE v10.4 (VICTORY) 🔥', 'TITLE');

        // 1. Auth
        log('AUTH', 'Autenticando con usuario eurovision...');
        const root = await request('POST', '/access/login', { username: 'eurovision', password: 'euro1234' });
        if (root.status !== 200) throw new Error("Fallo login admin. Revisa credenciales.");
        const admin = { cookie: root.cookie, csrf: root.csrf };

        const rolesRes = await request('GET', '/users/roles', null, admin);
        const roles = rolesRes.data?.data || rolesRes.data || [];
        const getR = (n) => roles.find(r => r.name === n)?._id;

        const sessions = { admin };
        for (const u of ['ventas', 'laboratorio']) {
            const rid = getR(u);
            if (rid) {
                const username = `${u}_audit_${Date.now().toString().slice(-4)}`;
                await request('POST', '/users', { username, password: 'Password123!', name: `Audit ${u}`, role: rid }, admin);
                const l = await request('POST', '/access/login', { username, password: 'Password123!' });
                sessions[u] = { cookie: l.cookie, csrf: l.csrf };
            }
        }

        // 2. Siembra
        log('SEED', 'Sembrando productos y esperando indexación...');
        const arm = await request('POST', '/optica/armazones', { 
            sku: `ARM-V104`, marca: 'AUDIT', modelo: 'V10.4', precio: 1500, stock: 100, 
            material: 'Acetato', tipo: 'Completo', genero: 'Unisex' 
        }, sessions.admin);
        const armData = arm.data?.data;

        const sheetRes = await request('POST', '/inventory/sheets', { 
            nombre: 'Mica V10.4', baseKey: 'V104', material: 'CR-39', 
            tipo_matriz: 'SPH_CYL', precioVenta: 900, precioCompra: 300 
        }, sessions.admin);
        const sheetId = sheetRes.data?.data?.sheet?._id;
        const codebar = `CB-AUDIT-104`;
        await request('POST', `/inventory/sheets/${sheetId}/chunk`, { 
            rows: [{ sph: 0.00, cyl: 0.00, existencias: 100, codebar }] 
        }, sessions.admin);

        log('SYSTEM', 'Esperando 2 segundos para que Mongo indexe los códigos...', 'WARN');
        await new Promise(res => setTimeout(res, 2000));

        // 3. Chaos Loop
        log('CHAOS', 'Iniciando ráfaga final...', 'WARN');
        const endTime = Date.now() + CONFIG.duration_ms;
        const labOrders = [];

        while (Date.now() < endTime) {
            const r = Math.random();
            
            if (r < 0.4) { // Venta + Sinc
                const sale = await request('POST', '/optica/sales', { 
                    cliente: 'Victory Client', total: 1500, 
                    items: [{ collection: 'armazones', documentId: armData._id, qty: 1, precio: 1500, sku: armData.sku }] 
                }, sessions.ventas);
                if (sale.status === 201) {
                    await request('POST', '/inventory/sales', { 
                        cliente: 'Victory Client', total: 1500, isReplica: true,
                        items: [{ sku: armData.sku, qty: 1, precio: 1500, collection: 'armazones' }] 
                    }, sessions.ventas);
                    log('SALE', `Venta OK: ${sale.data.data.folio}`, 'SUCCESS');
                }
            } else if (r < 0.7) { // Lab
                const lab = await request('POST', '/laboratory/orders', { 
                    sheetId, cliente: 'Victory Lab', totalMonto: 900, 
                    lines: [{ codebar, qty: 1, precio: 900 }] 
                }, sessions.ventas);
                if (lab.data?.data) {
                    labOrders.push(lab.data.data);
                    log('LAB', `Orden OK: ${lab.data.data.folio}`, 'INFO');
                }
            } else if (r < 0.85 && labOrders.length > 0) { // Scan
                const order = labOrders.shift();
                const scan = await request('POST', `/laboratory/orders/${order._id}/scan`, { codebar }, sessions.laboratorio);
                if (scan.status === 200) log('LAB', `Scan OK: ${order.folio}`, 'SUCCESS');
            } else { // Merma (CON ENUM VÁLIDO)
                const merma = await request('POST', '/optica/mermas', { 
                    collection: 'armazones', documentId: armData._id, sku: armData.sku, 
                    qty: 1, reason: 'ROTURA' 
                }, sessions.admin);
                if (merma.status === 201) log('MERMA', `Merma OK en Óptica`, 'WARN');
            }
            await new Promise(res => setTimeout(res, 500));
        }

        console.log("\n" + "=".repeat(60));
        log('FINAL', ' 🏁 REPORTE DE AUDITORÍA v10.4 TERMINADO 🏁', 'TITLE');
        console.log(`Éxitos: \x1b[32m${STATS.ok}\x1b[0m`);
        console.log(`Fallos: \x1b[31m${STATS.fail}\x1b[0m`);
        console.log("=".repeat(60));

    } catch (e) { log('SYSTEM', `⛔ ERROR: ${e.message}`, 'ERROR'); }
}

run();
