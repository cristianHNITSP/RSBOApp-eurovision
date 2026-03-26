// src/routes/inventory.routes.js
const express = require("express");
const router = express.Router();
const { body, param, validationResult, oneOf } = require("express-validator");

// Models
const InventorySheet = require("../models/InventorySheet");
const InventoryChangeLog = require("../models/InventoryChangeLog");
const MatrixBase = require("../models/matrix/MatrixBase");
const MatrixSphCyl = require("../models/matrix/MatrixSphCyl");
const MatrixBifocal = require("../models/matrix/MatrixBifocal");
const MatrixProgresivo = require("../models/matrix/MatrixProgresivo");

// Inventory modules
const PHYSICAL_LIMITS = require("../inventory/constants/physicalLimits");
const { buildTabsForTipo } = require("../inventory/utils/tabs");
const { actorFromBody, normalizeParty, escapeRegExp } = require("../inventory/utils/normalize");
const { makeUniqueSheetSku, ensureSheetSku } = require("../inventory/utils/sku");
const { to2, isDef, isMultipleOfStep } = require("../inventory/utils/numbers");
const { clampRange } = require("../inventory/utils/ranges");
const { parseKey, denormNum, keySphCyl, normalizeCylConvention } = require("../inventory/utils/keys");
const { makeSku, makeCodebar } = require("../inventory/utils/barcode");

// Services
const { seedRootForSheet, seedFullForSheet } = require("../inventory/services/seed.service");
const { validateChunkRows } = require("../inventory/services/chunkValidate.service");
const {
  applyChunkBase,
  applyChunkSphCyl,
  applyChunkBifocal,
  applyChunkProgresivo
} = require("../inventory/services/chunkApply.service");
const { maybeExtendMetaRangesFromRows } = require("../inventory/services/metaRangesExtend.service");
const { cacheMiddleware, invalidatePattern, cacheDel, KEYS } = require("../services/redis");

// ===================== DEBUG =====================
const DEBUG_INVENTORY = String(process.env.DEBUG_INVENTORY || "") === "1";

const pickPurchase = (obj) => ({
  numFactura: obj?.numFactura,
  loteProducto: obj?.loteProducto,
  fechaCompra: obj?.fechaCompra,
  fechaCaducidad: obj?.fechaCaducidad,
  precioVenta: obj?.precioVenta,
  precioCompra: obj?.precioCompra
});

const schemaHas = (path) => {
  try {
    return !!InventorySheet?.schema?.path?.(path);
  } catch {
    return false;
  }
};

// Log schema presence once at load (MUY útil para detectar backend desactualizado)
if (DEBUG_INVENTORY) {
  console.log("[INV][BOOT] InventorySheet schema paths present?", {
    numFactura: schemaHas("numFactura"),
    loteProducto: schemaHas("loteProducto"),
    fechaCompra: schemaHas("fechaCompra"),
    fechaCaducidad: schemaHas("fechaCaducidad"),
    fechaCreacion: schemaHas("fechaCreacion")
  });
}

// Router-level request logger (solo para /sheets)
router.use((req, res, next) => {
  if (!DEBUG_INVENTORY) return next();
  if (!req.path.startsWith("/sheets")) return next();

  console.log("[INV][REQ]", req.method, req.originalUrl, {
    bodyKeys: req.body ? Object.keys(req.body) : [],
    purchase: pickPurchase(req.body),
    actor: req.body?.actor
  });

  next();
});

// Helpers router-level
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (DEBUG_INVENTORY) {
      console.error("[INV][VALIDATION] FAIL", req.method, req.originalUrl, {
        purchase: pickPurchase(req.body),
        errors: errors.array()
      });
    }
    return res.status(400).json({ ok: false, errors: errors.array() });
  }
  next();
};

// Helper para display tratamiento
const composeTratamientoDisplay = (tratamiento, variante) => {
  const t = String(tratamiento || "").trim();
  const v = String(variante || "").trim();
  if (!t) return "";
  return v ? `${t} (${v})` : t;
};

// ✅ parse date-only y datetime sin bugs de timezone
const ISO_DATE_ONLY_RX = /^\d{4}-\d{2}-\d{2}$/;
const parseOptionalDate = (v) => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v : null;

  const s = String(v || "").trim();
  if (!s) return null;

  if (ISO_DATE_ONLY_RX.test(s)) {
    const d = new Date(`${s}T12:00:00.000Z`);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
};

const parseOptionalNumber = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// modelos agrupados
const models = { MatrixBase, MatrixSphCyl, MatrixBifocal, MatrixProgresivo };

/* ======================= SHEETS ======================= */

