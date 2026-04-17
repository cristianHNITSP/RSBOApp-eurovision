// useLabSocket.js — conexión WebSocket singleton al Gateway
let _ws = null;
let _reconnect = null;

function startWs() {
  try {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    _ws = new WebSocket(`${proto}//${location.host}/ws`);

    _ws.onopen = () => console.log("[WS] Conectado al Gateway");
    _ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
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
