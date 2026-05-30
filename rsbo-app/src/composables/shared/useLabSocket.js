// useLabSocket.js — conexión WebSocket singleton al Gateway
let _ws = null;
let _reconnect = null;
let _everConnected = false;

function startWs() {
  try {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    _ws = new WebSocket(`${proto}//${location.host}/ws`);

    _ws.onopen = () => {
      console.log("[WS] Conectado al Gateway");
      // Reconexión tras una caída → re-sincronizar las grillas vivas
      // (pudieron perderse parches durante el corte). El primer connect no.
      if (_everConnected) {
        window.dispatchEvent(new CustomEvent("lab:ws", { detail: { type: "INV_RELOAD", payload: {} } }));
      }
      _everConnected = true;
    };
    _ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log("[WS][IN]", data.type, "sheet:", data.payload?.sheetId ?? "?"); // DIAG temporal
        if (data.type !== "welcome") {
          window.dispatchEvent(new CustomEvent("lab:ws", { detail: data }));
        }
      } catch {}
    };
    _ws.onclose = () => {
      clearTimeout(_reconnect);
      _reconnect = setTimeout(startWs, 3500);
    };
    _ws.onerror = () => {
      try { _ws?.close(); } catch {}
    };
  } catch {}
}

export function initLabSocket() {
  if (typeof window === "undefined" || _ws) return;
  startWs();
}
