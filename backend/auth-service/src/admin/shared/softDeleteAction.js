/**
 * Hook before-delete que impide eliminar al usuario root.
 * Reutilizable en cualquier recurso que tenga el campo populado role.name.
 */
const preventRootDeletionHook = async (request) => {
  if (request.record?.params?.["role.name"] === "root") {
    throw new Error("El usuario root no se puede eliminar");
  }
  return request;
};

module.exports = { preventRootDeletionHook };
