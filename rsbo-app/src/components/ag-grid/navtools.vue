<template>
  <div class="ribbon m-0">
    <!-- HEADER: META + STATUS -->
    <div class="ribbon-header">
      <div class="ribbon-header__left">
        <div class="sheet-icon">
          <i class="fas fa-table"></i>
        </div>

        <div class="sheet-meta">
          <div class="sheet-meta__title">
            <span v-if="tipoHuman" class="badge-tipo">
              <i class="fas fa-layer-group mr-1"></i>
              {{ tipoHuman }}
            </span>
            <span class="sheet-name">
              {{ sheetName || "Hoja sin nombre" }}
            </span>
          </div>

          <div class="sheet-meta__line">
            <span v-if="material" class="meta-chip">
              <i class="fas fa-gem mr-1"></i>
              {{ material }}
            </span>

            <span v-if="tratamientosLabel" class="meta-chip">
              <i class="fas fa-magic mr-1"></i>
              {{ tratamientosLabel }}
            </span>

            <span v-if="totalRows != null" class="meta-chip">
              <i class="fas fa-database mr-1"></i>
              {{ totalRows }} filas
            </span>
          </div>
        </div>
      </div>

      <div class="ribbon-header__right">
        <span v-if="lastSavedLabel" class="last-saved">
          <i class="fas fa-clock mr-1"></i>
          {{ lastSavedLabel }}
        </span>

        <span :class="statusClass">
          <i v-if="saving" class="fas fa-spinner fa-spin mr-1"></i>
          <i v-else-if="dirty" class="fas fa-exclamation-circle mr-1"></i>
          <i v-else class="fas fa-check-circle mr-1"></i>
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
            <i class="fas fa-pencil-alt mr-1"></i>
            Edición
          </span>
        </template>

        <div class="ribbon-content">
          <div class="ribbon-group">
            <button
              class="ribbon-btn"
              @click="handleUndoClick"
              :disabled="!canUndo"
            >
              <span class="ribbon-btn__icon">
                <i class="fas fa-undo-alt"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Deshacer</span>
                <span class="ribbon-btn__hint">Ctrl+Z</span>
              </span>
            </button>

            <button
              class="ribbon-btn"
              @click="handleRedoClick"
              :disabled="!canRedo"
            >
              <span class="ribbon-btn__icon">
                <i class="fas fa-redo-alt"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Rehacer</span>
                <span class="ribbon-btn__hint">Ctrl+Y</span>
              </span>
            </button>
          </div>

          <div class="ribbon-group">
            <button class="ribbon-btn" @click="handleCopyClick">
              <span class="ribbon-btn__icon">
                <i class="fas fa-copy"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Copiar</span>
                <span class="ribbon-btn__hint">Ctrl+C</span>
              </span>
            </button>

            <button class="ribbon-btn" @click="handleCutClick">
              <span class="ribbon-btn__icon">
                <i class="fas fa-cut"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Cortar</span>
                <span class="ribbon-btn__hint">Ctrl+X</span>
              </span>
            </button>

            <button
              v-if="!isMobile"
              class="ribbon-btn"
              @click="handlePasteClick"
            >
              <span class="ribbon-btn__icon">
                <i class="fas fa-paste"></i>
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
            <i class="fas fa-border-all mr-1"></i>
            Estructura
          </span>
        </template>

        <div class="ribbon-content">
          <div class="ribbon-group">
            <!-- Nueva fila (siempre disponible) -->
            <button class="ribbon-btn" @click="openAddRowModal">
              <span class="ribbon-btn__icon">
                <i class="fas fa-plus-square"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Nueva fila</span>
                <span class="ribbon-btn__hint">
                  {{ rowHint }}
                </span>
              </span>
            </button>

            <!-- Nueva columna (NO se muestra en tipoMatriz === 'BASE') -->
            <button
              v-if="allowColumns"
              class="ribbon-btn"
              @click="openAddColumnModal"
            >
              <span class="ribbon-btn__icon">
                <i class="fas fa-plus"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Nueva columna</span>
                <span class="ribbon-btn__hint">
                  {{ colHint }}
                </span>
              </span>
            </button>
          </div>
        </div>
      </b-tab-item>

      <!-- ========== TAB: DATOS / HOJA ========== -->
      <b-tab-item>
        <template #header>
          <span class="tab-label">
            <i class="fas fa-database mr-1"></i>
            Datos
          </span>
        </template>

        <div class="ribbon-content">
          <!-- Grupo filtros / orden -->
          <div class="ribbon-group">
            <button class="ribbon-btn" @click="emit('clear-filters')">
              <span class="ribbon-btn__icon">
                <i class="fas fa-filter"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Limpiar filtros</span>
                <span class="ribbon-btn__hint">Borrar criterios</span>
              </span>
            </button>

            <button class="ribbon-btn" @click="emit('reset-sort')">
              <span class="ribbon-btn__icon">
                <i class="fas fa-sort-amount-down-alt"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Restablecer orden</span>
                <span class="ribbon-btn__hint">Orden natural</span>
              </span>
            </button>
          </div>

          <!-- Grupo persistencia -->
          <div class="ribbon-group">
            <button
              class="ribbon-btn"
              :disabled="!dirty || saving"
              @click="handleSaveClick"
            >
              <span class="ribbon-btn__icon">
                <i class="fas fa-save"></i>
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
                <i class="fas fa-undo"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Descartar cambios</span>
                <span class="ribbon-btn__hint">Recargar hoja</span>
              </span>
            </button>
          </div>

          <!-- Grupo extra -->
          <div class="ribbon-group">
            <button class="ribbon-btn" @click="emit('export')">
              <span class="ribbon-btn__icon">
                <i class="fas fa-file-export"></i>
              </span>
              <span class="ribbon-btn__text">
                <span class="ribbon-btn__title">Exportar</span>
                <span class="ribbon-btn__hint">CSV / Excel</span>
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
          <i class="fas fa-check mr-1"></i>
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
  "save-request",
  "discard-changes",
  "export"
]);

