const config = require("./config");
const WebSocket = require("ws");

const GATEWAY_WS = config.gateway.wsUrl;
const RECONNECT_DELAY = 4000;
// El gateway exige este token en el handshake del /ws-internal.
const SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "";

let _ws = null;

function connect() {
  try {
    _ws = new WebSocket(GATEWAY_WS, { headers: { "x-service-token": SERVICE_TOKEN } });
    _ws.on("open", () => console.log("[WS] Conectado al Gateway WS"));
    _ws.on("close", () => {
      _ws = null;
      setTimeout(connect, RECONNECT_DELAY);
    });
    _ws.on("error", (err) => {
      console.warn("[WS] Error de conexión al Gateway:", err?.message);
      try { _ws?.terminate(); } catch {}
    });
  } catch {
    setTimeout(connect, RECONNECT_DELAY);
  }
}

function broadcast(type, payload) {
  try {
    if (_ws?.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify({ type, payload }));
      console.log("[WS][OUT]", type, "sheet:", payload?.sheetId || payload?.sheetIds || "?");
    } else {
      console.warn("[WS][OUT] DESCARTADO (ws no abierto):", type, "readyState:", _ws?.readyState);
    }
  } catch (e) { console.warn("[WS][OUT] error:", e?.message); }
}

module.exports = { connect, broadcast };
