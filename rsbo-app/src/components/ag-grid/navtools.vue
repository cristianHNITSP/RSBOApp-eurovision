<template>
  <div class="ribbon">
    <!-- HEADER: META + STATUS -->
    <div class="ribbon-header">
      <div class="ribbon-header__left">
        <div class="sheet-icon">
          <i class="far fa-table"></i>
        </div>

        <div class="sheet-meta">
          <div class="sheet-meta__title">
            <span v-if="tipoHuman" class="badge-tipo">
              <i class="far fa-layer-group mr-1"></i>
              {{ tipoHuman }}
            </span>
            <span class="sheet-name">
              {{ sheetName || "Hoja sin nombre" }}
            </span>
          </div>

          <div class="sheet-meta__line">
            <span v-if="material" class="meta-chip">
              <i class="far fa-gem mr-1"></i>
              {{ material }}
            </span>

            <span v-if="tratamientosLabel" class="meta-chip">
              <i class="far fa-sparkles mr-1"></i>
              {{ tratamientosLabel }}
            </span>

            <span v-if="totalRows != null" class="meta-chip">
              <i class="far fa-database mr-1"></i>
              {{ totalRows }} filas
            </span>
          </div>
        </div>
      </div>

      <div class="ribbon-header__right">
        <span v-if="lastSavedLabel" class="last-saved">
          <i class="far fa-clock mr-1"></i>
          {{ lastSavedLabel }}
        </span>

        <span :class="statusClass">
          <i
            v-if="saving"
            class="fas fa-spinner fa-spin mr-1"
          ></i>
          <i
            v-else-if="dirty"
            class="far fa-exclamation-circle mr-1"
          ></i>
          <i
            v-else
            class="far fa-check-circle mr-1"
          ></i>
          {{ statusText }}
        </span>
      </div>
    </div>

    <!-- TABS -->
    <b-tabs
      v-model="activeTab"
      type="is-toggle"
      size="is-small"
      class="m-0 p-0 ribbon-tabs"
    >
      <!-- ========== TAB: EDICIÓN ========== -->
      <b-tab-item>
        <template #header>
          <span class="tab-label">
            <i class="far fa-pencil mr-1"></i>
            Edición
          </span>
        </template>

        <div class="ribbon-content">
          <div class="ribbon-group">
            <button
              class="ribbon-btn"
              @click="undo"
              :disabled="!canUndo"
            >
              <span class="ribbon-btn__icon">
                <i class="far fa-undo-alt"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Deshacer</span>
                <span class="ribbon-btn__hint">Ctrl+Z</span>
              </span>
            </button>

            <button
              class="ribbon-btn"
              @click="redo"
              :disabled="!canRedo"
            >
              <span class="ribbon-btn__icon">
                <i class="far fa-redo-alt"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Rehacer</span>
                <span class="ribbon-btn__hint">Ctrl+Y</span>
              </span>
            </button>
          </div>

          <div class="ribbon-group">
            <button class="ribbon-btn" @click="copyCell">
              <span class="ribbon-btn__icon">
                <i class="far fa-copy"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Copiar</span>
                <span class="ribbon-btn__hint">Ctrl+C</span>
              </span>
            </button>

            <button class="ribbon-btn" @click="cutCell">
              <span class="ribbon-btn__icon">
                <i class="far fa-cut"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Cortar</span>
                <span class="ribbon-btn__hint">Ctrl+X</span>
              </span>
            </button>

            <button
              v-if="!isMobile"
              class="ribbon-btn"
              @click="pasteCell"
            >
              <span class="ribbon-btn__icon">
                <i class="far fa-paste"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Pegar</span>
                <span class="ribbon-btn__hint">Ctrl+V</span>
              </span>
            </button>
          </div>
        </div>
      </b-tab-item>

      <!-- ========== TAB: ESTRUCTURA ========== -->
      <b-tab-item>
        <template #header>
          <span class="tab-label">
            <i class="far fa-border-none mr-1"></i>
            Estructura
          </span>
        </template>

        <div class="ribbon-content">
          <div class="ribbon-group">
            <button class="ribbon-btn" @click="openAddRowModal">
              <span class="ribbon-btn__icon">
                <i class="far fa-plus-square"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Nueva fila</span>
                <span class="ribbon-btn__hint">SPH / Base</span>
              </span>
            </button>

            <button class="ribbon-btn" @click="openAddColumnModal">
              <span class="ribbon-btn__icon">
                <i class="far fa-plus"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Nueva columna</span>
                <span class="ribbon-btn__hint">ADD / CYL</span>
              </span>
            </button>
          </div>
        </div>
      </b-tab-item>

      <!-- ========== TAB: DATOS / HOJA ========== -->
      <b-tab-item>
        <template #header>
          <span class="tab-label">
            <i class="far fa-database mr-1"></i>
            Datos
          </span>
        </template>

        <div class="ribbon-content">
          <!-- Grupo filtros / orden -->
          <div class="ribbon-group">
            <button class="ribbon-btn" @click="emit('clear-filters')">
              <span class="ribbon-btn__icon">
                <i class="far fa-filter"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Limpiar filtros</span>
                <span class="ribbon-btn__hint">Borrar criterios</span>
              </span>
            </button>

            <button class="ribbon-btn" @click="emit('reset-sort')">
              <span class="ribbon-btn__icon">
                <i class="far fa-sort-amount-down-alt"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Restablecer orden</span>
                <span class="ribbon-btn__hint">Orden natural</span>
              </span>
            </button>

            <button class="ribbon-btn" @click="emit('toggle-filters')">
              <span class="ribbon-btn__icon">
                <i class="far fa-eye"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Mostrar filtros</span>
                <span class="ribbon-btn__hint">Cabecera</span>
              </span>
            </button>
          </div>

          <!-- Grupo persistencia -->
          <div class="ribbon-group">
            <button
              class="ribbon-btn"
              :disabled="!dirty || saving"
              @click="handleSave"
            >
              <span class="ribbon-btn__icon">
                <i class="far fa-save"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">
                  <span v-if="saving">Guardando…</span>
                  <span v-else>Guardar cambios</span>
                </span>
                <span class="ribbon-btn__hint">Ctrl+S</span>
              </span>
            </button>

            <button
              class="ribbon-btn"
              :disabled="!dirty || saving"
              @click="handleDiscard"
            >
              <span class="ribbon-btn__icon">
                <i class="far fa-undo"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Descartar cambios</span>
                <span class="ribbon-btn__hint">Recargar hoja</span>
              </span>
            </button>

            <button
              class="ribbon-btn"
              :disabled="saving"
              @click="handleRefresh"
            >
              <span class="ribbon-btn__icon">
                <i class="far fa-sync-alt"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Recargar datos</span>
                <span class="ribbon-btn__hint">Desde servidor</span>
              </span>
            </button>
          </div>

          <!-- Grupo extra -->
          <div class="ribbon-group">
            <button class="ribbon-btn" @click="emit('export')">
              <span class="ribbon-btn__icon">
                <i class="far fa-file-export"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Exportar</span>
                <span class="ribbon-btn__hint">CSV / Excel</span>
              </span>
            </button>

            <button
              class="ribbon-btn"
              :disabled="saving"
              @click="handleSeed"
            >
              <span class="ribbon-btn__icon">
                <i class="far fa-seedling"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Regenerar matriz</span>
                <span class="ribbon-btn__hint">Seed por defecto</span>
              </span>
            </button>
          </div>
        </div>
      </b-tab-item>
    </b-tabs>

    <!-- Barra de fórmulas -->
    <div class="formula-bar">
      <label class="label">fx</label>
      <div class="formula-bar__input-wrapper">
        <b-input
          v-model="localValue"
          type="text"
          inputmode="numeric"
          placeholder="Selecciona una celda"
          size="is-small"
          @keyup.enter="applyChange"
          @blur="applyChange"
        />
        <button
          class="formula-apply-btn"
          type="button"
          @click="applyChange"
        >
          <i class="far fa-check mr-1"></i>
          Aplicar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  watch,
  computed,
  defineProps,
  defineEmits,
  onMounted,
  onBeforeUnmount,
  getCurrentInstance
} from "vue";

