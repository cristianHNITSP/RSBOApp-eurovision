<template>
  <Teleport to="body">
  <b-modal
    v-model="scan.scanOpen.value"
    has-modal-card
    trap-focus
    :destroy-on-hide="true"
    :can-cancel="['escape', 'outside']"
    aria-role="dialog"
    aria-modal
    @close="stopCamera"
  >
    <div class="modal-card scan-card">
      <header class="modal-card-head scan-card__head">
        <b-icon :icon="isStock ? 'box' : 'crosshairs'" pack="fas" type="is-primary" class="mr-2" />
        <p class="modal-card-title">{{ isStock ? 'Escanear para agregar stock' : 'Ubicar producto' }}</p>
        <button class="delete" aria-label="close" @click="close" />
      </header>

      <section class="modal-card-body scan-card__body">
        <!-- Cámara activa -->
        <div v-show="phase === 'scanning'" class="scan-video-wrap">
          <video ref="video" class="scan-video" muted playsinline autoplay />
          <div class="scan-frame" aria-hidden="true" />
          <p class="help has-text-centered mt-2">Apunta la cámara al código QR</p>
        </div>

        <!-- Inicio / reintento (gesto de usuario: requisito de iOS/Safari) -->
        <div v-if="phase === 'idle'" class="has-text-centered py-4">
          <b-icon icon="camera" pack="fas" size="is-large" type="is-primary" />
          <p class="mt-2 mb-3">Activa la cámara para escanear el código QR.</p>
          <b-button type="is-primary" icon-left="camera" @click="startCamera">Activar cámara</b-button>
        </div>

        <!-- Cámara no disponible / error -->
        <div v-else-if="phase === 'error'" class="notification is-warning is-light py-3">
          <p class="mb-2"><b-icon icon="video-slash" pack="fas" size="is-small" />&nbsp; {{ cameraMsg }}</p>

          <!-- Guía breve para habilitar el permiso, según el dispositivo -->
          <div class="scan-perm-hint">
            <p class="is-size-7 has-text-weight-semibold mb-1">
              <b-icon icon="circle-info" pack="fas" size="is-small" />&nbsp; Asegúrate de tener activado el permiso de cámara:
            </p>
            <p class="is-size-7">{{ permissionHint }}</p>
          </div>

          <b-button v-if="canRetry" size="is-small" type="is-warning" icon-left="rotate-right" class="mt-2" @click="startCamera">
            Reintentar cámara
          </b-button>
        </div>

        <!-- Fallback manual (siempre disponible) -->
        <div class="columns is-mobile is-vcentered mt-3 mb-0">
          <div class="column">
            <b-field class="mb-0">
              <b-input
                v-model="manualCode"
                placeholder="…o escribe/pega el código QR"
                icon-pack="fas"
                icon="keyboard"
                expanded
                @keyup.enter="submitManual"
              />
            </b-field>
          </div>
          <div class="column is-narrow">
            <b-button
              type="is-primary"
              icon-left="check"
              :loading="scan.resolving.value"
              :disabled="!manualCode.trim()"
              @click="submitManual"
            >
              Resolver
            </b-button>
          </div>
        </div>
      </section>
    </div>
  </b-modal>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import { useQrScan } from "@/composables/scan/useQrScan";

const scan = useQrScan();
const isStock = computed(() => scan.action.value === "stock");

// Guía de permiso de cámara según el dispositivo/navegador.
const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(ua);
const permissionHint = computed(() => {
  if (isIOS) return "iPhone/iPad: Ajustes ▸ Safari ▸ Cámara ▸ «Permitir», o toca «aA» en la barra de direcciones ▸ Ajustes del sitio web ▸ Cámara. Luego recarga.";
  if (isAndroid) return "Android: toca el candado o «ⓘ» junto a la dirección ▸ Permisos ▸ Cámara ▸ «Permitir», y recarga la página.";
  return "En el navegador: haz clic en el icono de cámara o el candado de la barra de direcciones y permite el acceso a la cámara; luego recarga.";
});

