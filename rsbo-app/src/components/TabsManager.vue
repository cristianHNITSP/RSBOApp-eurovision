<template>
  <div :class="{ 'reduced-effects': reduceEffects }">
    <!-- ✅ Accesibilidad / efectos 
    <div class="tabs-a11y-row">
      <b-switch v-model="reduceEffects" size="is-small" type="is-dark">
        Reducir transparencias / efectos
      </b-switch>
      <span class="a11y-hint">Se guarda en este dispositivo</span>
    </div>
    -->
    
    <!-- TABS -->
    <div ref="tabsContainer" class="tabs-wrapper tabs-wrapper--glass">
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
            'tab-item--glass',
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
          <!-- ✅ NUEVO: PROVEEDOR / MARCA -->
          <transition name="fade-slide">
            <div class="columns is-multiline">
              <div class="column is-12-mobile is-6-tablet">
                <b-field label="Proveedor (opcional)">
                  <b-autocomplete
                    v-model="newProveedorName"
                    :data="filteredProveedorOptions"
                    placeholder="Ej. Eurovisión / Luxottica / …"
                    open-on-focus
                    keep-first
                    :clear-on-select="false"
                    :max-height="220"
                    :check-infinite-scroll="false"
                    @select="onSelectProveedor"
                  >
                    <template #empty>
                      <span class="has-text-grey">Sin coincidencias (puedes crear uno nuevo escribiéndolo).</span>
                    </template>
                  </b-autocomplete>
                </b-field>
              </div>

              <div class="column is-12-mobile is-6-tablet">
                <b-field label="Marca (opcional)">
                  <b-autocomplete
                    v-model="newMarcaName"
                    :data="filteredMarcaOptions"
                    placeholder="Ej. Essilor / Zeiss / …"
                    open-on-focus
                    keep-first
                    :clear-on-select="false"
                    :max-height="220"
                    :check-infinite-scroll="false"
                    @select="onSelectMarca"
                  >
                    <template #empty>
                      <span class="has-text-grey">Sin coincidencias (puedes crear una nueva escribiéndola).</span>
                    </template>
                  </b-autocomplete>
                </b-field>
              </div>
            </div>
          </transition>

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

          <!-- MATERIALES -->
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

          <!-- TRATAMIENTOS -->
          <transition name="fade-slide">
            <b-field v-if="selectedMaterial" label="Selecciona Tratamientos">
              <div class="columns is-multiline is-mobile" style="max-height: 150px; overflow-y: auto;">
                <div
                  v-for="trat in allTratamientos"
                  :key="trat"
                  class="column is-half-mobile is-one-third-tablet is-one-quarter-desktop"
                >
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
              <button class="delete is-small" @click.prevent="removeTratamiento(i)" aria-label="Eliminar tratamiento"></button>
            </span>
          </transition-group>

          <!-- Nombre autogenerado -->
          <b-field label="Nombre generado automáticamente">
            <b-input v-model="newSheetName" disabled expanded />
          </b-field>

          <div class="create-actions">
            <b-button
              type="is-primary"
              native-type="submit"
              size="is-small"
              :disabled="!canCreate || creatingSheet"
              :loading="creatingSheet"
            >
              <span v-if="!creatingSheet">Crear Planilla</span>
              <span v-else>Creando…</span>
            </b-button>

            <div class="create-status" aria-live="polite" role="status">
              <transition name="fade-status">
                <div v-if="createStatus !== 'idle'" class="meta-status" :class="createStatus">
                  <span v-if="createStatus === 'saving'" class="dot-pulse"></span>
                  <i v-else-if="createStatus === 'saved'" class="far fa-check-circle"></i>
                  <i v-else-if="createStatus === 'error'" class="far fa-exclamation-triangle"></i>
                  <span class="meta-status-text">{{ createStatusMessage }}</span>
                </div>
              </transition>
            </div>
          </div>
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
    <teleport to="body">
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
          <header class="modal-card-head rsbo-actions-head">
            <div class="pill-row">
              <span class="pill strong">{{ selectedSheet?.name || "Planilla" }}</span>
              <span class="pill" v-if="selectedSheet?.sku">SKU: {{ selectedSheet.sku }}</span>
              <span class="pill">Tipo: {{ tipoHuman(selectedSheet?.tipo_matriz) }}</span>
              <span class="pill" v-if="selectedSheet?.material">Material: {{ selectedSheet.material }}</span>
              <span class="pill" v-if="selectedSheet?.tratamientos?.length">
                Tratamientos: {{ selectedSheet.tratamientos.join(" + ") }}
              </span>
            </div>

            <button
              class="delete"
              :class="{ 'is-disabled': anySaving }"
              :disabled="anySaving"
              aria-label="close"
              :title="anySaving ? 'Hay cambios en proceso…' : 'Cerrar'"
              @click="isActionsOpen = false"
            ></button>
          </header>

          <section class="modal-card-body rsbo-actions-body">
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
                  <b-button type="is-primary" :disabled="anySaving" @click="openSheet">Abrir</b-button>
                </div>
              </div>
            </div>

            <!-- RENOMBRAR -->
            <div class="action-card" :class="{ 'rename-glow': renameGlow }">
              <div class="action-icon"><i class="far fa-edit"></i></div>
              <div class="action-content">
                <div class="action-title">Renombrar</div>
                <div class="action-desc">Cambiar el nombre visible de la planilla</div>

                <div class="rename-row">
                  <b-field label="Nuevo nombre" class="rename-field">
                    <b-input
                      v-model.trim="renameName"
                      placeholder="Escribe el nuevo nombre"
                      maxlength="80"
                      :disabled="renaming"
                    />
                  </b-field>

                  <div class="rename-actions">
                    <div class="rename-status-wrapper" aria-live="polite" role="status">
                      <transition name="fade-status">
                        <div v-if="renameStatus !== 'idle'" class="meta-status" :class="renameStatus">
                          <span v-if="renameStatus === 'saving'" class="dot-pulse"></span>
                          <i v-else-if="renameStatus === 'saved'" class="far fa-check-circle"></i>
                          <i v-else-if="renameStatus === 'error'" class="far fa-exclamation-triangle"></i>
                          <span class="meta-status-text">{{ renameStatusMessage }}</span>
                        </div>
                      </transition>
                    </div>

                    <b-button
                      type="is-primary"
                      :disabled="!canRename || renaming"
                      :loading="renaming"
                      @click="confirmRename"
                    >
                      <span v-if="!renaming">Guardar</span>
                      <span v-else>Guardando…</span>
                    </b-button>
                  </div>
                </div>
              </div>
            </div>

            <!-- NOTAS Y OBSERVACIONES -->
            <div class="action-card" :class="{ 'meta-glow': metaGlow }">
              <div class="action-icon"><i class="far fa-comment-dots"></i></div>
              <div class="action-content">
                <div class="action-title">Notas y observaciones</div>
                <div class="action-desc">Guarda comentarios internos sobre la planilla (no afectan el stock).</div>

                <div class="meta-grid">
                  <b-field label="Observaciones">
                    <b-input v-model.trim="metaForm.observaciones" type="textarea" rows="2" maxlength="500" :disabled="savingMeta" />
                  </b-field>

                  <b-field label="Notas">
                    <b-input v-model.trim="metaForm.notas" type="textarea" rows="2" maxlength="500" :disabled="savingMeta" />
                  </b-field>
                </div>

                <div class="buttons is-right mt-2 meta-actions-row">
                  <div class="meta-status-wrapper" aria-live="polite" role="status">
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
                    :disabled="!canSaveMeta || savingMeta"
                    @click="confirmSaveMeta"
                  >
                    <span v-if="!savingMeta">Guardar notas</span>
                    <span v-else>Sincronizando…</span>
                  </b-button>
                </div>
              </div>
            </div>

            <!-- PAPELERA -->
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
                      <b-button :disabled="deleting" @click="confirmingDelete = false">Cancelar</b-button>
                      <b-button type="is-danger" :loading="deleting" :disabled="deleting" @click="softDelete">
                        <span v-if="!deleting">Sí, enviar</span>
                        <span v-else>Enviando…</span>
                      </b-button>
                    </div>
                  </div>

                  <div class="mt-2" v-show="!confirmingDelete">
                    <b-button type="is-danger" outlined :disabled="anySaving" @click="confirmingDelete = true">
                      Enviar a papelera
                    </b-button>
                  </div>

                  <div class="mt-2" aria-live="polite" role="status">
                    <transition name="fade-status">
                      <div v-if="trashStatus !== 'idle'" class="meta-status" :class="trashStatus">
                        <span v-if="trashStatus === 'saving'" class="dot-pulse"></span>
                        <i v-else-if="trashStatus === 'saved'" class="far fa-check-circle"></i>
                        <i v-else-if="trashStatus === 'error'" class="far fa-exclamation-triangle"></i>
                        <span class="meta-status-text">{{ trashStatusMessage }}</span>
                      </div>
                    </transition>
                  </div>
                </div>
              </div>
            </div>

            <div class="audit-row">
              <button class="audit-btn" disabled><i class="far fa-shield-check"></i> Cambios auditados</button>
            </div>
          </section>

          <footer class="modal-card-foot rsbo-actions-foot">
            <b-button :disabled="anySaving" @click="isActionsOpen = false">
              <span v-if="!anySaving">Cerrar</span>
              <span v-else>Procesando…</span>
            </b-button>
          </footer>
        </div>
      </b-modal>
    </teleport>
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

