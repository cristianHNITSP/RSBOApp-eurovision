// services/userService.js
import api from "../api/axios";

export const userService = {
  // Obtener roles de usuario
  async getRoles() {
    try {
      const res = await api.get("/users/roles");
      return res.data;
    } catch (error) {
      console.error("Error fetching roles:", error);
      throw error;
    }
  },

  // Actualizar perfil de usuario con validaciones
  async updateProfile(userId, userData) {
    const { name } = userData || {};

    // Validaciones
    if (!validators.isNameValid(name)) {
      return {
        success: false,
        message: "Nombre inválido. Solo letras y espacios, mínimo 2 caracteres.",
      };
    }

    try {
      // ✅ FIX: endpoint real en tu backend
      await api.put(`/users/${userId}`, userData, { withCredentials: true });
      return { success: true };
    } catch (error) {
      console.error("Error updating profile:", error);

      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Error al actualizar el perfil";

      return { success: false, message: msg };
    }
  },

  // Actualizar contraseña con validación
  async updatePassword(userId, password) {
    if (!validators.isPasswordValid(password)) {
      return {
        success: false,
        message:
          "Contraseña inválida. Debe tener mínimo 8 caracteres, incluyendo letras y números.",
      };
    }

    try {
      await api.put(`/users/${userId}/password`, { password }, { withCredentials: true });
      return { success: true };
    } catch (error) {
      console.error("Error updating password:", error);

      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Error al actualizar la contraseña";

      return { success: false, message: msg };
    }
  },
};

// Validadores reutilizables
export const validators = {
  isUsernameValid(username) {
    const regex = /^[a-z0-9_.-]{3,32}$/;
    return regex.test(String(username || "").trim().toLowerCase());
  },

  isNameValid(name) {
    const regex = /^[a-zA-ZÀ-ÿ\s]{2,}$/;
    return regex.test(String(name || "").trim());
  },

  isPasswordValid(password) {
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(String(password || ""));
  },
};

// Utilidades
export const utils = {
  formatDate(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  },

  timeSince(dateStr) {
    if (!dateStr) return "-";
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now - past;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffHours > 0) return `Hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
    if (diffMinutes > 0) return `Hace ${diffMinutes} minuto${diffMinutes > 1 ? "s" : ""}`;
    return "Hace unos segundos";
  },

  generateAvatarCategory(prefix, count) {
    return Array.from({ length: count }, (_, i) => {
      return `https://cdn.jsdelivr.net/gh/alohe/avatars/png/${prefix}_${i + 1}.png`;
    });
  },
};

export const avatarCategories = {
  Vibrent: utils.generateAvatarCategory("vibrent", 12),
  "3D": utils.generateAvatarCategory("3d", 5),
  Bluey: utils.generateAvatarCategory("bluey", 8),
  Memo: utils.generateAvatarCategory("memo", 10),
  Notion: utils.generateAvatarCategory("notion", 8),
  Teams: utils.generateAvatarCategory("teams", 6),
  Toon: utils.generateAvatarCategory("toon", 8),
  Upstream: utils.generateAvatarCategory("upstream", 8),
};