const activeTab = ref(0);
const localValue = ref(props.modelValue ?? "");

/* ========= Buefy instancia ========= */
const internalInstance = getCurrentInstance();
const $buefy =
  internalInstance?.appContext?.config?.globalProperties?.$buefy;

/* ========= Límites físicos de dioptrías (match backend) ========= */
const PHYSICAL_LIMITS = Object.freeze({
  SPH: { min: -40, max: 40 },
  CYL: { min: -15, max: 15 },
  BASE: { min: -40, max: 40 },
  ADD: { min: 0, max: 8 }
});

/* ========= Historial deshacer / rehacer ========= */
const MAX_HISTORY = 200;
const undoStack = ref([]);
const redoStack = ref([]);
const isApplyingHistory = ref(false);

const canUndo = computed(() => undoStack.value.length > 0);
const canRedo = computed(() => redoStack.value.length > 0);

console.log(
  "[Navtools] mounted for sheet:",
  props.sheetName || "(sin nombre)"
);

watch(
  () => props.modelValue,
  (val, oldVal) => {
    if (!isApplyingHistory.value && oldVal !== undefined && oldVal !== val) {
      if (undoStack.value.length >= MAX_HISTORY) {
        undoStack.value.shift();
      }
      undoStack.value.push(oldVal ?? "");
      redoStack.value = [];
    }
    localValue.value = val ?? "";
  }
);

/* Logs de dirty / saving para ver cuándo cambian desde el grid */
watch(
  () => props.dirty,
  (val) => {
    console.log("[Navtools] props.dirty cambió →", val);
  },
  { immediate: true }
);

watch(
  () => props.saving,
  (val) => {
    console.log("[Navtools] props.saving cambió →", val);
  },
  { immediate: true }
);

