<template>
  <div>
    <!-- TABS -->
    <div ref="tabsContainer" class="tabs-wrapper">
      <!-- Skeleton de tabs mientras se cargan las planillas -->
      <template v-if="loadingTabs">
        <div v-for="n in 3" :key="'sk-' + n" class="tab-item skeleton-tab">
          <span class="skeleton-bar"></span>
        </div>
      </template>

      <!-- Tabs reales -->
      <template v-else>
        <div
          v-for="planilla in sheets"
          :key="planilla.id"
          :data-id="planilla.id"
          :class="[
            'tab-item',
            { 'tab-agregar': planilla.id === 'nueva', active: planilla.id === activeId }
          ]"
          @click="handleTabClick(planilla.id)"
        >
          <template v-if="planilla.id === 'nueva'">
            <i class="fas fa-plus"></i>
          </template>

          <template v-else>
            <!-- ✅ Texto (nombre + sku) -->
            <div class="tab-text">
              <span class="tab-label" :title="planilla.name">{{ planilla.name }}</span>

              <span v-if="planilla.sku" class="tab-sku" :title="planilla.sku">
                {{ planilla.sku }}
              </span>
              <span v-else class="tab-sku tab-sku--empty" title="Sin SKU (pendiente de backfill)">
                SIN-SKU
              </span>
            </div>

            <!-- 3 puntos (abre modal; no deforma layout) -->
            <button
              class="tab-menu-btn"
              title="Más acciones"
              aria-label="Más acciones"
              @click.stop="openActions(planilla)"
            >
              ⋮
            </button>
          </template>
        </div>
      </template>
    </div>

    <!-- CONTENIDO -->
    <div :key="activeId" class="plantillas-contenedor">
      <!-- NUEVA -->
      <div class="box" v-if="activeId === 'nueva'">
        <form @submit.prevent="handleCrear">
          <!-- BASE -->
          <b-field label="Selecciona la Base">
            <div class="tabs tabs-opciones is-toggle is-small">
              <ul>
                <li
                  v-for="(val, key) in configuracion.bases"
                  :key="key"
                  :class="{ 'is-active': selectedBase === key }"
                  @click="selectBase(key)"
                >
                  <a>{{ val.label }}</a>
                </li>
              </ul>
            </div>
          </b-field>

          <!-- MATERIALES (feedback de incompatibles) -->
          <transition name="fade-slide">
            <b-field v-if="selectedBase" label="Selecciona el Material">
              <div class="tabs tabs-opciones is-toggle is-small">
                <ul>
                  <li
                    v-for="mat in allMaterials"
                    :key="mat"
                    :class="[
                      { 'is-active': selectedMaterial === mat },
                      { 'is-disabled': !isMaterialAllowed(mat) }
                    ]"
                    :aria-disabled="!isMaterialAllowed(mat)"
                  >
                    <!-- Incompatible → tooltip + bloqueo -->
                    <b-tooltip
                      v-if="!isMaterialAllowed(mat)"
                      :label="`No disponible con ${baseLabel}`"
                      position="is-top"
                      type="is-dark"
                      multilined
                    >
                      <a @click.prevent>
                        {{ mat }} <i class="fas fa-lock ml-1"></i>
                      </a>
                    </b-tooltip>

                    <!-- Compatible → selección normal -->
                    <a v-else @click="selectMaterial(mat)">{{ mat }}</a>
                  </li>
                </ul>
              </div>

              <p class="help is-danger mt-2" v-if="selectedBase && !hasAnyAllowedMaterial">
                No hay materiales compatibles con la base seleccionada.
              </p>
              <p class="help is-light mt-1">
                Las opciones en gris no son compatibles con la base elegida.
              </p>
            </b-field>
          </transition>

          <!-- TRATAMIENTOS (feedback de incompatibles) -->
          <transition name="fade-slide">
            <b-field v-if="selectedMaterial" label="Selecciona Tratamientos">
              <div class="columns is-multiline is-mobile" style="max-height: 150px; overflow-y: auto;">
                <div
                  v-for="trat in allTratamientos"
                  :key="trat"
                  class="column is-half-mobile is-one-third-tablet is-one-quarter-desktop"
                >
                  <!-- Incompatible → tooltip + aspecto deshabilitado -->
                  <b-tooltip
                    v-if="!isTratamientoAllowed(trat)"
                    label="No compatible con la base/material seleccionados"
                    position="is-top"
                    type="is-dark"
                  >
                    <div class="tratamiento-item is-disabled">
                      <b-checkbox
                        :model-value="false"
                        :native-value="trat"
                        size="is-small"
                        type="is-primary"
                        disabled
                      >
                        {{ trat }} <i class="fas fa-lock ml-1"></i>
                      </b-checkbox>
                    </div>
                  </b-tooltip>

                  <!-- Compatible -->
                  <div v-else class="tratamiento-item">
                    <b-checkbox v-model="selectedTratamientos" :native-value="trat" size="is-small" type="is-primary">
                      {{ trat }}
                    </b-checkbox>
                  </div>
                </div>
              </div>

              <p class="help is-danger mt-2" v-if="!hasAnyAllowedTratamiento">
                No hay tratamientos compatibles con la selección actual.
              </p>
            </b-field>
          </transition>

          <!-- TAGS -->
          <transition-group name="tag-list" tag="div" class="tags mb-3">
            <span v-for="(tag, i) in selectedTratamientos" :key="tag" class="tag is-info is-light is-rounded">
              {{ tag }}
              <button
                class="delete is-small"
                @click.prevent="removeTratamiento(i)"
                aria-label="Eliminar tratamiento"
              ></button>
            </span>
          </transition-group>

          <!-- Nombre autogenerado -->
          <b-field label="Nombre generado automáticamente">
            <b-input v-model="newSheetName" disabled expanded />
          </b-field>

          <b-button
            type="is-primary"
            native-type="submit"
            size="is-small"
            :disabled="!canCreate || creatingSheet"
            :loading="creatingSheet"
          >
            <span v-if="!creatingSheet">Crear Planilla</span>
            <span v-else>Creando planilla…</span>
          </b-button>
        </form>
      </div>

      <!-- EXISTENTES -->
      <div v-else>
        <slot :activeId="activeId" :activeInternal="activeInternalTab" :activeSheet="activeSheetObj"></slot>

        <!-- TABS INTERNAS -->
        <div class="sheet-tabs" v-if="internalTabs.length">
          <div
            v-for="tab in internalTabs"
            :key="tab.id"
            class="sheet-tab"
            :class="{ active: activeInternalTab === tab.id }"
            @click="handleInternalTabClick(tab.id)"
          >
            {{ tab.label }}
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL ACCIONES -->
    <b-modal
      v-model="isActionsOpen"
      has-modal-card
      :can-cancel="['escape']"
      :width="760"
      trap-focus
      scroll="keep"
      custom-class="rsbo-sheet-actions-modal"
    >
      <div class="modal-card rsbo-actions-card">
        <!-- Header opaco -->
        <header class="modal-card-head rsbo-actions-head">
          <div class="pill-row">
            <span class="pill strong">{{ selectedSheet?.name || "Planilla" }}</span>

            <!-- ✅ SKU visible -->
            <span class="pill" v-if="selectedSheet?.sku">SKU: {{ selectedSheet.sku }}</span>

            <span class="pill">Tipo: {{ tipoHuman(selectedSheet?.tipo_matriz) }}</span>
            <span class="pill" v-if="selectedSheet?.material">Material: {{ selectedSheet.material }}</span>
            <span class="pill" v-if="selectedSheet?.tratamientos?.length">
              Tratamientos: {{ selectedSheet.tratamientos.join(" + ") }}
            </span>
          </div>
          <button class="delete" aria-label="close" @click="isActionsOpen = false"></button>
        </header>

        <section class="modal-card-body rsbo-actions-body">
          <!-- SKU visible (solo lectura) -->
          <b-field label="SKU" class="mb-3">
            <b-input :value="selectedSheet?.sku || ''" disabled expanded />
          </b-field>

          <!-- ABRIR -->
          <div class="action-card primary">
            <div class="action-icon primary"><i class="far fa-table"></i></div>
            <div class="action-content">
              <div class="action-title">Abrir planilla</div>
              <div class="action-desc">Ir a la planilla y gestionarla.</div>
              <div class="mt-2">
                <b-button type="is-primary" @click="openSheet">Abrir</b-button>
              </div>
            </div>
          </div>

          <!-- RENOMBRAR -->
          <div class="action-card">
            <div class="action-icon"><i class="far fa-edit"></i></div>
            <div class="action-content">
              <div class="action-title">Renombrar</div>
              <div class="action-desc">Cambiar el nombre visible de la planilla</div>
              <div class="rename-row">
                <b-field label="Nuevo nombre" class="rename-field">
                  <b-input v-model.trim="renameName" placeholder="Escribe el nuevo nombre" maxlength="80" />
                </b-field>
                <b-button
                  type="is-primary"
                  :disabled="!renameName || renameName === selectedSheet?.name"
                  :loading="renaming"
                  @click="confirmRename"
                >
                  Guardar
                </b-button>
              </div>
            </div>
          </div>

          <!-- NOTAS Y OBSERVACIONES -->
          <div class="action-card" :class="{ 'meta-glow': metaGlow }">
            <div class="action-icon"><i class="far fa-comment-dots"></i></div>
            <div class="action-content">
              <div class="action-title">Notas y observaciones</div>
              <div class="action-desc">
                Guarda comentarios internos sobre la planilla (no afectan el stock).
              </div>

              <div class="meta-grid">
                <b-field label="Observaciones">
                  <b-input v-model.trim="metaForm.observaciones" type="textarea" rows="2" maxlength="500" />
                </b-field>

                <b-field label="Notas">
                  <b-input v-model.trim="metaForm.notas" type="textarea" rows="2" maxlength="500" />
                </b-field>
              </div>

              <div class="buttons is-right mt-2 meta-actions-row">
                <div class="meta-status-wrapper">
                  <transition name="fade-status">
                    <div v-if="metaStatus !== 'idle'" class="meta-status" :class="metaStatus">
                      <span v-if="metaStatus === 'saving'" class="dot-pulse"></span>
                      <i v-else-if="metaStatus === 'saved'" class="far fa-check-circle"></i>
                      <i v-else-if="metaStatus === 'error'" class="far fa-exclamation-triangle"></i>
                      <span class="meta-status-text">{{ metaStatusMessage }}</span>
                    </div>
                  </transition>
                </div>

                <b-button
                  type="is-primary"
                  size="is-small"
                  :loading="savingMeta"
                  :disabled="!canSaveMeta"
                  @click="confirmSaveMeta"
                >
                  <span v-if="!savingMeta">Guardar notas</span>
                  <span v-else>Sincronizando…</span>
                </b-button>
              </div>
            </div>
          </div>

          <!-- ENVIAR A PAPELERA (soft-delete con /trash) -->
          <div class="action-card danger">
            <div class="action-icon danger"><i class="far fa-trash-alt"></i></div>
            <div class="action-content">
              <div class="action-title">Enviar a papelera</div>

              <div class="confirm-space">
                <div v-show="confirmingDelete" class="confirm-inline">
                  <span class="confirm-text">
                    ¿Enviar <strong class="truncate">{{ selectedSheet?.name }}</strong> a la papelera?
                  </span>
                  <div class="buttons are-small ml-2">
                    <b-button @click="confirmingDelete = false">Cancelar</b-button>
                    <b-button type="is-danger" :loading="deleting" @click="softDelete">Sí, enviar</b-button>
                  </div>
                </div>

                <div class="mt-2" v-show="!confirmingDelete">
                  <b-button type="is-danger" outlined @click="confirmingDelete = true">Enviar a papelera</b-button>
                </div>
              </div>
            </div>
          </div>

          <div class="audit-row">
            <button class="audit-btn" disabled><i class="far fa-shield-check"></i> Cambios auditados</button>
          </div>
        </section>

        <footer class="modal-card-foot rsbo-actions-foot">
          <b-button @click="isActionsOpen = false">Cerrar</b-button>
        </footer>
      </div>
    </b-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from "vue";
