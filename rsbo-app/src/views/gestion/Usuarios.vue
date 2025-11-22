<template>
    <section class="panel-usuarios-section">
        <!-- BANNER USUARIO SELECCIONADO -->
        <div v-if="selectedUser" class="selected-user-banner">
            <!-- IZQUIERDA: AVATAR + NOMBRE + ROL + BIO -->
            <div class="selected-user-banner__left">
                <div class="selected-user-banner__avatar">
                    <img :src="selectedUser.profile.avatar" :alt="selectedUser.name" />
                </div>
                <div class="selected-user-banner__text">
                    <div class="selected-user-banner__name-row">
                        <span class="selected-user-banner__name">
                            {{ selectedUser.name }}
                        </span>
                        <span class="selected-user-banner__role">
                            {{ selectedUser.roleLabel }}
                        </span>
                    </div>
                    <p class="selected-user-banner__bio">
                        {{ selectedUser.profile.bio }}
                    </p>
                </div>
            </div>

            <!-- CENTRO: EMAIL -->
            <div class="selected-user-banner__center">
                <span class="selected-user-banner__email">
                    {{ selectedUser.email }}
                </span>
            </div>

            <!-- DERECHA: MÉTRICAS -->
            <div class="selected-user-banner__right">
                <div class="chip chip--light">
                    {{ formatDateTime(selectedUser.lastLogin) }}
                </div>

                <div class="chip" :class="selectedUser.isActive
                    ? 'chip--status-active'
                    : 'chip--status-inactive'
                    ">
                    {{ selectedUser.isActive ? 'Activo' : 'Inactivo' }}
                </div>

                <div class="chip chip--info">
                    {{ selectedUser.tokensCount }} sesiones
                </div>

                <div class="selected-user-banner__created">
                    Alta: {{ formatDate(selectedUser.createdAt) }}
                </div>
            </div>
        </div>

        <!-- HEADER PANEL -->
        <header class="panel-usuarios-header">
            <div>
                <span class="usuarios-pill">
                    <b-icon icon="life-ring" size="is-small" class="mr-1" />
                   Usuarios del sistema
                </span>
                <p class="subtitle is-6 m-0">
                    Control de cuentas y accesos del personal.
                </p>
            </div>

            <div class="panel-usuarios-summary">
                <b-taglist attached>
                    <b-tag type="is-primary">
                        {{ totalUsers }} usuarios
                    </b-tag>
                    <b-tag type="is-success">
                        {{ activeUsers }} activos
                    </b-tag>
                </b-taglist>
                <p class="is-size-7 has-text-grey mt-1">
                    {{ roles.length }} roles configurados
                </p>
            </div>
        </header>

        <!-- FILTROS -->
        <div class="panel-usuarios-filters">
            <b-field grouped group-multiline>
                <b-field label="Buscar" class="panel-usuarios-filter-field">
                    <b-input v-model="searchQuery" size="is-small" icon="magnify"
                        placeholder="Buscar por nombre, correo o rol…" />
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
                    </b-select>
                </b-field>
            </b-field>
        </div>

        <!-- TABLA -->
        <b-table :data="filteredUsers" detailed detail-key="_id" :show-detail-icon="true" sticky-header :height="360"
            hoverable focusable paginated :per-page="perPage" v-model:current-page="currentPage"
            :default-sort-direction="'asc'" default-sort="name" v-model:selected="selectedUser" :row-class="rowClass"
            aria-next-label="Página siguiente" aria-previous-label="Página anterior" aria-page-label="Página"
            aria-current-label="Página actual">
            <!-- COLUMNA: USUARIO -->
            <b-table-column field="name" label="Usuario" sortable v-slot="props">
                <div class="user-cell">
                    <div class="user-cell__avatar">
                        <img :src="props.row.profile.avatar" :alt="props.row.name" />
                    </div>
                    <div class="user-cell__meta">
                        <div class="user-cell__meta-header">
                            <span class="user-cell__name">
                                {{ props.row.name }}
                            </span>
                            <b-tag :type="roleTagType(props.row.roleName)" size="is-small" class="user-cell__role-tag">
                                {{ props.row.roleLabel }}
                            </b-tag>
                        </div>
                        <p class="user-cell__bio">
                            {{ props.row.profile.bio }}
                        </p>
                    </div>
                </div>
            </b-table-column>

            <!-- COLUMNA: EMAIL -->
            <b-table-column field="email" label="Correo" sortable v-slot="props">
                <span class="user-email">
                    <b-icon pack="mdi" icon="email-outline" size="is-small" class="mr-1" />
                    {{ props.row.email }}
                </span>
            </b-table-column>

            <!-- COLUMNA: ÚLTIMO ACCESO -->
            <b-table-column field="lastLogin" label="Último acceso" sortable centered v-slot="props">
                <span class="tag is-light is-size-7">
                    {{ formatDateTime(props.row.lastLogin) }}
                </span>
            </b-table-column>

            <!-- COLUMNA: ESTADO -->
            <b-table-column field="isActive" label="Estado" centered v-slot="props">
                <b-tag :type="props.row.isActive ? 'is-success' : 'is-danger'" size="is-small">
                    {{ props.row.isActive ? 'Activo' : 'Inactivo' }}
                </b-tag>
            </b-table-column>

            <!-- COLUMNA: SESIONES -->
            <b-table-column field="tokensCount" label="Sesiones" numeric v-slot="props">
                <span class="tag is-info is-light is-size-7">
                    {{ props.row.tokensCount }} sesiones
                </span>
            </b-table-column>

            <!-- COLUMNA: FECHA CREACIÓN -->
            <b-table-column field="createdAt" label="Alta" sortable centered v-slot="props">
                <span class="is-size-7">
                    {{ formatDate(props.row.createdAt) }}
                </span>
            </b-table-column>

            <!-- ACCIONES (SOLO UI) -->
            <b-table-column label="Acciones" width="90" centered v-slot="props">
                <div class="user-actions">
                    <button type="button" class="ghost-pill ghost-pill--view" title="Ver detalle">
                        <b-icon pack="mdi" icon="eye-outline" size="is-small" />
                    </button>
                    <button type="button" class="ghost-pill ghost-pill--edit" title="Editar usuario">
                        <b-icon pack="mdi" icon="pencil-outline" size="is-small" />
                    </button>
                </div>
            </b-table-column>

            <!-- DETALLE POR FILA -->
            <template #detail="props">
                <article class="media user-detail">
                    <figure class="media-left">
                        <p class="image is-64x64 user-detail__avatar">
                            <img :src="props.row.profile.avatar" />
                        </p>
                    </figure>
                    <div class="media-content">
                        <div class="content">
                            <p class="mb-2">
                                <strong>
                                    {{ props.row.name }}
                                </strong>
                                <br />
                                <span class="has-text-weight-semibold">
                                    Rol:
                                </span>
                                {{ props.row.roleLabel }}
                                <span class="has-text-grey is-size-7">
                                    ({{ props.row.roleDescription }})
                                </span>
                            </p>

                            <p class="mb-2">
                                <b-icon pack="mdi" icon="phone" size="is-small" class="mr-1" />
                                <strong>Teléfono de contacto:</strong>
                                {{ props.row.profile.phone || 'No registrado' }}
                            </p>

                            <p class="mb-1">
                                <strong>Lo que puede hacer en el sistema:</strong>
                            </p>
                            <p class="user-detail__helper">
                                Estos permisos describen las acciones que esta
                                persona tiene autorizadas dentro del sistema.
                            </p>
                            <div class="user-detail__permissions">
                                <b-tag v-for="perm in props.row.rolePermissions" :key="perm" size="is-small"
                                    type="is-light" class="user-detail__perm-tag">
                                    {{ formatPermissionLabel(perm) }}
                                </b-tag>
                            </div>

                            <hr class="my-2" />

                            <div class="user-detail__meta is-size-7">
                                <span>
                                    <b-icon pack="mdi" icon="clock-outline" size="is-small" class="mr-1" />
                                    <strong>Último acceso:</strong>
                                    {{ formatDateTime(props.row.lastLogin) }}
                                </span>
                                <span>
                                    <strong>Alta en el sistema:</strong>
                                    {{ formatDateTime(props.row.createdAt) }}
                                </span>
                                <span>
                                    <strong>Sesiones activas:</strong>
                                    {{ props.row.tokensCount }}
                                </span>
                            </div>
                        </div>
                    </div>
                </article>
            </template>

            <!-- VACÍO -->
            <template #empty>
                <div class="has-text-centered has-text-grey py-5">
                    No se encontraron usuarios con los filtros actuales.
                </div>
            </template>
        </b-table>
    </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
    BField,
    BInput,
    BSelect,
    BTag,
    BTaglist,
    BIcon,
    BTable,
    BTableColumn,
} from "buefy";

