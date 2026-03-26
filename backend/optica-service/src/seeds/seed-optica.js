// seeds/seed-optica.js — datos iniciales de demostración para optica-service
// Uso: node src/seeds/seed-optica.js [--force] [--dry-run]
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const mongoose = require("mongoose");

const Armazon       = require("../models/Armazon");
const LenteContacto = require("../models/LenteContacto");
const Solucion      = require("../models/Solucion");
const Accesorio     = require("../models/Accesorio");
const Estuche       = require("../models/Estuche");
const Equipo        = require("../models/Equipo");

const FORCE   = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");

// ── Datos semilla ─────────────────────────────────────────────────────────────

const ARMAZONES = [
  { sku: "ARZ-001", marca: "Ray-Ban",        modelo: "RB5154",        color: "Negro/Oro",    material: "Acetato", tipo: "Completo",     genero: "Unisex",   talla: "51-21-145", serie: "CLUB-2024A", precio: 3200,  stock: 14, estuche: true  },
  { sku: "ARZ-002", marca: "Oakley",         modelo: "OX8046",        color: "Satin Black",  material: "TR-90",   tipo: "Deportivo",    genero: "Hombre",   talla: "55-17-143", serie: "AIRD-2024B", precio: 2850,  stock: 8,  estuche: true  },
  { sku: "ARZ-003", marca: "Gucci",          modelo: "GG0025O",       color: "Havana",       material: "Acetato", tipo: "Completo",     genero: "Mujer",    talla: "56-14-140", serie: "GCC-2024C",  precio: 5800,  stock: 3,  estuche: true  },
  { sku: "ARZ-004", marca: "Silhouette",     modelo: "5515",          color: "Plata Mate",   material: "Titanio", tipo: "Al aire",      genero: "Unisex",   talla: "54-17-150", serie: "SIL-2024D",  precio: 7200,  stock: 5,  estuche: true  },
  { sku: "ARZ-005", marca: "Tom Ford",       modelo: "TF5401",        color: "Tortoise",     material: "Acetato", tipo: "Completo",     genero: "Hombre",   talla: "51-20-145", serie: "TFD-2024E",  precio: 6400,  stock: 2,  estuche: true  },
  { sku: "ARZ-006", marca: "Mykita",         modelo: "Lite Saku",     color: "Grafito",      material: "Metal",   tipo: "Semi-al-aire", genero: "Mujer",    talla: "50-18-140", serie: "MYK-2024F",  precio: 8900,  stock: 1,  estuche: false },
  { sku: "ARZ-007", marca: "Lindberg",       modelo: "Strip 9800",    color: "Oro Rosa",     material: "Titanio", tipo: "Al aire",      genero: "Mujer",    talla: "49-18-135", serie: "LBG-2024G",  precio: 12500, stock: 4,  estuche: true  },
  { sku: "ARZ-008", marca: "Nike",           modelo: "7130",          color: "Azul Mate",    material: "TR-90",   tipo: "Deportivo",    genero: "Unisex",   talla: "53-16-140", serie: "NKE-2024H",  precio: 1900,  stock: 22, estuche: false },
  { sku: "ARZ-009", marca: "Versace",        modelo: "VE3186",        color: "Negro/Dorado", material: "Combinado",tipo: "Completo",    genero: "Mujer",    talla: "54-16-140", serie: "VRS-2024I",  precio: 4500,  stock: 6,  estuche: true  },
  { sku: "ARZ-010", marca: "Emporio Armani", modelo: "EA3099",        color: "Azul Marino",  material: "Metal",   tipo: "Completo",     genero: "Hombre",   talla: "52-19-140", serie: "EAR-2024J",  precio: 2400,  stock: 0,  estuche: true  },
];