import Sortable from "sortablejs";
import { createSheet, updateSheet, moveSheetToTrash } from "@/services/inventory";

const props = defineProps({
  initialSheets: { type: Array, required: true },
  activeId: { type: String, required: true },
  configuracion: { type: Object, required: true },
  actor: { type: Object, default: null },
  loadingTabs: { type: Boolean, default: false }
});

const emit = defineEmits([
  "update:active",
  "reorder",
  "crear",
  "update:internal",
  "deleted",
  "renamed"
]);

/* ===================== ✅ NORMALIZADOR (FIX SKU NULL) ===================== */
/**
 * El backend puede mandar:
 * - id o _id
 * - name o nombre
 * - sku o SKU
 * Si el front esperaba `id/name` y venía `_id/nombre`, se pierde `sku` en el modelo local.
 * Esto lo vuelve 100% consistente.
 */
const normalizeSheet = (s) => {
  if (!s) return null;
  const id = String(s.id ?? s._id ?? "");
  const name = String(s.name ?? s.nombre ?? "");
  const skuRaw = s.sku ?? s.SKU ?? null;

  return {
    ...s,
    id,
    name,
    sku: skuRaw ? String(skuRaw) : null,
    tratamientos: Array.isArray(s.tratamientos) ? s.tratamientos : [],
    meta: s.meta && typeof s.meta === "object" ? s.meta : { observaciones: "", notas: "" },
    tabs: Array.isArray(s.tabs) ? s.tabs : []
  };
};

