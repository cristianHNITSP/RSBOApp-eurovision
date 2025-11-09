const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');

const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb://root:xqr5Dc93KMa24b@mongo:27017/rsboapp?authSource=admin';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    // =========================================
    // 1️⃣ Crear Roles con permisos
    // =========================================
    const rolesData = [
      {
        name: 'administrador',
        description: 'Administrador general de la óptica',
        permissions: [
          'manage_users',
          'manage_inventory',
          'manage_sales',
          'view_reports',
          'edit_settings',
        ],
      },
      {
        name: 'moderador',
        description: 'Encargado de ventas y atención al cliente',
        permissions: [
          'create_order',
          'update_order_status',
          'view_inventory',
          'view_clients',
        ],
      },
      {
        name: 'laboratorio',
        description: 'Responsable del taller de lentes y pulido',
        permissions: [
          'view_orders',
          'update_order_progress',
          'mark_order_completed',
        ],
      },
    ];

    for (const roleData of rolesData) {
      const exists = await Role.findOne({ name: roleData.name });
      if (!exists) {
        await Role.create(roleData);
        console.log(`✅ Rol "${roleData.name}" creado`);
      } else {
        console.log(`ℹ️ Rol "${roleData.name}" ya existe`);
      }
    }

    // =========================================
    // 2️⃣ Crear usuarios iniciales
    // =========================================
    const adminRole = await Role.findOne({ name: 'administrador' });
    const modRole = await Role.findOne({ name: 'moderador' });
    const labRole = await Role.findOne({ name: 'laboratorio' });

    const usersData = [
      {
        email: 'admin@optica.com',
        name: 'Administrador Óptica',
        password: 'admin1234',
        role: adminRole._id,
        profile: {
          avatar: 'https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_6.png',
          bio: 'Gestión completa del sistema de la óptica',
          phone: '000-000-0000',
        },
      },
      {
        email: 'ventas@optica.com',
        name: 'Encargado de Ventas',
        password: 'ventas1234',
        role: modRole._id,
        profile: {
          avatar: 'https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_1.png',
          bio: 'Atiende a clientes y gestiona ventas',
          phone: '111-111-1111',
        },
      },
      {
        email: 'laboratorio@optica.com',
        name: 'Técnico de Laboratorio',
        password: 'lab1234',
        role: labRole._id,
        profile: {
          avatar: 'https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_3.png',
          bio: 'Encargado del pulido y montaje de lentes',
          phone: '9993676541',
        },
      },
    ];

    for (const u of usersData) {
      const existingUser = await User.findOne({ email: u.email });
      if (!existingUser) {
        // 🔹 Guardar contraseña tal cual, sin hash
        await User.create({
          name: u.name,
          email: u.email,
          password: u.password, // <-- sin bcrypt
          role: u.role,
          tokens: [],
          isActive: true,
          lastLogin: null,
          deletedAt: null,
          profile: u.profile,
        });
        console.log(`✅ Usuario "${u.email}" creado correctamente.`);
      } else {
        console.log(`ℹ️ Usuario "${u.email}" ya existe.`);
      }
    }

    console.log('\n🎉 Seed completado con éxito 🎉');
  } catch (err) {
    console.error('❌ Error en el seed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
