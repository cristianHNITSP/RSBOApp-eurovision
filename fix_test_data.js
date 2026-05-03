const mongoose = require('mongoose');

// URI de conexión obtenida del entorno del contenedor
const mongoUri = 'mongodb://root:xqr5Dc93KMa24b@mongo:27017/inventory_db?authSource=admin';

async function fixData() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  
  const LaboratoryOrder = mongoose.model('LaboratoryOrder', new mongoose.Schema({}, { strict: false }));
  
  console.log('Updating orders for "juan"...');
  const result = await LaboratoryOrder.updateMany(
    { cliente: /juan/i },
    { 
      $set: { 
        clienteNombres: "Juan",
        clienteApellidos: "Perez Test",
        clienteDisplay: "Juan Perez Test",
        clienteEmpresa: "Optica Central",
        clienteContacto: "555-0123",
        note: "Prueba de autocompletado OK"
      } 
    }
  );
  
  console.log(`Success: Updated ${result.modifiedCount} orders.`);
  await mongoose.disconnect();
}

fixData().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
