"use strict";

/**
 * stockAlertHooks.js
 *
 * Registra hooks Mongoose post('save') en los cuatro modelos Matrix para
 * detectar cambios de stock en CUALQUIER ruta de escritura:
 *   - Creacion de planilla (seedRootForSheet → doc.save())
 *   - Seed completo      (seedFullForSheet  → doc.save())
 *   - Scripts CLI        (seed-inventory-sheets, etc.)
 *   - Actualizaciones via rutas (chunk save, cell update)
 *
 * Para rutas interactivas, la ruta ya dispara checkCellAlert/checkSheetAlerts
 * con respectCooldown:false (actualizacion inmediata).
 * El hook usa un cooldown corto (60s) para que, si la ruta ya notificó,
 * el hook lo omita y no duplique la llamada HTTP al notification-service.
 * Si nadie notificó aun (seed, creacion), el hook actua inmediatamente.
 *
 * Se registra EXTERNAMENTE (aqui, no en los archivos de modelo) para evitar
 * dependencias circulares: MatrixX → stockAlert.service → MatrixX.
 * El require dinamico dentro del callback difiere la resolucion hasta que
 * el modulo ya esta completamente cargado.
 */

const MatrixBase       = require("../models/matrix/MatrixBase");
const MatrixSphCyl     = require("../models/matrix/MatrixSphCyl");
const MatrixBifocal    = require("../models/matrix/MatrixBifocal");
const MatrixProgresivo = require("../models/matrix/MatrixProgresivo");

// Modelos de Lentes de Contacto (CL)
const CLMatrixBase       = require("../models/contactlenses/CLMatrixEsferico");
const CLMatrixColorido   = require("../models/contactlenses/CLMatrixColorido");
const CLMatrixTorico     = require("../models/contactlenses/CLMatrixTorico");
const CLMatrixMultifocal = require("../models/contactlenses/CLMatrixMultifocal");

// Cooldown corto: si la ruta ya disparo hace <60s, el hook lo omite.
// Si es una creacion/seed (nadie notifico antes), pasa sin cooldown.
const HOOK_COOLDOWN_MS = 60 * 1000; // 1 minuto

function registerStockAlertHooks() {
  const schemas = [
    MatrixBase.schema,
    MatrixSphCyl.schema,
    MatrixBifocal.schema,
    MatrixProgresivo.schema,
    // CL Models
    CLMatrixBase.schema,
    CLMatrixColorido.schema,
    CLMatrixTorico.schema,
    CLMatrixMultifocal.schema,
  ];

  for (const schema of schemas) {
    schema.post("save", function (doc) {
      const sheetId = doc.sheet;
      if (!sheetId) return;

      // Fire-and-forget en setImmediate para no bloquear el save
      setImmediate(() => {
        // require dinamico: evita circular dependency en tiempo de carga
        const { checkSheetById } = require("../services/stockAlert.service");
        checkSheetById(sheetId, {
          respectCooldown: true,
          cooldownMs:      HOOK_COOLDOWN_MS,
        }).catch((e) => console.warn("[STOCK_HOOK] error:", e?.message));
      });
    });
  }

  console.log("[STOCK_ALERT] Hooks post-save registrados en los 4 modelos Matrix.");
}

module.exports = { registerStockAlertHooks };
