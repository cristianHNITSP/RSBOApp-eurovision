/**
 * @fileoverview Modelo Notification
 * Notificaciones del sistema con soporte para roles objetivo,
 * prioridad, expiración y seguimiento de lectura por usuario.
 *
 * @module models/Notification
 */

const mongoose = require('mongoose');
const { ENUMS } = require('../data/constants');

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: ENUMS.TYPES,
      default: 'info',
    },
    priority: {
      type: String,
      enum: ENUMS.PRIORITIES,
      default: 'low',
    },
    /**
     * Roles que pueden ver esta notificación.
     * Array vacío + isGlobal=true → todos la ven.
     * Si isGlobal=false, solo los roles listados aquí la ven.
     */
    targetRoles: {
      type: [{ type: String, enum: ENUMS.VALID_ROLES }],
      default: [],
    },
    /** Si true, la notificación se muestra a todos los roles */
    isGlobal: {
      type: Boolean,
      default: false,
    },
    /** ID del usuario que creó la notificación */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    /** Nombre desnormalizado para mostrar en UI sin join extra */
    createdByName: {
      type: String,
      default: '',
      maxlength: 120,
    },
    /** Usuarios que fijaron esta notificación (per-user, persistente) */
    pinnedBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId }],
      default: [],
    },
    /** Usuarios que descartaron esta notificación (la oculta permanentemente para ellos) */
    dismissedBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId }],
      default: [],
    },
    /** Fecha de expiración opcional; null = no expira */
    expiresAt: {
      type: Date,
      default: null,
    },
    /**
     * Clave de agrupación (opcional).
     * Si dos notificaciones comparten el mismo groupKey, se acumulan en una sola
     * en lugar de crear entradas duplicadas.
     */
    groupKey: {
      type: String,
      default: null,
      maxlength: 200,
    },
    /** Cuántas veces se ha acumulado este grupo (≥1) */
    count: {
      type: Number,
      default: 1,
      min: 1,
    },
    /** Fecha YYYY-MM-DD para agrupar notificaciones por día */
    date: {
      type: String,
      default: null,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    /**
     * Datos detallados para el panel expandible del frontend.
     * Para alertas de stock: { type: 'stock_alert', sheetId, sheetLabel, cells: [...], critCount, lowCount }
     * Para pedidos pendientes: { type: 'pending_orders', date, orders: [...] }
     */
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      validate: {
        validator: (v) => {
          if (v == null) return true;
          if (typeof v !== "object") return false;
          // Rechaza claves con operadores Mongo y tamaños abusivos
          const json = JSON.stringify(v);
          if (/[$]|\\./.test(Object.keys(v).join(""))) return false;
          return Buffer.byteLength(json, "utf8") <= 32 * 1024;
        },
        message: "metadata inválida (claves no permitidas o excede 32KB)",
      },
    },
    /** Hash del contenido (title + message + metadata) para evitar actualizaciones nulas */
    contentHash: {
      type: String,
      default: null,
      maxlength: 64,
    },
  },
  { timestamps: true }
);

// Índices útiles
notificationSchema.index({ targetRoles: 1, priority: -1, createdAt: -1 });
notificationSchema.index({ isGlobal: 1, priority: -1, createdAt: -1 });
// TTL: borra el doc cuando expiresAt vence. El partialFilterExpression usa
// `$type: "date"` (Mongo NO admite `$ne`/`$not` en índices parciales) para
// aplicar el TTL solo a documentos con fecha de expiración.
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: "date" } } });
// Único cuando AMBOS son strings (agrupación diaria): evita documentos duplicados
// {groupKey,date} bajo concurrencia. No aplica a notificaciones sin groupKey/date.
notificationSchema.index(
  { groupKey: 1, date: 1 },
  { unique: true, partialFilterExpression: { groupKey: { $type: "string" }, date: { $type: "string" } } }
);

module.exports = mongoose.model('Notification', notificationSchema);
