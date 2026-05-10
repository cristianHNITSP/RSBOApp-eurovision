const mongoose = require("mongoose");

const createBackorderConnection = () => {
  const uri = process.env.BACKORDER_MONGO_URI;
  if (!uri) {
    console.warn("⚠️  BACKORDER_MONGO_URI no definido — back orders no disponibles en AdminJS");
    return null;
  }
  const conn = mongoose.createConnection(uri, { maxPoolSize: 5 });
  conn.on("connected", () => console.log("✅ AdminJS conectado a backorder_db"));
  conn.on("error",     (e) => console.error("❌ AdminJS backorder_db error:", e.message));
  return conn;
};

module.exports = { createBackorderConnection };