/* ===================== ✅ UI PREFS (reduce effects) ===================== */
const UI_PREFS_KEY = "rsbo_ui_prefs_v1";
const reduceEffects = ref(false);

const readPrefs = () => {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writePrefs = (prefs) => {
  try {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs || {}));
  } catch {}
};

onMounted(() => {
  // default: respeta prefers-reduced-motion si no hay config guardada
  const saved = readPrefs();
  const mediaReduce = typeof window !== "undefined"
    ? window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    : false;

  reduceEffects.value = saved?.reduceEffects ?? !!mediaReduce;
});

watch(reduceEffects, (v) => {
  const saved = readPrefs() || {};
  writePrefs({ ...saved, reduceEffects: !!v });
});

/* ===================== ✅ NORMALIZADOR (FIX SKU NULL) ===================== */
const normalizeSheet = (s) => {
  if (!s) return null;
  const id = String(s.id ?? s._id ?? "");
  const name = String(s.name ?? s.nombre ?? "");
  const skuRaw = s.sku ?? s.SKU ?? null;

  const proveedor =
    s.proveedor && typeof s.proveedor === "object"
      ? { id: s.proveedor.id ?? null, name: String(s.proveedor.name ?? "") }
      : { id: null, name: String(s.proveedor || "") };

  const marca =
    s.marca && typeof s.marca === "object"
      ? { id: s.marca.id ?? null, name: String(s.marca.name ?? "") }
      : { id: null, name: String(s.marca || "") };

  return {
    ...s,
    id,
    name,
    sku: skuRaw ? String(skuRaw) : null,
    proveedor,
    marca,
    tratamientos: Array.isArray(s.tratamientos) ? s.tratamientos : [],
    meta: s.meta && typeof s.meta === "object" ? s.meta : { observaciones: "", notas: "" },
    tabs: Array.isArray(s.tabs) ? s.tabs : []
  };
};

