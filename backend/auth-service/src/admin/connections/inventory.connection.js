const mongoose = require("mongoose");

const createInventoryConnection = () => {
  const uri = process.env.INVENTORY_MONGO_URI;
  if (!uri) {
    console.warn("⚠️  INVENTORY_MONGO_URI no definido — recursos de inventario no disponibles en AdminJS");
    return null;
  }
  const conn = mongoose.createConnection(uri, { maxPoolSize: 5 });
  conn.on("connected", () => console.log("✅ AdminJS conectado a inventory_db"));
  conn.on("error",     (e) => console.error("❌ AdminJS inventory_db error:", e.message));
  return conn;
};

module.exports = { createInventoryConnection };
