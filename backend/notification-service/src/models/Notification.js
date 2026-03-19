/**
 * @fileoverview Modelo Notification
 * Notificaciones del sistema con soporte para roles objetivo,
 * prioridad, expiración y seguimiento de lectura por usuario.
 *
 * @module models/Notification
 */

const mongoose = require('mongoose');

const VALID_ROLES = ['root', 'eurovision', 'supervisor', 'ventas', 'laboratorio'];

const readEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    readAt:  { type: Date, default: Date.now },
  },
  { _id: false }
);

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
      enum: ['info', 'warning', 'danger', 'success'],
      default: 'info',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    /**
     * Roles que pueden ver esta notificación.
     * Array vacío + isGlobal=true → todos la ven.
     * Si isGlobal=false, solo los roles listados aquí la ven.
     */
    targetRoles: {
      type: [{ type: String, enum: VALID_ROLES }],
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
    },
    /** Lista de usuarios que ya la leyeron */
    readBy: {
      type: [readEntrySchema],
      default: [],
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
    },
    /**
     * Datos detallados para el panel expandible del frontend.
     * Para alertas de stock: { type: 'stock_alert', sheetId, sheetLabel, cells: [...], critCount, lowCount }
     * Para pedidos pendientes: { type: 'pending_orders', date, orders: [...] }
     */
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

// Índices útiles
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ targetRoles: 1 });
notificationSchema.index({ isGlobal: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $ne: null } } });
notificationSchema.index({ groupKey: 1, date: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