router.get("/", cacheMiddleware(KEYS.sheetsList("inventory"), 30), async (req, res) => {
  try {
    const includeDeleted = String(req.query.includeDeleted) === "true";
    const q = String(req.query.q || "").trim();

    const query = includeDeleted ? {} : { isDeleted: { $ne: true } };

    if (q) {
      const rx = new RegExp(escapeRegExp(q), "i");
      query.$or = [
        { sku: rx },
        { nombre: rx },
        { material: rx },
        { baseKey: rx },

        { tratamientos: rx },
        { tratamiento: rx },
        { variante: rx },

        { numFactura: rx },
        { loteProducto: rx },

        { "proveedor.name": rx },
        { "marca.name": rx }
      ];
    }

    if (req.query.sku) query.sku = String(req.query.sku).trim().toUpperCase();

    const sheets = await InventorySheet.find(query).sort({ updatedAt: -1, createdAt: -1 });

    // backfill SKU únicamente
    for (const s of sheets) {
      if (!s.sku) {
        try {
          await ensureSheetSku(InventorySheet, s);
        } catch (e) {
          console.warn("SKU backfill fail:", s?._id, e?.message || e);
        }
      }
    }

    if (DEBUG_INVENTORY) {
      const sample = sheets.slice(0, 2).map((s) => {
        const o = s.toObject();
        return {
          _id: String(o._id),
          keys: Object.keys(o),
          purchase: pickPurchase(o)
        };
      });
      console.log("[INV][GET /inventory] sample sheets:", sample);
    }

    const data = sheets.map((s) => ({
      ...s.toObject(),
      tabs: buildTabsForTipo(s),
      physicalLimits: PHYSICAL_LIMITS
    }));

    res.json({ ok: true, data });
  } catch (err) {
    console.error("GET /inventory error:", err);
    res.status(500).json({ ok: false, message: "Error al listar hojas" });
  }
});

router.post(
  "/sheets",
  oneOf([body("nombre").isString().trim().notEmpty(), body("name").isString().trim().notEmpty()]),

  body("proveedor").optional({ nullable: true }).isObject(),
  body("proveedor.name").optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body("proveedor.id").optional({ nullable: true, checkFalsy: true }).isString().trim(),

  body("marca").optional({ nullable: true }).isObject(),
  body("marca.name").optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body("marca.id").optional({ nullable: true, checkFalsy: true }).isString().trim(),

  body("baseKey").isString().trim().notEmpty(),
  body("material").isString().trim().notEmpty(),
  body("tipo_matriz").isIn(["BASE", "SPH_CYL", "SPH_ADD", "BASE_ADD"]),

  body("tratamientos").optional().isArray(),
  body("tratamiento").optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body("variante").optional({ nullable: true, checkFalsy: true }).isString().trim(),

  // ✅ compra/fechas (permitir "" sin romper validator)
  body("numFactura").optional({ nullable: true }).isString().trim(),
  body("loteProducto").optional({ nullable: true }).isString().trim(),
  body("fechaCompra").optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body("fechaCaducidad").optional({ nullable: true, checkFalsy: true }).isISO8601(),

  body("precioVenta")
  .optional({ nullable: true })
  .custom((v) => v === null || String(v).trim() === "" || (Number.isFinite(Number(v)) && Number(v) >= 0)),

  body("precioCompra")
  .optional({ nullable: true })
  .custom((v) => v === null || String(v).trim() === "" || (Number.isFinite(Number(v)) && Number(v) >= 0)),

  body("actor").optional().isObject(),
  body("seed").optional().isBoolean(),
  body("sku").optional().isString().trim().isLength({ min: 6, max: 60 }),

  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);

    try {
      if (DEBUG_INVENTORY) {
        console.log("[INV][POST /sheets] schema check:", {
          numFactura: schemaHas("numFactura"),
          loteProducto: schemaHas("loteProducto"),
          fechaCompra: schemaHas("fechaCompra"),
          fechaCaducidad: schemaHas("fechaCaducidad")
        });
        console.log("[INV][POST /sheets] incoming purchase:", pickPurchase(req.body));
      }

      const nombre = (req.body.nombre ?? req.body.name).trim();

      const proveedor = normalizeParty(req.body.proveedor);
      const marca = normalizeParty(req.body.marca);

      const tratamiento = isDef(req.body.tratamiento) ? String(req.body.tratamiento).trim() : null;
      const variante = isDef(req.body.variante) ? String(req.body.variante).trim() : null;

      let tratamientosArr = Array.isArray(req.body.tratamientos) ? req.body.tratamientos : [];
      if (tratamiento && !tratamientosArr.length) {
        const display = composeTratamientoDisplay(tratamiento, variante);
        tratamientosArr = display ? [display] : [];
      }

      // compra/fechas
      const fechaCompra = parseOptionalDate(req.body.fechaCompra);
      const fechaCaducidad = parseOptionalDate(req.body.fechaCaducidad);

      const numFactura = String(req.body.numFactura || "").trim();
      const loteProducto = String(req.body.loteProducto || "").trim();

      const precioVenta = parseOptionalNumber(req.body.precioVenta);
      const precioCompra = parseOptionalNumber(req.body.precioCompra);

      if (DEBUG_INVENTORY) {
        console.log("[INV][POST /sheets] parsed purchase:", {
          numFactura,
          loteProducto,
          fechaCompra: fechaCompra ? fechaCompra.toISOString() : null,
          fechaCaducidad: fechaCaducidad ? fechaCaducidad.toISOString() : null
        });
      }

      const sheetSku = isDef(req.body.sku) ? String(req.body.sku).trim().toUpperCase() : null;

      const sheetLikeForSku = {
        proveedor,
        marca,
        tipo_matriz: req.body.tipo_matriz,
        baseKey: req.body.baseKey,
        material: req.body.material,
        tratamientos: tratamientosArr || []
      };

      const skuFinal = sheetSku || (await makeUniqueSheetSku(InventorySheet, sheetLikeForSku));

      const payloadCreate = {
        nombre,
        proveedor,
        marca,
        sku: skuFinal,
        baseKey: req.body.baseKey,
        material: req.body.material,
        tipo_matriz: req.body.tipo_matriz,

        tratamiento,
        variante,
        tratamientos: tratamientosArr,

        // ✅ compra/fechas
        fechaCompra,
        fechaCaducidad,
        numFactura,
        loteProducto,
        precioVenta,
        precioCompra,

        meta: req.body.meta || {},
        owner: actor,
        createdBy: actor,
        updatedBy: actor
      };

      if (DEBUG_INVENTORY) {
        console.log("[INV][POST /sheets] create payload purchase:", pickPurchase(payloadCreate));
      }

      const sheet = await InventorySheet.create(payloadCreate);

      if (DEBUG_INVENTORY) {
        const o = sheet.toObject();
        console.log("[INV][POST /sheets] created sheet purchase:", pickPurchase(o), {
          keys: Object.keys(o)
        });
      }

      const matrixDoc = await seedRootForSheet(models, sheet, actor);

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: "SHEET_CREATE",
        details: {
          nombre: sheet.nombre,
          matrixId: matrixDoc?._id || null,
          fechaCreacion: sheet.fechaCreacion,
          fechaCaducidad: sheet.fechaCaducidad,
          fechaCompra: sheet.fechaCompra,
          numFactura: sheet.numFactura,
          loteProducto: sheet.loteProducto,
          precioVenta: sheet.precioVenta,
          precioCompra: sheet.precioCompra
        },
        actor
      });

      let seedStats = { inserted: 0 };
      if (req.body.seed === true) {
        seedStats = await seedFullForSheet(models, sheet, actor);
        await InventoryChangeLog.create({
          sheet: sheet._id,
          tipo_matriz: sheet.tipo_matriz,
          type: "SEED_GENERATE",
          details: { inserted: seedStats.inserted, defaults: true },
          actor
        });
      }

      cacheDel(KEYS.sheetsList("inventory"));
      cacheDel(KEYS.stats());

      res.status(201).json({
        ok: true,
        data: {
          sheet,
          tabs: buildTabsForTipo(sheet),
          physicalLimits: PHYSICAL_LIMITS,
          seed: seedStats
        }
      });
    } catch (err) {
      console.error("POST /sheets error:", err);
      res.status(500).json({
        ok: false,
        message: "Error al crear hoja",
        details: String(err?.message || err)
      });
    }
  }
);

