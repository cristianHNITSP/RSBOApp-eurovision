// src/api/logErr.js
// Helper compartido para logging de errores de axios en servicios.

export const logErr = (tag, err) => {
  console.error(tag, {
    status:  err?.response?.status,
    data:    err?.response?.data,
    message: err?.message
  });
};
