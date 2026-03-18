'use strict';

/**
 * catalog-data.js
 *
 * Fuente única de verdad para bases y tratamientos ópticos.
 * Importado tanto por seed-catalog.js como por seed-inventory-sheets.js.
 */

// ── Paletas de variantes ──────────────────────────────────────────────────────
const POLAR_BASES   = ['Gris', 'Café', 'G15'];
const ESPEJO_COLORS = ['Verde', 'Rojo', 'Morado', 'Plata', 'Naranja'];

// ── Tratamientos ─────────────────────────────────────────────────────────────
const TREATMENTS = {
  BCO: {
    key:              'BCO',
    label:            'Blanco',
    orden:            1,
    variants:         [],
    variantsByMaterial: {},
    allowedMaterials: [],
    allowedBases:     [],
  },
  AR: {
    key:              'AR',
    label:            'Antirreflejante',
    orden:            2,
    variants:         [],
    variantsByMaterial: {},
    allowedMaterials: [],
    allowedBases:     [],
  },
  ANTIBLE: {
    key:              'ANTIBLE',
    label:            'Anti luz azul',
    orden:            3,
    variants:         ['sin Antirreflejante', 'con Antirreflejante'],
    variantsByMaterial: {},
    allowedMaterials: [],
    allowedBases:     [],
  },
  FOTO: {
    key:              'FOTO',
    label:            'Fotocromático',
    orden:            4,
    variants:         ['sin Antirreflejante', 'con Antirreflejante'],
    variantsByMaterial: {},
    allowedMaterials: [],
    allowedBases:     [],
  },
  FOTO_ANTIBLE: {
    key:              'FOTO_ANTIBLE',
    label:            'Fotocromático + Anti luz azul',
    orden:            5,
    variants:         ['sin Antirreflejante', 'con Antirreflejante'],
    variantsByMaterial: {},
    allowedMaterials: [],
    allowedBases:     [],
  },
  TRANSITIONS: {
    key:              'TRANSITIONS',
    label:            'Transitions',
    orden:            6,
    variants:         [],
    variantsByMaterial: {
      'CR-39':         ['Gris', 'Café', 'Verde'],
      'Policarbonato': ['Gris', 'Café'],
    },
    allowedMaterials: ['CR-39', 'Policarbonato'],
    allowedBases:     [],
  },
  POLAR: {
    key:              'POLAR',
    label:            'Polarizado',
    orden:            7,
    variants:         [...POLAR_BASES],
    variantsByMaterial: {},
    allowedMaterials: ['CR-39', 'Policarbonato'],
    allowedBases:     ['monofocal', 'monofocalEsfCil'],
  },
  POLAR_ESPEJO: {
    key:              'POLAR_ESPEJO',
    label:            'Polarizado + Espejado',
    orden:            8,
    variants:         POLAR_BASES.flatMap(b => ESPEJO_COLORS.map(c => `Base ${b} + Espejo ${c}`)),
    variantsByMaterial: {},
    allowedMaterials: ['CR-39', 'Policarbonato'],
    allowedBases:     ['monofocal', 'monofocalEsfCil'],
  },
  CRISTAL_FOTO: {
    key:              'CRISTAL_FOTO',
    label:            'Fotocromático Cristal',
    orden:            9,
    variants:         [],
    variantsByMaterial: {},
    allowedMaterials: ['Cristal'],
    allowedBases:     [],
  },
};

// ── Bases ─────────────────────────────────────────────────────────────────────
const BASES_CONFIG = {
  monofocal: {
    key:          'monofocal',
    label:        'Monofocal (Base)',
    tipo_matriz:  'BASE',
    orden:        1,
    materiales:   ['Policarbonato', 'CR-39', '1.56', '1.61 MR-8', '1.67', '1.74', 'Cristal'],
    tratamientos: ['BCO', 'AR', 'ANTIBLE', 'FOTO', 'FOTO_ANTIBLE', 'TRANSITIONS', 'POLAR', 'POLAR_ESPEJO', 'CRISTAL_FOTO'],
    materialTreatmentOverrides: [
      { material: 'Cristal', treatments: ['BCO', 'CRISTAL_FOTO'] },
    ],
  },
  progresivo: {
    key:          'progresivo',
    label:        'Progresivo (Base + ADD)',
    tipo_matriz:  'BASE_ADD',
    orden:        2,
    materiales:   ['Policarbonato', 'CR-39', '1.56', '1.61 MR-8', '1.67', '1.74'],
    tratamientos: ['BCO', 'AR', 'ANTIBLE', 'FOTO', 'FOTO_ANTIBLE', 'TRANSITIONS'],
    materialTreatmentOverrides: [],
  },
  monofocalEsfCil: {
    key:          'monofocalEsfCil',
    label:        'Monofocal Esférico-Cilíndrico (SPH/CYL)',
    tipo_matriz:  'SPH_CYL',
    orden:        3,
    materiales:   ['Policarbonato', 'CR-39', '1.56', '1.61 MR-8', '1.67', '1.74'],
    tratamientos: ['BCO', 'AR', 'ANTIBLE', 'FOTO', 'FOTO_ANTIBLE', 'TRANSITIONS', 'POLAR', 'POLAR_ESPEJO'],
    materialTreatmentOverrides: [],
  },
  bifocal: {
    key:          'bifocal',
    label:        'Bifocal (SPH + ADD)',
    tipo_matriz:  'SPH_ADD',
    orden:        4,
    materiales:   ['Policarbonato', 'CR-39', '1.56', '1.61 MR-8', '1.67', '1.74'],
    tratamientos: ['BCO', 'AR', 'ANTIBLE', 'FOTO', 'FOTO_ANTIBLE', 'TRANSITIONS'],
    materialTreatmentOverrides: [],
  },
  bifocalFT: {
    key:          'bifocalFT',
    label:        'Bifocal Flat Top (SPH + ADD)',
    tipo_matriz:  'SPH_ADD',
    orden:        5,
    materiales:   ['Policarbonato', 'CR-39'],
    tratamientos: ['BCO', 'AR', 'ANTIBLE', 'FOTO', 'FOTO_ANTIBLE', 'TRANSITIONS'],
    materialTreatmentOverrides: [],
  },
  bifocalYounger: {
    key:          'bifocalYounger',
    label:        'Bifocal Younger (SPH + ADD)',
    tipo_matriz:  'SPH_ADD',
    orden:        6,
    materiales:   ['Policarbonato', 'CR-39'],
    tratamientos: ['BCO', 'AR', 'ANTIBLE', 'FOTO', 'FOTO_ANTIBLE', 'TRANSITIONS'],
    materialTreatmentOverrides: [],
  },
};

module.exports = { POLAR_BASES, ESPEJO_COLORS, TREATMENTS, BASES_CONFIG };
