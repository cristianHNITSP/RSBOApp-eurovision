const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Role = require('../models/Role');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://root:xqr5Dc93KMa24b@mongo:27017/rsboapp?authSource=admin';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Conectado a MongoDB');

    // Crear roles con permisos
    const rolesData = [
      {
        name: 'admin',
        description: 'Administrador con acceso total',
        permissions: ['manage_users', 'view_reports', 'edit_settings']
      },
      {
        name: 'user',
        description: 'Usuario estándar con acceso básico',
        permissions: ['view_profile', 'edit_profile']
      }
    ];

    for (const roleData of rolesData) {
      const exists = await Role.findOne({ name: roleData.name });
      if (!exists) {
        await Role.create(roleData);
        console.log(`✅ Rol "${roleData.name}" creado`);
      }
    }

    const adminRole = await Role.findOne({ name: 'admin' });

    // Crear usuario admin si no existe
    const existingUser = await User.findOne({ email: 'admin@example.com' });
    if (existingUser) {
      console.log('ℹ️ El usuario admin ya existe.');
    } else {
      const hashedPassword = await bcrypt.hash('admin1234', 10);
      await User.create({
        name: 'Admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: adminRole._id,
        isActive: true,
        profile: {
          avatar: '', // Puedes poner una URL
          bio: 'Administrador del sistema',
          phone: '000-000-0000'
        },
        lastLogin: null,
        tokens: [] // Se pueden llenar cuando inicie sesión
      });
      console.log('✅ Usuario admin creado correctamente.');
    }
  } catch (err) {
    console.error('❌ Error en el seed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
