<template>
  <section class="panel-usuarios-section">
    <!-- BANNER + ACCIONES SUPERIORES (CENTRADO EN USUARIO SELECCIONADO) -->
    <UserBanner
      :user="selectedUser"
      :fallback-avatar="FALLBACK_AVATAR"
      :permission-catalog="permissionsCatalog"
      :loading="loading"
      @avatar-picked="onAvatarPicked"
      @open-create="openCreate"
      @reload="loadUsers"
      @edit="openEdit"
      @change-password="openPassword"
      @soft-delete="confirmSoftDelete"
      @restore="confirmRestore"
    />


    <!-- HEADER PANEL -->
    <header class="panel-usuarios-header page-section-header">
      <div>
        <span class="usuarios-pill">
          <b-icon icon="users" size="is-small" class="mr-1" />
          Gestión de usuarios
        </span>
        <h2>Usuarios del sistema</h2>
        <p class="psh-desc">Control de cuentas, roles y accesos del personal. Crea, edita, activa o desactiva usuarios.</p>

        <div class="psh-quick mt-3">
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-user-plus"></i></div>
            <div>
              <p class="psh-quick__title">Crear usuario</p>
              <p class="psh-quick__text">Asigna rol, nombre y correo</p>
            </div>
          </div>
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-trash-restore"></i></div>
            <div>
              <p class="psh-quick__title">Papelera</p>
              <p class="psh-quick__text">Los eliminados se pueden restaurar</p>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-usuarios-summary">
        <b-taglist attached>
          <b-tag type="is-primary">{{ stats.totalUsers }} usuarios</b-tag>
          <b-tag type="is-success">{{ stats.activeUsers }} activos</b-tag>
        </b-taglist>
        <p class="is-size-7 has-text-grey mt-1">{{ roles.length }} roles configurados</p>
      </div>
    </header>

    <!-- FILTROS -->
    <div class="panel-usuarios-filters">
      <b-field grouped group-multiline>
        <b-field label="Buscar" class="panel-usuarios-filter-field">
          <!-- ✅ FontAwesome -->
          <b-input
            v-model="searchQuery"
            size="is-small"
            icon="search"
            placeholder="Buscar por nombre o correo…"
          />
        </b-field>

        <b-field label="Rol" class="panel-usuarios-filter-field">
          <b-select v-model="roleFilter" size="is-small">
            <option value="all">Todos los roles</option>
            <option v-for="role in roles" :key="role._id" :value="role._id">
              {{ formatRoleLabel(role.name) }}
            </option>
          </b-select>
        </b-field>

        <b-field label="Estado" class="panel-usuarios-filter-field">
          <b-select v-model="statusFilter" size="is-small">
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="trash">Papelera</option>
          </b-select>
        </b-field>
      </b-field>
    </div>

    <!-- TABLA (sin detalle desplegable) -->
    <b-table
      :data="users"
      sticky-header
      :height="360"
      hoverable
      focusable
      paginated
      backend-pagination
      backend-sorting
      :total="total"
      :per-page="perPage"
      :current-page="currentPage"
      @page-change="onPageChange"
      @sort="onSort"
      v-model:selected="selectedUser"
      :row-class="rowClass"
      :loading="loading"
    >
      <b-table-column field="name" label="Usuario" sortable v-slot="props">
        <div class="user-cell" @click="selectRow(props.row)">
          <div class="user-cell__avatar-wrap">
            <AvatarPicker
              :modelValue="props.row.profile?.avatar || ''"
              :placeholder="FALLBACK_AVATAR"
              :editMode="canEditAvatar(props.row)"
              :size="32"
              @update:modelValue="(val) => onAvatarPicked(props.row, val)"
            />
          </div>

          <div class="user-cell__meta">
            <div class="user-cell__meta-header">
              <span class="user-cell__name">
                {{ props.row.name }}
                <b-tag v-if="props.row.isMe" type="is-light" size="is-small" class="ml-2">Yo</b-tag>
              </span>

              <b-tag :type="roleTagType(props.row.roleName)" size="is-small" class="user-cell__role-tag">
                {{ props.row.roleLabel }}
              </b-tag>

              <b-tag v-if="props.row.deletedAt" type="is-warning" size="is-small">Papelera</b-tag>
            </div>

            <!-- ✅ “fondo más grande” sin cortar el texto (wrap) -->
            <p class="has-background-light px-3 py-2 is-size-7 has-text-grey-dark user-bio-pill">
              {{ props.row.profile?.bio || "—" }}
            </p>
          </div>
        </div>
      </b-table-column>

      <b-table-column field="email" label="Correo" sortable v-slot="props">
        <!-- ✅ Icono FA + gris/negro en fondo blanco -->
        <span class="tag is-light is-size-7 has-text-grey-dark">
          <b-icon icon="envelope" size="is-small" class="mr-1 has-text-grey-dark" />
          {{ props.row.email }}
        </span>
      </b-table-column>

      <b-table-column field="lastLogin" label="Último acceso" sortable centered v-slot="props">
        <span class="tag is-light is-size-7">{{ formatDateTime(props.row.lastLogin) }}</span>
      </b-table-column>

      <b-table-column field="isActive" label="Estado" centered v-slot="props">
        <b-tag v-if="props.row.deletedAt" type="is-warning" size="is-small">Eliminado</b-tag>
        <b-tag v-else :type="props.row.isActive ? 'is-success' : 'is-danger'" size="is-small">
          {{ props.row.isActive ? "Activo" : "Inactivo" }}
        </b-tag>
      </b-table-column>


      <b-table-column field="createdAt" label="Alta" sortable centered v-slot="props">
        <span class="is-size-7">{{ formatDate(props.row.createdAt) }}</span>
      </b-table-column>

      <template #empty>
        <div class="has-text-centered has-text-grey py-5">No se encontraron usuarios con los filtros actuales.</div>
      </template>
    </b-table>

    <!-- MODALES -->
    <UserEditModal
      v-model="editOpen"
      :user="editUser"
      :roles="roles"
      :saving="saving"
      @save="saveEdit"
    />
    <UserPasswordModal
      v-model="passOpen"
      :user="passUser"
      :saving="saving"
      @save="savePassword"
      @toast="toast"
    />
    <UserCreateModal
      v-model="createOpen"
      :roles="roles"
      :saving="saving"
      :fallback-avatar="FALLBACK_AVATAR"
      @save="createUser"
      @toast="toast"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import AvatarPicker from "@/components/AvatarPicker.vue";