router.get(
  "/sheets/:sheetId",
  param("sheetId").isMongoId(),
  handleValidation,
  cacheMiddleware((req) => KEYS.sheetMeta(req.params.sheetId), 60),
  async (req, res) => {
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: "Sheet no existe" });
      if (sheet.isDeleted) return res.status(410).json({ ok: false, message: "Sheet eliminada (soft-delete)" });

      if (!sheet.sku) {
        try {
          await ensureSheetSku(InventorySheet, sheet);
        } catch (e) {
          console.warn("SKU backfill fail sheet:", sheet?._id, e?.message || e);
        }
      }

      if (DEBUG_INVENTORY) {
        const o = sheet.toObject();
        console.log("[INV][GET /sheets/:id] purchase:", pickPurchase(o), { keys: Object.keys(o) });
      }

      res.json({
        ok: true,
        data: {
          sheet,
          tabs: buildTabsForTipo(sheet),
          physicalLimits: PHYSICAL_LIMITS
        }
      });
    } catch (err) {
      console.error("GET /sheets/:sheetId error:", err);
      res.status(500).json({ ok: false, message: "Error al obtener hoja" });
    }
  }
);

router.get("/sheets/by-sku/:sku", async (req, res) => {
  try {
    const sku = String(req.params.sku || "").trim().toUpperCase();
    if (!sku) return res.status(400).json({ ok: false, message: "SKU requerido" });

    const sheet = await InventorySheet.findOne({ sku, isDeleted: { $ne: true } });
    if (!sheet) return res.status(404).json({ ok: false, message: "No existe planilla con ese SKU" });

    res.json({
      ok: true,
      data: { sheet, tabs: buildTabsForTipo(sheet), physicalLimits: PHYSICAL_LIMITS }
    });
  } catch (err) {
    console.error("GET /sheets/by-sku/:sku error:", err);
    res.status(500).json({ ok: false, message: "Error al buscar por SKU" });
  }
});

// ======================= PATCH SHEET =======================