const LENTES = [
  { sku: "LC-001", marca: "Acuvue",       nombre: "Oasys 1-Day",           tipo: "Esferico",   material: "Silicona-Hidrogel", bc: 8.5, dia: 14.3, graduacion: "-2.00",              duracion: "Diario",    stock: 48, precio: 680,  caducidad: new Date("2027-03-15") },
  { sku: "LC-002", marca: "Acuvue",       nombre: "Oasys for Astigmatism", tipo: "Torico",     material: "Silicona-Hidrogel", bc: 8.5, dia: 14.5, graduacion: "-1.75/-1.25x180",    duracion: "Quincenal", stock: 24, precio: 890,  caducidad: new Date("2026-11-20") },
  { sku: "LC-003", marca: "Air Optix",    nombre: "Night & Day Aqua",      tipo: "Esferico",   material: "Silicona-Hidrogel", bc: 8.6, dia: 13.8, graduacion: "-3.50",              duracion: "Mensual",   stock: 36, precio: 750,  caducidad: new Date("2027-01-10") },
  { sku: "LC-004", marca: "Bausch+Lomb",  nombre: "SofLens Toric",         tipo: "Torico",     material: "Hidrogel",          bc: 8.5, dia: 14.5, graduacion: "-2.25/-0.75x10",     duracion: "Mensual",   stock: 12, precio: 620,  caducidad: new Date("2026-09-05") },
  { sku: "LC-005", marca: "FreshLook",    nombre: "Colorblends",           tipo: "Colorido",   material: "Hidrogel",          bc: 8.6, dia: 14.5, graduacion: "0.00",               duracion: "Mensual",   stock: 60, precio: 450,  caducidad: new Date("2027-06-30") },
  { sku: "LC-006", marca: "Proclear",     nombre: "Multifocal",            tipo: "Multifocal", material: "Hidrogel",          bc: 8.7, dia: 14.4, graduacion: "-1.50 ADD +2.00",    duracion: "Mensual",   stock: 8,  precio: 1100, caducidad: new Date("2026-08-22") },
  { sku: "LC-007", marca: "Dailies",      nombre: "Total 1",               tipo: "Esferico",   material: "Silicona-Hidrogel", bc: 8.5, dia: 14.1, graduacion: "-4.00",              duracion: "Diario",    stock: 90, precio: 820,  caducidad: new Date("2027-09-01") },
  { sku: "LC-008", marca: "Biofinity",    nombre: "Toric XR",              tipo: "Torico",     material: "Silicona-Hidrogel", bc: 8.7, dia: 14.5, graduacion: "-5.00/-2.75x170",    duracion: "Mensual",   stock: 0,  precio: 950,  caducidad: new Date("2026-12-18") },
];

const SOLUCIONES = [
  { sku: "SOL-001", nombre: "ReNu MultiPlus",      tipo: "Solucion multiusos",  marca: "Bausch+Lomb", volumen: 360, stock: 30, precio: 280, caducidad: new Date("2027-02-10") },
  { sku: "SOL-002", nombre: "OPTI-FREE PureMoist",  tipo: "Solucion multiusos",  marca: "Alcon",       volumen: 300, stock: 25, precio: 350, caducidad: new Date("2027-05-15") },
  { sku: "SOL-003", nombre: "Systane Ultra",         tipo: "Gotas lubricantes",   marca: "Alcon",       volumen: 10,  stock: 45, precio: 220, caducidad: new Date("2026-10-28") },
  { sku: "SOL-004", nombre: "Refresh Tears",         tipo: "Gotas lubricantes",   marca: "Allergan",    volumen: 15,  stock: 38, precio: 190, caducidad: new Date("2027-01-30") },
  { sku: "SOL-005", nombre: "BioTrue",               tipo: "Solucion multiusos",  marca: "Bausch+Lomb", volumen: 300, stock: 20, precio: 310, caducidad: new Date("2027-04-22") },
  { sku: "SOL-006", nombre: "Saline Plus",           tipo: "Solucion salina",     marca: "AMO",         volumen: 360, stock: 15, precio: 120, caducidad: new Date("2026-12-05") },
  { sku: "SOL-007", nombre: "Hylo-Comod",            tipo: "Gotas lubricantes",   marca: "Ursapharm",   volumen: 10,  stock: 0,  precio: 380, caducidad: new Date("2027-08-14") },
  { sku: "SOL-008", nombre: "Clear Care Plus",       tipo: "Solucion peroxido",   marca: "Alcon",       volumen: 360, stock: 12, precio: 420, caducidad: new Date("2027-03-20") },
];