import UserBanner      from "@/components/usuarios/UserBanner.vue";
import UserEditModal   from "@/components/usuarios/UserEditModal.vue";
import UserPasswordModal from "@/components/usuarios/UserPasswordModal.vue";
import UserCreateModal from "@/components/usuarios/UserCreateModal.vue";
import { usersService } from "../../services/usersService.js";
import { labToast } from "@/composables/useLabToast";
import { formatRoleLabel, roleTagType } from "@/utils/roleHelpers.js";

const roles = ref([]);
const usersRaw = ref([]);
const me = ref(null);

const total = ref(0);
const stats = ref({ totalUsers: 0, activeUsers: 0, trashUsers: 0 });
const permissionsCatalog = ref(null);

const loading = ref(false);
const saving = ref(false);

const searchQuery = ref("");
const roleFilter = ref("all");
const statusFilter = ref("all");

const perPage = ref(10);
const currentPage = ref(1);

const sortBy = ref("name");
const sortDir = ref("asc");

const selectedUser = ref(null);

/* Modales */
const editOpen   = ref(false);
const passOpen   = ref(false);
const createOpen = ref(false);

const editUser = ref(null);
const passUser = ref(null);

const toast = (message, type = "is-danger", duration = 3000) => {
  labToast.show(message, type, duration);
};

