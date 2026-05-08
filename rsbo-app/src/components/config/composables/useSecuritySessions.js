import { ref, reactive, computed, watch, onMounted } from 'vue';
import { fetchSessions, revokeSession, revokeOtherSessions } from '@/services/security';
import { labToast } from '@/composables/shared/useLabToast';

export function useSecuritySessions() {
  const sessions       = ref([]);
  const loadingSessions = ref(false);
  const loadingRevoke  = ref(false);
  const revokingId     = ref(null);
  const ipCache        = reactive({});

  const showRevokeOneModal  = ref(false);
  const showRevokeAllModal  = ref(false);
  const pendingRevokeSession = ref(null);

  async function resolveIp(ip) {
    if (!ip || ipCache[ip]) return;

    const isPrivate =
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip.includes('localhost') ||
      /^10\./.test(ip) ||
      /^192\.168\./.test(ip) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);

    if (isPrivate) {
      ipCache[ip] = 'Red local';
      return;
    }

    try {
      const res  = await fetch(`https://freeipapi.com/api/json/${ip}`);
      const data = await res.json();
      if (data.cityName && data.countryName) {
        ipCache[ip] = `${data.cityName}, ${data.countryName}`;
      }
    } catch (err) {
      console.warn(`No se pudo geolocalizar la IP: ${ip}`, err);
    }
  }

  watch(sessions, (newSessions) => {
    newSessions.forEach((s) => {
      if (s.deviceInfo?.ip) resolveIp(s.deviceInfo.ip);
    });
  }, { deep: true });

  async function loadSessions() {
    loadingSessions.value = true;
    try {
      const { data } = await fetchSessions();
      sessions.value = Array.isArray(data) ? data : [];
    } catch {
      labToast.danger('No se pudieron cargar las sesiones.');
    } finally {
      loadingSessions.value = false;
    }
  }

  function confirmRevokeOne(session) {
    pendingRevokeSession.value = session;
    showRevokeOneModal.value = true;
  }

  async function onConfirmRevokeOne() {
    showRevokeOneModal.value = false;
    if (pendingRevokeSession.value) {
      await doRevokeOne(pendingRevokeSession.value.id);
      pendingRevokeSession.value = null;
    }
  }

  async function doRevokeOne(sessionId) {
    revokingId.value = sessionId;
    try {
      await revokeSession(sessionId);
      sessions.value = sessions.value.filter((s) => s.id !== sessionId);
      labToast.success('Sesión cerrada.');
    } catch {
      labToast.danger('No se pudo cerrar la sesión.');
    } finally {
      revokingId.value = null;
    }
  }

  function confirmRevokeAll() {
    showRevokeAllModal.value = true;
  }

  async function onConfirmRevokeAll() {
    showRevokeAllModal.value = false;
    await doRevokeAll();
  }

  async function doRevokeAll() {
    loadingRevoke.value = true;
    try {
      const { data } = await revokeOtherSessions();
      labToast.success(`${data.revoked ?? 'Otras'} sesión(es) cerrada(s).`);
    } catch {
      labToast.danger('No se pudieron cerrar las sesiones.');
    } finally {
      await loadSessions();
      loadingRevoke.value = false;
    }
  }

  const currentDeviceInfo = computed(() => {
    if (typeof window === 'undefined') {
      return { browser: 'Navegador', os: 'Sistema', name: 'Navegador en Sistema' };
    }
    const ua = navigator.userAgent;
    let browser = 'Navegador';
    let os = 'Sistema';

    if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';
    else if (ua.indexOf('Edg') !== -1) browser = 'Edge';
    else if (ua.indexOf('Chrome') !== -1) browser = 'Chrome';
    else if (ua.indexOf('Safari') !== -1) browser = 'Safari';

    if (ua.indexOf('Linux') !== -1) os = 'Linux';
    else if (ua.indexOf('Windows') !== -1) os = 'Windows';
    else if (ua.indexOf('Macintosh') !== -1 || ua.indexOf('Mac OS X') !== -1) os = 'macOS';
    else if (ua.indexOf('Android') !== -1) os = 'Android';
    else if (ua.indexOf('iPhone') !== -1 || ua.indexOf('iPad') !== -1) os = 'iOS';

    return { browser, os, name: `${browser} en ${os}` };
  });

  function getDisplayDevice(session) {
    if (!session) return 'Dispositivo desconocido';
    if (session.isCurrent) return currentDeviceInfo.value.name;
    return session.deviceInfo?.deviceName || 'Dispositivo desconocido';
  }

  function getOsIcon(session) {
    let os = session?.deviceInfo?.os;
    if (session?.isCurrent) os = currentDeviceInfo.value.os;

    if (!os) return 'laptop';
    const s = os.toLowerCase();
    if (s.includes('linux')) return 'server';
    if (s.includes('android')) return 'mobile-alt';
    if (s.includes('iphone') || s.includes('ipad')) return 'mobile-alt';
    return 'laptop';
  }

  function timeAgo(dateStr, future = false) {
    if (!dateStr) return '';
    const diff = future
      ? new Date(dateStr).getTime() - Date.now()
      : Date.now() - new Date(dateStr).getTime();
    const abs   = Math.abs(diff);
    const mins  = Math.floor(abs / 60000);
    const hours = Math.floor(abs / 3600000);
    const days  = Math.floor(abs / 86400000);
    if (mins < 1)  return future ? 'en unos segundos' : 'ahora mismo';
    if (mins < 60) return future ? `en ${mins} min` : `hace ${mins} min`;
    if (hours < 24) return future ? `en ${hours} h` : `hace ${hours} h`;
    if (days === 1) return future ? 'mañana' : 'ayer';
    return future ? `en ${days} días` : `hace ${days} días`;
  }

  onMounted(() => loadSessions());

  return {
    sessions,
    loadingSessions,
    loadingRevoke,
    revokingId,
    ipCache,
    showRevokeOneModal,
    showRevokeAllModal,
    pendingRevokeSession,
    currentDeviceInfo,
    loadSessions,
    confirmRevokeOne,
    onConfirmRevokeOne,
    confirmRevokeAll,
    onConfirmRevokeAll,
    getDisplayDevice,
    getOsIcon,
    timeAgo,
  };
}