router.patch(
  "/sheets/:sheetId",
  param("sheetId").isMongoId(),

  oneOf([
    body("nombre").optional().isString().trim().notEmpty(),
    body("name").optional().isString().trim().notEmpty()
  ]),

  body("tratamientos").optional().isArray(),
  body("tratamiento").optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body("variante").optional({ nullable: true, checkFalsy: true }).isString().trim(),

  // ✅ compra/fechas
  body("numFactura").optional({ nullable: true }).isString().trim(),
  body("loteProducto").optional({ nullable: true }).isString().trim(),
  body("fechaCompra").optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body("fechaCaducidad").optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body("precioVenta")
  .optional({ nullable: true })
  .custom((v) => v === null || String(v).trim() === "" || (Number.isFinite(Number(v)) && Number(v) >= 0)),

  body("precioCompra")
  .optional({ nullable: true })
  .custom((v) => v === null || String(v).trim() === "" || (Number.isFinite(Number(v)) && Number(v) >= 0)),

  body("proveedor").optional({ nullable: true }).isObject(),
  body("proveedor.name").optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body("proveedor.id").optional({ nullable: true, checkFalsy: true }).isString().trim(),

  body("marca").optional({ nullable: true }).isObject(),
  body("marca.name").optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body("marca.id").optional({ nullable: true, checkFalsy: true }).isString().trim(),

  body("meta").optional().isObject(),
  body("meta.observaciones").optional().isString(),
  body("meta.notas").optional().isString(),
  body("meta.ranges").optional().isObject(),

  body("sku").optional({ nullable: true }).isString().trim().isLength({ min: 6, max: 60 }),
  body("regenSku").optional().isBoolean(),
  body("preserveSku").optional().isBoolean(),

  body("actor").optional().isObject(),

  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);

    const sameParty = (a, b) => {
      const A = normalizeParty(a);
      const B = normalizeParty(b);
      return String(A?.id || "") === String(B?.id || "") && String(A?.name || "") === String(B?.name || "");
    };

    const sameArr = (a, b) => {
      const A = Array.isArray(a) ? a.map(String).map((x) => x.trim()).filter(Boolean).sort() : [];
      const B = Array.isArray(b) ? b.map(String).map((x) => x.trim()).filter(Boolean).sort() : [];
      if (A.length !== B.length) return false;
      for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) return false;
      return true;
    };

    try {
      if (DEBUG_INVENTORY) {
        console.log("[INV][PATCH /sheets/:id] schema check:", {
          numFactura: schemaHas("numFactura"),
          loteProducto: schemaHas("loteProducto"),
          fechaCompra: schemaHas("fechaCompra"),
          fechaCaducidad: schemaHas("fechaCaducidad")
        });
        console.log("[INV][PATCH /sheets/:id] incoming purchase:", pickPurchase(req.body));
      }

      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: "Sheet no existe" });
      if (sheet.isDeleted) return res.status(410).json({ ok: false, message: "Sheet eliminada (soft-delete)" });

      const skuBefore = sheet.sku || null;

      if (DEBUG_INVENTORY) {
        console.log("[INV][PATCH] BEFORE purchase:", pickPurchase(sheet.toObject()));
      }

      const beforeSnapshot = {
        proveedor: sheet.proveedor,
        marca: sheet.marca,
        tipo_matriz: sheet.tipo_matriz,
        baseKey: sheet.baseKey,
        material: sheet.material,
        tratamientos: sheet.tratamientos || []
      };

      if (isDef(req.body.nombre) || isDef(req.body.name)) sheet.nombre = (req.body.nombre ?? req.body.name).trim();
      if (isDef(req.body.tratamientos)) sheet.tratamientos = req.body.tratamientos;
      if (Object.prototype.hasOwnProperty.call(req.body, "tratamiento"))
        sheet.tratamiento = String(req.body.tratamiento || "").trim() || null;
      if (Object.prototype.hasOwnProperty.call(req.body, "variante"))
        sheet.variante = String(req.body.variante || "").trim() || null;

      // ✅ compra/fechas
      const hasFechaCompra = Object.prototype.hasOwnProperty.call(req.body, "fechaCompra");
      const hasFechaCad = Object.prototype.hasOwnProperty.call(req.body, "fechaCaducidad");

      if (Object.prototype.hasOwnProperty.call(req.body, "numFactura")) {
        sheet.numFactura = String(req.body.numFactura ?? "").trim();
        if (DEBUG_INVENTORY) console.log("[INV][PATCH] set numFactura:", sheet.numFactura);
      }
      if (Object.prototype.hasOwnProperty.call(req.body, "loteProducto")) {
        sheet.loteProducto = String(req.body.loteProducto ?? "").trim();
        if (DEBUG_INVENTORY) console.log("[INV][PATCH] set loteProducto:", sheet.loteProducto);
      }

      if (Object.prototype.hasOwnProperty.call(req.body, "precioVenta")) {
        sheet.precioVenta = parseOptionalNumber(req.body.precioVenta);
        if (DEBUG_INVENTORY) console.log("[INV][PATCH] set precioVenta:", sheet.precioVenta);
      }

      if (Object.prototype.hasOwnProperty.call(req.body, "precioCompra")) {
        sheet.precioCompra = parseOptionalNumber(req.body.precioCompra);
        if (DEBUG_INVENTORY) console.log("[INV][PATCH] set precioCompra:", sheet.precioCompra);
      }

      if (hasFechaCompra) {
        sheet.fechaCompra = parseOptionalDate(req.body.fechaCompra);
        if (DEBUG_INVENTORY) console.log("[INV][PATCH] set fechaCompra:", sheet.fechaCompra);
      }

      if (hasFechaCad) {
        sheet.fechaCaducidad = parseOptionalDate(req.body.fechaCaducidad);
        if (DEBUG_INVENTORY) console.log("[INV][PATCH] set fechaCaducidad:", sheet.fechaCaducidad);
      }

      // Si cambió fechaCompra y NO mandaron fechaCaducidad, recalcula caducidad en modelo
      if (hasFechaCompra && !hasFechaCad) {
        sheet.fechaCaducidad = null;
        if (DEBUG_INVENTORY) console.log("[INV][PATCH] force recalc fechaCaducidad (set null)");
      }

      

      if (isDef(req.body.proveedor)) sheet.proveedor = normalizeParty(req.body.proveedor);
      if (isDef(req.body.marca)) sheet.marca = normalizeParty(req.body.marca);

      if (req.body.meta && typeof req.body.meta === "object") {
        sheet.meta = sheet.meta && typeof sheet.meta === "object" ? sheet.meta : {};
        if (isDef(req.body.meta.observaciones)) sheet.meta.observaciones = String(req.body.meta.observaciones || "");
        if (isDef(req.body.meta.notas)) sheet.meta.notas = String(req.body.meta.notas || "");
        if (req.body.meta.ranges && typeof req.body.meta.ranges === "object") sheet.meta.ranges = req.body.meta.ranges;
        sheet.markModified("meta");
      }

      // SKU logic (igual)
      const preserveSku = req.body.preserveSku === true;
      const forceRegen = req.body.regenSku === true;

      const skuManualProvided = Object.prototype.hasOwnProperty.call(req.body, "sku") && req.body.sku !== null;
      const skuWantsClearAndAuto = Object.prototype.hasOwnProperty.call(req.body, "sku") && req.body.sku === null;

      const afterSnapshot = {
        proveedor: sheet.proveedor,
        marca: sheet.marca,
        tipo_matriz: sheet.tipo_matriz,
        baseKey: sheet.baseKey,
        material: sheet.material,
        tratamientos: sheet.tratamientos || []
      };

      const contextChanged =
        !sameParty(beforeSnapshot.proveedor, afterSnapshot.proveedor) ||
        !sameParty(beforeSnapshot.marca, afterSnapshot.marca) ||
        String(beforeSnapshot.tipo_matriz || "") !== String(afterSnapshot.tipo_matriz || "") ||
        String(beforeSnapshot.baseKey || "") !== String(afterSnapshot.baseKey || "") ||
        String(beforeSnapshot.material || "") !== String(afterSnapshot.material || "") ||
        !sameArr(beforeSnapshot.tratamientos, afterSnapshot.tratamientos);

      if (!preserveSku) {
        if (skuManualProvided) {
          sheet.sku = String(req.body.sku).trim().toUpperCase();
        } else if (skuWantsClearAndAuto || forceRegen || contextChanged) {
          const sheetLikeForSku = {
            proveedor: sheet.proveedor,
            marca: sheet.marca,
            tipo_matriz: sheet.tipo_matriz,
            baseKey: sheet.baseKey,
            material: sheet.material,
            tratamientos: sheet.tratamientos || []
          };
          sheet.sku = await makeUniqueSheetSku(InventorySheet, sheetLikeForSku, sheet._id);
        } else if (!sheet.sku) {
          await ensureSheetSku(InventorySheet, sheet);
        }
      }

      sheet.updatedBy = actor;
      sheet.updatedAt = new Date();

      await sheet.save();

      const skuAfter = sheet.sku || null;

      if (DEBUG_INVENTORY) {
        console.log("[INV][PATCH] AFTER purchase:", pickPurchase(sheet.toObject()));
      }

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: "SHEET_UPDATE",
        details: {
          nombre: sheet.nombre,
          proveedor: sheet.proveedor,
          marca: sheet.marca,
          tratamientos: sheet.tratamientos,

          fechaCreacion: sheet.fechaCreacion,
          fechaCaducidad: sheet.fechaCaducidad,
          fechaCompra: sheet.fechaCompra,
          numFactura: sheet.numFactura,
          loteProducto: sheet.loteProducto,
          precioVenta: sheet.precioVenta,
          precioCompra: sheet.precioCompra,

          metaChanged: !!req.body.meta,
          skuBefore,
          skuAfter,
          contextChanged,
          regenSku: forceRegen,
          preserveSku,
          skuManualProvided
        },
        actor
      });

      return res.json({
        ok: true,
        data: {
          sheet,
          tabs: buildTabsForTipo(sheet),
          physicalLimits: PHYSICAL_LIMITS
        }
      });
    } catch (err) {
      console.error("PATCH /sheets/:sheetId error:", err);
      return res.status(500).json({ ok: false, message: "Error al actualizar hoja" });
    }
  }
);

