// backend/auth-service/src/seeds/seedUsers.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');
require('dotenv').config();

if (!process.env.MONGO_URI) {
  console.error('❌ FATAL: MONGO_URI environment variable is required for seeding');
  process.exit(1);
}
// const MONGO_URI = process.env.MONGO_URI;

const { ROLES_DATA } = require('../data/roles');
const { INITIAL_USERS } = require('../data/seed-data');

const OBSOLETE_ROLES = ['administrador', 'moderador'];

async function seed() {
  try {
    // await mongoose.connect(MONGO_URI);
    console.log('✅ Iniciando sembrado de usuarios/roles...');

    // 1️⃣  Upsert de roles (indispensable para que el sistema funcione)
    const roleRefs = {};
    for (const roleData of ROLES_DATA) {
      const role = await Role.findOneAndUpdate(
        { name: roleData.name },
        { $set: roleData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      roleRefs[roleData.name] = role._id;
      console.log(`✅ Rol "${roleData.name}" listo`);
    }

    // 2️⃣  Usuarios iniciales
    for (const userData of INITIAL_USERS) {
      const existingUser = await User.findOne({ username: userData.username });
      if (!existingUser) {
        // Resolvemos el ID del rol por su nombre
        const roleId = roleRefs[userData.role];
        if (!roleId) {
          console.warn(`⚠️ Omitiendo usuario ${userData.username}: Rol ${userData.role} no encontrado`);
          continue;
        }

        await User.create({
          ...userData,
          role: roleId,
        });
        console.log(`\n🚀 Usuario ${userData.username.toUpperCase()} creado con éxito.`);
        console.log(`   Username: ${userData.username}`);
      } else {
        console.log(`ℹ️  Usuario ${userData.username.toUpperCase()} ya existe — omitido`);
      }
    }

    console.log('\n🎉 Seed completado: Solo se han configurado los ROLES y el usuario ROOT.');
  } catch (err) {
    console.error('❌ Error en el seed:', err);
  } finally {
    // await mongoose.disconnect();
  }
}

module.exports = { seed };

// Si se ejecuta directamente
if (require.main === module) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => seed())
    .then(() => mongoose.disconnect())
    .catch(err => {
       console.error(err);
       process.exit(1);
    });
}
