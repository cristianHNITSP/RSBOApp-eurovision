// rsbo-app/src/views/gestion/composables/useUsuariosLogic.js
import { computed, getCurrentInstance, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { usersService } from "../../../services/usersService.js";
import { labToast } from "@/composables/shared/useLabToast";
import { formatRoleLabel, roleTagType } from "@/utils/roleHelpers.js";

export function canEditAvatar(u) {
  return !!(u && !u.isMe && !u.deletedAt);
}

export function formatDateTime(value) {
  if (!value) return "Nunca ha iniciado sesión";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function rowClass(row) {
  if (row.deletedAt) return "user-row--inactive";
  return !row.isActive ? "user-row--inactive" : undefined;
}

export function useUsuariosLogic() {
  const roles = ref([]);
  const usersRaw = ref([]);
  const me = ref(null);

  const total = ref(0);
  const stats = ref({ totalUsers: 0, activeUsers: 0, trashUsers: 0 });
  const permissionsCatalog = ref(null);

  const loading = ref(false);
  const saving = ref(false);
  const deleting = ref(false);

  const _instance = getCurrentInstance();
  const $buefy = _instance?.appContext?.config?.globalProperties?.$buefy;

  const isMobile = ref(false);
  const updateIsMobile = () => { isMobile.value = window.innerWidth <= 768; };

  onMounted(() => {
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', updateIsMobile);
  });

  const searchQuery = ref("");
  const roleFilter = ref("all");
  const statusFilter = ref("all");

  const perPage = ref(10);
  const currentPage = ref(1);

  const sortBy = ref("name");
  const sortDir = ref("asc");

  const selectedUser = ref(null);
  const bannerRef = ref(null);

  /* Modales */
  const editOpen = ref(false);
  const passOpen = ref(false);
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

  function selectRow(row) {
    selectedUser.value = row;
    if (bannerRef.value) {
      bannerRef.value.triggerFocus(true);
    }
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
    const q = searchQuery.value?.trim() || "";
    // Solo buscamos si está vacío (reset) o si tiene 3 o más caracteres
    if (q.length > 0 && q.length < 3) return;

    currentPage.value = 1;
    loadUsers();
  }, 450); // Aumentamos un poco el debounce para mayor fluidez
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
    if (!data.name || !data.username || !data.role) return toast("Nombre, usuario y rol son obligatorios", "is-warning");
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
          if (res?.alreadyDeleted) {
            toast("El usuario ya estaba en papelera", "is-info", 2000);
          } else {
            toast("Usuario enviado a papelera", "is-warning", 2500);
          }
        } catch (e) {
          try {
            await loadUsers();
            const stillExists = (usersRaw.value || []).some(x => String(x._id) === String(u._id));
            const nowDeleted = (usersRaw.value || []).some(
              x => String(x._id) === String(u._id) && !!x.deletedAt
            );
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
          try { await loadUsers(); } catch { }
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

  async function init() {
    await loadRolesAndMe();
    await loadUsers();
  }

  return {
    // Estado
    roles, usersRaw, me, total, stats, permissionsCatalog,
    loading, saving, deleting,
    isMobile,

    // Filtros / paginación / orden
    searchQuery, roleFilter, statusFilter,
    perPage, currentPage, sortBy, sortDir,

    // Selección y modales
    selectedUser, bannerRef,
    editOpen, passOpen, createOpen,
    editUser, passUser,

    // Computed
    users,

    // Constante
    FALLBACK_AVATAR,

    // Formato
    formatDateTime, formatDate, rowClass,
    formatRoleLabel, roleTagType,

    // Acciones
    selectRow, canEditAvatar, onAvatarPicked,
    loadUsers,
    openEdit, saveEdit,
    openPassword, savePassword,
    openCreate, createUser,
    confirmSoftDelete, confirmRestore,

    // Paginación / orden
    onPageChange, onSort,

    // Toast
    toast,

    // Init
    init,
  };
}