const ACCESORIOS = [
  { sku: "ACC-001", nombre: "Paño Microfibra Premium",     categoria: "Paño",        marca: "Zeiss",    compatible: "Universal",           stock: 120, precio: 45  },
  { sku: "ACC-002", nombre: "Cadena Metálica Dorada",      categoria: "Cadena",      marca: "Silac",    compatible: "Armazones adulto",    stock: 35,  precio: 85  },
  { sku: "ACC-003", nombre: "Plaquetas Silicón (par)",     categoria: "Plaquetas",   marca: "Genérico", compatible: "Armazones metal",     stock: 200, precio: 15  },
  { sku: "ACC-004", nombre: "Kit Tornillos Surtido",       categoria: "Tornillos",   marca: "Genérico", compatible: "Universal",           stock: 50,  precio: 60  },
  { sku: "ACC-005", nombre: "Spray Limpiador 60ml",        categoria: "Limpiador",   marca: "Zeiss",    compatible: "Universal",           stock: 65,  precio: 120 },
  { sku: "ACC-006", nombre: "Cordón Deportivo Ajustable",  categoria: "Cadena",      marca: "Croakies", compatible: "Armazones deportivos",stock: 28,  precio: 95  },
  { sku: "ACC-007", nombre: "Almohadillas Adhesivas (par)",categoria: "Almohadillas",marca: "Genérico", compatible: "Armazones acetato",   stock: 0,   precio: 25  },
  { sku: "ACC-008", nombre: "Destornillador Óptico 3-en-1",categoria: "Herramienta", marca: "OptiTool", compatible: "Universal",           stock: 18,  precio: 75  },
];

const ESTUCHES = [
  { sku: "EST-001", nombre: "Estuche Rígido Clásico",     tipo: "Rigido",              material: "Cuero sintético", color: "Negro",        compatible: "Armazones completos",  stock: 45, precio: 150 },
  { sku: "EST-002", nombre: "Estuche Magnético Premium",  tipo: "Rigido",              material: "PU Premium",      color: "Café",         compatible: "Armazones completos",  stock: 20, precio: 280 },
  { sku: "EST-003", nombre: "Funda Blanda Microfibra",    tipo: "Blando",              material: "Microfibra",      color: "Gris",         compatible: "Universal",            stock: 80, precio: 65  },
  { sku: "EST-004", nombre: "Estuche Plegable Viaje",     tipo: "Plegable",            material: "Nylon",           color: "Azul marino",  compatible: "Armazones medianos",   stock: 15, precio: 120 },
  { sku: "EST-005", nombre: "Estuche Deportivo Flotante", tipo: "Deportivo",           material: "EVA",             color: "Neon Verde",   compatible: "Armazones deportivos", stock: 10, precio: 180 },
  { sku: "EST-006", nombre: "Portalentes Contacto Doble", tipo: "Lentes de contacto",  material: "Plástico",        color: "Rosa",         compatible: "Lentes de contacto",   stock: 60, precio: 35  },
  { sku: "EST-007", nombre: "Kit Viaje LC Completo",      tipo: "Lentes de contacto",  material: "Plástico/Espejo", color: "Blanco",       compatible: "Lentes de contacto",   stock: 0,  precio: 95  },
  { sku: "EST-008", nombre: "Estuche Infantil Animales",  tipo: "Rigido",              material: "Plástico ABS",    color: "Multicolor",   compatible: "Armazones infantiles", stock: 25, precio: 90  },
];

