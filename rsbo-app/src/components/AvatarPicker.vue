<template>
  <div class="avatar-picker" :style="pickerVars">
    <!-- Avatar actual (click para editar) -->
    <button
      type="button"
      class="avatar-trigger"
      :class="{ 'is-disabled': !editMode }"
      :disabled="!editMode"
      @click.stop="openModal"
      :title="editMode ? 'Cambiar avatar' : 'Solo lectura'"
    >
      <span class="avatar-ring">
        <img :src="currentSrc" alt="Avatar" class="avatar-img" />
        <span v-if="showCameraOverlay && editMode" class="avatar-overlay">
          <b-icon pack="mdi" icon="camera-outline" size="is-small" />
        </span>
      </span>
    </button>

    <teleport to="body">
      <b-modal
        v-model="isModalActive"
        :width="760"
        :can-cancel="['escape', 'outside']"
        @close="closeModal"
        class="avatar-modal"
        trap-focus
      >
        <div class="modal-card avatar-modal-card" role="dialog" aria-modal="true">
          <header class="modal-card-head avatar-modal-head">
            <div class="head-left">
              <p class="modal-card-title">Selecciona un avatar</p>
              <p class="subtitle">Elige uno y presiona “Seleccionar”.</p>
            </div>

            <!-- ✅ FIX: siempre al extremo derecho -->
            <button
              class="delete avatar-close"
              aria-label="close"
              type="button"
              @click="closeModal"
            ></button>
          </header>

          <section class="modal-card-body avatar-modal-body">
            <DynamicTabs v-model="activeTab" :tabs="avatarTabs">
              <template
                v-for="(category, name) in avatarCategoriesSafe"
                :key="name"
                v-slot:[name]
              >
                <div class="avatar-grid" role="list">
                  <button
                    v-for="(img, index) in category"
                    :key="name + '-' + index"
                    type="button"
                    class="avatar-option"
                    :class="{ 'is-selected': img === selectedAvatar }"
                    @click="selectAvatar(img)"
                    role="listitem"
                    :aria-pressed="img === selectedAvatar"
                    :title="img === selectedAvatar ? 'Seleccionado' : 'Seleccionar'"
                  >
                    <img :src="img" alt="Avatar option" />
                    <span class="badge" v-if="img === selectedAvatar">
                      <i class="fas fa-check"></i>
                    </span>
                  </button>
                </div>
              </template>
            </DynamicTabs>
          </section>

          <footer class="modal-card-foot avatar-modal-foot">
            <div class="preview">
              <span class="preview-label">Vista previa</span>
              <span class="preview-ring">
                <img :src="selectedAvatar || currentSrc" alt="preview" />
              </span>
            </div>

            <div class="actions">
              <b-button @click="closeModal" type="is-light">Cerrar</b-button>
              <b-button type="is-primary" @click="confirmSelection" :disabled="!selectedAvatar">
                Seleccionar
              </b-button>
            </div>
          </footer>
        </div>
      </b-modal>
    </teleport>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import { avatarCategories } from "@/services/myUserCRUD";
import DynamicTabs from "@/components/DynamicTabs.vue";

const props = defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "" },
  editMode: { type: Boolean, default: false },
  size: { type: Number, default: 84 },
  showCameraOverlay: { type: Boolean, default: true },
});

const emit = defineEmits(["update:modelValue"]);

const isModalActive = ref(false);
const activeTab = ref("");
const selectedAvatar = ref("");

const currentSrc = computed(() => props.modelValue || props.placeholder || "");

const avatarCategoriesSafe = computed(() => {
  if (!avatarCategories || typeof avatarCategories !== "object") return {};
  return avatarCategories;
});

const avatarTabs = computed(() =>
  Object.keys(avatarCategoriesSafe.value).map((name) => ({ key: name, label: name }))
);

const pickerVars = computed(() => {
  const s = Math.max(28, Number(props.size) || 84);
  const pad = Math.max(2, Math.round(s * 0.04));
  return { "--av-size": `${s}px`, "--av-pad": `${pad}px` };
});

watch(
  () => props.modelValue,
  (val) => {
    selectedAvatar.value = val || "";
  },
  { immediate: true }
);

function openModal() {
  if (!props.editMode) return;

  selectedAvatar.value = props.modelValue || "";
  const entries = Object.entries(avatarCategoriesSafe.value || {});
  const current = selectedAvatar.value;
  const idx = entries.findIndex(([, list]) => Array.isArray(list) && list.includes(current));
  activeTab.value = idx >= 0 ? entries[idx][0] : (entries[0]?.[0] ?? "");

  isModalActive.value = true;
}

function closeModal() {
  isModalActive.value = false;
}

function selectAvatar(img) {
  selectedAvatar.value = img;
}

function confirmSelection() {
  if (!selectedAvatar.value) return;
  emit("update:modelValue", selectedAvatar.value);
  isModalActive.value = false;
}
</script>