const mapSheets = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map(normalizeSheet)
    .filter(Boolean);

/* ===== Tabs ===== */
const sheets = ref(mapSheets(props.initialSheets));
watch(
  () => props.initialSheets,
  (v) => (sheets.value = mapSheets(v)),
  { deep: true, immediate: true }
);

const activeId = computed(() => props.activeId);
const activeSheetObj = computed(() => sheets.value.find((s) => s.id === activeId.value));

/* ===== Tabs internas ===== */
const activeInternalTab = ref(null);
const internalTabs = computed(() => {
  const t = activeSheetObj.value?.tipo_matriz;
  if (!t) return [];

  if (t === "SPH_ADD" || t === "SPH_CYL") {
    return [
      { id: "sph-neg", label: "SPH (-)" },
      { id: "sph-pos", label: "SPH (+)" }
    ];
  }

  if (t === "BASE" || t === "BASE_ADD") {
    return [
      { id: "base-neg", label: "BASE (-)" },
      { id: "base-pos", label: "BASE (+)" }
    ];
  }

  return [];
});

watch(
  internalTabs,
  (tabs) => {
    const first = tabs[0]?.id || null;
    activeInternalTab.value = first;
    emit("update:internal", first);
  },
  { immediate: true }
);
const handleInternalTabClick = (id) => {
  activeInternalTab.value = id;
  emit("update:internal", id);
};

