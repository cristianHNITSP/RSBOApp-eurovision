// src/services/authService.js
import api from "../api/axios";
import router from "../router/index";

/* ============================ API (AUTH) ============================ */

export const login = async ({ username, password }) => {
  try {
    const res = await api.post(
      "/access/login",
      { email: username, password },
      { withCredentials: true } // IMPORTANTE: cookies httpOnly
    );
    return res.data;
  } catch (err) {
    if (err?.response?.data) {
      return Promise.reject(err.response.data);
    }
    if (err?.request) {
      return Promise.reject({ error: "No se pudo conectar al servidor" });
    }
    return Promise.reject({ error: err?.message || "Error desconocido" });
  }
};

/* ============================ UI SERVICE (BUEFY) ============================ */

const parseRetryInToSeconds = (retryIn) => {
  // Soporta: "2m 10s", "2m", "10s", "130" (string), 130 (number)
  if (typeof retryIn === "number" && Number.isFinite(retryIn)) return Math.max(0, Math.floor(retryIn));
  if (typeof retryIn !== "string") return null;

  const raw = retryIn.trim();

  // "130" -> seconds
  if (/^\d+$/.test(raw)) return Math.max(0, parseInt(raw, 10));

  // "2m 10s" / "2m" / "10s"
  const m = raw.match(/(\d+)\s*m/i);
  const s = raw.match(/(\d+)\s*s/i);
  const minutes = m ? parseInt(m[1], 10) : 0;
  const seconds = s ? parseInt(s[1], 10) : 0;

  const total = minutes * 60 + seconds;
  return Number.isFinite(total) ? Math.max(0, total) : null;
};

const fmtMMSS = (totalSeconds) => {
  const t = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}m ${s}s`;
};

export const useAuthService = ($buefy) => {
  let activeToast = null;
  let toastInterval = null;

  const clearActiveToast = () => {
    if (toastInterval) {
      clearInterval(toastInterval);
      toastInterval = null;
    }
    if (activeToast) {
      activeToast.close();
      activeToast = null;
    }
  };

  const purgeCredentials = (credentials) => {
    // evita dejar strings sensibles en memoria
    credentials.username = "";
    credentials.password = "";
  };

  const handleLogin = async (credentials, showLoginPanel) => {
    clearActiveToast();

    // Validación de campos vacíos
    if (!credentials?.username || !credentials?.password) {
      activeToast = $buefy.toast.open({
        message: "Por favor ingresa tus credenciales",
        type: "is-danger",
        duration: 3000,
      });
      return;
    }

    try {
      const data = await login({
        username: credentials.username,
        password: credentials.password,
      });

      activeToast = $buefy.toast.open({
        message: `Bienvenido ${data?.name ?? ""}!`,
        type: "is-success",
        duration: 3000,
      });

      // Cierra panel y purga credenciales
      if (showLoginPanel && typeof showLoginPanel === "object") {
        showLoginPanel.value = false;
      }
      purgeCredentials(credentials);

      // Redirige a la página home
      router.push({ name: "home" });
    } catch (err) {
      // Bloqueo por rate limiter
      if (err?.retryIn) {
        let remainingSeconds = parseRetryInToSeconds(err.retryIn);

        // fallback si viene raro
        if (remainingSeconds === null) remainingSeconds = 60;

        activeToast = $buefy.toast.open({
          message: `Demasiados intentos. Intenta de nuevo en ${fmtMMSS(remainingSeconds)}.`,
          type: "is-warning",
          duration: 0, // persistente
        });

        toastInterval = setInterval(() => {
          remainingSeconds -= 1;

          if (remainingSeconds <= 0) {
            clearActiveToast();
            return;
          }

          if (activeToast) {
            activeToast.update({
              message: `Demasiados intentos. Intenta de nuevo en ${fmtMMSS(remainingSeconds)}.`,
            });
          }
        }, 1000);
      } else {
        activeToast = $buefy.toast.open({
          message: err?.error || "Error al iniciar sesión",
          type: "is-danger",
          duration: 3000,
        });
      }
    }
  };

  // opcional: por si quieres limpiar intervalos al desmontar componente
  const dispose = () => clearActiveToast();

  return { handleLogin, dispose };
};