const mapSheets = (arr) => (Array.isArray(arr) ? arr : []).map(normalizeSheet).filter(Boolean);

/* ===== Tabs ===== */
const sheets = ref(mapSheets(props.initialSheets));
watch(
  () => props.initialSheets,
  (v) => (sheets.value = mapSheets(v)),
  { deep: true, immediate: true }
);

/* ===================== ✅ Autocomplete Proveedor/Marca (faltaba) ===================== */
const normTxt = (s) =>
  String(s || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const uniqueNamesFromSheets = (getter) => {
  const set = new Map();
  for (const sh of sheets.value || []) {
    if (sh?.id === "nueva") continue;
    const raw = getter(sh);
    const pretty = String(raw || "").trim();
    if (!pretty) continue;
    const key = normTxt(pretty);
    if (!key) continue;
    if (!set.has(key)) set.set(key, pretty);
  }
  return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
};

const proveedorOptions = computed(() => uniqueNamesFromSheets((s) => s?.proveedor?.name));
const marcaOptions = computed(() => uniqueNamesFromSheets((s) => s?.marca?.name));

const newProveedorName = ref("");
const newMarcaName = ref("");

const filteredProveedorOptions = computed(() => {
  const q = normTxt(newProveedorName.value);
  const base = proveedorOptions.value;
  if (!q) return base.slice(0, 30);
  return base.filter((x) => normTxt(x).includes(q)).slice(0, 30);
});

const filteredMarcaOptions = computed(() => {
  const q = normTxt(newMarcaName.value);
  const base = marcaOptions.value;
  if (!q) return base.slice(0, 30);
  return base.filter((x) => normTxt(x).includes(q)).slice(0, 30);
});

const onSelectProveedor = (val) => {
  if (typeof val === "string") newProveedorName.value = val;
};
const onSelectMarca = (val) => {
  if (typeof val === "string") newMarcaName.value = val;
};

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

/* ===================== ✅ Helpers de feedback ===================== */
const errMsg = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

/* ===== Crear ===== */
const selectedBase = ref(null);
const selectedMaterial = ref(null);
const selectedTratamientos = ref([]);
const newSheetName = ref("");
const creatingSheet = ref(false);

const createStatus = ref("idle");
const createStatusMessage = ref("");
const resetCreateStatus = () => {
  createStatus.value = "idle";
  createStatusMessage.value = "";
};

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
    !!newSheetName.value &&
    !creatingSheet.value
);

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
  const src = props.actor || (typeof window !== "undefined" ? window.__currentUser : null) || null;
  return src && (src.id || src.userId) ? { userId: src.id || src.userId, name: src.name } : null;
});