/* ========= Dioptrías: múltiplos de 0.25 + límites físicos ========= */

const isQuarterStep = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return false;
  const scaled = num * 4;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
};

const rowLabel = computed(() => {
  switch (props.tipoMatriz) {
    case "SPH_CYL":
    case "SPH_ADD":
      return "SPH";
    case "BASE_ADD":
    case "BASE":
      return "BASE";
    default:
      return "valor";
  }
});

const colLabel = computed(() => {
  switch (props.tipoMatriz) {
    case "SPH_CYL":
      return "CYL";
    case "SPH_ADD":
    case "BASE_ADD":
      return "ADD";
    case "BASE":
      return "valor";
    default:
      return "valor";
  }
});

/** En monofocal BASE no hay columnas dinámicas */
const allowColumns = computed(() => props.tipoMatriz !== "BASE");

const rowHint = computed(() => {
  if (rowLabel.value === "SPH") {
    const { min, max } = PHYSICAL_LIMITS.SPH;
    return `SPH (±) en pasos de 0.25 D. Rango físico aprox: ${min} a ${max} D.`;
  }
  if (rowLabel.value === "BASE") {
    const { min, max } = PHYSICAL_LIMITS.BASE;
    return `Base en pasos de 0.25 D. Rango físico aprox: ${min} a ${max} D.`;
  }
  return "SPH / Base en formato 0.00, pasos de 0.25 D.";
});

const colHint = computed(() => {
  if (colLabel.value === "CYL") {
    const { min, max } = PHYSICAL_LIMITS.CYL;
    return `CYL (±) en pasos de 0.25 D. Rango físico aprox: ${min} a ${max} D.`;
  }
  if (colLabel.value === "ADD") {
    const { min, max } = PHYSICAL_LIMITS.ADD;
    return `ADD (+) en pasos de 0.25 D. Rango típico: ${min} a ${max} D.`;
  }
  return "ADD / CYL en formato 0.00, pasos de 0.25 D.";
});

/**
 * Determina qué tipo de dioptría se está editando según el contexto:
 *  - row  → SPH / BASE
 *  - col  → CYL / ADD
 */
const getContextDimension = (kind) => {
  if (kind === "row") {
    if (rowLabel.value === "SPH") return "SPH";
    if (rowLabel.value === "BASE") return "BASE";
  } else if (kind === "col") {
    if (colLabel.value === "CYL") return "CYL";
    if (colLabel.value === "ADD") return "ADD";
  }
  return null;
};

const ensureQuarterStepOrToast = (value, kind) => {
  const num = Number(value);
  const lbl = kind === "row" ? rowLabel.value : colLabel.value;

  if (!Number.isFinite(num)) {
    $buefy?.toast.open({
      message: `Ingresa un valor numérico válido${
        lbl === "valor" ? "" : ` para ${lbl}`
      }.`,
      type: "is-danger"
    });
    return false;
  }

  const dim = getContextDimension(kind);
  if (dim && PHYSICAL_LIMITS[dim]) {
    const { min, max } = PHYSICAL_LIMITS[dim];
    if (num < min || num > max) {
      $buefy?.toast.open({
        message: `${dim} debe estar entre ${min.toFixed(2)} y ${max.toFixed(
          2
        )} D.`,
        type: "is-danger"
      });
      return false;
    }
  }

  if (!isQuarterStep(num)) {
    const what = lbl === "valor" ? "" : ` de ${lbl}`;
    $buefy?.toast.open({
      message:
        `El valor${what} debe ser múltiplo de 0.25 D (…00, …25, …50, …75). ` +
        `Ejemplos válidos: -6.00, -5.75, -5.50, 0.00, 0.25, 0.50.`,
      type: "is-danger"
    });
    return false;
  }

  return true;
};