// ======================= trash, delete, restore =======================

router.patch(
  "/sheets/:sheetId/trash",
  param("sheetId").isMongoId(),
  body("actor").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: "Sheet no existe" });

      if (sheet.isDeleted) {
        return res.json({
          ok: true,
          message: "Hoja ya estaba en papelera",
          data: {
            sheet,
            tabs: buildTabsForTipo(sheet),
            physicalLimits: PHYSICAL_LIMITS
          }
        });
      }

      sheet.isDeleted = true;
      sheet.deletedAt = new Date();
      sheet.deletedBy = actor;
      sheet.updatedBy = actor;
      sheet.updatedAt = new Date();
      await sheet.save();

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: "SHEET_TRASH",
        details: { isDeleted: true },
        actor
      });

      return res.json({
        ok: true,
        message: "Hoja enviada a papelera",
        data: {
          sheet,
          tabs: buildTabsForTipo(sheet),
          physicalLimits: PHYSICAL_LIMITS
        }
      });
    } catch (err) {
      console.error("PATCH /sheets/:sheetId/trash error:", err);
      return res.status(500).json({ ok: false, message: "Error al enviar a papelera" });
    }
  }
);

router.delete(
  "/sheets/:sheetId",
  param("sheetId").isMongoId(),
  body("actor").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: "Sheet no existe" });
      if (sheet.isDeleted) return res.json({ ok: true, message: "Hoja ya estaba eliminada" });

      sheet.isDeleted = true;
      sheet.deletedAt = new Date();
      sheet.deletedBy = actor;
      sheet.updatedBy = actor;
      await sheet.save();

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: "SHEET_SOFT_DELETE",
        details: { isDeleted: true },
        actor
      });

      invalidatePattern(KEYS.sheetPattern(req.params.sheetId));
      cacheDel(KEYS.sheetsList("inventory"));
      cacheDel(KEYS.stats());
      res.json({ ok: true, message: "Hoja eliminada (soft-delete)" });
    } catch (err) {
      console.error("DELETE /sheets/:sheetId error:", err);
      res.status(500).json({ ok: false, message: "Error al eliminar hoja" });
    }
  }
);