const props = defineProps({
  modelValue: { type: [Number, String], default: "" },

  // ==== Estado de hoja / inventario ====
  dirty: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  totalRows: { type: Number, default: 0 },
  sheetName: { type: String, default: "" },
  tipoMatriz: { type: String, default: "" },
  material: { type: String, default: "" },
  tratamientos: { type: Array, default: () => [] },
  lastSavedAt: { type: [String, Date], default: null }
});

const emit = defineEmits([
  "update:modelValue",
  "add-row",
  "add-column",
  "clear-filters",
  "reset-sort",
  "toggle-filters",
  "save-request",
  "discard-changes",
  "refresh",
  "seed",
  "export"
]);

const activeTab = ref(0);
const localValue = ref(props.modelValue ?? "");

/* ========= Buefy instancia ========= */
const internalInstance = getCurrentInstance();
const $buefy =
  internalInstance?.appContext?.config?.globalProperties?.$buefy;

/* ========= Historial deshacer / rehacer ========= */
const MAX_HISTORY = 200;
const undoStack = ref([]); // valores previos
const redoStack = ref([]); // valores hacia adelante
const isApplyingHistory = ref(false);

const canUndo = computed(() => undoStack.value.length > 0);
const canRedo = computed(() => redoStack.value.length > 0);

