const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  console.log('📡 Espía WS conectado al Gateway');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log('📥 Mensaje Recibido:', JSON.stringify(msg, null, 2));
  if (msg.type === 'INV_CHANGE') {
    console.log('✅ EXITO: Cambio detectado vía WebSockets!');
    process.exit(0);
  }
});

ws.on('error', (err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

// Timeout por si no llega nada
setTimeout(() => {
  console.log('⏳ Tiempo de espera agotado');
  process.exit(1);
}, 10000);