router.patch(
  "/sheets/:sheetId/restore",
  param("sheetId").isMongoId(),
  body("actor").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: "Sheet no existe" });
      if (!sheet.isDeleted) return res.json({ ok: true, message: "Hoja ya está activa" });

      sheet.isDeleted = false;
      sheet.deletedAt = null;
      sheet.deletedBy = { userId: null, name: null };
      sheet.updatedBy = actor;
      await sheet.save();

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: "SHEET_RESTORE",
        details: { isDeleted: false },
        actor
      });

      res.json({
        ok: true,
        data: {
          sheet,
          tabs: buildTabsForTipo(sheet),
          physicalLimits: PHYSICAL_LIMITS
        }
      });
    } catch (err) {
      console.error("PATCH /sheets/:sheetId/restore error:", err);
      res.status(500).json({ ok: false, message: "Error al restaurar hoja" });
    }
  }
);

/* ======================= ITEMS ======================= */

router.get(
  "/sheets/:sheetId/items",
  param("sheetId").isMongoId(),
  handleValidation,
  cacheMiddleware((req) => KEYS.sheetItems(req.params.sheetId, req.query), 20),
  async (req, res) => {
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: "Sheet no existe" });
      if (sheet.isDeleted) return res.status(410).json({ ok: false, message: "Sheet eliminada (soft-delete)" });

      const limit = Math.min(Number(req.query.limit ?? 5000), 20000);

      if (sheet.tipo_matriz === "BASE") {
        const doc = await MatrixBase.findOne({ sheet: sheet._id });

        const baseRange = clampRange(
          isDef(req.query.baseMin) ? Number(req.query.baseMin) : PHYSICAL_LIMITS.BASE.min,
          isDef(req.query.baseMax) ? Number(req.query.baseMax) : PHYSICAL_LIMITS.BASE.max,
          PHYSICAL_LIMITS.BASE
        );
        if (!baseRange) return res.status(400).json({ ok: false, message: "Rango BASE inválido" });

        let rows = [];
        if (doc?.cells) {
          for (const [k, cell] of doc.cells.entries()) {
            const base = denormNum(k);
            if (Number.isFinite(base) && base >= baseRange.min && base <= baseRange.max) {
              rows.push({
                sheet: sheet._id,
                tipo_matriz: "BASE",
                base,
                existencias: cell.existencias ?? 0,
                sku: cell.sku || null,
                codebar: cell.codebar || null
              });
            }
          }
        }

        rows = rows.sort((a, b) => a.base - b.base).slice(0, limit);
        return res.json({ ok: true, data: rows });
      }

      if (sheet.tipo_matriz === "SPH_CYL") {
        const doc = await MatrixSphCyl.findOne({ sheet: sheet._id });

        const sphRange = clampRange(
          isDef(req.query.sphMin) ? Number(req.query.sphMin) : PHYSICAL_LIMITS.SPH.min,
          isDef(req.query.sphMax) ? Number(req.query.sphMax) : PHYSICAL_LIMITS.SPH.max,
          PHYSICAL_LIMITS.SPH
        );
        const cylRange = clampRange(
          isDef(req.query.cylMin) ? Number(req.query.cylMin) : PHYSICAL_LIMITS.CYL.min,
          isDef(req.query.cylMax) ? Number(req.query.cylMax) : PHYSICAL_LIMITS.CYL.max,
          PHYSICAL_LIMITS.CYL
        );
        if (!sphRange) return res.status(400).json({ ok: false, message: "Rango SPH inválido" });
        if (!cylRange) return res.status(400).json({ ok: false, message: "Rango CYL inválido" });

        let rows = [];
        if (doc?.cells) {
          for (const [k, cell] of doc.cells.entries()) {
            const [sph, cyl] = parseKey(k);
            if (
              Number.isFinite(sph) &&
              Number.isFinite(cyl) &&
              sph >= sphRange.min &&
              sph <= sphRange.max &&
              cyl >= cylRange.min &&
              cyl <= cylRange.max
            ) {
              rows.push({
                sheet: sheet._id,
                tipo_matriz: "SPH_CYL",
                sph,
                cyl,
                existencias: cell.existencias ?? 0,
                sku: cell.sku || null,
                codebar: cell.codebar || null
              });
            }
          }
        }

        rows = rows.sort((a, b) => (a.sph === b.sph ? a.cyl - b.cyl : a.sph - b.sph)).slice(0, limit);
        return res.json({ ok: true, data: rows });
      }

      if (sheet.tipo_matriz === "SPH_ADD") {
        const doc = await MatrixBifocal.findOne({ sheet: sheet._id });

        const sphMin = Number(req.query.sphMin ?? PHYSICAL_LIMITS.SPH.min);
        const sphMax = Number(req.query.sphMax ?? PHYSICAL_LIMITS.SPH.max);
        const addMin = Number(req.query.addMin ?? PHYSICAL_LIMITS.ADD.min);
        const addMax = Number(req.query.addMax ?? PHYSICAL_LIMITS.ADD.max);

        const eyes = String(req.query.eyes || "OD,OI")
          .split(",")
          .map((e) => e.trim().toUpperCase());

        let rows = [];

        if (doc?.cells) {
          for (const [k, cell] of doc.cells.entries()) {
            const [sph, add] = parseKey(k);

            if (sph < sphMin || sph > sphMax) continue;
            if (add < addMin || add > addMax) continue;

            for (const eye of eyes) {
              const eyeNode = cell[eye];
              if (!eyeNode) continue;

              rows.push({
                sheet: sheet._id,
                tipo_matriz: "SPH_ADD",
                sph,
                add,
                eye,
                base_izq: to2(cell.base_izq),
                base_der: to2(cell.base_der),
                existencias: Number(eyeNode.existencias || 0),
                sku: eyeNode.sku || null,
                codebar: eyeNode.codebar || null
              });
            }
          }
        }

        rows = rows.sort((a, b) => (a.sph === b.sph ? a.add - b.add : a.sph - b.sph)).slice(0, limit);
        return res.json({ ok: true, data: rows });
      }

      if (sheet.tipo_matriz === "BASE_ADD") {
        const doc = await MatrixProgresivo.findOne({ sheet: sheet._id });

        const addMin = Number(req.query.addMin ?? PHYSICAL_LIMITS.ADD.min);
        const addMax = Number(req.query.addMax ?? PHYSICAL_LIMITS.ADD.max);

        const eyes = String(req.query.eyes || "OD,OI")
          .split(",")
          .map((e) => e.trim().toUpperCase());

        let rows = [];

        if (doc?.cells) {
          for (const [k, cell] of doc.cells.entries()) {
            const [, , add] = parseKey(k);

            if (add < addMin || add > addMax) continue;

            for (const eye of eyes) {
              const eyeNode = cell[eye];
              if (!eyeNode) continue;

              rows.push({
                sheet: sheet._id,
                tipo_matriz: "BASE_ADD",
                base_izq: to2(cell.base_izq),
                base_der: to2(cell.base_der),
                add: to2(add),
                eye,
                existencias: Number(eyeNode.existencias || 0),
                sku: eyeNode.sku || null,
                codebar: eyeNode.codebar || null
              });
            }
          }
        }

        rows = rows.slice(0, limit);
        return res.json({ ok: true, data: rows });
      }

      return res.json({ ok: true, data: [] });
    } catch (err) {
      console.error("GET /sheets/:sheetId/items error:", err);
      res.status(500).json({ ok: false, message: "Error al listar items" });
    }
  }
);