interface Profile {
    avatar: string;
    bio: string;
    phone: string;
}

interface DbUser {
    _id: string;
    name: string;
    email: string;
    password: string;
    role: string;
    tokens: any[];
    isActive: boolean;
    lastLogin: string | null;
    profile: Profile;
    createdAt: string;
    deletedAt: string | null;
    __v: number;
}

interface Role {
    _id: string;
    name: string;
    description: string;
    permissions: string[];
    __v: number;
}

interface UserTableRow extends DbUser {
    roleName: string;
    roleLabel: string;
    roleDescription: string;
    rolePermissions: string[];
    tokensCount: number;
}

/* === DATOS EN MEMORIA (MIRROR DB) === */

const users: DbUser[] = [
    {
        _id: "690ffc0fb053222e186ba99f",
        name: "Administrador Óptica",
        email: "admin@optica.com",
        password: "$2b$10$Kk/tRkrPVYiWgOA3G2ngWuBCxmB1FmI8pg8yCi2RVQ…",
        role: "690fa4082a813842f66ad206",
        tokens: [{}, {}],
        isActive: true,
        lastLogin: "2025-11-22T07:59:15.000Z",
        profile: {
            avatar:
                "https://cdn.jsdelivr.net/gh/alohe/avatars/png/3d_2.png",
            bio: "Gestión completa del sistema de la óptica",
            phone: "000-000-0000",
        },
        createdAt: "2025-11-09T02:27:27.000Z",
        deletedAt: null,
        __v: 2,
    },
    {
        _id: "690ffc0fb053222e186ba9a2",
        name: "Encargado de Ventas",
        email: "ventas@optica.com",
        password: "$2b$10$PGgwqbA0VOvv3pgj6LczHOAiEvwHeo8HcYLke/6kDg…",
        role: "690fa4082a813842f66ad209",
        tokens: [],
        isActive: true,
        lastLogin: null,
        profile: {
            avatar:
                "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_1.png",
            bio: "Atiende a clientes y gestiona ventas",
            phone: "111-111-1111",
        },
        createdAt: "2025-11-09T02:27:27.000Z",
        deletedAt: null,
        __v: 0,
    },
    {
        _id: "690ffc0fb053222e186ba9a5",
        name: "Técnico de Laboratorio",
        email: "laboratorio@optica.com",
        password: "$2b$10$5/72wcikO9FrhSsuRVCJI.IL8AFLBxgG3Pno1rXqcL…",
        role: "690fa4082a813842f66ad20c",
        tokens: [{}, {}, {}, {}, {}, {}, {}, {}, {}],
        isActive: true,
        lastLogin: "2025-11-21T20:01:15.000Z",
        profile: {
            avatar:
                "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_7.png",
            bio: "Encargado del pulido y montaje de lentes actualizado",
            phone: "9993676541",
        },
        createdAt: "2025-11-09T02:27:27.000Z",
        deletedAt: null,
        __v: 24,
    },
];

