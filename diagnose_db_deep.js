const mongoose = require('mongoose');
const mongoUri = 'mongodb://root:xqr5Dc93KMa24b@mongo:27017/?authSource=admin';

async function diagnose() {
  console.log('Connecting...');
  await mongoose.connect(mongoUri);
  const admin = mongoose.connection.db.admin();
  
  console.log('Databases:');
  const dbs = await admin.listDatabases();
  console.log(JSON.stringify(dbs, null, 2));
  
  for (const dbInfo of dbs.databases) {
    const db = mongoose.connection.useDb(dbInfo.name);
    const cols = await db.listCollections().toArray();
    console.log(`DB: ${dbInfo.name} | Collections: ${cols.map(c => c.name).join(', ')}`);
    
    if (cols.some(c => c.name === 'laboratoryorders')) {
      const LaboratoryOrder = db.model('LaboratoryOrder', new mongoose.Schema({}, { strict: false }));
      const count = await LaboratoryOrder.countDocuments({ cliente: /juan/i });
      console.log(`  -> Found ${count} orders for "juan" in ${dbInfo.name}.laboratoryorders`);
    }
  }
  
  await mongoose.disconnect();
}

diagnose().catch(console.error);
