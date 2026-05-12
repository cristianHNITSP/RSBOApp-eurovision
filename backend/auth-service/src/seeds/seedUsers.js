// backend/auth-service/src/seeds/seedUsers.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');
require('dotenv').config();

if (!process.env.MONGO_URI) {
  console.error('❌ FATAL: MONGO_URI environment variable is required for seeding');
  process.exit(1);
}
const MONGO_URI = process.env.MONGO_URI;

const { ROLES_DATA } = require('../data/roles');
const { INITIAL_USERS } = require('../data/seed-data');

const OBSOLETE_ROLES = ['administrador', 'moderador'];

/**
 * @function runSeed
 * @description Ejecuta el seeding de roles y usuarios iniciales. 
 * Es idempotente: no sobreescribe roles ni usuarios existentes.
 */
async function runSeed() {
  try {
    console.log('🌱 Iniciando seeding automático...');

    // 1️⃣  Upsert de roles (indispensable para que el sistema funcione)
    const roleRefs = {};
    for (const roleData of ROLES_DATA) {
      const role = await Role.findOneAndUpdate(
        { name: roleData.name },
        { $set: roleData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      roleRefs[roleData.name] = role._id;
      console.log(`   ✅ Rol "${roleData.name}" validado/creado`);
    }

    // 2️⃣  Usuarios iniciales
    for (const userData of INITIAL_USERS) {
      const existingUser = await User.findOne({ username: userData.username });
      if (!existingUser) {
        const roleId = roleRefs[userData.role];
        if (!roleId) {
          console.warn(`   ⚠️ Omitiendo usuario ${userData.username}: Rol ${userData.role} no encontrado`);
          continue;
        }

        await User.create({
          ...userData,
          role: roleId,
        });
        console.log(`   🚀 Usuario ${userData.username.toUpperCase()} inyectado correctamente`);
      } else {
        // console.log(`   ℹ️  Usuario ${userData.username.toUpperCase()} ya existe — omitido`);
      }
    }

    console.log('✅ Seeding completado con éxito.\n');
  } catch (err) {
    console.error('❌ Error durante el seeding:', err);
    // No matamos el proceso aquí si es automático para no bloquear el arranque del servicio
    // a menos que sea un error fatal de conexión, pero aquí ya estamos conectados.
  }
}

// Exportar para uso automático en index.js
module.exports = { runSeed };

// Ejecución manual si se llama directamente: node seedUsers.js
if (require.main === module) {
  (async () => {
    try {
      await mongoose.connect(MONGO_URI);
      await runSeed();
    } finally {
      await mongoose.disconnect();
      process.exit(0);
    }
  })();
}
