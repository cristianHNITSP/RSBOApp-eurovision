/**
 * @fileoverview Validadores de rutas de notificaciones.
 * @module validators/notification.validators
 */
const { body, query, runValidation, objectIdParam } = require("./_helpers");
const { ENUMS } = require("../data/constants");

const DATE_RANGES = ["diario", "semana", "mes", "indefinido"];

const targetRolesField = body("targetRoles").optional({ nullable: true })
  .isArray({ max: ENUMS.VALID_ROLES.length }).withMessage("targetRoles debe ser un arreglo")
  .bail()
  .custom((arr) => arr.every((r) => ENUMS.VALID_ROLES.includes(r)))
  .withMessage("targetRoles contiene un rol inválido");

const createNotification = [
  body("title").exists().withMessage("title requerido").bail().isString().trim().isLength({ min: 1, max: 120 }),
  body("message").exists().withMessage("message requerido").bail().isString().trim().isLength({ min: 1, max: 2000 }),
  body("type").optional({ nullable: true }).isIn(ENUMS.TYPES).withMessage("type inválido"),
  body("priority").optional({ nullable: true }).isIn(ENUMS.PRIORITIES).withMessage("priority inválido"),
  targetRolesField,
  body("isGlobal").optional({ nullable: true }).isBoolean().withMessage("isGlobal debe ser booleano"),
  body("expiresAt").optional({ nullable: true }).isISO8601().withMessage("expiresAt debe ser fecha válida"),
  runValidation,
];

const createGrouped = [
  body("groupKey").optional({ nullable: true }).isString().isLength({ max: 200 }).withMessage("groupKey máx 200"),
  body("title").exists().withMessage("title requerido").bail().isString().trim().isLength({ min: 1, max: 120 }),
  body("messageTemplate").exists().withMessage("messageTemplate requerido").bail().isString().trim().isLength({ min: 1, max: 2000 }),
  body("type").optional({ nullable: true }).isIn(ENUMS.TYPES).withMessage("type inválido"),
  body("priority").optional({ nullable: true }).isIn(ENUMS.PRIORITIES).withMessage("priority inválido"),
  targetRolesField,
  body("isGlobal").optional({ nullable: true }).isBoolean().withMessage("isGlobal debe ser booleano"),
  runValidation,
];

const listQuery = [
  query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("limit entre 1 y 50"),
  query("skip").optional().isInt({ min: 0 }).withMessage("skip ≥ 0"),
  query("dateRange").optional().isIn(DATE_RANGES).withMessage("dateRange inválido"),
  runValidation,
];

const idParam = [objectIdParam("id"), runValidation];

const updateNotification = [
  objectIdParam("id"),
  body("title").optional().isString().trim().isLength({ min: 1, max: 120 }),
  body("message").optional().isString().trim().isLength({ min: 1, max: 2000 }),
  body("type").optional({ nullable: true }).isIn(ENUMS.TYPES).withMessage("type inválido"),
  body("priority").optional({ nullable: true }).isIn(ENUMS.PRIORITIES).withMessage("priority inválido"),
  targetRolesField,
  body("isGlobal").optional({ nullable: true }).isBoolean(),
  body("expiresAt").optional({ nullable: true }).isISO8601().withMessage("expiresAt debe ser fecha válida"),
  runValidation,
];

module.exports = { createNotification, createGrouped, listQuery, idParam, updateNotification };
