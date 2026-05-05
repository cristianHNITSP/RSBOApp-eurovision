<template>
  <teleport to="body">
    <b-modal
      v-model="localIsOpen"
      has-modal-card
      trap-focus
      :destroy-on-hide="true"
      animation="zoom-in"
      :width="700"
    >
      <div class="modal-card bo-create-modal">
        <header class="modal-card-head bo-modal-head">
          <div class="bo-modal-head__icon accent-green">
            <i class="fas fa-plus-circle"></i>
          </div>
          <div class="bo-modal-head__title">
            <p class="modal-card-title">Nuevo Encargo</p>
            <p class="bo-modal-head__sub">Registro de trabajo especial</p>
          </div>
          <button type="button" class="delete" @click="closeModal"></button>
        </header>

        <section class="modal-card-body bo-modal-body">
          <!-- TABS DE CATEGORÍA -->
          <div class="bo-create-tabs mb-5">
            <button 
              v-for="cat in categories" 
              :key="cat.id"
              @click="activeTab = cat.id"
              :class="{ 'is-active': activeTab === cat.id }"
              class="bo-create-tab-item"
            >
              <i :class="cat.icon" class="mr-2"></i> {{ cat.label }}
            </button>
          </div>

          <form @submit.prevent="handleSubmit" class="bo-create-form">
            <!-- SECCIÓN: CLIENTE -->
            <div class="bo-form-section">
              <h4 class="bo-section-title"><i class="fas fa-user-tag mr-2"></i> Información del Cliente</h4>
              <div class="columns is-multiline">
                <div class="column is-12">
                  <div class="field">
                    <label class="pg-label">Nombre Completo *</label>
                    <input v-model="form.cliente.nombre" type="text" class="pg-input" required placeholder="Ej. Juan Pérez" />
                  </div>
                </div>
                <div class="column is-6">
                  <div class="field">
                    <label class="pg-label">Teléfono</label>
                    <input v-model="form.cliente.telefono" type="tel" class="pg-input" placeholder="000 000 0000" />
                  </div>
                </div>
                <div class="column is-6">
                  <div class="field">
                    <label class="pg-label">Email</label>
                    <input v-model="form.cliente.email" type="email" class="pg-input" placeholder="cliente@correo.com" />
                  </div>
                </div>
              </div>
            </div>

            <!-- SECCIÓN: DETALLES DEL ITEM -->
            <div class="bo-form-section mt-4">
              <h4 class="bo-section-title"><i class="fas fa-box-open mr-2"></i> Detalles del Trabajo</h4>
              
              <div class="columns is-multiline">
                <div class="column is-6">
                  <div class="field">
                    <label class="pg-label">Proveedor / Laboratorio</label>
                    <input v-model="form.proveedor.nombre" type="text" class="pg-input" placeholder="Nombre del proveedor" />
                  </div>
                </div>
                <div class="column is-6">
                  <div class="field">
                    <label class="pg-label">Precio Estimado *</label>
                    <div class="control has-icons-left">
                      <input v-model.number="form.precioEstimado" type="number" step="0.01" class="pg-input" required />
                      <span class="icon is-left"><i class="fas fa-dollar-sign"></i></span>
                    </div>
                  </div>
                </div>

                <!-- DINAMIC FIELDS BY CATEGORY -->
                <template v-if="activeTab === 'BASES_MICAS'">
                  <div class="column is-6">
                    <div class="field">
                      <label class="pg-label">Tipo de Matriz *</label>
                      <div class="pg-select-wrapper">
                        <select v-model="form.item.tipo_matriz" class="pg-select" required>
                          <option value="">Selecciona...</option>
                          <option value="BASE">Base</option>
                          <option value="SPH_CYL">Esférica/Cilíndrica</option>
                          <option value="SPH_ADD">Esférica/Add</option>
                          <option value="BASE_ADD">Base/Add</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div class="column is-6">
                    <div class="field">
                      <label class="pg-label">Marca / Material</label>
                      <input v-model="form.item.marca" type="text" class="pg-input" placeholder="Ej. Poly / CR-39" />
                    </div>
                  </div>
                </template>

                <template v-if="activeTab === 'LENTES_CONTACTO'">
                  <div class="column is-6">
                    <div class="field">
                      <label class="pg-label">Tipo de Lente *</label>
                      <div class="pg-select-wrapper">
                        <select v-model="form.item.tipo" class="pg-select" required>
                          <option value="ESFERICO">Esférico</option>
                          <option value="TORICO">Tórico</option>
                          <option value="MULTIFOCAL">Multifocal</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div class="column is-6">
                    <div class="field">
                      <label class="pg-label">Marca y Cantidad</label>
                      <div class="is-flex" style="gap: 10px">
                        <input v-model="form.item.marca" type="text" class="pg-input" placeholder="Marca" style="flex: 2" />
                        <input v-model.number="form.item.cantidadCajas" type="number" class="pg-input" min="1" style="flex: 1" />
                      </div>
                    </div>
                  </div>
                </template>

                <template v-if="activeTab === 'OPTICA'">
                  <div class="column is-6">
                    <div class="field">
                      <label class="pg-label">Subcategoría *</label>
                      <div class="pg-select-wrapper">
                        <select v-model="form.item.subcategoria" class="pg-select" required>
                          <option value="">Selecciona...</option>
                          <option value="ARMAZON">Armazón</option>
                          <option value="SOLUCION">Solución</option>
                          <option value="ACCESORIO">Accesorio</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div class="column is-6">
                    <div class="field">
                      <label class="pg-label">Marca / Modelo</label>
                      <input v-model="form.item.marca" type="text" class="pg-input" placeholder="Marca y Modelo" />
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <div v-if="error" class="notification is-danger is-light mt-4">
              <i class="fas fa-exclamation-circle mr-2"></i> {{ error }}
            </div>
          </form>
        </section>

        <footer class="modal-card-foot bo-modal-foot">
          <button type="button" class="button is-ghost" @click="closeModal">Cancelar</button>
          <button 
            type="button" 
            class="button bo-btn-confirm" 
            @click="handleSubmit" 
            :class="{ 'is-loading': isSubmitting }"
          >
            <i class="fas fa-check-circle mr-2"></i> Crear Encargo
          </button>
        </footer>
      </div>
    </b-modal>
  </teleport>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  isOpen: { type: Boolean, default: false },
});

