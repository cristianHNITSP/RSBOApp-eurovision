const mongoose = require("mongoose");

const createNotificationConnection = () => {
  const uri = process.env.NOTIFICATION_MONGO_URI;
  if (!uri) {
    console.warn("⚠️  NOTIFICATION_MONGO_URI no definido — notificaciones no disponibles en AdminJS");
    return null;
  }
  const conn = mongoose.createConnection(uri, { maxPoolSize: 5 });
  conn.on("connected", () => console.log("✅ AdminJS conectado a notification_db"));
  conn.on("error",     (e) => console.error("❌ AdminJS notification_db error:", e.message));
  return conn;
};

module.exports = { createNotificationConnection };
