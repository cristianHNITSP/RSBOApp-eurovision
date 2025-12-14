<template>
  <section class="panel-usuarios-section">
    <!-- BANNER + ACCIONES SUPERIORES (CENTRADO EN USUARIO SELECCIONADO) -->
    <div
      v-if="selectedUser"
      ref="bannerRef"
      class="selected-user-banner"
      :class="{ 'selected-user-banner--pulse': bannerPulse }"
    >
      <div class="selected-user-banner__left">
        <!-- AvatarPicker (banner) -->
        <AvatarPicker
          :modelValue="selectedUser.profile?.avatar || ''"
          :placeholder="FALLBACK_AVATAR"
          :editMode="canEditAvatar(selectedUser)"
          :size="44"
          @update:modelValue="(val) => onAvatarPicked(selectedUser, val)"
        />

        <div class="selected-user-banner__text">
          <div class="selected-user-banner__name-row">
            <span class="selected-user-banner__name">
              {{ selectedUser.name }}
              <b-tag v-if="selectedUser.isMe" type="is-light" size="is-small" class="ml-2">Yo</b-tag>
            </span>

            <span class="selected-user-banner__role">
              {{ selectedUser.roleLabel }}
              <span v-if="selectedUser.deletedAt" style="opacity: 0.9">· En papelera</span>
            </span>
          </div>

          <p class="selected-user-banner__bio">
            {{ selectedUser.profile?.bio || "—" }}
          </p>
        </div>
      </div>

      <div class="selected-user-banner__center">
        <span class="selected-user-banner__email">{{ selectedUser.email }}</span>
      </div>

      <div class="selected-user-banner__right">
        <div class="chip chip--light">{{ formatDateTime(selectedUser.lastLogin) }}</div>

        <div
          class="chip"
          :class="
            selectedUser.deletedAt
              ? 'chip--status-inactive'
              : selectedUser.isActive
              ? 'chip--status-active'
              : 'chip--status-inactive'
          "
        >
          {{ selectedUser.deletedAt ? "Eliminado" : selectedUser.isActive ? "Activo" : "Inactivo" }}
        </div>


        <div class="selected-user-banner__created">Alta: {{ formatDate(selectedUser.createdAt) }}</div>
      </div>

      <!-- Acciones superiores -->
      <div class="selected-user-actions">
        <div class="selected-user-actions__left">
          <!-- ✅ FontAwesome (fas) -->
          <b-button size="is-small" type="is-light" icon-left="user-plus" @click="openCreate()">
            Nuevo usuario
          </b-button>

          <b-button size="is-small" type="is-light" icon-left="sync-alt" :loading="loading" @click="loadUsers()">
            Recargar
          </b-button>
        </div>

        <div class="selected-user-actions__right">
          <b-button size="is-small" type="is-light" icon-left="info-circle" @click="toggleBannerDetails">
            {{ showBannerDetails ? "Ocultar detalles" : "Ver detalles" }}
          </b-button>

          <b-button
            size="is-small"
            type="is-light"
            icon-left="pen"
            :disabled="selectedUser.isMe || !!selectedUser.deletedAt"
            @click="openEdit(selectedUser)"
          >
            Editar
          </b-button>

          <b-button
            size="is-small"
            type="is-light"
            icon-left="key"
            :disabled="selectedUser.isMe || !!selectedUser.deletedAt"
            @click="openPassword(selectedUser)"
          >
            Contraseña
          </b-button>

          <b-button
            v-if="!selectedUser.deletedAt"
            size="is-small"
            type="is-warning"
            icon-left="trash"
            :disabled="selectedUser.isMe"
            @click="confirmSoftDelete(selectedUser)"
          >
            Papelera
          </b-button>

          <b-button v-else size="is-small" type="is-success" icon-left="undo" @click="confirmRestore(selectedUser)">
            Restaurar
          </b-button>
        </div>
      </div>

      <!-- Detalles del usuario (se muestran EN EL BANNER, no en desplegable de tabla) -->
      <transition name="banner-details">
        <div v-if="showBannerDetails" class="banner-details" @click.stop>
          <div class="banner-details__grid">
            <div class="banner-details__item">
              <p class="banner-details__k">Teléfono</p>
              <p class="banner-details__v">{{ selectedUser.profile?.phone || "No registrado" }}</p>
            </div>

            <div class="banner-details__item">
              <p class="banner-details__k">Descripción del rol</p>
              <p class="banner-details__v">{{ selectedUser.roleDescription || "—" }}</p>
            </div>

            <div class="banner-details__item banner-details__item--full">
              <p class="banner-details__k">Permisos</p>
              <div class="banner-details__perms">
                <b-tag
                  v-for="perm in selectedUser.rolePermissions"
                  :key="perm"
                  size="is-small"
                  type="is-light"
                  class="banner-details__perm-tag"
                >
                  {{ formatPermissionLabel(perm) }}
                </b-tag>

                <span v-if="!selectedUser.rolePermissions?.length" class="banner-details__empty">
                  Sin permisos configurados
                </span>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- HEADER PANEL -->
    <header class="panel-usuarios-header">
      <div>
        <span class="usuarios-pill">
          <b-icon icon="life-ring" size="is-small" class="mr-1" />
          Usuarios del sistema
        </span>
        <p class="subtitle is-6 m-0">Control de cuentas y accesos del personal.</p>
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

    <!-- MODAL EDITAR (sin avatar) -->
    <b-modal v-model="editOpen" has-modal-card trap-focus :destroy-on-hide="true" animation="zoom-in">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Editar usuario</p>
          <button class="delete" aria-label="close" @click="editOpen = false"></button>
        </header>

        <section class="modal-card-body">
          <b-field label="Nombre"><b-input v-model="editForm.name" /></b-field>
          <b-field label="Correo"><b-input v-model="editForm.email" type="email" /></b-field>
          <b-field label="Teléfono"><b-input v-model="editForm.phone" /></b-field>
          <b-field label="Bio"><b-input v-model="editForm.bio" type="textarea" /></b-field>

          <b-field label="Rol">
            <b-select v-model="editForm.role" expanded>
              <option v-for="r in roles" :key="r._id" :value="r._id">{{ formatRoleLabel(r.name) }}</option>
            </b-select>
          </b-field>

          <b-field label="Estado">
            <b-switch v-model="editForm.isActive">Activo</b-switch>
          </b-field>
        </section>

        <footer class="modal-card-foot" style="justify-content: flex-end; gap: 0.5rem">
          <b-button @click="editOpen = false">Cancelar</b-button>
          <b-button type="is-primary" :loading="saving" @click="saveEdit">Guardar</b-button>
        </footer>
      </div>
    </b-modal>

    <!-- MODAL PASSWORD -->
    <b-modal v-model="passOpen" has-modal-card trap-focus :destroy-on-hide="true" animation="zoom-in">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Cambiar contraseña</p>
          <button class="delete" aria-label="close" @click="passOpen = false"></button>
        </header>

        <section class="modal-card-body">
          <p class="mb-2"><strong>{{ passUser?.name }}</strong> · {{ passUser?.email }}</p>

          <b-field label="Nueva contraseña">
            <b-input v-model="newPassword" type="password" password-reveal />
          </b-field>

          <div class="password-tools">
            <!-- ✅ FontAwesome -->
            <b-button size="is-small" type="is-light" icon-left="shield-alt" @click="generateIntoPassword()">
              Generar segura
            </b-button>
            <b-button size="is-small" type="is-light" icon-left="copy" @click="copyText(newPassword)">
              Copiar
            </b-button>
            <span class="is-size-7 has-text-grey">Mínimo 10 caracteres recomendado.</span>
          </div>
        </section>

        <footer class="modal-card-foot" style="justify-content: flex-end; gap: 0.5rem">
          <b-button @click="passOpen = false">Cancelar</b-button>
          <b-button type="is-primary" :loading="saving" @click="savePassword">Actualizar</b-button>
        </footer>
      </div>
    </b-modal>

    <!-- MODAL CREAR USUARIO (avatar integrado) -->
    <b-modal v-model="createOpen" has-modal-card trap-focus :destroy-on-hide="true" animation="zoom-in">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Nuevo usuario</p>
          <button class="delete" aria-label="close" @click="createOpen = false"></button>
        </header>

        <section class="modal-card-body">
          <div class="create-avatar">
            <AvatarPicker
              :modelValue="createForm.avatar || ''"
              :placeholder="FALLBACK_AVATAR"
              :editMode="true"
              :size="56"
              @update:modelValue="(val) => (createForm.avatar = val)"
            />

            <div class="create-avatar__hint">
              <p class="is-size-7 has-text-grey m-0">Foto de perfil</p>
              <p class="is-size-6 has-text-weight-semibold m-0">{{ createForm.name || "Nuevo usuario" }}</p>
              <p class="is-size-7 has-text-grey m-0">Toca el avatar para cambiarlo.</p>
            </div>
          </div>

          <hr class="my-3" />

          <b-field label="Nombre"><b-input v-model="createForm.name" /></b-field>
          <b-field label="Correo"><b-input v-model="createForm.email" type="email" /></b-field>
          <b-field label="Teléfono"><b-input v-model="createForm.phone" /></b-field>
          <b-field label="Bio"><b-input v-model="createForm.bio" type="textarea" /></b-field>

          <b-field label="Rol">
            <b-select v-model="createForm.role" expanded>
              <option v-for="r in roles" :key="r._id" :value="r._id">{{ formatRoleLabel(r.name) }}</option>
            </b-select>
          </b-field>

          <b-field label="Estado">
            <b-switch v-model="createForm.isActive">Activo</b-switch>
          </b-field>

          <b-field label="Contraseña">
            <b-input v-model="createForm.password" type="text" />
          </b-field>

          <div class="password-tools">
            <!-- ✅ FontAwesome -->
            <b-button size="is-small" type="is-light" icon-left="shield-alt" @click="generateIntoCreate()">
              Generar segura
            </b-button>
            <b-button size="is-small" type="is-light" icon-left="copy" @click="copyText(createForm.password)">
              Copiar
            </b-button>
            <span class="is-size-7 has-text-grey">Se recomienda guardarla y dársela al usuario.</span>
          </div>
        </section>

        <footer class="modal-card-foot" style="justify-content: flex-end; gap: 0.5rem">
          <b-button @click="createOpen = false">Cancelar</b-button>
          <b-button type="is-primary" :loading="saving" @click="createUser">Crear</b-button>
        </footer>
      </div>
    </b-modal>
  </section>