const roles: Role[] = [
    {
        _id: "690fa4082a813842f66ad206",
        name: "administrador",
        description: "Administrador general de la óptica",
        permissions:
            "manage_users,manage_inventory,manage_sales,view_reports,edit_settings".split(
                ","
            ),
        __v: 0,
    },
    {
        _id: "690fa4082a813842f66ad209",
        name: "moderador",
        description: "Encargado de ventas y atención al cliente",
        permissions:
            "create_order,update_order_status,view_inventory,view_clients".split(
                ","
            ),
        __v: 0,
    },
    {
        _id: "690fa4082a813842f66ad20c",
        name: "laboratorio",
        description: "Responsable del taller de lentes y pulido",
        permissions:
            "view_orders,update_order_progress,mark_order_completed".split(
                ","
            ),
        __v: 0,
    },
];

/* === MAPEO PERMISOS A TEXTO HUMANO === */

const permissionLabels: Record<string, string> = {
    manage_users: "Gestionar usuarios",
    manage_inventory: "Gestionar inventario",
    manage_sales: "Gestionar ventas",
    view_reports: "Ver reportes",
    edit_settings: "Configurar el sistema",
    create_order: "Crear órdenes de venta",
    update_order_status: "Actualizar estado de órdenes",
    view_inventory: "Consultar inventario",
    view_clients: "Ver información de clientes",
    view_orders: "Ver órdenes de trabajo",
    update_order_progress: "Actualizar avance de órdenes",
    mark_order_completed: "Marcar órdenes como finalizadas",
};

/* === ESTADO UI === */

