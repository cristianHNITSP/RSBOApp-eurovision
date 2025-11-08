const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
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
    // 1️⃣ Crear Roles con permisos (óptica)
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

    // ---- Usuario Administrador ----
    const existingAdmin = await User.findOne({ email: 'admin@optica.com' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin1234', 10);
      await User.create({
        name: 'Administrador Óptica',
        email: 'admin@optica.com',
        password: hashedPassword,
        role: adminRole._id,
        isActive: true,
        profile: {
          avatar: 'https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_6.png',
          bio: 'Gestión completa del sistema de la óptica',
          phone: '000-000-0000',
        },
      });
      console.log('✅ Usuario administrador creado correctamente.');
    } else {
      console.log('ℹ️ El usuario administrador ya existe.');
    }

    // ---- Usuario Moderador (Ventas) ----
    const existingMod = await User.findOne({ email: 'ventas@optica.com' });
    if (!existingMod) {
      const hashedPassword = await bcrypt.hash('ventas1234', 10);
      await User.create({
        name: 'Encargado de Ventas',
        email: 'ventas@optica.com',
        password: hashedPassword,
        role: modRole._id,
        isActive: true,
        profile: {
          avatar: 'https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_1.png',
          bio: 'Atiende a clientes y gestiona ventas',
          phone: '111-111-1111',
        },
      });
      console.log('✅ Usuario moderador creado correctamente.');
    }

    // ---- Usuario Laboratorio ----
    const existingLab = await User.findOne({ email: 'laboratorio@optica.com' });
    if (!existingLab) {
      const hashedPassword = await bcrypt.hash('lab1234', 10);
      await User.create({
        name: 'Técnico de Laboratorio',
        email: 'laboratorio@optica.com',
        password: hashedPassword,
        role: labRole._id,
        isActive: true,
        profile: {
          avatar: 'https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_3.png',
          bio: 'Encargado del pulido y montaje de lentes',
          phone: '222-222-2222',
        },
      });
      console.log('✅ Usuario laboratorio creado correctamente.');
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