/* Crear */
const handleCrear = async () => {
  if (!canCreate.value || creatingSheet.value) return;

  creatingSheet.value = true;
  createStatus.value = "saving";
  createStatusMessage.value = "Validando selección…";
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

      proveedor: { id: null, name: (newProveedorName.value || "").trim() },
      marca: { id: null, name: (newMarcaName.value || "").trim() },

      actor: actorRef.value || undefined
    };

    createStatusMessage.value = "Subiendo planilla…";
    const { data } = await createSheet(payload);

    createStatusMessage.value = "Aplicando respuesta…";
    const s = data?.data?.sheet;
    const tabs = data?.data?.tabs || [];
    if (!s) throw new Error("Sin hoja en respuesta");

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
    newProveedorName.value = "";
    newMarcaName.value = "";

    createStatus.value = "saved";
    createStatusMessage.value = "Planilla creada correctamente";
    setTimeout(() => resetCreateStatus(), 1800);
  } catch (e) {
    console.error("Error al crear planilla:", e?.response?.data || e);
    createStatus.value = "error";
    createStatusMessage.value = errMsg(e, "No se pudo crear la planilla");
    setTimeout(() => resetCreateStatus(), 2600);
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
        // ✅ si reduced effects, evitamos shake (no molestar)
        if (!reduceEffects.value) {
          evt.dragged.classList.add("shake", "shake-color");
          setTimeout(() => evt.dragged.classList.remove("shake", "shake-color"), 300);
        }
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

const renameStatus = ref("idle");
const renameStatusMessage = ref("");
const renameGlow = ref(false);

const resetRenameStatus = () => {
  renameStatus.value = "idle";
  renameStatusMessage.value = "";
  renameGlow.value = false;
};

const canRename = computed(() => {
  const current = (selectedSheet.value?.name || "").trim();
  const next = (renameName.value || "").trim();
  return !!selectedSheet.value && !renaming.value && next.length > 0 && next !== current;
});

const metaForm = ref({ observaciones: "", notas: "" });
const savingMeta = ref(false);
const metaStatus = ref("idle");
const metaStatusMessage = ref("");
const metaGlow = ref(false);

const canSaveMeta = computed(() => !!selectedSheet.value && !savingMeta.value);

const trashStatus = ref("idle");
const trashStatusMessage = ref("");
const resetTrashStatus = () => {
  trashStatus.value = "idle";
  trashStatusMessage.value = "";
};

const anySaving = computed(() => creatingSheet.value || renaming.value || savingMeta.value || deleting.value);

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
  if (!selectedSheet.value || savingMeta.value) return;

  savingMeta.value = true;
  metaStatus.value = "saving";
  metaStatusMessage.value = "Sincronizando…";

  try {
    const { id } = selectedSheet.value;

    // ✅ Solo mandamos lo que editas, NO ranges
    const metaPayload = {
      observaciones: metaForm.value.observaciones || "",
      notas: metaForm.value.notas || ""
    };

    const { data } = await updateSheet(id, {
      meta: metaPayload,
      actor: actorRef.value || undefined
    });

    if (!data || data.ok === false) throw new Error(data?.message || "El servidor rechazó el cambio");

    const updated = data?.data?.sheet;
    const tabs = data?.data?.tabs;

    if (updated) {
      const norm = normalizeSheet(updated);
      const idx = sheets.value.findIndex((s) => s.id === id);
      const newTabs = tabs || (idx >= 0 ? sheets.value[idx].tabs : selectedSheet.value?.tabs || []);

      if (idx >= 0) sheets.value[idx] = normalizeSheet({ ...sheets.value[idx], ...norm, tabs: newTabs });
      selectedSheet.value = normalizeSheet({ ...selectedSheet.value, ...norm, tabs: newTabs });

      metaStatus.value = "saved";
      metaStatusMessage.value = "Notas sincronizadas";
      if (!reduceEffects.value) {
        metaGlow.value = true;
        setTimeout(() => (metaGlow.value = false), 900);
      }
      setTimeout(() => {
        metaStatus.value = "idle";
        metaStatusMessage.value = "";
      }, 1800);
    } else {
      throw new Error("No se pudo actualizar la planilla");
    }
  } catch (e) {
    console.error("update meta error:", e?.response?.data || e);
    metaStatus.value = "error";
    metaStatusMessage.value = errMsg(e, "Error al guardar notas");
    setTimeout(() => {
      metaStatus.value = "idle";
      metaStatusMessage.value = "";
    }, 2400);
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

  resetRenameStatus();
  resetTrashStatus();

  loadMetaFromSheet(selectedSheet.value);
  isActionsOpen.value = true;
};

const openSheet = () => {
  if (!selectedSheet.value) return;
  emit("update:active", selectedSheet.value.id);
  isActionsOpen.value = false;
};

const confirmRename = async () => {
  const nextName = (renameName.value || "").trim();
  if (!selectedSheet.value || renaming.value) return;

  const currentName = (selectedSheet.value.name || "").trim();
  if (!nextName || nextName === currentName) return;

  renaming.value = true;
  renameStatus.value = "saving";
  renameStatusMessage.value = "Guardando…";
  renameGlow.value = false;

  try {
    const { id } = selectedSheet.value;

    const { data } = await updateSheet(id, {
      nombre: nextName,
      actor: actorRef.value || undefined
    });

    if (!data || data.ok === false) throw new Error(data?.message || "El servidor rechazó el cambio");

    const updated = data?.data?.sheet;
    if (!updated) throw new Error("Respuesta inválida: falta data.sheet");

    const norm = normalizeSheet(updated);

    const idx = sheets.value.findIndex((s) => s.id === id);
    if (idx >= 0) sheets.value[idx] = normalizeSheet({ ...sheets.value[idx], ...norm });

    selectedSheet.value = normalizeSheet({ ...selectedSheet.value, ...norm, tabs: selectedSheet.value?.tabs || [] });
    renameName.value = norm.name;

    emit("renamed", { id, nombre: norm.name });

    renameStatus.value = "saved";
    renameStatusMessage.value = "Nombre actualizado";
    if (!reduceEffects.value) {
      renameGlow.value = true;
      setTimeout(() => (renameGlow.value = false), 900);
    }
    setTimeout(() => resetRenameStatus(), 1800);
  } catch (e) {
    console.error("rename error:", e?.response?.data || e);
    renameStatus.value = "error";
    renameStatusMessage.value = errMsg(e, "No se pudo renombrar");
    setTimeout(() => resetRenameStatus(), 2300);
  } finally {
    renaming.value = false;
  }
};

const softDelete = async () => {
  if (!selectedSheet.value || deleting.value) return;

  deleting.value = true;
  trashStatus.value = "saving";
  trashStatusMessage.value = "Enviando a papelera…";

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

    trashStatus.value = "saved";
    trashStatusMessage.value = "Enviado a papelera";
    setTimeout(() => {
      resetTrashStatus();
      isActionsOpen.value = false;
    }, 900);
  } catch (e) {
    console.error("trash (soft) error:", e?.response?.data || e);
    trashStatus.value = "error";
    trashStatusMessage.value = errMsg(e, "No se pudo enviar a la papelera");
    setTimeout(() => resetTrashStatus(), 2600);
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
/* ✅ Accesibilidad row */
.tabs-a11y-row{
  display:flex;
  align-items:center;
  justify-content:flex-end;
  gap:.6rem;
  padding:.35rem .55rem .2rem;
}
.a11y-hint{
  font-size:.78rem;
  opacity:.65;
}

/* =========================
   CONTENEDOR (card)
   ========================= */
.plantillas-contenedor {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 14px;
  min-height: 140px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.10);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  overflow: hidden;
}

/* =========================
   TABS WRAPPER (glass + fade)
   ========================= */
.tabs-wrapper {
  position: relative;
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  gap: 0.35rem;
  padding: 0.55rem 0.55rem 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
  -webkit-overflow-scrolling: touch;
}

.tabs-wrapper--glass {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* Fade lateral para indicar scroll */
.tabs-wrapper::before,
.tabs-wrapper::after {
  content: "";
  position: sticky;
  top: 0;
  width: 20px;
  height: 100%;
  flex: 0 0 20px;
  pointer-events: none;
  z-index: 2;
}

.tabs-wrapper::before {
  left: 0;
  margin-left: -0.55rem;
  background: linear-gradient(90deg, rgba(255,255,255,0.92), rgba(255,255,255,0));
}

.tabs-wrapper::after {
  right: 0;
  margin-right: -0.55rem;
  background: linear-gradient(270deg, rgba(255,255,255,0.92), rgba(255,255,255,0));
}

/* scrollbar suave */
.tabs-wrapper::-webkit-scrollbar {
  height: 8px;
}
.tabs-wrapper::-webkit-scrollbar-thumb {
  background: rgba(148,163,184,0.35);
  border-radius: 999px;
}
.tabs-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

/* =========================
   TAB ITEM (glass)
   ========================= */
.tab-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  max-width: 280px;
  padding: 0.45rem 2.1rem 0.45rem 0.75rem;
  font-size: 0.86rem;
  border-radius: 12px 12px 0 0;
  cursor: pointer;
  user-select: none;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-bottom: none;
  transition: transform 0.16s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease;
  will-change: transform;
}

.tab-item--glass {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #0f172a;
}

.tab-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.10);
}