const applyChange = () => {
  const raw = String(localValue.value ?? "").trim();
  console.log("[Navtools] applyChange, raw:", raw);
  if (raw === "") {
    emit("update:modelValue", 0);
  } else if (/^-?\d+(\.\d+)?$/.test(raw)) {
    emit("update:modelValue", Number(raw));
  } else {
    emit("update:modelValue", raw);
  }
};

const undo = () => {
  if (!undoStack.value.length) return;
  const current = props.modelValue ?? "";
  const previous = undoStack.value.pop();
  console.log("[Navtools] undo", { current, previous });
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
  console.log("[Navtools] redo", { current, next });
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
    console.log("[Navtools] copyToClipboard:", text);
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
    console.log("[Navtools] pasteFromClipboard");
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
  console.log("[Navtools] copyCell, localValue:", localValue.value);
  if (localValue.value !== "" && localValue.value != null) {
    await copyToClipboard(localValue.value.toString());
  }
};

const cutCell = async () => {
  console.log("[Navtools] cutCell, localValue:", localValue.value);
  if (localValue.value !== "" && localValue.value != null) {
    await copyToClipboard(localValue.value.toString());
    emit("update:modelValue", 0);
  }
};

const pasteCell = async () => {
  const pasted = await pasteFromClipboard();
  console.log("[Navtools] pasteCell, pasted:", pasted);
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
  console.log("[Navtools] openAddRowModal");

  const dim = getContextDimension("row");
  const limits = dim ? PHYSICAL_LIMITS[dim] : null;

  const placeholder =
    rowLabel.value === "SPH"
      ? "Ej: -6.00, -5.75, -5.50, 0.00, 0.25…"
      : rowLabel.value === "BASE"
      ? "Ej: 0.00, 0.25, 0.50…"
      : "Ej: 0.00, 0.25, 0.50…";

  const inputAttrs = {
    placeholder,
    type: "number",
    step: "0.25"
  };

  if (limits) {
    inputAttrs.min = limits.min;
    inputAttrs.max = limits.max;
  }

  $buefy?.dialog.prompt({
    message: `Agregar nueva fila (${rowLabel.value})`,
    inputAttrs,
    trapFocus: true,
    onConfirm: (value) => {
      console.log("[Navtools] add-row confirm:", value);
      if (value === null || value === undefined || value === "") return;

      const num = Number(value);
      if (!ensureQuarterStepOrToast(num, "row")) return;

      emit("add-row", num);

      const unit = rowLabel.value === "valor" ? "" : " D";
      $buefy?.toast.open({
        message: `Se agregó la fila ${rowLabel.value} ${num.toFixed(
          2
        )}${unit}.`,
        type: "is-success"
      });
    }
  });
};

const openAddColumnModal = () => {
  console.log("[Navtools] openAddColumnModal");
  if (!allowColumns.value) return; // protección extra para BASE

  const dim = getContextDimension("col");
  const limits = dim ? PHYSICAL_LIMITS[dim] : null;

  const placeholder =
    colLabel.value === "CYL"
      ? "Ej: -0.25, -0.50, -0.75, 0.25, 0.50…"
      : colLabel.value === "ADD"
      ? "Ej: 0.75, 1.00, 1.25, 1.50…"
      : "Ej: 0.00, 0.25, 0.50…";

  const inputAttrs = {
    placeholder,
    type: "number",
    step: "0.25"
  };

  if (limits) {
    inputAttrs.min = limits.min;
    inputAttrs.max = limits.max;
  }

  $buefy?.dialog.prompt({
    message: `Agregar nueva columna (${colLabel.value})`,
    inputAttrs,
    trapFocus: true,
    onConfirm: (value) => {
      console.log("[Navtools] add-column confirm:", value);
      if (value === null || value === undefined || value === "") return;

      const num = Number(value);
      if (!ensureQuarterStepOrToast(num, "col")) return;

      emit("add-column", num);

      const unit = colLabel.value === "valor" ? "" : " D";
      $buefy?.toast.open({
        message: `Se agregó la columna ${colLabel.value} ${num.toFixed(
          2
        )}${unit}.`,
        type: "is-success"
      });
    }
  });
};

