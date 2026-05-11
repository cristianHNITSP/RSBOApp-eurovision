/**
 * RSBOApp "MASTER ENGINEER EDITION" v28.1
 * Rectificación de acceso y auditoría industrial masiva.
 */
const http = require('http');

const CONFIG = { hostname: 'localhost', port: 3000, basePath: '/api' };
const STATS = { ok: 0, fail: 0, sales: 0 };

function log(m, msg, t = 'INFO') {
    const ts = new Date().toLocaleTimeString();
    const colors = { ERROR: '\x1b[31m', SUCCESS: '\x1b[32m', INFO: '\x1b[36m', TITLE: '\x1b[1;34m' };
    console.log(`${colors[t] || colors.INFO}[${ts}][${m}][${t}] ${msg}\x1b[0m`);
}

function request(method, path, body = null, session = { cookies: {}, csrf: null }) {
    if (!session.cookies) session.cookies = {};
    return new Promise((resolve) => {
        const cookieStr = Object.entries(session.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
        const options = {
            method, hostname: CONFIG.hostname, port: CONFIG.port, path: CONFIG.basePath + path,
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieStr,
                'x-csrf-token': session.csrf || '',
                'Origin': 'http://localhost:3000',
                'Referer': 'http://localhost:3000/'
            }, timeout: 60000
        };
        const req = http.request(options, (res) => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => {
                let p = null; try { p = d ? JSON.parse(d) : null; } catch (e) { }
                const setCookies = res.headers['set-cookie'] || [];
                setCookies.forEach(c => {
                    const parts = c.split(';')[0].split('=');
                    if (parts[0]) session.cookies[parts[0]] = parts.slice(1).join('=');
                    if (parts[0] === 'csrf_token') session.csrf = parts.slice(1).join('=');
                });
                resolve({ status: res.statusCode, data: p, raw: d });
            });
        });
        req.on('error', (e) => resolve({ status: 500, error: e.message }));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    try {
        log('MASTER', '🌌 INICIANDO RECTIFICACIÓN v28.1 🌌', 'TITLE');
        const admin = { cookies: {}, csrf: null };

        // Intento de login con diagnóstico
        const login = await request('POST', '/access/login', { username: 'eurovision', password: 'euro1234' }, admin);
        if (login.status >= 400) {
            log('FAIL', `Login Maestro falló [${login.status}]: ${login.raw}`, 'ERROR');
            return;
        }

        log('SEED', 'Sembrando Micas Industriales...', 'INFO');
        const rM = await request('POST', '/inventory/sheets', { nombre: `Mica Master ${Date.now()}`, material: "Poly", tipo_matriz: "BASE", baseKey: "sph", precioVenta: 900, precioCompra: 300 }, admin);
        const sid = rM.data?.data?.sheet?._id;
        if (sid) {
            log('WORLD', 'Sembrando 20 Ventas de Auditoría...', 'INFO');
            for (let i = 0; i < 20; i++) {
                const v = await request('POST', '/inventory/sales', {
                    cliente: `Cliente ${i}`, total: 900, pago: ['efec'],
                    items: [{ collection: 'bases-micas', category: 'bases-micas', sheet: sid, matrixKey: "-1.00", sku: "SKU-PRO", qty: 1, precio: 900, description: "Venta Master" }]
                }, admin);
                if (v.status < 400) STATS.sales++;
            }
            log('FINAL', `🏁 Ventas Totales: ${STATS.sales}`, 'SUCCESS');
        } else {
            log('FAIL', `Fallo sembrado [${rM.status}]: ${rM.raw}`, 'ERROR');
        }

    } catch (e) { log('SYSTEM', `⛔ ERROR: ${e.message}`, 'ERROR'); }
}
run();