const FALLBACK_AVATAR =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#7957d5"/><stop offset="1" stop-color="#9a6dff"/></linearGradient></defs>
  <rect width="96" height="96" rx="48" fill="url(#g)"/>
  <circle cx="48" cy="40" r="16" fill="rgba(255,255,255,.9)"/>
  <path d="M18 86c7-17 20-24 30-24s23 7 30 24" fill="rgba(255,255,255,.9)"/>
  </svg>`);

function canEditAvatar(u) {
  return !!(u && !u.isMe && !u.deletedAt);
}

function setUserAvatarLocal(userId, avatar) {
  usersRaw.value = (usersRaw.value || []).map((u) => {
    if (String(u._id) !== String(userId)) return u;
    const profile = { ...(u.profile || {}), avatar };
    return { ...u, profile };
  });
}

/* guardar avatar */
async function onAvatarPicked(user, newAvatar) {
  if (!user?._id) return;
  if (!canEditAvatar(user)) return toast("No puedes cambiar el avatar de este usuario", "is-warning", 2200);

  const prev = user?.profile?.avatar || "";
  setUserAvatarLocal(user._id, newAvatar); // UI optimista

  saving.value = true;
  try {
    await usersService.updateUser(user._id, { avatar: newAvatar });
    toast("Avatar actualizado", "is-success", 1800);
    await loadUsers();
  } catch (e) {
    setUserAvatarLocal(user._id, prev);
    toast(e?.error || "No se pudo actualizar el avatar");
  } finally {
    saving.value = false;
  }
}


function formatDateTime(value) {
  if (!value) return "Nunca ha iniciado sesión";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function rowClass(row) {
  if (row.deletedAt) return "user-row--inactive";
  return !row.isActive ? "user-row--inactive" : undefined;
}

function selectRow(row) {
  selectedUser.value = row;
}

/* API */
async function loadRolesAndMe() {
  try {
    const [r, m] = await Promise.all([usersService.getRoles(), usersService.me()]);
    roles.value = Array.isArray(r) ? r : [];
    me.value = m || null;
  } catch {
    roles.value = Array.isArray(roles.value) ? roles.value : [];
  }
}

async function loadUsers() {
  loading.value = true;
  try {
    const res = await usersService.listUsers({
      page: currentPage.value,
      limit: perPage.value,
      q: searchQuery.value?.trim() || "",
      role: roleFilter.value,
      status: statusFilter.value,
      sortBy: sortBy.value,
      sortDir: sortDir.value,
    });

    usersRaw.value = Array.isArray(res?.items) ? res.items : [];
    total.value = Number(res?.total || 0);
    stats.value = res?.stats || stats.value;
    permissionsCatalog.value = res?.permissionsCatalog || null;
  } catch (e) {
    toast(e?.error || "No se pudieron cargar usuarios");
  } finally {
    loading.value = false;
  }
}

/* computed normalizado */
const users = computed(() => {
  const myId = String(me.value?.id || me.value?._id || "");
  return (usersRaw.value || []).filter((u) => {
    const roleName = (u?.roleDoc || u?.role)?.name || "";
    return roleName !== "root";
  }).map((u) => {
    const roleObj = u?.roleDoc || u?.role || null;
    const roleName = roleObj?.name || "sin-rol";
    const rolePermissions = Array.isArray(roleObj?.permissions) ? roleObj.permissions : [];

    return {
      ...u,
      profile: u.profile || {},
      roleName,
      roleLabel: formatRoleLabel(roleName),
      roleDescription: roleObj?.description || "",
      rolePermissions,
      tokensCount: Number.isFinite(u.tokensCount) ? u.tokensCount : Array.isArray(u.tokens) ? u.tokens.length : 0,
      isMe: myId && String(u._id) === myId,
    };
  });
});

/* Mantener seleccionado si existe; si no, selecciona el primero */
watch(users, (list) => {
  if (!list?.length) return;
  if (!selectedUser.value) {
    selectedUser.value = list[0];
    return;
  }
  const found = list.find((x) => String(x._id) === String(selectedUser.value?._id));
  if (found) selectedUser.value = found;
});

/* debounce búsqueda */
const _debouncedLoadUsers = useDebounceFn(() => {
  currentPage.value = 1;
  loadUsers();
}, 260);
watch(searchQuery, _debouncedLoadUsers);

watch([roleFilter, statusFilter, perPage], () => {
  currentPage.value = 1;
  loadUsers();
});

function onPageChange(p) {
  currentPage.value = p;
  loadUsers();
}

function onSort(field, order) {
  sortBy.value = field || "name";
  sortDir.value = String(order || "asc");
  currentPage.value = 1;
  loadUsers();
}

/* EDIT */
function openEdit(u) {
  if (u.isMe) return toast("No puedes editar tu propio usuario", "is-warning");
  if (u.deletedAt) return toast("No puedes editar un usuario en papelera", "is-warning");
  editUser.value = u;
  editOpen.value = true;
}

async function saveEdit(data) {
  if (!editUser.value?._id) return;
  saving.value = true;
  try {
    await usersService.updateUser(editUser.value._id, data);
    toast("Usuario actualizado", "is-success", 2000);
    editOpen.value = false;
    await loadUsers();
  } catch (e) {
    toast(e?.error || "No se pudo actualizar el usuario");
  } finally {
    saving.value = false;
  }
}

/* PASSWORD */
function openPassword(u) {
  if (u.isMe) return toast("No puedes cambiar tu propia contraseña aquí", "is-warning");
  if (u.deletedAt) return toast("No puedes editar un usuario en papelera", "is-warning");
  passUser.value = u;
  passOpen.value = true;
}

async function savePassword(password) {
  if (!passUser.value?._id) return;
  if (!password || password.length < 10) return toast("Recomendado mínimo 10 caracteres", "is-warning");
  saving.value = true;
  try {
    await usersService.updatePassword(passUser.value._id, password);
    toast("Contraseña actualizada", "is-success", 2000);
    passOpen.value = false;
  } catch (e) {
    toast(e?.error || "No se pudo actualizar la contraseña");
  } finally {
    saving.value = false;
  }
}

/* CREAR */
function openCreate() {
  createOpen.value = true;
}

async function createUser(data) {
  if (!data.name || !data.email || !data.role) return toast("Nombre, correo y rol son obligatorios", "is-warning");
  if (!data.password || data.password.length < 10) return toast("Contraseña recomendada mínimo 10 caracteres", "is-warning");
  saving.value = true;
  try {
    await usersService.createUser(data);
    toast("Usuario creado", "is-success", 2000);
    createOpen.value = false;
    currentPage.value = 1;
    await loadUsers();
  } catch (e) {
    toast(e?.error || "No se pudo crear el usuario");
  } finally {
    saving.value = false;
  }
}

/* PAPELERA */
const deleting = ref(false);

function confirmSoftDelete(u) {
  if (deleting.value) return;
  if (u.isMe) return toast("No puedes enviar tu propio usuario a papelera", "is-warning");

  deleting.value = true;

  $buefy?.dialog?.confirm?.({
    title: "Enviar a papelera",
    message: `¿Deseas enviar a <b>${u.name}</b> a la papelera?`,
    confirmText: "Sí, enviar",
    cancelText: "Cancelar",
    type: "is-warning",
    hasIcon: true,
    onConfirm: async () => {
      loading.value = true;

      try {
        const res = await usersService.softDelete(u._id);

        // ✅ respuesta esperada (200 JSON)
        if (res?.alreadyDeleted) {
          toast("El usuario ya estaba en papelera", "is-info", 2000);
        } else {
          toast("Usuario enviado a papelera", "is-warning", 2500);
        }
      } catch (e) {
        // 👇 workaround PRO: a veces el backend sí borró, pero el response fue 400/timeout/etc.
        // Entonces validamos por estado real:
        try {
          await loadUsers();

          const stillExists = (usersRaw.value || []).some(x => String(x._id) === String(u._id));
          const nowDeleted = (usersRaw.value || []).some(
            x => String(x._id) === String(u._id) && !!x.deletedAt
          );

          // Si ya no existe en lista (porque listUsers por defecto filtra deletedAt=null),
          // asumimos que fue enviado a papelera aunque Axios haya marcado error.
          if (!stillExists) {
            toast("Usuario enviado a papelera", "is-warning", 2500);
          } else if (nowDeleted) {
            toast("El usuario ya estaba/enviándose a papelera", "is-info", 2200);
          } else {
            toast(e?.error || "No se pudo eliminar el usuario");
          }
        } catch {
          toast(e?.error || "No se pudo eliminar el usuario");
        }
      } finally {
        selectedUser.value = null;
        try { await loadUsers(); } catch {}
        loading.value = false;
        deleting.value = false;
      }
    },
    onCancel: () => (deleting.value = false),
  });
}


function confirmRestore(u) {
  $buefy?.dialog?.confirm?.({
    title: "Restaurar usuario",
    message: `¿Deseas restaurar a <b>${u.name}</b>?`,
    confirmText: "Sí, restaurar",
    cancelText: "Cancelar",
    type: "is-success",
    hasIcon: true,
    onConfirm: async () => {
      loading.value = true;
      try {
        await usersService.restore(u._id);
        toast("Usuario restaurado", "is-success", 2500);
        selectedUser.value = null;
        await loadUsers();
      } catch (e) {
        toast(e?.error || "No se pudo restaurar el usuario");
      } finally {
        loading.value = false;
      }
    },
  });
}

onMounted(async () => {
  await loadRolesAndMe();
  await loadUsers();
});
</script>

<style scoped>
.user-cell__avatar-wrap {
  flex: 0 0 auto;
}

/* ✅ Bio: fondo grande y texto WRAP (no se corta por el fondo) */
.user-bio-pill {
  border-radius: 10px;
  line-height: 1.25rem;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

/* PANEL */
.panel-usuarios-section {
  border-radius: 12px;
  padding: 1.5rem;
  background-color: var(--surface-solid);
  border: 1px solid var(--border-solid);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  animation: panel-fade-in 220ms ease-out;
  overflow: hidden;
}

.usuarios-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--c-primary);
  background: var(--c-primary-alpha);
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  margin-bottom: 0.35rem;
}

.panel-usuarios-header {
  /* layout handled by .page-section-header */
}

.panel-usuarios-summary {
  text-align: right;
}

.panel-usuarios-filters {
  margin-top: 0.25rem;
}

.panel-usuarios-filter-field {
  min-width: 210px;
}

/* TABLA */
:deep(.b-table .table) {
  table-layout: fixed;
}

:deep(.b-table .table td),
:deep(.b-table .table th) {
  vertical-align: middle;
}

/* FIX CONTRASTE: fila seleccionada/focus */
:deep(.b-table .table tbody tr.is-selected) {
  background: rgba(79, 70, 229, 0.1) !important;
}

:deep(.b-table .table tbody tr.is-selected td) {
  color: var(--text-primary) !important;
}

:deep(.b-table .table tbody tr.is-selected .tag) {
  background: var(--surface-solid) !important;
  color: var(--text-primary) !important;
  border: 1px solid var(--border) !important;
}

:deep(.b-table .table tbody tr.is-selected .b-tag) {
  color: inherit !important;
}

:deep(.b-table .table tbody tr:focus-within) {
  outline: none;
  box-shadow: inset 0 0 0 2px rgba(79, 70, 229, 0.2);
}

.user-cell {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  min-width: 0;
  cursor: pointer;
}

.user-cell__meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.user-cell__meta-header {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.user-cell__name {
  font-weight: 600;
  font-size: 0.9rem;
}

.user-cell__role-tag {
  text-transform: capitalize;
}

.user-row--inactive {
  background-color: var(--c-danger-alpha);
  opacity: 0.95;
}

/* Crear usuario */
.create-avatar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* password tools */
.password-tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.25rem;
}

@keyframes panel-fade-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .panel-usuarios-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .panel-usuarios-summary {
    text-align: left;
  }
}
</style>