/* ========= Click handlers wrapper ========= */
const handleUndoClick = () => {
  console.log("[Navtools] botón Deshacer");
  undo();
};
const handleRedoClick = () => {
  console.log("[Navtools] botón Rehacer");
  redo();
};
const handleCopyClick = () => {
  console.log("[Navtools] botón Copiar");
  copyCell();
};
const handleCutClick = () => {
  console.log("[Navtools] botón Cortar");
  cutCell();
};
const handlePasteClick = () => {
  console.log("[Navtools] botón Pegar");
  pasteCell();
};

/* ========= Atajos de teclado (desktop) ========= */
const isMobile =
  typeof navigator !== "undefined" &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");

const handleSaveInternal = () => {
  console.log(
    "[Navtools] handleSaveInternal llamado. dirty:",
    props.dirty,
    "saving:",
    props.saving
  );

  if (!props.dirty) {
    console.log(
      "[Navtools] handleSaveInternal → sin cambios, no emite"
    );
    $buefy?.toast.open({
      message: "No hay cambios pendientes por guardar.",
      type: "is-info"
    });
    return;
  }
  if (props.saving) {
    console.log(
      "[Navtools] handleSaveInternal → ya está guardando, return"
    );
    return;
  }

  console.log(
    "[Navtools] Abriendo diálogo de confirmación de guardado"
  );
  $buefy?.dialog.confirm({
    title: "Guardar cambios",
    message: "Se guardarán los cambios realizados en esta planilla.",
    confirmText: "Guardar",
    cancelText: "Cancelar",
    type: "is-primary",
    trapFocus: true,
    onConfirm: () => {
      console.log(
        "[Navtools] Confirm guardado aceptado → emit('save-request')"
      );
      emit("save-request");
    },
    onCancel: () => {
      console.log("[Navtools] Confirm guardado cancelado");
    }
  });
};

const handleSaveClick = () => {
  console.log("[Navtools] Botón Guardar clicado");
  handleSaveInternal();
};

const handleKey = async (e) => {
  if (isMobile) return;
  if (e.ctrlKey || e.metaKey) {
    const key = e.key.toLowerCase();
    if (key === "z") {
      console.log("[Navtools] Ctrl+Z detectado");
      e.preventDefault();
      undo();
    } else if (key === "y") {
      console.log("[Navtools] Ctrl+Y detectado");
      e.preventDefault();
      redo();
    } else if (key === "c") {
      console.log("[Navtools] Ctrl+C detectado");
      e.preventDefault();
      await copyCell();
    } else if (key === "x") {
      console.log("[Navtools] Ctrl+X detectado");
      e.preventDefault();
      await cutCell();
    } else if (key === "v") {
      console.log("[Navtools] Ctrl+V detectado");
      e.preventDefault();
      await pasteCell();
    } else if (key === "s") {
      console.log("[Navtools] Ctrl+S detectado");
      e.preventDefault();
      handleSaveInternal();
    }
  }
};

onMounted(() => {
  if (!isMobile) {
    console.log(
      "[Navtools] Registrando listener global de teclado"
    );
    window.addEventListener("keydown", handleKey);
  }
});

