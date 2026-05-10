const mongoose = require("mongoose");

const createOpticaConnection = () => {
  const uri = process.env.OPTICA_MONGO_URI;
  if (!uri) {
    console.warn("⚠️  OPTICA_MONGO_URI no definido — recursos de óptica no disponibles en AdminJS");
    return null;
  }
  const conn = mongoose.createConnection(uri, { maxPoolSize: 5 });
  conn.on("connected", () => console.log("✅ AdminJS conectado a optica_db"));
  conn.on("error",     (e) => console.error("❌ AdminJS optica_db error:", e.message));
  return conn;
};

module.exports = { createOpticaConnection };