/* ======================= RESEED ======================= */

router.post(
  "/sheets/:sheetId/seed",
  param("sheetId").isMongoId(),
  body("actor").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: "Sheet no existe" });
      if (sheet.isDeleted) return res.status(410).json({ ok: false, message: "Sheet eliminada (soft-delete)" });

      const stats = await seedFullForSheet(models, sheet, actor);

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: "SEED_GENERATE",
        details: { inserted: stats.inserted, defaults: true },
        actor
      });

      res.json({ ok: true, data: stats });
    } catch (err) {
      console.error("POST /sheets/:sheetId/seed error:", err);
      res.status(500).json({ ok: false, message: "Error al generar seed" });
    }
  }
);

/* ======================= UPDATE UNA CELDA SPH_CYL ======================= */

router.put(
  "/sheets/:sheetId/sph-cyl/cell",
  param("sheetId").isMongoId(),
  body("sph").exists(),
  body("cyl").exists(),
  body("existencias").optional(),
  body("delta").optional(),
  body("sku").optional(),
  body("codebar").optional(),
  body("actor").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req) || { userId: null, name: "system" };

    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet || sheet.isDeleted) return res.status(404).json({ ok: false, message: "Hoja no encontrada" });
      if (sheet.tipo_matriz !== "SPH_CYL") return res.status(400).json({ ok: false, message: "Esta hoja no es SPH_CYL" });

      const sph = to2(req.body.sph);
      const cyl = normalizeCylConvention(req.body.cyl);

      if (!Number.isFinite(sph) || !Number.isFinite(cyl)) return res.status(400).json({ ok: false, message: "SPH/CYL inválidos" });

      if (sph < PHYSICAL_LIMITS.SPH.min || sph > PHYSICAL_LIMITS.SPH.max)
        return res.status(400).json({ ok: false, message: `SPH fuera de límites (${PHYSICAL_LIMITS.SPH.min}..${PHYSICAL_LIMITS.SPH.max})` });
      if (!isMultipleOfStep(sph, 0.25)) return res.status(400).json({ ok: false, message: "SPH debe ir en pasos de 0.25" });

      if (cyl < PHYSICAL_LIMITS.CYL.min || cyl > PHYSICAL_LIMITS.CYL.max)
        return res.status(400).json({ ok: false, message: `CYL fuera de límites (${PHYSICAL_LIMITS.CYL.min}..${PHYSICAL_LIMITS.CYL.max})` });

      const cylIsZero = Math.abs(cyl) < 1e-6;
      if (!cylIsZero && !isMultipleOfStep(cyl, 0.25)) return res.status(400).json({ ok: false, message: "CYL debe ir en pasos de 0.25" });

      const key = keySphCyl(sph, cyl);

      let doc = await MatrixSphCyl.findOne({ sheet: sheet._id });
      if (!doc) doc = new MatrixSphCyl({ sheet: sheet._id, tipo_matriz: "SPH_CYL", cells: new Map() });

      doc.set("cells", doc.cells || new Map());

      const prev = doc.cells.get(key) || { existencias: 0, sku: null, codebar: null, createdBy: actor };
      const before = Number(prev.existencias ?? 0);

      let after;
      if (isDef(req.body.existencias)) after = Number(req.body.existencias);
      else if (isDef(req.body.delta)) after = before + Number(req.body.delta);
      else return res.status(400).json({ ok: false, message: "Envía existencias o delta" });

      if (!Number.isFinite(after) || after < 0) return res.status(400).json({ ok: false, message: "Existencias resultantes inválidas (<0)" });

      let finalSku = isDef(req.body.sku) ? String(req.body.sku) : prev.sku || makeSku(sheet._id, "SPH_CYL", { sph, cyl });
      let finalCodebar = isDef(req.body.codebar) ? (req.body.codebar === null ? null : String(req.body.codebar)) : prev.codebar;

      if (after > 0 && !finalCodebar) finalCodebar = makeCodebar(sheet._id, "SPH_CYL", { sph, cyl });

      const nextCell = { ...prev, existencias: after, sku: finalSku, codebar: finalCodebar, createdBy: prev.createdBy || actor, updatedBy: actor };

      doc.cells.set(key, nextCell);
      doc.markModified("cells");
      await doc.save();

      let axisExtended = false;
      let axisExtendError = null;
      try {
        axisExtended = await maybeExtendMetaRangesFromRows(sheet, [{ sph, cyl, existencias: after }]);
      } catch (e) {
        axisExtended = false;
        axisExtendError = e?.message || String(e);
      }

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: "SPH_CYL",
        sph,
        cyl,
        type: "CELL_UPDATE",
        details: { key, before, after, delta: after - before, axisExtended, axisExtendError },
        actor
      });

      // Alerta de stock — no bloqueante, no afecta la respuesta HTTP
      setImmediate(() => {
        const { checkCellAlert } = require("../services/stockAlert.service");
        checkCellAlert(sheet, "SPH_CYL", key, after, null);
      });

      return res.json({ ok: true, key, before, after, cell: nextCell, axisExtended, axisExtendError });
    } catch (err) {
      console.error("PUT /sheets/:sheetId/sph-cyl/cell error:", err);
      return res.status(500).json({ ok: false, message: "Error interno", error: String(err?.message || err) });
    }
  }
);