<style scoped>
/* ===== Trigger ===== */
.avatar-trigger {
  display: inline-flex;
  align-items: center;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  user-select: none;
  transition: transform 160ms ease, opacity 160ms ease, filter 160ms ease;
}
.avatar-trigger:active {
  transform: translateY(1px);
}
.avatar-trigger.is-disabled {
  cursor: not-allowed;
  opacity: 0.55;
  filter: grayscale(0.2);
}

.avatar-ring {
  width: var(--av-size);
  height: var(--av-size);
  border-radius: 999px;
  padding: var(--av-pad);
  background: linear-gradient(135deg, #7957d5, #9a6dff, #f97316, #ec4899);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.18);
  transition: box-shadow 180ms ease, transform 180ms ease;
  position: relative;
  overflow: hidden;
}
.avatar-trigger:not(.is-disabled):hover .avatar-ring {
  transform: scale(1.03);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 999px;
  object-fit: cover;
  background: var(--surface-solid);
  display: block;
  box-shadow: 0 0 0 2px var(--surface-solid) inset;
}

/* overlay cámara */
.avatar-overlay {
  position: absolute;
  inset: var(--av-pad);
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.34);
  color: var(--text-on-primary);
  opacity: 0;
  transition: opacity 130ms ease;
}
.avatar-trigger:not(.is-disabled):hover .avatar-overlay {
  opacity: 1;
}

/* ===== Modal ===== */
.avatar-modal :deep(.modal-background) {
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(3px);
}

/* tarjeta */
.avatar-modal-card {
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.35);
  animation: pop-in 160ms ease-out;
  background: var(--surface-solid);
}

@keyframes pop-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ✅ header sólido + layout correcto */
.avatar-modal :deep(.modal-card-head),
.avatar-modal-head {
  background: var(--surface-solid) !important;
  border-bottom: 1px solid rgba(148, 163, 184, 0.35);
  position: relative;
  z-index: 2;

  /* ✅ asegura que el texto ocupe y el botón no se meta */
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 12px;

  /* ✅ espacio reservado para el botón absoluto */
  padding-right: 56px;
}

/* gradiente suave */
.avatar-modal-head::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    120deg,
    rgba(121, 87, 213, 0.1),
    rgba(249, 115, 22, 0.06),
    rgba(236, 72, 153, 0.06)
  );
  pointer-events: none;
  z-index: -1;
}

.head-left {
  flex: 1;
  min-width: 0;
}

.head-left .modal-card-title {
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}
.head-left .subtitle {
  margin-top: 0.15rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* ✅ boton cerrar literalmente al final arriba-derecha */
.avatar-close {
  position: absolute !important;
  top: 14px;
  right: 14px;
  margin: 0 !important;
}

/* fondos sólidos en secciones */
.avatar-modal :deep(.modal-card),
.avatar-modal :deep(.modal-card-body),
.avatar-modal :deep(.modal-card-foot) {
  background-color: var(--surface-solid);
}


/* ===== Grid ===== */
.avatar-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  padding: 8px 6px 2px;
}
@media (max-width: 820px) {
  .avatar-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 560px) {
  .avatar-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.avatar-option {
  position: relative;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  border-radius: 999px;
  width: 74px;
  height: 74px;
  margin: 0 auto;
  transition: transform 140ms ease, filter 140ms ease;
}
.avatar-option img {
  width: 74px;
  height: 74px;
  border-radius: 999px;
  object-fit: cover;
  display: block;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  outline: 2px solid transparent;
  transition: outline-color 140ms ease, box-shadow 140ms ease;
}
.avatar-option:hover {
  transform: scale(1.05);
}
.avatar-option:hover img {
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.16);
  outline-color: rgba(99, 102, 241, 0.35);
}
.avatar-option.is-selected img {
  outline-color: rgba(109, 40, 217, 0.65);
  box-shadow: 0 18px 36px rgba(109, 40, 217, 0.18);
}

.badge {
  position: absolute;
  right: -6px;
  top: -6px;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: var(--c-primary);
  color: var(--text-on-primary);
  display: grid;
  place-items: center;
  box-shadow: 0 10px 22px var(--c-primary-alpha);
  transform: scale(0.92);
  animation: badge-in 140ms ease-out;
}
@keyframes badge-in {
  from {
    transform: scale(0.6);
    opacity: 0;
  }
  to {
    transform: scale(0.92);
    opacity: 1;
  }
}

/* ===== Footer ===== */
.avatar-modal-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.35);
}
.preview {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.preview-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-muted);
}
.preview-ring {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  padding: 2px;
  background: linear-gradient(135deg, #7957d5, #f97316, #ec4899);
}
.preview-ring img {
  width: 100%;
  height: 100%;
  border-radius: 999px;
  object-fit: cover;
  background: var(--surface-solid);
  display: block;
}
.actions {
  display: inline-flex;
  gap: 10px;
}
</style>