watch(
  () => props.modelValue,
  (val, oldVal) => {
    // cuando el valor viene del grid, registramos historial
    if (!isApplyingHistory.value && oldVal !== undefined && oldVal !== val) {
      if (undoStack.value.length >= MAX_HISTORY) {
        undoStack.value.shift();
      }
      undoStack.value.push(oldVal ?? "");
      // cualquier cambio "normal" invalida rehacer
      redoStack.value = [];
    }
    localValue.value = val ?? "";
  }
);

const applyChange = () => {
  const raw = String(localValue.value ?? "").trim();
  if (raw === "") {
    emit("update:modelValue", 0);
  } else if (/^-?\d+(\.\d+)?$/.test(raw)) {
    emit("update:modelValue", Number(raw));
  } else {
    emit("update:modelValue", raw);
  }
};

/* Deshacer / rehacer solo afectan al modelValue que ve el grid */
const undo = () => {
  if (!undoStack.value.length) return;
  const current = props.modelValue ?? "";
  const previous = undoStack.value.pop();
  redoStack.value.push(current);
  isApplyingHistory.value = true;
  emit("update:modelValue", previous);
  setTimeout(() => {
    isApplyingHistory.value = false;
  }, 0);
};

const redo = () => {
  if (!redoStack.value.length) return;
  const current = props.modelValue ?? "";
  const next = redoStack.value.pop();
  undoStack.value.push(current);
  isApplyingHistory.value = true;
  emit("update:modelValue", next);
  setTimeout(() => {
    isApplyingHistory.value = false;
  }, 0);
};

/* ========= Copiar / Cortar / Pegar ========= */
const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  } catch (err) {
    console.error("Error copiando:", err);
    $buefy?.toast.open({
      message: "El navegador bloqueó el acceso al portapapeles.",
      type: "is-danger"
    });
  }
};

const pasteFromClipboard = async () => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      return await navigator.clipboard.readText();
    } else {
      return new Promise((resolve) => {
        const textarea = document.createElement("textarea");
        textarea.style.position = "absolute";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        const handler = (e) => {
          const pasted = e.clipboardData?.getData("text") || "";
          resolve(pasted);
          document.body.removeChild(textarea);
        };
        textarea.addEventListener("paste", handler, { once: true });
        document.execCommand("paste");
      });
    }
  } catch (err) {
    console.error("Error pegando:", err);
    $buefy?.toast.open({
      message: "El navegador bloqueó el acceso al portapapeles.",
      type: "is-danger"
    });
    return "";
  }
};

const copyCell = async () => {
  if (localValue.value !== "" && localValue.value != null) {
    await copyToClipboard(localValue.value.toString());
  }
};

const cutCell = async () => {
  if (localValue.value !== "" && localValue.value != null) {
    await copyToClipboard(localValue.value.toString());
    emit("update:modelValue", 0);
  }
};

const pasteCell = async () => {
  const pasted = await pasteFromClipboard();
  if (!pasted) return;
  const str = pasted.trim();
  if (/^-?\d+(\.\d+)?$/.test(str)) {
    emit("update:modelValue", Number(str));
  } else {
    emit("update:modelValue", str);
  }
};

/* ========= Modales Nueva fila / columna (Buefy) ========= */
const openAddRowModal = () => {
  $buefy?.dialog.prompt({
    message: "Agregar nueva fila",
    inputAttrs: {
      placeholder: "Ej: -0.25, 0.00, 0.25…",
      type: "number",
      step: "0.25"
    },
    trapFocus: true,
    onConfirm: (value) => {
      if (value !== null && value !== undefined && value !== "") {
        emit("add-row", parseFloat(value));
      }
    }
  });
};