const searchQuery = ref<string>("");
const roleFilter = ref<string>("all");
const statusFilter = ref<"all" | "active" | "inactive">("all");
const perPage = ref<number>(10);
const currentPage = ref<number>(1);
const selectedUser = ref<UserTableRow | null>(null);

/* === DERIVADOS === */

const rolesById: Record<string, Role> = {};
roles.forEach((r) => {
    rolesById[r._id] = r;
});

const tableUsers = computed<UserTableRow[]>(() =>
    users.map((u) => {
        const role = rolesById[u.role];
        const roleName = role?.name ?? "sin-rol";
        return {
            ...u,
            roleName,
            roleLabel: formatRoleLabel(roleName),
            roleDescription: role?.description ?? "",
            rolePermissions: role?.permissions ?? [],
            tokensCount: u.tokens.length,
        };
    })
);

const filteredUsers = computed<UserTableRow[]>(() => {
    const query = searchQuery.value.trim().toLowerCase();

    return tableUsers.value.filter((user) => {
        if (roleFilter.value !== "all" && user.role !== roleFilter.value) {
            return false;
        }

        if (statusFilter.value === "active" && !user.isActive) return false;
        if (statusFilter.value === "inactive" && user.isActive) return false;

        if (!query) return true;

        const match =
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.roleLabel.toLowerCase().includes(query);

        return match;
    });
});

const totalUsers = computed(() => tableUsers.value.length);
const activeUsers = computed(
    () => tableUsers.value.filter((u) => u.isActive).length
);

/* === HELPERS === */

function formatDateTime(value: string | null): string {
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

function formatDate(value: string | null): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function formatRoleLabel(name: string): string {
    if (!name) return "Sin rol";
    return (
        name.charAt(0).toUpperCase() +
        name.slice(1).replace(/_/g, " ")
    );
}

function roleTagType(roleName: string): string {
    const key = roleName.toLowerCase();
    if (key === "administrador") return "is-primary";
    if (key === "moderador") return "is-info";
    if (key === "laboratorio") return "is-warning";
    return "is-dark";
}

function formatPermissionLabel(code: string): string {
    if (permissionLabels[code]) return permissionLabels[code];
    // fallback por si añades nuevos permisos
    const pretty = code.replace(/_/g, " ");
    return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

function rowClass(row: UserTableRow) {
    return !row.isActive ? "user-row--inactive" : undefined;
}
</script>

<style scoped>
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

/* BANNER SELECCIONADO */

.selected-user-banner {
    background: linear-gradient(120deg,
            #7957d5,
            #9a6dff,
            #f97316,
            #ec4899);
    background-size: 200% 200%;
    border-radius: 10px;
    padding: 0.75rem 1.25rem;
    display: grid;
    grid-template-columns: minmax(0, 1.8fr) minmax(0, 1.1fr) minmax(0, 1.7fr);
    align-items: center;
    gap: 1rem;
    color: #f9fafb;
    box-shadow: 0 14px 32px rgba(88, 28, 135, 0.45);
    position: relative;
    overflow: hidden;
    animation:
        banner-enter 220ms ease-out,
        banner-gradient-shift 14s ease-in-out infinite alternate;
}

.selected-user-banner::after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 0 0,
            rgba(255, 255, 255, 0.28),
            transparent 60%),
        radial-gradient(circle at 100% 100%,
            rgba(15, 23, 42, 0.24),
            transparent 60%);
    opacity: 0.9;
    pointer-events: none;
}

.selected-user-banner>* {
    position: relative;
    z-index: 1;
}

.selected-user-banner__left {
    display: flex;
    align-items: center;
    gap: 0.8rem;
}

.selected-user-banner__avatar {
    width: 40px;
    height: 40px;
    min-width: 40px;
    border-radius: 999px;
    overflow: hidden;
    box-shadow: 0 0 0 2px rgba(248, 250, 252, 0.9);
    transform-origin: center;
    transition:
        transform 160ms ease-out,
        box-shadow 160ms ease-out;
}

.selected-user-banner__avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.selected-user-banner__avatar:hover {
    transform: scale(1.06) rotate(-2deg);
    box-shadow:
        0 0 0 2px #f97316,
        0 14px 24px rgba(15, 23, 42, 0.35);
}

.selected-user-banner__text {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
}

.selected-user-banner__name-row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.selected-user-banner__name {
    font-weight: 600;
    font-size: 0.95rem;
}

.selected-user-banner__role {
    font-size: 0.8rem;
    opacity: 0.9;
}

.selected-user-banner__bio {
    font-size: 0.75rem;
    opacity: 0.78;
}

.selected-user-banner__center {
    text-align: center;
    font-size: 0.8rem;
    font-weight: 500;
}

.selected-user-banner__email {
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.16);
    color: #f9fafb;
    backdrop-filter: blur(4px);
    box-shadow: 0 0 0 1px rgba(249, 250, 251, 0.2);
}

