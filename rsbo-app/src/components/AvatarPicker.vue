<template>
  <div :style="pickerVars">
    <button type="button" class="avatar-trigger" :class="{ 'is-disabled': !editMode }" :disabled="!editMode"
      @click.stop="openModal" :title="editMode ? 'Cambiar avatar' : 'Solo lectura'">
      <span class="avatar-ring">
        <img :src="currentSrc" alt="Avatar" class="avatar-img" />
        <span v-if="showCameraOverlay && editMode" class="avatar-overlay">
          <b-icon pack="mdi" icon="camera-outline" size="is-small" />
        </span>
      </span>
    </button>

    <teleport to="body">
      <b-modal v-model="isModalActive" has-modal-card :can-cancel="['escape', 'outside']" @close="closeModal" trap-focus
        scroll="keep" aria-role="dialog" aria-modal>
        <div class="modal-card" role="dialog" aria-modal="true">
          <header class="modal-card-head">
            <div class="is-flex-grow-1">
              <p class="modal-card-title">Selecciona un avatar</p>
              <p class="help">Elige uno y presiona "Seleccionar".</p>
            </div>
            <button class="delete" aria-label="close" type="button" @click="closeModal"></button>
          </header>

          <section class="modal-card-body avatar-modal-body">
            <DynamicTabs v-model="activeTab" :tabs="avatarTabs">
              <template v-for="(category, name) in avatarCategoriesSafe" :key="name" v-slot:[name]>
                <div class="columns is-mobile is-multiline is-variable is-3 px-2 pt-2" role="list">
                  <div v-for="(img, index) in category" :key="name + '-' + index" class="column is-3-tablet is-4-mobile"
                    role="listitem">
                    <button type="button" class="avatar-option" :class="{ 'is-selected': img === selectedAvatar }"
                      @click="selectAvatar(img)" :aria-pressed="img === selectedAvatar"
                      :title="img === selectedAvatar ? 'Seleccionado' : 'Seleccionar'">
                      <div class="av-media">
                        <b-skeleton v-show="!_imgCache[img]" :width="74" :height="74" animated circle class="av-skel" />
                        <img :src="img" alt="Avatar option" class="av-img" :class="{ 'av-img--loaded': _imgCache[img] }"
                          @load="onImgLoad(img)" />
                      </div>
                      <span class="badge" v-if="img === selectedAvatar">
                        <i class="fas fa-check"></i>
                      </span>
                    </button>
                  </div>
                </div>
              </template>
            </DynamicTabs>
          </section>

          <footer class="modal-card-foot is-flex is-align-items-center is-justify-content-space-between">
            <div class="is-flex is-align-items-center ">
              <span class="preview-ring mr-3">
                <img :src="selectedAvatar || currentSrc" alt="preview" />
              </span>
              <span class="has-text-grey is-size-7 is-hidden-mobile has-text-weight-semibold">Vista previa</span>
            </div>

            <div class="buttons mt-2">
              <b-button @click="closeModal" type="is-light" class="px-4">
                Cancelar
              </b-button>
              <b-button type="is-primary" @click="confirmSelection" :disabled="!selectedAvatar" class="px-5">
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
import { ref, watch, computed, reactive } from "vue";

const _imgCache = reactive({});
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
  (val) => { selectedAvatar.value = val || ""; },
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

function closeModal() { isModalActive.value = false; }
function selectAvatar(img) { selectedAvatar.value = img; }
function onImgLoad(src) { _imgCache[src] = true; }

function confirmSelection() {
  if (!selectedAvatar.value) return;
  emit("update:modelValue", selectedAvatar.value);
  isModalActive.value = false;
}
</script>

<style scoped>
/* ── Trigger ── */
.avatar-trigger {
  display: inline-flex;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  transition: opacity 160ms ease;
}

.avatar-trigger.is-disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

/* ── Anillo gradiente ── */
.avatar-ring {
  width: var(--av-size);
  height: var(--av-size);
  border-radius: 9999px;
  padding: var(--av-pad);
  background: linear-gradient(135deg, #7957d5, #9a6dff, #f97316, #ec4899);
  position: relative;
  overflow: hidden;
  transition: transform 180ms ease;
}

.avatar-trigger:not(.is-disabled):hover .avatar-ring {
  transform: scale(1.03);
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  object-fit: cover;
  display: block;
}

/* ── Overlay cámara ── */
.avatar-overlay {
  position: absolute;
  inset: var(--av-pad);
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.34);
  color: #fff;
  opacity: 0;
  transition: opacity 130ms ease;
}

.avatar-trigger:not(.is-disabled):hover .avatar-overlay {
  opacity: 1;
}

/* ── Modal body altura fija ── */
.avatar-modal-body {
  height: 380px;
  overflow-y: auto;
}

/* ── Opción de avatar ── */
.avatar-option {
  position: relative;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  border-radius: 9999px;
  width: 74px;
  height: 74px;
  margin: 0 auto;
  display: block;
  transition: transform 140ms ease;
}

.avatar-option:hover {
  transform: scale(1.05);
}

.av-media {
  position: relative;
  width: 74px;
  height: 74px;
  border-radius: 9999px;
  overflow: hidden;
}

.av-skel {
  position: absolute !important;
  inset: 0;
  margin: 0 !important;
}

.av-skel :deep(.b-skeleton-item) {
  width: 74px !important;
  height: 74px !important;
  border-radius: 9999px !important;
}

/* Fade-in al cargar la imagen */
.av-img {
  position: absolute;
  inset: 0;
  width: 74px;
  height: 74px;
  border-radius: 9999px;
  object-fit: cover;
  display: block;
  outline: 2px solid transparent;
  transition: outline-color 140ms ease, opacity 240ms ease;
  opacity: 0;
}

.av-img--loaded {
  opacity: 1;
}

.avatar-option:hover .av-img--loaded {
  outline-color: rgba(99, 102, 241, 0.35);
}

.avatar-option.is-selected .av-img--loaded {
  outline-color: var(--c-primary-dark, #7957d5);
}

/* ── Badge selección ── */
.badge {
  position: absolute;
  right: -6px;
  top: -6px;
  width: 26px;
  height: 26px;
  border-radius: 9999px;
  background: var(--c-primary, #7957d5);
  color: #fff;
  display: grid;
  place-items: center;
  animation: badge-in 140ms ease-out both;
}

@keyframes badge-in {
  from {
    transform: scale(0.6);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* ── Preview ring ── */
.preview-ring {
  width: 44px;
  height: 44px;
  border-radius: 9999px;
  padding: 2px;
  background: linear-gradient(135deg, #7957d5, #f97316, #ec4899);
  flex-shrink: 0;
  display: block;
}

.preview-ring img {
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  object-fit: cover;
  display: block;
}
</style>