const openAddColumnModal = () => {
  $buefy?.dialog.prompt({
    message: "Agregar nueva columna",
    inputAttrs: {
      placeholder: "Ej: 1.00, 1.50, 2.00…",
      type: "number",
      step: "0.25"
    },
    trapFocus: true,
    onConfirm: (value) => {
      if (value !== null && value !== undefined && value !== "") {
        emit("add-column", parseFloat(value));
      }
    }
  });
};

/* ========= Atajos de teclado (desktop) ========= */
const isMobile =
  typeof navigator !== "undefined" &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");

const handleKey = async (e) => {
  if (isMobile) return;
  if (e.ctrlKey || e.metaKey) {
    const key = e.key.toLowerCase();
    if (key === "z") {
      e.preventDefault();
      undo();
    } else if (key === "y") {
      e.preventDefault();
      redo();
    } else if (key === "c") {
      e.preventDefault();
      await copyCell();
    } else if (key === "x") {
      e.preventDefault();
      await cutCell();
    } else if (key === "v") {
      e.preventDefault();
      await pasteCell();
    } else if (key === "s") {
      e.preventDefault();
      handleSave();
    }
  }
};
onMounted(() => {
  if (!isMobile) window.addEventListener("keydown", handleKey);
});
onBeforeUnmount(() => {
  if (!isMobile) window.removeEventListener("keydown", handleKey);
});

/* ========= Estado y helpers visuales ========= */
const tipoHuman = computed(() => {
  if (!props.tipoMatriz) return "";
  return (
    {
      BASE: "Monofocal (Base)",
      SPH_CYL: "Monofocal (Esf/Cil)",
      SPH_ADD: "Bifocal (SPH + ADD)",
      BASE_ADD: "Progresivo (BASE + ADD)"
    }[props.tipoMatriz] || props.tipoMatriz
  );
});

const tratamientosLabel = computed(() =>
  (props.tratamientos || []).join(" + ")
);

const lastSavedLabel = computed(() => {
  if (!props.lastSavedAt) return null;
  if (typeof props.lastSavedAt === "string") return props.lastSavedAt;
  try {
    const d = new Date(props.lastSavedAt);
    return d.toLocaleString();
  } catch {
    return String(props.lastSavedAt);
  }
});

const statusText = computed(() => {
  if (props.saving) return "Guardando cambios…";
  if (props.dirty) return "Cambios sin guardar";
  return "Sin cambios pendientes";
});

const statusClass = computed(() => {
  if (props.saving) return "status-pill saving";
  if (props.dirty) return "status-pill dirty";
  return "status-pill clean";
});

/* ========= Acciones de hoja (guardar / recargar / seed) ========= */
const handleSave = () => {
  if (!props.dirty) {
    $buefy?.toast.open({
      message: "No hay cambios pendientes por guardar.",
      type: "is-info"
    });
    return;
  }
  if (props.saving) return;
  $buefy?.dialog.confirm({
    title: "Guardar cambios",
    message: "Se guardarán los cambios realizados en esta planilla.",
    confirmText: "Guardar",
    cancelText: "Cancelar",
    type: "is-primary",
    trapFocus: true,
    onConfirm: () => emit("save-request")
  });
};

const handleDiscard = () => {
  if (!props.dirty) {
    $buefy?.toast.open({
      message: "No hay cambios locales para descartar.",
      type: "is-info"
    });
    return;
  }
  $buefy?.dialog.confirm({
    title: "Descartar cambios",
    message: "Se perderán los cambios locales no guardados. ¿Deseas continuar?",
    confirmText: "Descartar",
    cancelText: "Cancelar",
    type: "is-danger",
    trapFocus: true,
    onConfirm: () => emit("discard-changes")
  });
};

const handleRefresh = () => {
  if (props.dirty) {
    $buefy?.dialog.confirm({
      title: "Recargar datos",
      message:
        "Hay cambios sin guardar. Al recargar, podrían perderse. ¿Deseas continuar?",
      confirmText: "Recargar",
      cancelText: "Cancelar",
      type: "is-warning",
      trapFocus: true,
      onConfirm: () => emit("refresh")
    });
  } else {
    emit("refresh");
  }
};

