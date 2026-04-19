<template>
  <teleport :to="teleportTarget">
    <transition name="dirty-float-slide">
      <div v-if="showDirtyFloat" class="dirty-float-root" :class="{ 'is-fullscreen': isFullscreenActive }" role="status" aria-live="polite">
        <div class="dirty-float">
          <div class="dirty-float__content">
            <div class="dirty-float__left">
              <span class="dirty-float__icon" aria-hidden="true">
                <b-icon icon="exclamation-triangle" size="is-small" />
              </span>

              <div class="dirty-float__texts">
                <div class="dirty-float__title">Cambios sin guardar</div>
                <div class="dirty-float__subtitle">
                  Guarda para no perder edición.
                  <span v-if="!isMobile" class="dirty-float__hint">Atajo: <b>Ctrl + S</b></span>
                </div>
              </div>
            </div>

            <div class="dirty-float__actions">
              <b-button
                size="is-small"
                type="is-primary"
                icon-left="save"
                :disabled="saving || opPending"
                @click="emit('save')"
              >
                <span v-if="saving || opPending">Guardando…</span>
                <span v-else>Guardar</span>
              </b-button>

              <b-button
                size="is-small"
                type="is-light"
                icon-left="undo"
                :disabled="saving || opPending"
                @click="emit('discard')"
              >
                Descartar
              </b-button>

              <b-button
                size="is-small"
                type="is-light"
                icon-left="times"
                :disabled="saving || opPending"
                @click="dismissed = true"
              >
                Ocultar
              </b-button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, onBeforeUnmount } from 'vue'
import { useLabToast } from '@/composables/shared/useLabToast.js'

// ── Lógica de Pantalla Completa para Teleport ──
const isFullscreenActive = ref(!!document.fullscreenElement);
const teleportTarget = computed(() => {
  if (isFullscreenActive.value && document.fullscreenElement) {
    return document.fullscreenElement;
  }
  return "body";
});

const updateFullscreenStatus = () => {
  isFullscreenActive.value = !!document.fullscreenElement;
};

onMounted(() => {
  document.addEventListener("fullscreenchange", updateFullscreenStatus);
});

onUnmounted(() => {
  document.removeEventListener("fullscreenchange", updateFullscreenStatus);
});

const props = defineProps({
  dirty:     { type: Boolean, default: false },
  saving:    { type: Boolean, default: false },
  opPending: { type: Boolean, default: false },
  /** Increment this whenever a new change arrives while still dirty to re-show a dismissed float */
  changeKey: { type: Number, default: 0 },
})

const emit = defineEmits(['save', 'discard'])

const { isDirtyFloatVisible } = useLabToast()

const dismissed = ref(false)
const showDirtyFloat = computed(() => props.dirty && !props.saving && !dismissed.value)

watch(showDirtyFloat, (val) => {
  isDirtyFloatVisible.value = val
}, { immediate: true })

onBeforeUnmount(() => {
  isDirtyFloatVisible.value = false
})

// Re-show when a new change arrives even if user hid it
watch(() => props.changeKey, () => {
  if (props.dirty && !props.saving) dismissed.value = false
})

// Reset when dirty clears (after save/discard)
watch(() => props.dirty, (isDirty) => {
  if (!isDirty) dismissed.value = false
})

const isMobile =
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')
</script>

<style scoped>
.dirty-float-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.dirty-float {
  position: absolute;
  right: 14px;
  bottom: 14px;
  max-width: min(720px, calc(100vw - 28px));
  pointer-events: auto;
}

.dirty-float__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0.65rem;
  border-radius: 0.9rem;
  border: 1px solid rgba(245, 158, 11, 0.35);
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.16), rgba(124, 58, 237, 0.10));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: var(--shadow-md);
}

.dirty-float__left {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.dirty-float__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.18);
  border: 1px solid rgba(245, 158, 11, 0.25);
  flex: 0 0 auto;
}

.dirty-float__texts { min-width: 0; }

.dirty-float__title {
  font-weight: 900;
  letter-spacing: 0.01em;
  line-height: 1.1;
  color: var(--text-primary);
}

.dirty-float__subtitle {
  font-size: 0.78rem;
  line-height: 1.25;
  color: var(--text-secondary);
  word-break: break-word;
}

.dirty-float__hint {
  margin-left: 0.35rem;
  opacity: 0.9;
}

.dirty-float__actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex: 0 0 auto;
}

/* Transition */
.dirty-float-slide-enter-active,
.dirty-float-slide-leave-active { transition: transform 160ms ease, opacity 160ms ease; }
.dirty-float-slide-enter-from,
.dirty-float-slide-leave-to { opacity: 0; transform: translate3d(0, 8px, 0); }

@media (prefers-reduced-motion: reduce) {
  .dirty-float-slide-enter-active,
  .dirty-float-slide-leave-active { transition: none !important; }
}

/* Mobile */
@media screen and (max-width: 768px) {
  .dirty-float {
    left: 10px;
    right: 10px;
    bottom: 10px;
    max-width: none;
  }

  .dirty-float__content {
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .dirty-float__actions {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
}
</style>