.tab-item.active {
  background: linear-gradient(90deg, rgba(121, 87, 213, 0.18), rgba(236, 72, 153, 0.10));
  color: #0f172a;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.12);
  border-color: rgba(121, 87, 213, 0.35);
}

/* indicator */
.tab-item.active::after {
  content: "";
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: -1px;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(121,87,213,1), rgba(236,72,153,0.95));
}

/* Nueva */
.tab-agregar {
  background: rgba(15, 23, 42, 0.92);
  color: #fff;
  border-color: rgba(15, 23, 42, 0.25);
  padding-right: 0.85rem;
}
.tab-agregar:hover {
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.18);
}

/* Texto */
.tab-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding-right: 0.65rem;
  line-height: 1.05;
}

.tab-label {
  font-weight: 900;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-sku {
  margin-top: 3px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(15,23,42,0.58);
}

.tab-item.active .tab-sku {
  color: rgba(15,23,42,0.70);
}

.tab-sku--empty {
  opacity: 0.55;
  font-weight: 700;
}

/* Botón ⋮ */
.tab-menu-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(255,255,255,0.72);
  line-height: 1;
  cursor: pointer;
  font-size: 16px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  opacity: 0.92;
  transition: transform 0.14s ease, box-shadow 0.2s ease, background 0.2s ease, opacity 0.2s ease;
}