/* ======================= CHUNK SAVE ======================= */

router.post(
  "/sheets/:sheetId/chunk",
  param("sheetId").isMongoId(),
  body("rows").isArray().withMessage("rows debe ser un arreglo"),
  body("actor").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);

    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: "Sheet no existe" });
      if (sheet.isDeleted) return res.status(410).json({ ok: false, message: "Sheet eliminada (soft-delete)" });

      const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
      if (!rows.length) return res.json({ ok: true, data: { upserted: 0 } });

      const validationErrors = validateChunkRows(sheet.tipo_matriz, rows);
      if (validationErrors.length) {
        return res.status(400).json({ ok: false, message: "Datos inválidos en rows", errors: validationErrors });
      }

      let result;
      let usedRowsForExtend = rows;

      switch (sheet.tipo_matriz) {
        case "BASE":
          result = await applyChunkBase(models, sheet, rows, actor);
          break;

        case "SPH_CYL": {
          const normalizedRows = rows.map((r) => ({ ...r, cyl: normalizeCylConvention(r.cyl) }));
          result = await applyChunkSphCyl(models, sheet, normalizedRows, actor);
          usedRowsForExtend = normalizedRows;
          break;
        }

        case "SPH_ADD":
          result = await applyChunkBifocal(models, sheet, rows, actor);
          break;

        case "BASE_ADD":
          result = await applyChunkProgresivo(models, sheet, rows, actor);
          break;

        default:
          return res.status(400).json({ ok: false, message: `tipo_matriz no soportado: ${sheet.tipo_matriz}` });
      }

      let axisExtended = false;
      let axisExtendError = null;
      try {
        axisExtended = await maybeExtendMetaRangesFromRows(sheet, usedRowsForExtend);
      } catch (e) {
        axisExtended = false;
        axisExtendError = e?.message || String(e);
      }

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: "CHUNK_SAVE",
        details: { upserted: result.updated, rowsCount: rows.length, axisExtended, axisExtendError },
        actor
      });

      // Alerta de stock — barre toda la planilla, no bloqueante
      setImmediate(() => {
        const { checkSheetAlerts } = require("../services/stockAlert.service");
        checkSheetAlerts(sheet);
      });

      // Invalidate cache for this sheet + stats
      invalidatePattern(KEYS.sheetPattern(req.params.sheetId));
      cacheDel(KEYS.stats());
      cacheDel(KEYS.sheetsList("inventory"));

      return res.json({ ok: true, data: { upserted: result.updated, axisExtended, axisExtendError } });
    } catch (err) {
      console.error("POST /sheets/:sheetId/chunk error:", err);
      res.status(500).json({ ok: false, message: "Error al guardar chunk" });
    }
  }
);

module.exports = router;