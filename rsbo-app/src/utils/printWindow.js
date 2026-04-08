// src/utils/printWindow.js
// Abre una ventana de impresión con el layout de RSBO.

export function openPrintWindow({ title, bodyHtml }) {
  const w = window.open("", "_blank");
  if (!w) return;
  const now = new Date();
  const fechaGenerado = now.toLocaleString("es-MX", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
  w.document.open();
  w.document.write(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${String(title || "Documento")}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      font-size: 13px;
      color: #0f172a;
      background:
        radial-gradient(circle at 0% 0%, rgba(121, 87, 213, 0.10), transparent 55%),
        radial-gradient(circle at 100% 70%, rgba(236, 72, 153, 0.07), transparent 55%),
        radial-gradient(circle at 40% 110%, rgba(249, 115, 22, 0.06), transparent 55%),
        #f9fafb;
      padding: 28px;
      min-height: 100vh;
    }

    .print-toolbar {
      display: flex; align-items: center; gap: 12px;
      background: rgba(255, 255, 255, 0.70);
      backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(144, 111, 225, 0.18);
      border-radius: 12px; padding: 12px 18px; margin-bottom: 24px;
      box-shadow: 0 4px 16px rgba(88, 28, 135, 0.08);
    }
    .print-toolbar button {
      background: linear-gradient(135deg, #906fe1, #7957d5);
      color: #fff; border: none; border-radius: 8px;
      padding: 9px 24px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: transform 120ms ease;
      box-shadow: 0 4px 14px rgba(121, 87, 213, 0.30);
    }
    .print-toolbar button:hover { transform: translateY(-1px); }
    .print-toolbar span { font-size: 12px; color: rgba(15, 23, 42, 0.55); }

    .print-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      background: rgba(255, 255, 255, 0.65);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(144, 111, 225, 0.14);
      border-radius: 14px; padding: 20px 24px; margin-bottom: 22px;
      box-shadow: 0 8px 30px rgba(88, 28, 135, 0.06);
    }
    .print-header-left .doc-title {
      font-size: 22px; font-weight: 700;
      background: linear-gradient(135deg, #7957d5, #906fe1);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text; line-height: 1.2;
    }
    .print-header-left .doc-subtitle { font-size: 12px; color: rgba(15, 23, 42, 0.50); margin-top: 4px; }
    .print-header-right { text-align: right; }
    .print-header-right .brand { font-size: 16px; font-weight: 800; color: #906fe1; letter-spacing: -0.5px; }
    .print-header-right .gen-date { font-size: 11px; color: #94a3b8; margin-top: 3px; }

    h2 { font-size: 15px; font-weight: 700; color: #7957d5; margin: 18px 0 8px; }
    h3 { font-size: 13px; font-weight: 600; color: #334155; margin: 12px 0 6px; }
    .muted { color: rgba(15, 23, 42, 0.50); }

    .box {
      background: rgba(255, 255, 255, 0.60);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(144, 111, 225, 0.12);
      border-radius: 12px; padding: 14px 16px; margin: 12px 0;
      box-shadow: 0 4px 20px rgba(88, 28, 135, 0.05);
    }

    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin: 14px 0; }
    .info-card {
      background: rgba(255, 255, 255, 0.72);
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(144, 111, 225, 0.12);
      border-radius: 10px; padding: 12px 16px;
      box-shadow: 0 2px 10px rgba(88, 28, 135, 0.04);
    }
    .info-card .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #906fe1; font-weight: 700; }
    .info-card .val { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 3px; }
    .info-card .val.mono { font-family: ui-monospace, 'Courier New', monospace; font-size: 13px; }

    table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 10px; font-size: 12px; }
    thead tr { background: linear-gradient(135deg, #7957d5, #906fe1); }
    thead th { color: #fff; padding: 10px 12px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; }
    thead th:first-child { border-radius: 10px 0 0 0; }
    thead th:last-child { border-radius: 0 10px 0 0; }
    tbody tr { background: rgba(255, 255, 255, 0.55); }
    tbody tr:nth-child(even) { background: rgba(245, 243, 255, 0.60); }
    tbody tr:hover { background: rgba(144, 111, 225, 0.06); }
    td { padding: 9px 12px; border-bottom: 1px solid rgba(144, 111, 225, 0.08); vertical-align: middle; }
    tfoot tr { background: linear-gradient(135deg, #7957d5, #906fe1); }
    tfoot td { color: #fff; font-weight: 700; padding: 10px 12px; border: none; }
    tfoot td:first-child { border-radius: 0 0 0 10px; }
    tfoot td:last-child { border-radius: 0 0 10px 0; }

    .mono { font-family: ui-monospace, 'Courier New', monospace; font-size: 11px; }
    .right { text-align: right; }
    .center { text-align: center; }

    .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .badge-blue { background: rgba(144, 111, 225, 0.14); color: #7957d5; }
    .badge-green { background: rgba(34, 197, 94, 0.14); color: #166534; }
    .badge-yellow { background: rgba(245, 158, 11, 0.16); color: #854d0e; }
    .badge-red { background: rgba(239, 68, 68, 0.14); color: #991b1b; }
    .badge-gray { background: rgba(148, 163, 184, 0.14); color: #475569; }

    .note-box {
      border-left: 4px solid #f59e0b;
      background: rgba(255, 251, 235, 0.80);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      border-radius: 0 8px 8px 0; padding: 10px 14px; margin: 10px 0; font-size: 12px;
    }

    .print-footer {
      margin-top: 28px; padding-top: 12px;
      border-top: 1px solid rgba(144, 111, 225, 0.14);
      font-size: 10px; color: #94a3b8;
      display: flex; justify-content: space-between;
    }

    @media print {
      .print-toolbar { display: none !important; }
      body { padding: 0; background: #fff; }
      .print-header, .box, .info-card {
        backdrop-filter: none; -webkit-backdrop-filter: none;
        background: #fff; border-color: #e5e7eb;
      }
      tbody tr { background: #fff !important; }
      tbody tr:nth-child(even) { background: #f5f3ff !important; }
      @page { margin: 1.8cm 1.5cm; }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <button onclick="window.print()">Imprimir / Guardar como PDF</button>
    <span>Para guardar como PDF, selecciona "Guardar como PDF" en el dialogo de impresora.</span>
  </div>
  <div class="print-header">
    <div class="print-header-left">
      <div class="doc-title">${String(title || "Documento")}</div>
      <div class="doc-subtitle">Sistema de gestion optica · RSBO</div>
    </div>
    <div class="print-header-right">
      <div class="brand">RSBO</div>
      <div class="gen-date">Generado el ${fechaGenerado}</div>
    </div>
  </div>
  ${bodyHtml || ""}
  <div class="print-footer">
    <span>RSBO — Sistema de Gestion Optica</span>
    <span>${fechaGenerado}</span>
  </div>
</body>
</html>`);
  w.document.close();
  w.focus();
}