/* ===== Crear ===== */
const selectedBase = ref(null);
const selectedMaterial = ref(null);
const selectedTratamientos = ref([]);
const newSheetName = ref("");
const creatingSheet = ref(false);

const allMaterials = ["Polycarbonato", "CR-39", "1.56", "1.61", "1.74"];
const allTratamientos = ["Antirreflejo", "Fotocromático", "Tinte Gris", "Blue Light", "Endurecido"];

/* Nombre autogenerado */
watch([selectedBase, selectedMaterial, selectedTratamientos], () => {
  const baseCfg = selectedBase.value && props.configuracion.bases[selectedBase.value];
  const baseLabel = baseCfg ? baseCfg.label : "";
  const materialLabel = selectedMaterial.value || "";
  const tratamientosLabel = selectedTratamientos.value.join(" + ");
  newSheetName.value = [baseLabel, materialLabel, tratamientosLabel].filter(Boolean).join(" | ");
});

const selectBase = (base) => {
  selectedBase.value = base;
  selectedMaterial.value = null;
  selectedTratamientos.value = [];
};
const selectMaterial = (mat) => {
  if (!isMaterialAllowed(mat)) return;
  selectedMaterial.value = mat;
  selectedTratamientos.value = [];
};
const isMaterialAllowed = (mat) => {
  if (!selectedBase.value) return false;
  const b = props.configuracion.bases[selectedBase.value];
  return b && b.materiales.includes(mat);
};
const isTratamientoAllowed = (trat) => {
  if (!selectedBase.value) return false;
  const b = props.configuracion.bases[selectedBase.value];
  return b && b.tratamientos.includes(trat);
};
const removeTratamiento = (i) => selectedTratamientos.value.splice(i, 1);