.selected-user-banner__right {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
}

.selected-user-banner__created {
    opacity: 0.93;
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
    transition:
        transform 120ms ease,
        box-shadow 120ms ease,
        background-color 120ms ease,
        color 120ms ease;
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

/* HEADER PANEL */

.panel-usuarios-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
}

.panel-usuarios-summary {
    text-align: right;
}

/* FILTROS */

.panel-usuarios-filters {
    margin-top: 0.25rem;
}

.panel-usuarios-filter-field {
    min-width: 210px;
}

/* CELDA USUARIO (TABLA) */

.user-cell {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
}

.user-cell__avatar {
    width: 32px;
    height: 32px;
    min-width: 32px;
    border-radius: 999px;
    overflow: hidden;
    box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.7);
    transform-origin: center;
    transition:
        transform 160ms ease-out,
        box-shadow 160ms ease-out;
}

.user-cell__avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.user-cell__avatar:hover {
    transform: scale(1.05);
    box-shadow:
        0 0 0 1px #6366f1,
        0 10px 20px rgba(15, 23, 42, 0.35);
}

.user-cell__meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
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

.user-cell__bio {
    font-size: 0.75rem;
    color: #6b7280;
    max-width: 380px;
}

/* EMAIL */

.user-email {
    font-size: 0.8rem;
    color: #374151;
}

/* ACCIONES */

.user-actions {
    display: flex;
    justify-content: center;
    gap: 0.4rem;
}

.ghost-pill {
    border-radius: 999px;
    border: none;
    padding: 0.2rem 0.45rem;
    background: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition:
        background-color 120ms ease,
        transform 120ms ease,
        box-shadow 120ms ease,
        opacity 120ms ease;
    opacity: 0.85;
}

.ghost-pill--view:hover {
    background: rgba(59, 130, 246, 0.1);
    box-shadow: 0 4px 10px rgba(59, 130, 246, 0.4);
    transform: translateY(-1px);
    opacity: 1;
}

.ghost-pill--edit:hover {
    background: rgba(16, 185, 129, 0.12);
    box-shadow: 0 4px 10px rgba(16, 185, 129, 0.4);
    transform: translateY(-1px);
    opacity: 1;
}

.ghost-pill:active {
    transform: translateY(0);
    box-shadow: none;
}

/* DETALLE FILA */

.user-detail {
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
}

.user-detail__avatar {
    border-radius: 999px;
    overflow: hidden;
    box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.7);
}

.user-detail__permissions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}

.user-detail__perm-tag {
    text-transform: none;
}

.user-detail__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    color: #6b7280;
}

.user-detail__helper {
    font-size: 0.75rem;
    color: #9ca3af;
    margin-bottom: 0.4rem;
}

/* FILAS INACTIVAS */

.user-row--inactive {
    background-color: #fff5f5;
    opacity: 0.95;
}

/* SELECCIÓN / HOVER DE TABLA */

:deep(.b-table .table tbody tr) {
    transition:
        background-color 130ms ease,
        box-shadow 130ms ease,
        transform 130ms ease,
        border-color 130ms ease;
}

:deep(.b-table .table tbody tr:hover:not(.is-selected)) {
    background-color: rgba(121, 87, 213, 0.04);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
}

:deep(.b-table .table tbody tr.is-selected) {
    background: rgba(121, 87, 213, 0.12);
    box-shadow:
        inset 2px 0 0 #7957d5,
        0 0 0 1px rgba(121, 87, 213, 0.08);
    transform: translateY(-0.5px);
}

:deep(.b-table .table tbody tr.is-selected td) {
    border-color: rgba(121, 87, 213, 0.2) !important;
}

/* RESPONSIVE */

@media (max-width: 1024px) {
    .selected-user-banner {
        grid-template-columns: minmax(0, 1.8fr) minmax(0, 1.4fr);
        grid-template-rows: auto auto;
    }

    .selected-user-banner__right {
        justify-content: flex-start;
        flex-wrap: wrap;
    }

    .selected-user-banner__center {
        text-align: left;
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
}

/* ANIMACIONES KEYFRAMES */

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
</style>
