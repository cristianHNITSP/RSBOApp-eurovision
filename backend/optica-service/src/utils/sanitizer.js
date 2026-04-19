const purify = require("isomorphic-dompurify");

/**
 * Sanitiza un objeto eliminando cualquier etiqueta HTML de los campos de texto.
 * @param {Object} data - Los datos a sanitizar (ej: req.body)
 * @param {Array} fields - Lista de campos que deben ser limpiados
 */
const sanitizeFields = (data, fields = []) => {
  if (!data || typeof data !== "object") return data;
  
  fields.forEach(field => {
    if (data[field] && typeof data[field] === "string") {
      data[field] = purify.sanitize(data[field].trim());
    }
  });
  
  return data;
};

/**
 * Middleware para sanitizar campos específicos del body
 * @param {Array} fields 
 */
const sanitizeMiddleware = (fields = []) => (req, res, next) => {
  sanitizeFields(req.body, fields);
  next();
};

module.exports = {
  sanitizeFields,
  sanitizeMiddleware
};