const canCreate = computed(
  () =>
    !!selectedBase.value &&
    !!selectedMaterial.value &&
    selectedTratamientos.value.length > 0 &&
    !!newSheetName.value
);

/* Feedback helpers */
const hasAnyAllowedMaterial = computed(() => allMaterials.some((m) => isMaterialAllowed(m)));
const hasAnyAllowedTratamiento = computed(() => allTratamientos.some((t) => isTratamientoAllowed(t)));
const baseLabel = computed(() => {
  const b = selectedBase.value && props.configuracion.bases[selectedBase.value];
  return b ? b.label : "";
});

/* Map baseKey -> tipo_matriz */
const mapBaseToTipoMatriz = (baseKey) => {
  const cfg = props.configuracion.bases[baseKey];
  if (cfg?.tipo_matriz) return cfg.tipo_matriz;
  if (baseKey === "monofocal") return "BASE";
  if (baseKey === "monofocalEsfCil") return "SPH_CYL";
  if (baseKey === "bifocal") return "SPH_ADD";
  if (baseKey === "progresivo") return "BASE_ADD";
  if (baseKey === "base" || baseKey === "bases") return "BASE";
  return "SPH_CYL";
};

/* Actor */
const actorRef = computed(() => {
  const src =
    props.actor ||
    (typeof window !== "undefined" ? window.__currentUser : null) ||
    null;
  return src && (src.id || src.userId)
    ? { userId: src.id || src.userId, name: src.name }
    : null;
});

/* Crear */
const handleCrear = async () => {
  if (!canCreate.value) return;
  creatingSheet.value = true;
  await nextTick();
  try {
    const baseCfg = props.configuracion.bases[selectedBase.value];
    const tipo_matriz = mapBaseToTipoMatriz(selectedBase.value);

    const payload = {
      nombre: newSheetName.value,
      baseKey: selectedBase.value,
      base: baseCfg?.label || selectedBase.value,
      material: selectedMaterial.value,
      tratamientos: [...selectedTratamientos.value],
      tipo_matriz,
      seed: true,
      autoGenerate: true,
      actor: actorRef.value || undefined
    };

    const { data } = await createSheet(payload);
    const s = data?.data?.sheet;
    const tabs = data?.data?.tabs || [];
    if (!s) throw new Error("Sin hoja en respuesta");

    // ✅ pasa por normalizador: asegura id/name/sku aunque el back venga con _id/nombre
    const newTab = normalizeSheet({ ...s, tabs });

    const addIndex = sheets.value.findIndex((x) => x.id === "nueva");
    sheets.value.splice(addIndex >= 0 ? addIndex : sheets.value.length, 0, newTab);

    emit("update:active", newTab.id);
    emit("crear", { payload, result: s, tabs });

    // reset form
    selectedBase.value = null;
    selectedMaterial.value = null;
    selectedTratamientos.value = [];
    newSheetName.value = "";
  } catch (err) {
    console.error("Error al crear planilla:", err?.response?.data || err);
    alert("No se pudo crear la planilla");
  } finally {
    creatingSheet.value = false;
  }
};

/* Drag & Drop de tabs */
const tabsContainer = ref(null);
onMounted(() => {
  if (!tabsContainer.value) return;
  Sortable.create(tabsContainer.value, {
    animation: 150,
    ghostClass: "sortable-ghost",
    filter: ".tab-agregar",
    preventOnFilter: false,
    delay: 200,
    delayOnTouchOnly: true,
    onMove: (evt) => {
      if (props.loadingTabs) return false;
      const relatedEl = evt.related;
      if (relatedEl && relatedEl.classList.contains("tab-agregar")) {
        evt.dragged.classList.add("shake", "shake-color");
        setTimeout(() => evt.dragged.classList.remove("shake", "shake-color"), 300);
        return false;
      }
      return true;
    },
    onEnd: (evt) => {
      if (props.loadingTabs) return;

      const maxIndex = sheets.value.length - 1;
      const oldIndex = evt.oldIndex;
      let newIndex = evt.newIndex;

      if (newIndex >= maxIndex) {
        evt.from.insertBefore(evt.item, evt.from.children[oldIndex]);
        return;
      }
      if (oldIndex === newIndex) return;

      const moved = sheets.value.splice(oldIndex, 1)[0];
      sheets.value.splice(newIndex, 0, moved);
      emit("reorder", { oldIndex, newIndex });
    }
  });
});