.tab-menu-btn:hover {
  opacity: 1;
  transform: translateY(-50%) scale(1.03);
  background: rgba(255,255,255,0.92);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.10);
}

/* =========================
   SKELETON TABS
   ========================= */
.skeleton-tab {
  background: transparent;
  border-color: transparent;
  cursor: default;
  box-shadow: none !important;
  transform: none !important;
}

.skeleton-bar {
  display: block;
  width: 120px;
  height: 0.85rem;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(226,232,240,0.9) 0%,
    rgba(248,250,252,0.9) 50%,
    rgba(226,232,240,0.9) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.2s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* =========================
   CREATE ACTIONS (pill status)
   ========================= */
.create-actions {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
}

.create-status {
  min-height: 26px;
  display: flex;
  align-items: center;
}

/* =========================
   INTERNAL TABS (sheet tabs)
   ========================= */
.sheet-tabs {
  display: flex;
  height: 38px;
  align-items: center;
  border-top: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255,255,255,0.66);
  padding: 0.2rem 0.35rem;
}

.sheet-tab {
  padding: 0.35rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 800;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.18s ease;
  color: rgba(15,23,42,0.70);
}

.sheet-tab:hover {
  background: rgba(121,87,213,0.10);
}

.sheet-tab.active {
  background: rgba(121,87,213,0.16);
  color: rgba(15,23,42,0.92);
  box-shadow: 0 12px 24px rgba(15,23,42,0.10);
}