const video = ref(null);
const manualCode = ref("");
const phase = ref("idle"); // 'idle' | 'scanning' | 'error'
const cameraMsg = ref("");
const canRetry = ref(false);
let qrScanner = null;

// La cámara solo está disponible en contexto seguro (HTTPS o localhost).
function cameraSupported() {
  return !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

async function startCamera() {
  if (!cameraSupported()) {
    return fail(
      window.isSecureContext
        ? "Este dispositivo/navegador no expone la cámara. Ingresa el código manualmente."
        : "La cámara requiere una conexión segura (HTTPS). Abre la app por HTTPS o ingresa el código manualmente.",
      false
    );
  }
  try {
    const { default: QrScanner } = await import("qr-scanner");
    if (!(await QrScanner.hasCamera())) {
      return fail("No se detectó ninguna cámara. Ingresa el código manualmente.", false);
    }
    phase.value = "scanning";
    await nextTick();
    qrScanner = new QrScanner(video.value, (res) => onDetected(res?.data ?? res), {
      preferredCamera: "environment",
      highlightScanRegion: true,
      highlightCodeOutline: true,
      maxScansPerSecond: 5,
    });
    await qrScanner.start();
  } catch (e) {
    const denied = e?.name === "NotAllowedError" || e?.name === "SecurityError";
    fail(
      denied
        ? "Permiso de cámara denegado. Actívalo en los ajustes del navegador o ingresa el código manualmente."
        : "No se pudo iniciar la cámara. Ingresa el código manualmente.",
      true
    );
  }
}

function fail(msg, retry) {
  cameraMsg.value = msg;
  canRetry.value = !!retry;
  phase.value = "error";
  stopCamera();
}

function stopCamera() {
  if (qrScanner) {
    qrScanner.stop();
    qrScanner.destroy();
    qrScanner = null;
  }
}

function onDetected(code) {
  if (!code) return;
  stopCamera();
  scan.onScanned(code);
}

function submitManual() {
  const code = manualCode.value.trim();
  if (code) scan.onScanned(code);
}

function close() {
  scan.scanOpen.value = false;
}

// Al abrir: en contexto seguro intentamos auto-arrancar (escritorio/Android);
// si el gesto de usuario es obligatorio (iOS) o falla, queda el botón "Activar cámara".
watch(
  () => scan.scanOpen.value,
  (open) => {
    if (open) {
      manualCode.value = "";
      phase.value = "idle";
      canRetry.value = false;
      if (cameraSupported()) startCamera();
      else fail("La cámara requiere una conexión segura (HTTPS). Abre la app por HTTPS o ingresa el código manualmente.", false);
    } else {
      stopCamera();
    }
  }
);

onBeforeUnmount(stopCamera);
</script>

<style scoped>
.scan-card {
  width: 100%;
  max-width: 440px;
  border-radius: 18px;
  overflow: hidden;
  background: var(--surface);
  box-shadow: var(--shadow-lg);
  animation: scan-liquid-in 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) both;
}

.scan-card__head {
  background: var(--surface-raised);
  border-bottom: 1px solid var(--border);
}

.scan-video-wrap {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  background: var(--bg-subtle);
}

.scan-video {
  width: 100%;
  max-height: 280px;
  object-fit: cover;
  display: block;
}

.scan-frame {
  position: absolute;
  inset: 18%;
  border: 2px solid var(--c-primary);
  border-radius: 14px;
  box-shadow: 0 0 0 4000px var(--static-color-rgba-15-23-42-0-10);
  pointer-events: none;
}

.scan-perm-hint {
  border-top: 1px solid var(--border);
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  line-height: 1.35;
}

@keyframes scan-liquid-in {
  0%   { opacity: 0; transform: scale(0.94); filter: blur(var(--fx-blur, 10px)); }
  60%  { opacity: 1; transform: scale(1.012); filter: blur(0); }
  100% { transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .scan-card { animation: none; }
}
</style>