const EQUIPOS = [
  { sku: "EQP-001", nombre: "Autorefractómetro",     tipo: "Diagnóstico", marca: "Topcon",      modelo: "KR-800",      serie: "TOP-2022-1041", estado: "Operativo",         ubicacion: "Consultorio 1", adquisicion: new Date("2022-06-15"), mantenimiento: new Date("2026-06-15") },
  { sku: "EQP-002", nombre: "Lámpara de Hendidura",  tipo: "Diagnóstico", marca: "Haag-Streit", modelo: "BQ 900",      serie: "HS-2021-5523",  estado: "Operativo",         ubicacion: "Consultorio 1", adquisicion: new Date("2021-03-20"), mantenimiento: new Date("2026-03-20") },
  { sku: "EQP-003", nombre: "Lensómetro Digital",    tipo: "Medición",    marca: "Nidek",       modelo: "LM-600PD",    serie: "NDK-2023-0892", estado: "Operativo",         ubicacion: "Taller",        adquisicion: new Date("2023-01-10"), mantenimiento: new Date("2026-07-10") },
  { sku: "EQP-004", nombre: "Biseladora Automática",tipo: "Taller",      marca: "Essilor",     modelo: "Kappa CTD",   serie: "ESS-2020-3317", estado: "Mantenimiento",     ubicacion: "Taller",        adquisicion: new Date("2020-09-01"), mantenimiento: new Date("2026-04-01") },
  { sku: "EQP-005", nombre: "Tonómetro de Aire",     tipo: "Diagnóstico", marca: "Reichert",    modelo: "7CR",         serie: "RCH-2022-7841", estado: "Operativo",         ubicacion: "Consultorio 2", adquisicion: new Date("2022-11-05"), mantenimiento: new Date("2026-11-05") },
  { sku: "EQP-006", nombre: "Pupilómetro Digital",   tipo: "Medición",    marca: "Essilor",     modelo: "Visioffice X",serie: "ESS-2023-4412", estado: "Operativo",         ubicacion: "Mostrador",     adquisicion: new Date("2023-08-22"), mantenimiento: new Date("2026-08-22") },
  { sku: "EQP-007", nombre: "Queratómetro",          tipo: "Diagnóstico", marca: "Topcon",      modelo: "OM-4",        serie: "TOP-2019-2203", estado: "Fuera de servicio", ubicacion: "Almacén",       adquisicion: new Date("2019-04-12"), mantenimiento: new Date("2025-10-12") },
  { sku: "EQP-008", nombre: "Perímetro Campimétrico",tipo: "Diagnóstico", marca: "Zeiss",       modelo: "HFA III 860", serie: "ZSS-2024-0115", estado: "Operativo",         ubicacion: "Consultorio 2", adquisicion: new Date("2024-02-28"), mantenimiento: new Date("2027-02-28") },
];

// ── Función de seed por colección ─────────────────────────────────────────────
async function seedCollection(Model, data, label) {
  const existing = await Model.countDocuments({});
  if (existing > 0 && !FORCE) {
    console.log(`  ⏭️  ${label}: ${existing} documentos ya existen (usa --force para reiniciar)`);
    return;
  }
  if (FORCE && existing > 0) {
    await Model.deleteMany({});
    console.log(`  🗑️  ${label}: ${existing} documentos eliminados`);
  }
  if (DRY_RUN) {
    console.log(`  🔍 [DRY-RUN] ${label}: insertaría ${data.length} documentos`);
    return;
  }
  await Model.insertMany(data);
  console.log(`  ✅ ${label}: ${data.length} documentos insertados`);
}

// ── Ejecución principal ────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("✅ Conectado a MongoDB (optica)");
  console.log(`\n🌱 Iniciando seed${FORCE ? " [--force]" : ""}${DRY_RUN ? " [--dry-run]" : ""}...\n`);

  await seedCollection(Armazon,       ARMAZONES,   "Armazones");
  await seedCollection(LenteContacto, LENTES,      "Lentes de Contacto");
  await seedCollection(Solucion,      SOLUCIONES,  "Soluciones y Gotas");
  await seedCollection(Accesorio,     ACCESORIOS,  "Accesorios");
  await seedCollection(Estuche,       ESTUCHES,    "Estuches");
  await seedCollection(Equipo,        EQUIPOS,     "Equipos");

  console.log("\n🎉 Seed completado.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Error en seed:", err);
  process.exit(1);
});