const handleSeed = () => {
  $buefy?.dialog.confirm({
    title: "Regenerar matriz",
    message:
      "Se generará de nuevo la matriz con los rangos por defecto. Los datos existentes podrían ser sobreescritos según la lógica del backend. ¿Estás seguro?",
    confirmText: "Regenerar",
    cancelText: "Cancelar",
    type: "is-danger",
    trapFocus: true,
    onConfirm: () => emit("seed")
  });
};
</script>

<style scoped>
.ribbon {
  display: flex;
  flex-direction: column;
  background-color: #f7f5ff;
  border-bottom: 1px solid #e0def5;
}

/* HEADER */
.ribbon-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px 4px;
  gap: 12px;
}

.ribbon-header__left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sheet-icon {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: rgba(121, 87, 213, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4527a0;
}

.sheet-icon i {
  font-size: 16px;
}

.sheet-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sheet-meta__title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sheet-name {
  font-size: 13px;
  font-weight: 600;
  color: #2d2242;
}

.sheet-meta__line {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 11px;
  color: #5b5b7a;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.ribbon-header__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.last-saved {
  font-size: 11px;
  color: #7a7a9a;
}

/* Tabs más planas */
.ribbon-tabs ::v-deep(.tabs) {
  margin-bottom: 0;
}
.ribbon-tabs ::v-deep(.tabs ul) {
  border-bottom: 1px solid #e0def5;
}
.ribbon-tabs ::v-deep(.tabs li.is-active a) {
  background-color: #ffffff;
  color: #4527a0;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

/* Contenido del ribbon */
.ribbon-content {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 6px 8px;
}

.ribbon-group {
  display: flex;
  align-items: stretch;
  gap: 6px;
  padding-right: 8px;
  border-right: 1px solid #e5e5f0;
  flex-shrink: 0;
}

.ribbon-group:last-child {
  border-right: none;
}

/* Botones ribbon */
.ribbon-btn {
  min-width: 120px;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  background-color: #ffffff;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #4a4a4a;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ribbon-btn__icon {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #f5f3ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4527a0;
  flex-shrink: 0;
}

.ribbon-btn__icon i {
  font-size: 12px;
}

.ribbon-btn__text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.ribbon-btn__title {
  font-weight: 600;
  font-size: 11px;
}

.ribbon-btn__hint {
  font-size: 10px;
  color: #7a7a7a;
}

.ribbon-btn:hover:not(:disabled) {
  border-color: #d0c8ff;
  box-shadow: 0 0 0 1px rgba(121, 87, 213, 0.12);
  background-color: #faf8ff;
}

.ribbon-btn:disabled {
  opacity: 0.5;
  cursor: default;
  box-shadow: none;
}

/* Barra de fórmulas */
.formula-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background-color: #f9f8ff;
  border-top: 1px solid #e0def5;
  border-bottom: 1px solid #e0def5;
}

.formula-bar .label {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: #4527a0;
  white-space: nowrap;
}

.formula-bar__input-wrapper {
  display: flex;
  flex: 1;
  gap: 4px;
}

.formula-apply-btn {
  border-radius: 6px;
  border: 1px solid #d4cef8;
  background-color: #ffffff;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 600;
  color: #4527a0;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.formula-apply-btn:hover {
  background-color: #f3f0ff;
  border-color: #7957d5;
}

/* Status */
.badge-tipo {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(142, 0, 210, 0.06);
  border: 1px solid rgba(142, 0, 210, 0.2);
  color: #6a1b9a;
  font-size: 10px;
  font-weight: 600;
}

.status-pill {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.status-pill.clean {
  background: #f4fff7;
  color: #2e7d32;
  border: 1px solid rgba(46, 125, 50, 0.2);
}
.status-pill.dirty {
  background: #fffaf4;
  color: #bf6519;
  border: 1px solid rgba(191, 101, 25, 0.2);
}
.status-pill.saving {
  background: #f4f7ff;
  color: #1a73e8;
  border: 1px solid rgba(26, 115, 232, 0.2);
}

/* Mobile: ribbon scrolleable horizontal */
@media (max-width: 768px) {
  .ribbon-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .ribbon-header__right {
    align-items: flex-start;
  }
  .ribbon-content {
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .ribbon-group {
    flex-shrink: 0;
  }
}
</style>
