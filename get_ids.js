const mongoose = require('mongoose');
const connStr = "mongodb://rsbo_admin:rsbo_pass@localhost:27017/rsbo_inventory?authSource=admin";

async function run() {
  try {
    await mongoose.connect(connStr);
    const Sheet = mongoose.model('InventorySheet', new mongoose.Schema({ nombre: String, tipo_matriz: String, isDeleted: Boolean }), 'inventorysheets');
    const CLSheet = mongoose.model('ContactLensesSheet', new mongoose.Schema({ nombre: String, tipo_matriz: String, isDeleted: Boolean }), 'contactlensessheets');
    
    const inv = await Sheet.find({ isDeleted: false }).lean();
    const cl = await CLSheet.find({ isDeleted: false }).lean();
    
    console.log("--- INVENTORY ---");
    inv.forEach(s => console.log(`${s._id} | ${s.nombre} | ${s.tipo_matriz}`));
    console.log("--- CONTACT LENSES ---");
    cl.forEach(s => console.log(`${s._id} | ${s.nombre} | ${s.tipo_matriz}`));
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