/* =========================
   ANIMACIONES / FEEDBACK
   ========================= */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-3px); }
  40%, 80% { transform: translateX(3px); }
}
.shake { animation: shake 0.3s; }
.tabs-wrapper .tab-item.shake-color {
  background: rgba(220, 38, 38, 0.16);
  border-color: rgba(220, 38, 38, 0.35);
}

/* Fade slide */
.fade-slide-enter-active,
.fade-slide-leave-active { transition: all 0.28s ease; }
.fade-slide-enter-from,
.fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }

/* Tags */
.tag-list-enter-active,
.tag-list-leave-active { transition: all 0.22s ease; }
.tag-list-enter-from,
.tag-list-leave-to { opacity: 0; transform: scale(0.92); }

/* =========================
   MODAL (glass + cards)
   ========================= */
.rsbo-sheet-actions-modal .modal-card { width: 100%; max-width: 760px; }

.rsbo-actions-card {
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255,255,255,0.90);
  border: 1px solid rgba(148,163,184,0.22);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.22);
}

.rsbo-actions-head {
  background: rgba(255,255,255,0.70);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(148,163,184,0.22);
}

.pill-row { display: flex; gap: 0.45rem; align-items: center; flex-wrap: wrap; }

.pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.78rem;
  background: rgba(255,255,255,0.72);
  border: 1px solid rgba(148,163,184,0.22);
  color: rgba(15,23,42,0.78);
}

.pill.strong {
  background: linear-gradient(90deg, rgba(121,87,213,0.16), rgba(236,72,153,0.10));
  border-color: rgba(121,87,213,0.35);
  color: rgba(15,23,42,0.88);
}

.rsbo-actions-body { padding: 1rem 1.25rem; min-height: 320px; }

