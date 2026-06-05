const mongoose = require("mongoose");

/**
 * La óptica se consolidó dentro de inventory-service y sus datos viven ahora en
 * la base de datos de inventario (colección `opticaproducts` vía discriminators).
 * AdminJS se conecta por tanto a INVENTORY_MONGO_URI.
 */
const createOpticaConnection = () => {
  const uri = process.env.INVENTORY_MONGO_URI;
  if (!uri) {
    console.warn("⚠️  INVENTORY_MONGO_URI no definido — recursos de óptica no disponibles en AdminJS");
    return null;
  }
  const conn = mongoose.createConnection(uri, { maxPoolSize: 5 });
  conn.on("connected", () => console.log("✅ AdminJS conectado a óptica (inventory_db)"));
  conn.on("error",     (e) => console.error("❌ AdminJS óptica error:", e.message));
  return conn;
};

module.exports = { createOpticaConnection };