const emit = defineEmits(["update:isOpen", "close", "created"]);

const localIsOpen = computed({
  get: () => props.isOpen,
  set: (v) => emit("update:isOpen", v)
});

const categories = [
  { id: "BASES_MICAS", label: "Bases/Micas", icon: "fas fa-glasses" },
  { id: "LENTES_CONTACTO", label: "C. Lenses", icon: "fas fa-eye" },
  { id: "OPTICA", label: "Óptica", icon: "fas fa-store" },
];

const activeTab = ref("BASES_MICAS");
const isSubmitting = ref(false);
const error = ref("");

const form = ref({
  cliente: { nombre: "", telefono: "", email: "" },
  proveedor: { nombre: "" },
  item: {
    tipo_matriz: "",
    marca: "",
    material: "",
    params: { sph: null, cyl: null },
    tipo: "ESFERICO",
    cantidadCajas: 1,
    subcategoria: "",
    modelo: "",
  },
  precioEstimado: null,
});

function closeModal() {
  localIsOpen.value = false;
  emit("close");
}

async function handleSubmit() {
  if (!form.value.cliente.nombre) {
    error.value = "El nombre del cliente es requerido";
    return;
  }
  if (!form.value.precioEstimado || form.value.precioEstimado <= 0) {
    error.value = "Ingresa un precio estimado válido";
    return;
  }

  isSubmitting.value = true;
  error.value = "";

  try {
    await emit("created", {
      category: activeTab.value,
      data: { ...form.value },
    });

    // Reset local
    form.value = {
      cliente: { nombre: "", telefono: "", email: "" },
      proveedor: { nombre: "" },
      item: {
        tipo_matriz: "",
        marca: "",
        material: "",
        params: { sph: null, cyl: null },
        tipo: "ESFERICO",
        cantidadCajas: 1,
        subcategoria: "",
        modelo: "",
      },
      precioEstimado: null,
    };
  } catch (err) {
    error.value = err.message || "Error al crear encargo";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.bo-create-modal {
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.bo-modal-head {
  background: var(--surface-overlay);
  backdrop-filter: blur(20px);
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.bo-modal-head__icon {
  width: 42px;
  height: 42px;
  background: var(--c-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 1.25rem;
}

.bo-modal-head__icon.accent-green {
  background: var(--c-success, #10b981);
}

.bo-modal-head__sub {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.bo-modal-body {
  background: var(--bg-subtle, #f8fafc);
  padding: 1.5rem;
}

/* TABS */
.bo-create-tabs {
  display: flex;
  gap: 0.5rem;
  background: rgba(148, 163, 184, 0.1);
  padding: 0.4rem;
  border-radius: 12px;
}

.bo-create-tab-item {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.6rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.bo-create-tab-item.is-active {
  background: white;
  color: var(--c-primary);
  box-shadow: var(--shadow-sm);
}

/* FORM SECTIONS */
.bo-form-section {
  background: white;
  padding: 1.25rem;
  border-radius: 16px;
  border: 1px solid var(--border);
}

.bo-section-title {
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
}

.pg-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 0.4rem;
}

.pg-input {
  width: 100%;
  background: #fdfdfd;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.pg-input:focus {
  outline: none;
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3px var(--c-primary-alpha);
}

.pg-select-wrapper {
  position: relative;
}

.pg-select {
  width: 100%;
  background: #fdfdfd;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
  appearance: none;
}

.bo-modal-foot {
  justify-content: flex-end;
  background: white;
  padding: 1rem 1.5rem;
  gap: 1rem;
}

.bo-btn-confirm {
  background: var(--c-primary);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 0.5rem 1.5rem;
  font-weight: 700;
}

[data-theme="dark"] .bo-form-section,
[data-theme="dark"] .bo-modal-foot {
  background: #1e293b;
}

[data-theme="dark"] .pg-input,
[data-theme="dark"] .pg-select {
  background: rgba(0,0,0,0.2);
  color: #fff;
}
</style>