/* Modal acciones */
const isActionsOpen = ref(false);
const selectedSheet = ref(null);
const renameName = ref("");
const renaming = ref(false);
const confirmingDelete = ref(false);
const deleting = ref(false);

/* Meta: notas y observaciones */
const metaForm = ref({ observaciones: "", notas: "" });
const savingMeta = ref(false);
const metaStatus = ref("idle"); // 'idle' | 'saving' | 'saved' | 'error'
const metaStatusMessage = ref("");
const metaGlow = ref(false);

const canSaveMeta = computed(() => !!selectedSheet.value);

const loadMetaFromSheet = (sheet) => {
  const meta = sheet?.meta || {};
  metaForm.value = {
    observaciones: meta.observaciones || "",
    notas: meta.notas || ""
  };
  metaStatus.value = "idle";
  metaStatusMessage.value = "";
  metaGlow.value = false;
};

const confirmSaveMeta = async () => {
  if (!selectedSheet.value) return;
  savingMeta.value = true;
  metaStatus.value = "saving";
  metaStatusMessage.value = "Conectando con el servidor…";

  try {
    const { id } = selectedSheet.value;
    const metaPayload = {
      observaciones: metaForm.value.observaciones || "",
      notas: metaForm.value.notas || ""
    };

    const { data } = await updateSheet(id, {
      meta: metaPayload,
      actor: actorRef.value || undefined
    });

    const updated = data?.data?.sheet;
    const tabs = data?.data?.tabs;

    if (updated) {
      const norm = normalizeSheet(updated);
      const idx = sheets.value.findIndex((s) => s.id === id);
      const newTabs = tabs || (idx >= 0 ? sheets.value[idx].tabs : selectedSheet.value?.tabs || []);

      if (idx >= 0) {
        sheets.value[idx] = normalizeSheet({ ...sheets.value[idx], ...norm, tabs: newTabs });
      }

      if (selectedSheet.value) {
        selectedSheet.value = normalizeSheet({ ...selectedSheet.value, ...norm, tabs: newTabs });
      }

      metaStatus.value = "saved";
      metaStatusMessage.value = "Notas sincronizadas correctamente";
      metaGlow.value = true;
      setTimeout(() => (metaGlow.value = false), 900);
      setTimeout(() => {
        metaStatus.value = "idle";
        metaStatusMessage.value = "";
      }, 1800);
    } else {
      metaStatus.value = "error";
      metaStatusMessage.value = "No se pudo actualizar la planilla";
    }
  } catch (e) {
    console.error("update meta error:", e?.response?.data || e);
    metaStatus.value = "error";
    metaStatusMessage.value = "Error al guardar notas";
  } finally {
    savingMeta.value = false;
  }
};

const tipoHuman = (t) =>
  ({
    BASE: "Monofocal (Base)",
    SPH_CYL: "Monofocal (Esf/Cil)",
    SPH_ADD: "Bifocal (SPH + ADD)",
    BASE_ADD: "Progresivo (BASE + ADD)"
  }[t] || t);

const openActions = (sheet) => {
  selectedSheet.value = normalizeSheet(sheet);
  renameName.value = selectedSheet.value?.name || "";
  confirmingDelete.value = false;
  loadMetaFromSheet(selectedSheet.value);
  isActionsOpen.value = true;
};

const openSheet = () => {
  if (!selectedSheet.value) return;
  emit("update:active", selectedSheet.value.id);
  isActionsOpen.value = false;
};

