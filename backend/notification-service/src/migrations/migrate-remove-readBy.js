// Ejecutar: docker exec rsboapp-notification node src/migrations/migrate-remove-readBy.js
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

async function run() {
  try {
    console.log("Conectando a MongoDB...", process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log("Conectado. Ejecutando migración...");
    
    // updateMany para eliminar el campo readBy
    const result = await mongoose.connection.db.collection("notifications").updateMany(
      {},
      { $unset: { readBy: "" } }
    );
    
    console.log(`Migración completada. Documentos modificados: ${result.modifiedCount}`);
  } catch (error) {
    console.error("Error durante la migración:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