</template>

<script setup>
import { computed, getCurrentInstance, nextTick, onMounted, ref, watch } from "vue";
import AvatarPicker from "../../components/AvatarPicker.vue";
import { usersService } from "../../services/usersService.js";

const inst = getCurrentInstance();
const $buefy = inst?.proxy?.$buefy;

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

/* Banner focus */
const bannerRef = ref(null);
const bannerPulse = ref(false);
const showBannerDetails = ref(false);

let pulseT = null;
let hasUserInteracted = false;

function isElementMostlyVisible(el, ratio = 0.7) {
  if (!el) return true;
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const visibleTop = Math.max(rect.top, 0);
  const visibleBottom = Math.min(rect.bottom, vh);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);
  const h = Math.max(1, rect.height);
  return visibleHeight / h >= ratio;
}

async function focusBannerIfNeeded() {
  await nextTick();
  const el = bannerRef.value;
  if (!el) return;

  // Pulso visual siempre
  bannerPulse.value = false;
  if (pulseT) clearTimeout(pulseT);
  bannerPulse.value = true;
  pulseT = setTimeout(() => (bannerPulse.value = false), 650);

  // Si el usuario está abajo y selecciona, subimos al banner
  if (hasUserInteracted && !isElementMostlyVisible(el, 0.65)) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function toggleBannerDetails() {
  showBannerDetails.value = !showBannerDetails.value;
  if (showBannerDetails.value) focusBannerIfNeeded();
}

/* Modales */
const editOpen = ref(false);
const passOpen = ref(false);
const createOpen = ref(false);

const editUserId = ref(null);
const editForm = ref({ name: "", email: "", phone: "", bio: "", role: null, isActive: true });

const passUser = ref(null);
const newPassword = ref("");

const createForm = ref({
  name: "",
  email: "",
  phone: "",
  bio: "",
  avatar: "",
  role: null,
  isActive: true,
  password: "",
});

const toast = (message, type = "is-danger", duration = 3000) => {
  $buefy?.toast?.open?.({ message, type, duration });
};

const FALLBACK_AVATAR =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#7957d5"/><stop offset="1" stop-color="#9a6dff"/></linearGradient></defs>
  <rect width="96" height="96" rx="48" fill="url(#g)"/>
  <circle cx="48" cy="40" r="16" fill="rgba(255,255,255,.9)"/>
  <path d="M18 86c7-17 20-24 30-24s23 7 30 24" fill="rgba(255,255,255,.9)"/>
  </svg>`);

function safeAvatar(u) {
  const src = u?.profile?.avatar;
  return src && String(src).trim() ? src : FALLBACK_AVATAR;
}

function canEditAvatar(u) {
  if (!u) return false;
  if (u.isMe) return false;
  if (u.deletedAt) return false;
  return true;
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

function formatRoleLabel(name) {
  if (!name || name === "sin-rol") return "Sin rol";
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " ");
}

function roleTagType(roleName) {
  const key = String(roleName || "").toLowerCase();
  if (key === "administrador") return "is-primary";
  if (key === "moderador") return "is-info";
  if (key === "laboratorio") return "is-warning";
  return "is-dark";
}

function formatPermissionLabel(code) {
  if (!code) return "—";
  const cat = permissionsCatalog.value;
  if (cat && typeof cat === "object" && cat[code]) return String(cat[code]);
  const pretty = String(code).replace(/[_-]/g, " ").toLowerCase();
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

function formatDateTime(value) {
  if (!value) return "Nunca ha iniciado sesión";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function rowClass(row) {
  if (row.deletedAt) return "user-row--inactive";
  return !row.isActive ? "user-row--inactive" : undefined;
}

function selectRow(row) {
  hasUserInteracted = true;
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
  return (usersRaw.value || []).map((u) => {
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

/* Cuando cambia el usuario seleccionado */
watch(
  selectedUser,
  async (u, prev) => {
    if (!u) return;
    if (prev && String(prev._id) !== String(u._id)) showBannerDetails.value = false;
    await focusBannerIfNeeded();
  },
  { flush: "post" }
);

/* debounce búsqueda */
let t = null;
watch(searchQuery, () => {
  clearTimeout(t);
  t = setTimeout(() => {
    currentPage.value = 1;
    loadUsers();
  }, 260);
});

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

  editUserId.value = u._id;
  editForm.value = {
    name: u.name || "",
    email: u.email || "",
    phone: u.profile?.phone || "",
    bio: u.profile?.bio || "",
    role: typeof u.role === "string" ? u.role : u.role?._id || u.roleDoc?._id || null,
    isActive: !!u.isActive,
  };
  editOpen.value = true;
}

async function saveEdit() {
  if (!editUserId.value) return;
  saving.value = true;
  try {
    await usersService.updateUser(editUserId.value, {
      name: editForm.value.name,
      email: editForm.value.email,
      phone: editForm.value.phone,
      bio: editForm.value.bio,
      role: editForm.value.role,
      isActive: editForm.value.isActive,
    });
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
  newPassword.value = "";
  passOpen.value = true;
}

function generateSecurePassword(len = 16) {
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const nums = "23456789";
  const syms = "!@#$%*_-+=";
  const all = lower + upper + nums + syms;

  const rand = (s) => s[Math.floor(Math.random() * s.length)];
  let out = [rand(lower), rand(upper), rand(nums), rand(syms)];
  for (let i = out.length; i < len; i++) out.push(rand(all));
  out = out.sort(() => Math.random() - 0.5);
  return out.join("");
}

function generateIntoPassword() {
  newPassword.value = generateSecurePassword(16);
  toast("Contraseña segura generada", "is-success", 1400);
}

async function savePassword() {
  if (!passUser.value?._id) return;
  if (!newPassword.value || newPassword.value.length < 10) {
    return toast("Recomendado mínimo 10 caracteres", "is-warning");
  }

  saving.value = true;
  try {
    await usersService.updatePassword(passUser.value._id, newPassword.value);
    toast("Contraseña actualizada", "is-success", 2000);
    passOpen.value = false;
  } catch (e) {
    toast(e?.error || "No se pudo actualizar la contraseña");
  } finally {
    saving.value = false;
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text || ""));
    toast("Copiado", "is-success", 1200);
  } catch {
    toast("No se pudo copiar", "is-warning", 1500);
  }
}

/* CREAR */
function openCreate() {
  createForm.value = {
    name: "",
    email: "",
    phone: "",
    bio: "",
    avatar: "",
    role: roles.value?.[0]?._id || null,
    isActive: true,
    password: generateSecurePassword(16),
  };
  createOpen.value = true;
}

function generateIntoCreate() {
  createForm.value.password = generateSecurePassword(16);
  toast("Contraseña segura generada", "is-success", 1400);
}

async function createUser() {
  if (!createForm.value.name || !createForm.value.email || !createForm.value.role) {
    return toast("Nombre, correo y rol son obligatorios", "is-warning");
  }
  if (!createForm.value.password || createForm.value.password.length < 10) {
    return toast("Contraseña recomendada mínimo 10 caracteres", "is-warning");
  }

  saving.value = true;
  try {
    await usersService.createUser({
      name: createForm.value.name,
      email: createForm.value.email,
      phone: createForm.value.phone,
      bio: createForm.value.bio,
      avatar: createForm.value.avatar,
      role: createForm.value.role,
      isActive: createForm.value.isActive,
      password: createForm.value.password,
    });

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
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
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
  color: #4f46e5;
  background: #eef2ff;
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  margin-bottom: 0.35rem;
}

.panel-usuarios-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
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

/* BANNER */
.selected-user-banner {
  background: linear-gradient(120deg, #7957d5, #9a6dff, #f97316, #ec4899);
  background-size: 200% 200%;
  border-radius: 10px;
  padding: 0.9rem 1.25rem;
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(0, 1.1fr) minmax(0, 1.7fr);
  align-items: center;
  gap: 1rem;
  color: #f9fafb;
  box-shadow: 0 14px 32px rgba(88, 28, 135, 0.45);
  position: relative;
  overflow: hidden;
  animation: banner-enter 220ms ease-out, banner-gradient-shift 14s ease-in-out infinite alternate;
}

.selected-user-banner--pulse {
  box-shadow: 0 14px 32px rgba(88, 28, 135, 0.45), 0 0 0 3px rgba(255, 255, 255, 0.22);
}

.selected-user-banner::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 0 0, rgba(255, 255, 255, 0.28), transparent 60%),
    radial-gradient(circle at 100% 100%, rgba(15, 23, 42, 0.24), transparent 60%);
  opacity: 0.55;
  pointer-events: none;
}

.selected-user-banner > * {
  position: relative;
  z-index: 1;
}

.selected-user-banner__left {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
}

.selected-user-banner__text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.selected-user-banner__name-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.selected-user-banner__name {
  font-weight: 600;
  font-size: 0.98rem;
}

.selected-user-banner__role {
  font-size: 0.82rem;
  opacity: 0.92;
}

.selected-user-banner__bio {
  font-size: 0.75rem;
  opacity: 0.92;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);
  max-width: 560px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-user-banner__center {
  text-align: center;
  font-size: 0.8rem;
  font-weight: 500;
  min-width: 0;
}

.selected-user-banner__email {
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.28);
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(4px);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.22);
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected-user-banner__right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  flex-wrap: wrap;
}

.selected-user-banner__created {
  opacity: 0.93;
}

/* Barra acciones superior */
.selected-user-actions {
  grid-column: 1 / -1;
  margin-top: 0.65rem;
  padding-top: 0.65rem;
  border-top: 1px solid rgba(249, 250, 251, 0.22);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.selected-user-actions__left,
.selected-user-actions__right {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Detalles en banner */
.banner-details {
  grid-column: 1 / -1;
  margin-top: 0.55rem;
  padding-top: 0.65rem;
  border-top: 1px solid rgba(249, 250, 251, 0.18);
}

.banner-details__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.75rem;
}

.banner-details__item {
  background: rgba(15, 23, 42, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(6px);
  border-radius: 12px;
  padding: 0.65rem 0.75rem;
  min-width: 0;
}

.banner-details__item--full {
  grid-column: 1 / -1;
}

.banner-details__k {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 800;
  opacity: 0.9;
}

.banner-details__v {
  margin: 0.25rem 0 0;
  font-size: 0.88rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  overflow: hidden;
  text-overflow: ellipsis;
}

.banner-details__perms {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.35rem;
}

.banner-details__perm-tag {
  text-transform: none;
}

.banner-details__empty {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.85);
}

/* Transición detalles */
.banner-details-enter-active,
.banner-details-leave-active {
  transition: all 180ms ease;
}

.banner-details-enter-from,
.banner-details-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* CHIPS */
.chip {
  border-radius: 999px;
  padding: 0.25rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.15);
  color: #f9fafb;
  backdrop-filter: blur(4px);
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.chip--light {
  background: #f9fafb;
  color: #111827;
}

.chip--status-active {
  background: #10b981;
  color: #ecfdf5;
}

.chip--status-inactive {
  background: #f59e0b;
  color: #111827;
}

.chip--info {
  background: #e0f2fe;
  color: #075985;
}

.chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 7px 18px rgba(15, 23, 42, 0.25);
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
  color: #111827 !important;
}

:deep(.b-table .table tbody tr.is-selected .tag) {
  background: #ffffff !important;
  color: #111827 !important;
  border: 1px solid rgba(148, 163, 184, 0.22) !important;
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
  background-color: #fff5f5;
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

/* animaciones */
@keyframes banner-gradient-shift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes banner-enter {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
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

@media (max-width: 1024px) {
  .selected-user-banner {
    grid-template-columns: minmax(0, 1.8fr) minmax(0, 1.4fr);
    grid-template-rows: auto auto;
  }

  .selected-user-banner__right {
    justify-content: flex-start;
  }

  .selected-user-banner__center {
    text-align: left;
  }

  .banner-details__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 768px) {
  .selected-user-banner {
    grid-template-columns: minmax(0, 1fr);
    grid-auto-rows: auto;
    align-items: flex-start;
  }

  .panel-usuarios-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .panel-usuarios-summary {
    text-align: left;
  }

  .selected-user-actions {
    justify-content: flex-start;
  }
}
</style>
