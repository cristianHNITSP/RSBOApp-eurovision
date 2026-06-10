/**
 * @fileoverview Validadores de rutas de usuarios (express-validator).
 * Falla con 400 { ok:false, errors } vía runValidation.
 *
 * @module validators/user.validators
 */
const { body, param, query, runValidation, objectIdParam } = require("./_helpers");

const USERNAME_RX = /^[a-zA-Z0-9_.-]{3,32}$/;
const STATUS = ["all", "active", "inactive", "trash"];
const SORT_BY = ["name", "username", "createdAt", "lastLogin"];
const SORT_DIR = ["asc", "desc"];

/** Política de contraseña unificada: 8–128, con al menos una letra y un dígito. */
const passwordPolicy = (field) =>
  body(field)
    .exists({ checkNull: true }).withMessage(`${field} requerido`).bail()
    .isString().withMessage(`${field} debe ser texto`)
    .isLength({ min: 8, max: 128 }).withMessage("La contraseña debe tener entre 8 y 128 caracteres")
    .matches(/[A-Za-z]/).withMessage("La contraseña debe incluir al menos una letra")
    .matches(/\d/).withMessage("La contraseña debe incluir al menos un número");

const optionalProfileFields = [
  body("phone").optional({ nullable: true }).isString().trim().isLength({ max: 20 }).withMessage("phone máx 20 caracteres"),
  body("bio").optional({ nullable: true }).isString().trim().isLength({ max: 500 }).withMessage("bio máx 500 caracteres"),
  body("avatar").optional({ nullable: true }).isString().trim().isLength({ max: 500 }).withMessage("avatar máx 500 caracteres"),
];

const listUsers = [
  query("page").optional().isInt({ min: 1 }).withMessage("page debe ser un entero ≥ 1"),
  query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("limit entre 1 y 50"),
  query("q").optional().isString().trim().isLength({ max: 100 }).withMessage("q máx 100 caracteres"),
  query("status").optional().isIn(STATUS).withMessage("status inválido"),
  query("sortBy").optional().isIn(SORT_BY).withMessage("sortBy inválido"),
  query("sortDir").optional().isIn(SORT_DIR).withMessage("sortDir inválido"),
  query("role").optional().custom((v) => v === "all" || require("mongoose").Types.ObjectId.isValid(v))
    .withMessage("role inválido"),
  runValidation,
];

const createUser = [
  body("name").exists().withMessage("name requerido").bail().isString().trim()
    .isLength({ min: 2, max: 80 }).withMessage("name entre 2 y 80 caracteres"),
  body("username").exists().withMessage("username requerido").bail().isString().trim()
    .matches(USERNAME_RX).withMessage("username: 3-32 chars [a-z0-9_.-]"),
  passwordPolicy("password"),
  body("role").exists().withMessage("role requerido").bail()
    .custom((v) => require("mongoose").Types.ObjectId.isValid(v)).withMessage("role inválido"),
  body("isActive").optional({ nullable: true }).isBoolean().withMessage("isActive debe ser booleano"),
  ...optionalProfileFields,
  runValidation,
];

const updateUser = [
  objectIdParam("id"),
  body("name").optional().isString().trim().isLength({ min: 2, max: 80 }).withMessage("name entre 2 y 80 caracteres"),
  body("username").optional().isString().trim().matches(USERNAME_RX).withMessage("username: 3-32 chars [a-z0-9_.-]"),
  body("role").optional().custom((v) => require("mongoose").Types.ObjectId.isValid(v)).withMessage("role inválido"),
  body("isActive").optional({ nullable: true }).isBoolean().withMessage("isActive debe ser booleano"),
  ...optionalProfileFields,
  runValidation,
];

const idParam = [objectIdParam("id"), runValidation];

const updatePasswordAdmin = [objectIdParam("id"), passwordPolicy("password"), runValidation];

const changePasswordSelf = [
  body("currentPassword").exists({ checkNull: true }).withMessage("currentPassword requerido").bail()
    .isString().isLength({ min: 1, max: 128 }),
  passwordPolicy("newPassword"),
  runValidation,
];

module.exports = {
  listUsers, createUser, updateUser, idParam, updatePasswordAdmin, changePasswordSelf,
};
