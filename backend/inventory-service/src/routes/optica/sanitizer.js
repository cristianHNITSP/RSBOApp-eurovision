/**
 * @fileoverview Sanitización anti-XSS de campos de texto del body (DOMPurify).
 */
const purify = require("isomorphic-dompurify");

const sanitizeFields = (data, fields = []) => {
  if (!data || typeof data !== "object") return data;
  fields.forEach((field) => {
    if (data[field] && typeof data[field] === "string") {
      data[field] = purify.sanitize(data[field].trim());
    }
  });
  return data;
};

const sanitizeMiddleware = (fields = []) => (req, _res, next) => {
  sanitizeFields(req.body, fields);
  next();
};

module.exports = { sanitizeFields, sanitizeMiddleware };