onBeforeUnmount(() => {
  if (!isMobile) {
    console.log(
      "[Navtools] Eliminando listener global de teclado"
    );
    window.removeEventListener("keydown", handleKey);
  }
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

/* ========= Acciones de hoja (descartar) ========= */
const handleDiscard = () => {
  console.log("[Navtools] handleDiscard, dirty:", props.dirty);
  if (!props.dirty) {
    $buefy?.toast.open({
      message: "No hay cambios locales para descartar.",
      type: "is-info"
    });
    return;
  }
  $buefy?.dialog.confirm({
    title: "Descartar cambios",
    message:
      "Se perderán los cambios locales no guardados. ¿Deseas continuar?",
    confirmText: "Descartar",
    cancelText: "Cancelar",
    type: "is-danger",
    trapFocus: true,
    onConfirm: () => {
      console.log(
        "[Navtools] confirm discard → emit('discard-changes')"
      );
      emit("discard-changes");
    }
  });
};
</script>

<style scoped>
/* ===== Contenedor general ===== */
.ribbon {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-bottom: 1px solid #e5e5e5;
  margin-top: 0 !important;
}

/* ===== Header ===== */
.ribbon-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px 3px;
  gap: 10px;
}

.ribbon-header__left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sheet-icon {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4a4a4a;
}

.sheet-icon i {
  font-size: 14px;
}

.sheet-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sheet-meta__title {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sheet-name {
  font-size: 12px;
  font-weight: 600;
  color: #363636;
}

.sheet-meta__line {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 10px;
  color: #7a7a7a;
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
  gap: 2px;
}

.last-saved {
  font-size: 10px;
  color: #7a7a7a;
}

/* ===== Tabs de Buefy ===== */
.ribbon-tabs ::v-deep(.tabs) {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  padding-top: 0;
  padding-bottom: 0;
}

.ribbon-tabs ::v-deep(.tabs ul) {
  border-bottom: 1px solid #e5e5e5;
}

.ribbon-tabs ::v-deep(.tabs li a) {
  border-radius: 4px 4px 0 0;
}

.ribbon-tabs ::v-deep(.tabs li.is-active a) {
  background-color: #ffffff;
  color: #363636;
  border-color: #dbdbdb;
}

/* ===== Contenido de tabs ===== */
.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
}

.ribbon-content {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 6px;
  background: #ffffff;
}

/* ===== Grupos de botones ===== */
.ribbon-group {
  display: flex;
  align-items: stretch;
  gap: 4px;
  padding-right: 6px;
  border-right: 1px solid #e5e5e5;
  flex-shrink: 0;
}

.ribbon-group:last-child {
  border-right: none;
}

/* ===== Botones ===== */
.ribbon-btn {
  min-width: 96px;
  padding: 3px 6px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  background-color: #ffffff;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: #4a4a4a;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ribbon-btn__icon {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4a4a4a;
  flex-shrink: 0;
}

.ribbon-btn__icon i {
  font-size: 10px;
}

.ribbon-btn__text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.ribbon-btn__title {
  font-weight: 600;
  font-size: 10px;
}

.ribbon-btn__hint {
  font-size: 9px;
  color: #7a7a7a;
}

.ribbon-btn:hover:not(:disabled) {
  border-color: #b5b5b5;
  background-color: #f5f5f5;
}

.ribbon-btn:disabled {
  opacity: 0.5;
  cursor: default;
  box-shadow: none;
}

/* ===== Barra de fórmulas ===== */
.formula-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  background-color: #fafafa;
  border-top: 1px solid #e5e5e5;
  border-bottom: 1px solid #e5e5e5;
}

.formula-bar .label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: #363636;
  white-space: nowrap;
}

.formula-bar__input-wrapper {
  display: flex;
  flex: 1;
  gap: 4px;
}

.formula-apply-btn {
  border-radius: 6px;
  border: 1px solid #dbdbdb;
  background-color: #ffffff;
  padding: 0 8px;
  font-size: 10px;
  font-weight: 600;
  color: #363636;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.formula-apply-btn:hover {
  background-color: #f5f5f5;
  border-color: #b5b5b5;
}

/* ===== Badge de tipo ===== */
.badge-tipo {
  padding: 2px 6px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid #dbdbdb;
  color: #7957d5;
  font-size: 9px;
  font-weight: 600;
}

/* ===== Estado (status pill) ===== */
.status-pill {
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 9px;
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

/* ===== Responsive ===== */
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