const confirmRename = async () => {
  if (!renameName.value || renameName.value === selectedSheet.value.name) return;
  renaming.value = true;
  try {
    const { id } = selectedSheet.value;
    const { data } = await updateSheet(id, {
      nombre: renameName.value,
      actor: actorRef.value || undefined
    });
    const updated = data?.data?.sheet;
    if (updated) {
      const norm = normalizeSheet(updated);
      const idx = sheets.value.findIndex((s) => s.id === id);
      if (idx >= 0) sheets.value[idx] = normalizeSheet({ ...sheets.value[idx], ...norm });

      emit("renamed", { id, nombre: norm.name });
    }
  } catch (e) {
    console.error("rename error:", e?.response?.data || e);
    alert("No se pudo renombrar");
  } finally {
    renaming.value = false;
  }
};

const softDelete = async () => {
  deleting.value = true;
  try {
    const id = selectedSheet.value.id;
    await moveSheetToTrash(id, actorRef.value || undefined);

    const idx = sheets.value.findIndex((s) => s.id === id);
    if (idx >= 0) sheets.value.splice(idx, 1);

    if (activeId.value === id) {
      const next =
        sheets.value[idx] ||
        sheets.value[idx - 1] ||
        sheets.value.find((s) => s.id !== "nueva") ||
        { id: "nueva" };
      emit("update:active", String(next.id));
    }

    emit("deleted", { id });
    isActionsOpen.value = false;
  } catch (e) {
    console.error("trash (soft) error:", e?.response?.data || e);
    alert("No se pudo enviar a la papelera");
  } finally {
    deleting.value = false;
    confirmingDelete.value = false;
  }
};

const handleTabClick = (id) => {
  if (props.loadingTabs) return;
  emit("update:active", id);
};
</script>

<style scoped>
.plantillas-contenedor {
  background: #fff;
  border: 1px solid rgba(113, 77, 210, 0.12);
  border-radius: 0 6px 6px 6px;
  min-height: 140px;
  box-shadow: 0 6px 18px rgba(113, 77, 210, 0.04);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

/* ===== Tabs ===== */
.tabs-wrapper {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  gap: 0.25rem;
  border-bottom: 2px solid #dbdbdb;
}

.tab-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  max-width: 260px;
  padding: 0.35rem 1.6rem 0.35rem 0.75rem;
  font-size: 0.85rem;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  background: #f5f5f5;
  color: #4a4a4a;
  user-select: none;
  border: 1px solid #dbdbdb;
  transition: background-color 0.3s, color 0.3s, box-shadow 0.2s;
}

.tab-item.active {
  background-color: var(--rsbo-primary, #714dd2);
  color: #fff;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}

.tab-agregar {
  cursor: pointer !important;
  background: #494949;
  color: #fff;
}

.tab-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding-right: 0.5rem;
  line-height: 1.05;
}

.tab-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-sku {
  margin-top: 2px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #7a7a7a;
  opacity: 0.95;
}

.tab-item.active .tab-sku {
  color: rgba(255, 255, 255, 0.92);
  opacity: 0.95;
}

.tab-sku--empty {
  opacity: 0.5;
  font-weight: 600;
}

/* menu */
.tab-menu-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  line-height: 1;
  cursor: pointer;
  font-size: 18px;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  opacity: 0.8;
}

.tab-menu-btn:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.06);
}

/* 🔹 Skeleton para tabs */
.skeleton-tab {
  background: transparent;
  border-color: transparent;
  cursor: default;
}

