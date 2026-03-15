<template>
  <teleport to="body">
    <div class="lab-notif-root" aria-live="polite" aria-atomic="false">
      <transition-group name="lab-notif-slide" tag="div" class="lab-notif-stack">
        <div
          v-for="n in notifications"
          :key="n.id"
          class="lab-notif"
          :class="`lab-notif--${n.type}`"
          role="status"
        >
          <div class="lab-notif__content">

            <!-- Icono bubble (igual que dirty-float__icon) -->
            <span class="lab-notif__icon" aria-hidden="true">
              <b-icon :icon="iconFor(n.type)" size="is-small" />
            </span>

            <!-- Texto -->
            <div class="lab-notif__texts">
              <div class="lab-notif__title">{{ labelFor(n.type) }}</div>
              <div class="lab-notif__subtitle">{{ n.message }}</div>
            </div>

            <!-- Cerrar -->
            <div class="lab-notif__actions">
              <b-button
                size="is-small"
                type="is-light"
                icon-left="times"
                @click="dismiss(n.id)"
              />
            </div>

          </div>

          <!-- Barra de progreso (tiempo restante) -->
          <div v-if="n.duration > 0" class="lab-notif__bar">
            <div
              class="lab-notif__bar-fill"
              :class="`lab-notif__bar-fill--${n.type}`"
              :style="{ animationDuration: n.duration + 'ms' }"
            />
          </div>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<script setup>
import { useLabToast } from "@/composables/useLabToast.js";

const { notifications, dismiss } = useLabToast();

const iconFor = (type) => ({
  'is-success': 'check-circle',
  'is-danger':  'times-circle',
  'is-warning': 'exclamation-triangle',
  'is-info':    'info-circle',
}[type] ?? 'info-circle');

const labelFor = (type) => ({
  'is-success': 'Listo',
  'is-danger':  'Error',
  'is-warning': 'Atención',
  'is-info':    'Información',
}[type] ?? 'Aviso');
</script>

<style scoped>
/* ===== Root (fixed, misma lógica que dirty-float-root) ===== */
.lab-notif-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
}

.lab-notif-stack {
  position: absolute;
  right: 14px;
  bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: min(480px, calc(100vw - 28px));
  pointer-events: none;
}

/* ===== Tarjeta (1:1 dirty-float__content) ===== */
.lab-notif {
  pointer-events: auto;
  border-radius: 0.9rem;
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

/* Variantes de color — mismo patrón de gradiente que dirty-float */
.lab-notif--is-success {
  border: 1px solid rgba(34, 197, 94, 0.35);
  background: linear-gradient(90deg, var(--c-success-alpha), rgba(124, 58, 237, 0.08));
}
.lab-notif--is-danger {
  border: 1px solid rgba(239, 68, 68, 0.35);
  background: linear-gradient(90deg, var(--c-danger-alpha), rgba(124, 58, 237, 0.08));
}
.lab-notif--is-warning {
  border: 1px solid rgba(245, 158, 11, 0.35);
  background: linear-gradient(90deg, var(--c-warning-alpha), rgba(124, 58, 237, 0.10));
}
.lab-notif--is-info {
  border: 1px solid rgba(59, 130, 246, 0.30);
  background: linear-gradient(90deg, var(--c-info-alpha), rgba(124, 58, 237, 0.08));
}

/* ===== Contenido (mismo layout que dirty-float__content) ===== */
.lab-notif__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0.65rem;
}

/* Icono bubble (1:1 dirty-float__icon) */
.lab-notif__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  flex: 0 0 auto;
}
.lab-notif--is-success .lab-notif__icon {
  background: var(--c-success-alpha);
  border: 1px solid rgba(34, 197, 94, 0.28);
  color: var(--c-success);
}
.lab-notif--is-danger .lab-notif__icon {
  background: var(--c-danger-alpha);
  border: 1px solid rgba(239, 68, 68, 0.28);
  color: var(--c-danger);
}
.lab-notif--is-warning .lab-notif__icon {
  background: var(--c-warning-alpha);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: var(--c-warning);
}
.lab-notif--is-info .lab-notif__icon {
  background: var(--c-info-alpha);
  border: 1px solid rgba(59, 130, 246, 0.24);
  color: var(--c-info);
}

/* Textos (1:1 dirty-float__texts / __title / __subtitle) */
.lab-notif__texts {
  flex: 1;
  min-width: 0;
}
.lab-notif__title {
  font-weight: 900;
  letter-spacing: 0.01em;
  line-height: 1.1;
  color: var(--text-primary);
  font-size: 0.82rem;
}
.lab-notif__subtitle {
  font-size: 0.78rem;
  line-height: 1.25;
  color: var(--text-secondary);
  word-break: break-word;
}

/* Acciones */
.lab-notif__actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

/* Barra de tiempo (auto-dismiss visual) */
.lab-notif__bar {
  height: 2px;
  background: var(--border);
  overflow: hidden;
}
.lab-notif__bar-fill {
  height: 100%;
  width: 100%;
  transform-origin: left;
  animation: lab-notif-shrink linear forwards;
}
.lab-notif__bar-fill--is-success { background: var(--c-success); }
.lab-notif__bar-fill--is-danger  { background: var(--c-danger); }
.lab-notif__bar-fill--is-warning { background: var(--c-warning); }
.lab-notif__bar-fill--is-info    { background: var(--c-info); }

@keyframes lab-notif-shrink {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}

/* ===== Transición (1:1 dirty-float-slide) ===== */
.lab-notif-slide-enter-active,
.lab-notif-slide-leave-active {
  transition: transform 160ms ease, opacity 160ms ease;
}
.lab-notif-slide-enter-from,
.lab-notif-slide-leave-to {
  opacity: 0;
  transform: translate3d(0, 8px, 0);
}

@media (prefers-reduced-motion: reduce) {
  .lab-notif-slide-enter-active,
  .lab-notif-slide-leave-active { transition: none !important; }
  .lab-notif__bar-fill { animation: none !important; }
}

/* Mobile (mismo breakpoint que dirty-float) */
@media screen and (max-width: 768px) {
  .lab-notif-stack {
    left: 10px;
    right: 10px;
    bottom: 10px;
    max-width: none;
  }
  .lab-notif__subtitle { display: none; }
}
</style>