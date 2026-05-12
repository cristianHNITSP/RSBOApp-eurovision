/**
 * @fileoverview Script para sembrar pedidos de laboratorio de prueba.
 */
const mongoose = require('mongoose');
require('dotenv').config();

const LaboratoryOrder = require('../src/models/laboratory/LaboratoryOrder');
const InventorySheet = require('../src/models/InventorySheet');
const MatrixBase = require('../src/models/matrix/MatrixBase');
const MatrixSphCyl = require('../src/models/matrix/MatrixSphCyl');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://root:xqr5Dc93KMa24b@localhost:27017/inventory_db?authSource=admin';

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    // Buscar una planilla activa
    const sheet = await InventorySheet.findOne({ isDeleted: false });
    if (!sheet) {
      console.error('No se encontró ninguna planilla activa. Abortando.');
      process.exit(1);
    }
    console.log(`Using sheet: ${sheet.nombre} (${sheet._id})`);

    // Buscar items con o sin stock
    let Model;
    if (sheet.tipo_matriz === 'BASE') Model = MatrixBase;
    else if (sheet.tipo_matriz === 'SPH_CYL') Model = MatrixSphCyl;
    else {
        console.warn(`Tipo de matriz ${sheet.tipo_matriz} no soportado por este script simple.`);
        process.exit(1);
    }

    const matrix = await Model.findOne({ sheet: sheet._id });
    if (!matrix || !matrix.cells || matrix.cells.size === 0) {
      console.error('La planilla no tiene ítems en su matriz.');
      process.exit(1);
    }

    const cells = Array.from(matrix.cells.entries());
    const sampleCells = cells.slice(0, 3);

    const orders = [
      {
        folio: 'LAB-TEST-001',
        cliente: 'Juan Pérez (Prueba)',
        clienteNombres: 'Juan',
        clienteApellidos: 'Pérez',
        status: 'pendiente',
        sheet: sheet._id,
        totalMonto: 1500,
        lines: sampleCells.map(([k, cell]) => ({
          lineId: `line_${k}`,
          codebar: cell.codebar || `CB-${k}`,
          sku: cell.sku,
          qty: 1,
          picked: 0,
          precio: 500,
          matrixKey: k,
          params: { [sheet.tipo_matriz === 'BASE' ? 'base' : 'sph']: parseFloat(k) || 0 },
          tipo_matriz: sheet.tipo_matriz
        })),
        actor: { userId: 'system', name: 'Seed Script' }
      },
      {
        folio: 'LAB-TEST-002',
        cliente: 'María García (Prueba)',
        clienteNombres: 'María',
        clienteApellidos: 'García',
        status: 'parcial',
        sheet: sheet._id,
        totalMonto: 1000,
        lines: sampleCells.slice(0, 2).map(([k, cell]) => ({
          lineId: `line_${k}`,
          codebar: cell.codebar || `CB-${k}`,
          sku: cell.sku,
          qty: 1,
          picked: 1,
          precio: 500,
          matrixKey: k,
          params: { [sheet.tipo_matriz === 'BASE' ? 'base' : 'sph']: parseFloat(k) || 0 },
          tipo_matriz: sheet.tipo_matriz
        })),
        actor: { userId: 'system', name: 'Seed Script' }
      }
    ];

    console.log('Creating orders...');
    // Eliminar si ya existen
    await LaboratoryOrder.deleteMany({ folio: { $in: ['LAB-TEST-001', 'LAB-TEST-002'] } });
    await LaboratoryOrder.insertMany(orders);
    console.log('Done! 2 orders created.');

    process.exit(0);
  } catch (err) {
    console.error('Error seeding orders:', err);
    process.exit(1);
  }
}

seed();