.skeleton-bar {
  display: block;
  width: 110px;
  height: 0.8rem;
  border-radius: 999px;
  background: linear-gradient(90deg, #eee 0%, #f5f5f5 50%, #eee 100%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* ===== Tabs internas ===== */
.sheet-tab {
  padding: 0.25rem 0.75rem;
  font-size: 0.85rem;
  background: transparent;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  margin-right: 2px;
  cursor: pointer;
  transition: all 0.2s;
}

.sheet-tabs {
  display: flex;
  height: 34px;
  align-items: center;
  border-bottom: 1px solid #dbdbdb;
  background: #f5f5f5;
  padding-left: 0.25rem;
  border-radius: 0 0 4px 4px;
}

.sheet-tab.active {
  background: #fff;
  border-color: #dbdbdb #dbdbdb #fff;
}

.sheet-tab:hover:not(.active) {
  background: #e8e8e8;
}

/* ===== Animaciones ===== */
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20%,
  60% {
    transform: translateX(-3px);
  }
  40%,
  80% {
    transform: translateX(3px);
  }
}

.shake {
  animation: shake 0.3s;
}

.tabs-wrapper .tab-item.shake-color {
  background: red;
  color: #fff;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.55, 0, 0.1, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.tag-list-enter-active,
.tag-list-leave-active {
  transition: all 0.3s ease;
}

.tag-list-enter-from,
.tag-list-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* ===== Feedback de incompatibles ===== */
.tabs-opciones ul li.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
  filter: grayscale(0.25);
}

.tabs-opciones ul li.is-disabled a {
  text-decoration: line-through;
}

.tratamiento-item.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tratamiento-item.is-disabled :deep(input[type="checkbox"]) {
  cursor: not-allowed !important;
}

/* ===== Modal ===== */
.rsbo-actions-card {
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
}

.rsbo-actions-head {
  background: #fff;
  border-bottom: 1px solid #eee;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.pill-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.8rem;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  color: #3c3c3c;
}

.pill.strong {
  background: rgba(142, 0, 210, 0.08);
  color: var(--rsbo-primary, #8e00d2);
  border-color: rgba(142, 0, 210, 0.25);
}

.rsbo-actions-body {
  padding: 1rem 1.25rem;
  min-height: 320px;
}

.action-card {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 1rem;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
  margin-bottom: 1rem;
  transition: box-shadow 0.25s ease, border-color 0.25s ease, transform 0.18s ease;
}

.action-card.primary {
  border-color: rgba(142, 0, 210, 0.25);
}

.action-icon {
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(142, 0, 210, 0.08);
  color: var(--rsbo-primary, #8e00d2);
}

.action-icon.danger {
  background: rgba(192, 57, 43, 0.08);
  color: #c0392b;
}

.action-content {
  flex: 1;
  min-width: 0;
}

.action-title {
  font-weight: 800;
  font-size: 1rem;
  margin-bottom: 0.15rem;
}

.action-desc {
  opacity: 0.85;
  font-size: 0.9rem;
}

/* Meta */
.meta-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.meta-actions-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.meta-status-wrapper {
  flex: 1;
  min-height: 24px;
}

.meta-status {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  border: 1px solid transparent;
  background: #f5f5f5;
  color: #555;
}

.meta-status.saving {
  border-color: rgba(0, 123, 255, 0.2);
  background: rgba(0, 123, 255, 0.06);
}

.meta-status.saved {
  border-color: rgba(40, 167, 69, 0.3);
  background: rgba(40, 167, 69, 0.06);
  color: #1f6f38;
}

.meta-status.error {
  border-color: rgba(220, 53, 69, 0.3);
  background: rgba(220, 53, 69, 0.06);
  color: #b0212f;
}

.meta-status-text {
  white-space: nowrap;
}

.dot-pulse {
  position: relative;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 currentColor;
  animation: dotPulse 1s infinite linear;
}

@keyframes dotPulse {
  0% {
    box-shadow: 0 0 0 0 currentColor;
    opacity: 1;
  }
  70% {
    box-shadow: 0 0 0 6px rgba(0, 0, 0, 0);
    opacity: 0.6;
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
    opacity: 0.4;
  }
}

.meta-glow {
  box-shadow: 0 0 0 1px rgba(40, 167, 69, 0.2), 0 0 18px rgba(40, 167, 69, 0.25);
  transform: translateY(-1px);
}

.fade-status-enter-active,
.fade-status-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-status-enter-from,
.fade-status-leave-to {
  opacity: 0;
  transform: translateY(3px);
}

/* Confirmación */
.confirm-space {
  min-height: 56px;
}

.confirm-inline {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #fff5f5;
  border: 1px solid #f5c6cb;
  border-radius: 10px;
}

.confirm-text {
  flex: 1 1 auto;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.truncate {
  max-width: 260px;
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audit-row {
  display: flex;
  justify-content: flex-start;
}

.audit-btn {
  border: none;
  background: #f5f5f5;
  color: #666;
  padding: 0.55rem 0.8rem;
  border-radius: 10px;
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  cursor: not-allowed;
}

.rsbo-actions-foot {
  justify-content: flex-end;
}

.rsbo-sheet-actions-modal .modal-card {
  width: 100%;
  max-width: 760px;
}
</style>