.action-card {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 1rem;
  background: rgba(255,255,255,0.86);
  border: 1px solid rgba(148,163,184,0.22);
  border-radius: 16px;
  box-shadow: 0 18px 50px rgba(15,23,42,0.10);
  margin-bottom: 1rem;
  transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.16s ease;
}

.action-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 26px 70px rgba(15,23,42,0.14);
}

.action-card.primary { border-color: rgba(121,87,213,0.35); }
.action-card.danger { border-color: rgba(220,38,38,0.28); }

.action-icon {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: rgba(121,87,213,0.12);
  color: rgba(121,87,213,1);
}

.action-icon.danger { background: rgba(220,38,38,0.12); color: rgba(220,38,38,1); }

.action-content { flex: 1; min-width: 0; }
.action-title { font-weight: 900; font-size: 1rem; margin-bottom: 0.15rem; }
.action-desc { opacity: 0.85; font-size: 0.9rem; color: rgba(15,23,42,0.72); }

/* Status pills */
.meta-status {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 800;
  border: 1px solid transparent;
  background: rgba(248,250,252,0.85);
  color: rgba(15,23,42,0.72);
}

.meta-status.saving { border-color: rgba(59,130,246,0.25); background: rgba(59,130,246,0.08); }
.meta-status.saved { border-color: rgba(34,197,94,0.25); background: rgba(34,197,94,0.08); color: rgba(15,23,42,0.86); }
.meta-status.error { border-color: rgba(220,38,38,0.25); background: rgba(220,38,38,0.08); color: rgba(15,23,42,0.86); }

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
  0% { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
  70% { box-shadow: 0 0 0 6px rgba(0, 0, 0, 0); opacity: 0.6; }
  100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); opacity: 0.4; }
}

.fade-status-enter-active,
.fade-status-leave-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.fade-status-enter-from,
.fade-status-leave-to { opacity: 0; transform: translateY(3px); }

/* confirm danger */
.confirm-inline {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.8rem;
  background: rgba(220,38,38,0.08);
  border: 1px solid rgba(220,38,38,0.20);
  border-radius: 14px;
}

.rsbo-actions-foot { justify-content: flex-end; }
.delete.is-disabled { opacity: 0.35; cursor: not-allowed; }

@media screen and (max-width: 768px) {
  .tab-item { max-width: 220px; }
  .rsbo-actions-body { padding: 0.9rem; }
}

/* ==========================================================
   ✅ REDUCED EFFECTS MODE (reduce transparencias/gradientes)
   ========================================================== */
.reduced-effects .tabs-wrapper--glass,
.reduced-effects .tab-item--glass,
.reduced-effects .rsbo-actions-head,
.reduced-effects .rsbo-actions-card,
.reduced-effects .action-card {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.reduced-effects .tab-item.active,
.reduced-effects .pill.strong {
  background: rgba(15, 23, 42, 0.06) !important;
}

.reduced-effects .tab-item.active::after {
  background: rgba(15, 23, 42, 0.45) !important;
}

.reduced-effects .tab-item,
.reduced-effects .action-card,
.reduced-effects .sheet-tab,
.reduced-effects .plantillas-contenedor,
.reduced-effects .tab-menu-btn {
  transition: none !important;
  box-shadow: none !important;
}

.reduced-effects .tab-item:hover,
.reduced-effects .action-card:hover,
.reduced-effects .tab-menu-btn:hover {
  transform: none !important;
}

.reduced-effects .skeleton-bar {
  animation: none !important;
  background: rgba(226,232,240,0.9) !important;
}

.reduced-effects .dot-pulse {
  animation: none !important;
}

.reduced-effects .shake {
  animation: none !important;
}

.reduced-effects .fade-slide-enter-active,
.reduced-effects .fade-slide-leave-active,
.reduced-effects .fade-status-enter-active,
.reduced-effects .fade-status-leave-active,
.reduced-effects .tag-list-enter-active,
.reduced-effects .tag-list-leave-active {
  transition: none !important;
}
</style>
