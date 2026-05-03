// backend/auth-service/src/seeds/seedUsers.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Role = require('../models/Role');

const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb://root:xqr5Dc93KMa24b@mongo:27017/auth_db?authSource=admin';

// ─── Definición de roles ────────────────────────────────────────────────────
const ROLES_DATA = [
  {
    name: 'root',
    description: 'Administrador del sistema con acceso total e irrestricto',
    permissions: [
      'manage_users',
      'manage_inventory',
      'manage_sales',
      'view_reports',
      'edit_settings',
      'manage_roles',
      'manage_system',
      'view_devolutions',
      'manage_devolutions',
      'export_reports',
      'view_audit_log',
    ],
  },
  {
    name: 'eurovision',
    description: 'Encargado de la óptica Eurovisión — gestión completa del negocio',
    permissions: [
      'manage_users',
      'manage_inventory',
      'manage_sales',
      'view_reports',
      'edit_settings',
      'create_order',
      'update_order_status',
      'view_inventory',
      'view_clients',
      'view_devolutions',
      'manage_devolutions',
      'export_reports',
      'view_audit_log',
    ],
  },
  {
    name: 'supervisor',
    description: 'Supervisor de operaciones — supervisa inventario, ventas y equipo',
    permissions: [
      'manage_inventory',
      'manage_sales',
      'view_reports',
      'create_order',
      'update_order_status',
      'view_inventory',
      'view_clients',
      'view_devolutions',
      'manage_devolutions',
      'export_reports',
    ],
  },
  {
    name: 'ventas',
    description: 'Personal de ventas y atención al cliente',
    permissions: [
      'create_order',
      'update_order_status',
      'view_inventory',
      'view_clients',
      'manage_sales',
      'create_devolution',
    ],
  },
  {
    name: 'laboratorio',
    description: 'Técnico de laboratorio — taller de pulido y montaje de lentes',
    permissions: [
      'view_orders',
      'update_order_progress',
      'mark_order_completed',
      'view_devolutions',
    ],
  },
];

// ─── Roles que ya no existen y deben eliminarse ──────────────────────────────
const OBSOLETE_ROLES = ['administrador', 'moderador'];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    // 1️⃣  Eliminar roles obsoletos (solo si no tienen usuarios asignados)
    for (const obsoleteName of OBSOLETE_ROLES) {
      const obsolete = await Role.findOne({ name: obsoleteName });
      if (!obsolete) continue;

      const usersWithRole = await User.countDocuments({ role: obsolete._id });
      if (usersWithRole > 0) {
        console.log(`⚠️  Rol obsoleto "${obsoleteName}" tiene ${usersWithRole} usuario(s) — no se elimina`);
      } else {
        await Role.deleteOne({ _id: obsolete._id });
        console.log(`🗑️  Rol obsoleto "${obsoleteName}" eliminado`);
      }
    }

    // 2️⃣  Upsert de roles nuevos (crea o actualiza)
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

    // 3️⃣  Usuarios iniciales (idempotente)
    const USERS_DATA = [
      {
        username: 'root',
        name: 'Root — Administrador del Sistema',
        password: 'root1234',
        role: roleRefs['root'],
        profile: {
          avatar: 'https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_6.png',
          bio: 'Acceso total al sistema Eurovisión',
          phone: '000-000-0000',
        },
      },
      {
        username: 'eurovision',
        name: 'Encargado Eurovisión',
        password: 'euro1234',
        role: roleRefs['eurovision'],
        profile: {
          avatar: 'https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_5.png',
          bio: 'Encargado general de la óptica Eurovisión',
          phone: '111-000-0000',
        },
      },
      {
        username: 'supervisor',
        name: 'Supervisor Eurovisión',
        password: 'super1234',
        role: roleRefs['supervisor'],
        profile: {
          avatar: 'https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_4.png',
          bio: 'Supervisa operaciones e inventario',
          phone: '222-000-0000',
        },
      },
      {
        username: 'ventas',
        name: 'Personal de Ventas',
        password: 'ventas1234',
        role: roleRefs['ventas'],
        profile: {
          avatar: 'https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_1.png',
          bio: 'Atención al cliente y gestión de ventas',
          phone: '333-000-0000',
        },
      },
      {
        username: 'laboratorio',
        name: 'Técnico de Laboratorio',
        password: 'lab1234',
        role: roleRefs['laboratorio'],
        profile: {
          avatar: 'https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_3.png',
          bio: 'Pulido y montaje de lentes',
          phone: '444-000-0000',
        },
      },
    ];

    for (const u of USERS_DATA) {
      const existing = await User.findOne({ username: u.username });
      if (!existing) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        await User.create({
          name: u.name,
          username: u.username,
          password: hashedPassword,
          role: u.role,
          tokens: [],
          isActive: true,
          lastLogin: null,
          deletedAt: null,
          profile: u.profile,
        });
        console.log(`✅ Usuario "${u.username}" creado`);
      } else {
        console.log(`ℹ️  Usuario "${u.username}" ya existe — omitido`);
      }
    }

    console.log('\n🎉 Seed completado con éxito 🎉');
    console.log('\nCredenciales iniciales:');
    console.log('  root         / root1234');
    console.log('  eurovision   / euro1234');
    console.log('  supervisor   / super1234');
    console.log('  ventas       / ventas1234');
    console.log('  laboratorio  / lab1234');
  } catch (err) {
    console.error('❌ Error en el seed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
