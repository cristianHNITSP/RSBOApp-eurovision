<template>
  <div class="avatar-picker has-text-centered">
    <figure
      class="image is-128x128 is-inline-block mb-3 avatar-frame"
      :class="{ 'is-disabled': !editMode }"
      @click="editMode && openModal()"
    >
      <img :src="currentValue" alt="Avatar" class="is-rounded" />
    </figure>

    <b-modal
      v-model="isModalActive"
      :width="640"
      :can-cancel="['escape', 'outside']"
      @close="closeModal"
    >
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Selecciona un avatar</p>
          <button class="delete" aria-label="close" @click="closeModal"></button>
        </header>
        <section class="modal-card-body">
          <b-tabs v-model="activeTab" animated>
            <b-tab-item
              v-for="(category, name) in avatarCategories"
              :key="name"
              :label="name"
            >
              <div class="columns is-multiline is-mobile avatar-grid">
                <div
                  class="column is-3"
                  v-for="(img, index) in category"
                  :key="index"
                >
                  <figure
                    class="image is-64x64 avatar-option-container"
                    @click="selectAvatar(img)"
                  >
                    <img
                      :src="img"
                      class="avatar-option"
                      :class="{ 'is-selected': img === selectedAvatar }"
                    />
                    <div
                      v-if="img === selectedAvatar"
                      class="avatar-selected-overlay"
                    >
                      <span class="icon has-text-white">
                        <i class="fas fa-check"></i>
                      </span>
                    </div>
                  </figure>
                </div>
              </div>
            </b-tab-item>
          </b-tabs>
        </section>
        <footer class="modal-card-foot">
          <b-button @click="closeModal">Cerrar</b-button>
          <b-button type="is-primary" @click="confirmSelection">
            Seleccionar
          </b-button>
        </footer>
      </div>
    </b-modal>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { avatarCategories } from '../services/myUserCRUD' // ajusta ruta si es necesario

const props = defineProps({
  modelValue: { type: String, default: '' },
  editMode: { type: Boolean, default: false },
  placeholder: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const isModalActive = ref(false)
const activeTab = ref(0)
const selectedAvatar = ref('')

const currentValue = computed(() => props.modelValue || props.placeholder)

watch(
  () => props.modelValue,
  (val) => {
    selectedAvatar.value = val || props.placeholder
  },
  { immediate: true }
)

function openModal() {
  selectedAvatar.value = currentValue.value
  isModalActive.value = true
}

function closeModal() {
  isModalActive.value = false
}

function selectAvatar(img) {
  selectedAvatar.value = img
}

function confirmSelection() {
  emit('update:modelValue', selectedAvatar.value)
  isModalActive.value = false
}
</script>

<style scoped>
.avatar-frame img {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.avatar-frame img:hover {
  transform: scale(1.03);
}

.avatar-option-container {
  cursor: pointer;
  transition: transform 0.2s ease;
  position: relative;
}

.avatar-option-container:hover {
  transform: scale(1.05);
}

.avatar-option {
  border-radius: 50%;
  width: 64px;
  height: 64px;
  transition: transform 0.2s;
}

.avatar-option:hover {
  transform: scale(1.05);
}

.avatar-option.is-selected {
  border: 2px solid #3273dc;
}

.avatar-selected-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(50, 115, 220, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.is-disabled {
  pointer-events: none;
  opacity: 0.5;
}
</style>
