<!-- src/views/inventario/Optica.vue -->
<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount } from "vue";
import { labToast } from "@/composables/shared/useLabToast.js";
import DynamicTabs from "@/components/DynamicTabs.vue";
import {
  armazonesService, solucionesService,
  accesoriosService, estuchesService, equiposService,
} from "@/services/optica.js";
import {
  ARMAZONES_CONFIG, SOLUCIONES_CONFIG,
  ACCESORIOS_CONFIG, ESTUCHES_CONFIG, EQUIPOS_CONFIG
} from "@/constants/optica.js";

const OPTICA_TABS = [
  { key: "armazones",  label: "Armazones",          icon: "glasses" },
  { key: "soluciones", label: "Soluciones y Gotas",  icon: "tint" },
  { key: "accesorios", label: "Accesorios",          icon: "puzzle-piece" },
  { key: "estuches",   label: "Estuches",            icon: "box-open" },
  { key: "equipos",    label: "Equipos",             icon: "tools" },
];

const props = defineProps({ user: { type: Object, default: null } });
const actor = computed(() => ({
  userId: props.user?._id || props.user?.id || null,
  name:   props.user?.name || props.user?.nombre || "Usuario",
}));

const activeTab = ref("armazones");

// ══════════════════════════════════════════════════════════════
// ESTADO POR SECCIÓN
// ══════════════════════════════════════════════════════════════
function makeSection() {
  return reactive({
    items:       [],
    loading:     false,
    showTrash:   false,
    searchQ:     "",
    filterField: "all",  // filtro extra por categoría/tipo/estado
    selected:    null,   // fila seleccionada (para banner)
    bannerPulse: false,
  });
}

const sec = {
  armazones:  makeSection(),
  soluciones: makeSection(),
  accesorios: makeSection(),
  estuches:   makeSection(),
  equipos:    makeSection(),
};

const SVC = {
  armazones:  armazonesService,
  soluciones: solucionesService,
  accesorios: accesoriosService,
  estuches:   estuchesService,
  equipos:    equiposService,
};

// ── Carga ────────────────────────────────────────────────────
async function load(key) {
  const s = sec[key];
  s.loading = true;
  s.selected = null;
  try {
    const res = s.showTrash
      ? await SVC[key].listTrash()
      : await SVC[key].list(s.searchQ ? { q: s.searchQ } : {});
    s.items = res?.data?.data || [];
  } catch {
    labToast.danger("Error al cargar datos. Verifica la conexión.");
  } finally {
    s.loading = false;
  }
}

const loadingAll = ref(false);

async function loadAll() {
  loadingAll.value = true;
  try {
    await Promise.all(Object.keys(sec).map(load));
  } finally {
    loadingAll.value = false;
  }
}
onMounted(loadAll);

// ── Banner pulse al seleccionar ───────────────────────────────
function selectRow(key, row) {
  const s = sec[key];
  s.selected = row;
  s.bannerPulse = true;
  setTimeout(() => { s.bannerPulse = false; }, 400);
}

function toggleTrash(key) {
  sec[key].showTrash = !sec[key].showTrash;
  load(key);
}

// ══════════════════════════════════════════════════════════════
// MODAL CONFIRMACIÓN
// ══════════════════════════════════════════════════════════════
const confirm = reactive({
  active: false, title: "", message: "", type: "is-danger",
  btnLabel: "Confirmar", resolve: null,
});
function openConfirm({ title, message, type = "is-danger", btnLabel = "Confirmar" }) {
  return new Promise((resolve) => {
    Object.assign(confirm, { title, message, type, btnLabel, resolve, active: true });
  });
}
function onConfirmOk()     { confirm.active = false; confirm.resolve?.(true); }
function onConfirmCancel() { confirm.active = false; confirm.resolve?.(false); }

// ══════════════════════════════════════════════════════════════
// MODAL FORMULARIO
// ══════════════════════════════════════════════════════════════
const fm = reactive({
  active: false, section: "", mode: "create",
  saving: false, item: {}, id: null,
});

const DEFAULTS = {
  armazones:  { sku:"", marca:"", modelo:"", color:"", material: ARMAZONES_CONFIG.materiales[0], tipo: ARMAZONES_CONFIG.tipos[0], genero: ARMAZONES_CONFIG.generos[2], talla:"", serie:"", precio:0, stock:0, estuche:false, notas:"" },
  soluciones: { sku:"", nombre:"", tipo: SOLUCIONES_CONFIG.tipos[0], marca:"", volumen:0, stock:0, precio:0, caducidad:"", notas:"" },
  accesorios: { sku:"", nombre:"", categoria: ACCESORIOS_CONFIG.categorias[7], marca:"Genérico", compatible:"Universal", stock:0, precio:0, notas:"" },
  estuches:   { sku:"", nombre:"", tipo: ESTUCHES_CONFIG.tipos[0], material:"", color:"", compatible:"Universal", stock:0, precio:0, notas:"" },
  equipos:    { sku:"", nombre:"", tipo: EQUIPOS_CONFIG.areas[0], marca:"", modelo:"", serie:"", estado: EQUIPOS_CONFIG.estados[0], ubicacion:"", adquisicion:"", mantenimiento:"", notas:"" },
};

function openCreate(section) {
  Object.assign(fm, { section, mode:"create", id:null, saving:false, item:{ ...DEFAULTS[section] }, active:true });
}
function openEdit(section, row) {
  const caducidad = row.caducidad ? new Date(row.caducidad).toISOString().split("T")[0] : "";
  const adquisicion = row.adquisicion ? new Date(row.adquisicion).toISOString().split("T")[0] : "";
  const mantenimiento = row.mantenimiento ? new Date(row.mantenimiento).toISOString().split("T")[0] : "";
  Object.assign(fm, { section, mode:"edit", id:row._id, saving:false,
    item:{ ...DEFAULTS[section], ...row, caducidad, adquisicion, mantenimiento }, active:true });
}
async function saveForm() {
  fm.saving = true;
  const isCreate = fm.mode === "create";
  const t = labToast.info(isCreate ? "Creando elemento…" : "Guardando cambios…", 0);
  try {
    const payload = { ...fm.item, actor: actor.value };
    if (isCreate) {
      await SVC[fm.section].create(payload);
      t.close();
      labToast.success(`"${fm.item.sku || fm.item.nombre || "Elemento"}" creado correctamente`);
    } else {
      await SVC[fm.section].update(fm.id, payload);
      t.close();
      labToast.success(`"${fm.item.sku || fm.item.nombre || "Elemento"}" actualizado correctamente`);
    }
    fm.active = false;
    sec[fm.section].selected = null;
    load(fm.section);
  } catch (err) {
    t.close();
    labToast.danger(err?.response?.data?.error || "Error al guardar. Verifica los datos.");
  } finally {
    fm.saving = false;
  }
}

// ══════════════════════════════════════════════════════════════
// ACCIONES DELETE / RESTORE
// ══════════════════════════════════════════════════════════════

// Solicita confirmación vía modal Buefy y luego ejecuta la acción.
// El DirtyFloat se usa para acciones desde el banner (flujo inline).
async function doSoftDelete(key, row) {
  const ok = await openConfirm({
    title: "Mover a papelera",
    message: `¿Mover "${row.sku}" a la papelera? Podrás restaurarlo después.`,
    type: "is-warning", btnLabel: "Mover a papelera",
  });
  if (!ok) return;
  const t = labToast.warning(`Moviendo "${row.sku}" a papelera…`, 0);
  try {
    await SVC[key].softDelete(row._id, actor.value);
    t.close();
    labToast.warning(`"${row.sku}" movido a papelera`);
    sec[key].selected = null;
    load(key);
  } catch (e) {
    t.close();
    labToast.danger(e?.response?.data?.error || "Error al mover a papelera");
  }
}

async function doHardDelete(key, row) {
  const ok = await openConfirm({
    title: "Eliminar permanentemente",
    message: `¿Eliminar "${row.sku}" de forma PERMANENTE? Esta acción no se puede deshacer.`,
    type: "is-danger", btnLabel: "Eliminar para siempre",
  });
  if (!ok) return;
  const t = labToast.danger(`Eliminando "${row.sku}"…`, 0);
  try {
    await SVC[key].hardDelete(row._id, actor.value);
    t.close();
    labToast.danger(`"${row.sku}" eliminado permanentemente`);
    sec[key].selected = null;
    load(key);
  } catch (e) {
    t.close();
    labToast.danger(e?.response?.data?.error || "Error al eliminar");
  }
}

async function doRestore(key, row) {
  const ok = await openConfirm({
    title: "Restaurar elemento",
    message: `¿Restaurar "${row.sku}" de la papelera?`,
    type: "is-success", btnLabel: "Restaurar",
  });
  if (!ok) return;
  const t = labToast.info(`Restaurando "${row.sku}"…`, 0);
  try {
    await SVC[key].restore(row._id, actor.value);
    t.close();
    labToast.success(`"${row.sku}" restaurado correctamente`);
    sec[key].selected = null;
    load(key);
  } catch (e) {
    t.close();
    labToast.danger(e?.response?.data?.error || "Error al restaurar");
  }
}

// (Estadísticas movidas a DashboardHome.vue)

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
const fmt = n => Number(n||0).toLocaleString("es-MX",{style:"currency",currency:"MXN",minimumFractionDigits:0});
const fmtDate = d => {
  if(!d) return "—";
  const dt = new Date(d);
  return isNaN(dt) ? String(d).split("T")[0] : dt.toLocaleDateString("es-MX",{day:"2-digit",month:"2-digit",year:"numeric"});
};
const estadoTag   = e => ({"Disponible":"is-success","Bajo stock":"is-warning","Agotado":"is-danger","Operativo":"is-success","Mantenimiento":"is-warning","Fuera de servicio":"is-danger","Baja":"is-dark"}[e]||"is-info");
const tipoSolTag  = t => ({"Solucion multiusos":"is-primary","Solucion salina":"is-info","Gotas lubricantes":"is-success","Solucion peroxido":"is-warning"}[t]||"is-light");
const caducidadClass = f => { if(!f)return""; const df=(new Date(f)-new Date())/86400000; return df<=0?"has-text-danger":df<=180?"has-text-warning":""; };
const armazonEstado = r => { if(r.estado)return r.estado; if(!r.stock)return"Agotado"; if(r.stock<=3)return"Bajo stock"; return"Disponible"; };
const formTitle = computed(() => fm.mode==="create" ? `Agregar en ${labelFor(fm.section)}` : `Editar — ${fm.item?.sku||""}`);
function labelFor(s){ return{armazones:"Armazones",soluciones:"Soluciones y Gotas",accesorios:"Accesorios",estuches:"Estuches",equipos:"Equipos"}[s]||s; }

// Clase de fila para elementos en papelera
function rowClass(row) { return row.isDeleted ? "row--deleted" : ""; }

// ── Lógica de Pantalla Completa para Modales ──
const isFullscreenActive = ref(!!document.fullscreenElement);
const fullscreenContainer = computed(() => isFullscreenActive.value ? '.optica-section' : null);

const updateFullscreenStatus = () => { isFullscreenActive.value = !!document.fullscreenElement; };
onMounted(() => { document.addEventListener("fullscreenchange", updateFullscreenStatus); });
onBeforeUnmount(() => { document.removeEventListener("fullscreenchange", updateFullscreenStatus); });
</script>

<template>
  <section class="optica-section" :class="{ 'ag-grid-fullscreen-container': isFullscreenActive }" v-motion-fade-visible-once>

    <!-- ╔══════════════════════════════════════════════════╗
         ║  HEADER DE PÁGINA                               ║
         ╚══════════════════════════════════════════════════╝ -->
    <header class="optica-page-header page-section-header">
      <div>
        <span class="optica-pill">
          <b-icon icon="store" size="is-small" class="mr-1" />
          Inventario Óptica
        </span>
        <h2>Gestión de Óptica</h2>
        <p class="psh-desc">Armazones, soluciones, accesorios, estuches y equipos — control total con historial de cambios.</p>
        <div class="psh-quick mt-3">
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-glasses"></i></div>
            <div>
              <p class="psh-quick__title">Armazones</p>
              <p class="psh-quick__text">Stock, marcas y modelos</p>
            </div>
          </div>
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-tools"></i></div>
            <div>
              <p class="psh-quick__title">Equipos</p>
              <p class="psh-quick__text">Estado y mantenimientos</p>
            </div>
          </div>
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-trash-restore"></i></div>
            <div>
              <p class="psh-quick__title">Papelera</p>
              <p class="psh-quick__text">Los eliminados se pueden restaurar</p>
            </div>
          </div>
        </div>
      </div>
      <div class="optica-header-summary">
        <b-taglist attached>
          <b-tag type="is-primary">
            <template v-if="loadingAll"><b-icon icon="spinner" size="is-small" class="fa-spin mr-1" />Cargando…</template>
            <template v-else>{{ sec.armazones.items.length + sec.soluciones.items.length + sec.accesorios.items.length + sec.estuches.items.length + sec.equipos.items.length }} items</template>
          </b-tag>
          <b-tag type="is-success">activos</b-tag>
        </b-taglist>
        <p class="is-size-7 has-text-grey mt-1">5 categorías · audit trail completo</p>
      </div>
    </header>

    <!-- ╔══════════════════════════════════════════════════╗
         ║  TABS GLASSMORPHISM                             ║
         ╚══════════════════════════════════════════════════╝ -->
    <div class="glass-wrapper">
      <DynamicTabs v-model="activeTab" :tabs="OPTICA_TABS">

        <!-- ═══════════════════════════ TAB 1: ARMAZONES ════════════════════════════ -->
        <template #armazones>

          <!-- Banner item seleccionado -->
          <transition name="banner-slide">
            <div v-if="sec.armazones.selected" class="item-banner"
                 :class="{ 'item-banner--pulse': sec.armazones.bannerPulse }">
              <div class="item-banner__main">
                <div class="item-banner__sku-badge">
                  <i class="fas fa-glasses"></i>
                  <span>{{ sec.armazones.selected.sku }}</span>
                </div>
                <div class="item-banner__info">
                  <p class="item-banner__name">{{ sec.armazones.selected.marca }} · {{ sec.armazones.selected.modelo }}</p>
                  <p class="item-banner__sub">{{ sec.armazones.selected.color }} · {{ sec.armazones.selected.material }} · {{ sec.armazones.selected.tipo }}</p>
                </div>
              </div>
              <div class="item-banner__chips">
                <span class="i-chip i-chip--price">{{ fmt(sec.armazones.selected.precio) }}</span>
                <span class="i-chip" :class="(sec.armazones.selected.stock||0)===0?'i-chip--danger':(sec.armazones.selected.stock||0)<=3?'i-chip--warn':'i-chip--ok'">
                  {{ sec.armazones.selected.stock }} uds
                </span>
                <span class="i-chip" :class="'i-chip--' + (armazonEstado(sec.armazones.selected)==='Disponible'?'ok':armazonEstado(sec.armazones.selected)==='Bajo stock'?'warn':'danger')">
                  {{ armazonEstado(sec.armazones.selected) }}
                </span>
                <span v-if="sec.armazones.selected.estuche" class="i-chip i-chip--info">Incl. estuche</span>
              </div>
              <div class="item-banner__actions">
                <b-button size="is-small" type="is-light" icon-left="pen" @click="openEdit('armazones', sec.armazones.selected)">Editar</b-button>
                <b-button v-if="!sec.armazones.showTrash" size="is-small" type="is-warning" icon-left="trash" @click="doSoftDelete('armazones', sec.armazones.selected)">Papelera</b-button>
                <b-button v-else size="is-small" type="is-success" icon-left="undo" @click="doRestore('armazones', sec.armazones.selected)">Restaurar</b-button>
                <b-button size="is-small" type="is-danger" icon-left="times" @click="doHardDelete('armazones', sec.armazones.selected)">Eliminar</b-button>
              </div>
            </div>
          </transition>

          <!-- Filtros + Toolbar -->
          <div class="section-toolbar">
            <b-field grouped group-multiline class="mb-0">
              <b-field class="toolbar-field">
                <b-input v-model="sec.armazones.searchQ" placeholder="Buscar SKU, marca, modelo…" icon="search" size="is-small" @input="load('armazones')" />
              </b-field>
              <b-field class="toolbar-field">
                <b-select v-model="sec.armazones.filterField" size="is-small">
                  <option value="all">Todos los materiales</option>
                  <option v-for="m in ARMAZONES_CONFIG.materiales" :key="m" :value="m">{{ m }}</option>
                </b-select>
              </b-field>
            </b-field>
            <div class="toolbar-actions">
              <b-button size="is-small" :type="sec.armazones.showTrash?'is-warning':'is-light'" icon-left="trash" @click="toggleTrash('armazones')">
                {{ sec.armazones.showTrash?"Ver activos":"Papelera" }}
              </b-button>
              <b-button size="is-small" icon-left="sync-alt" :loading="sec.armazones.loading" @click="load('armazones')" />
              <b-button v-if="!sec.armazones.showTrash" size="is-small" type="is-primary" icon-left="plus" @click="openCreate('armazones')">Agregar</b-button>
            </div>
          </div>

          <!-- Skeleton -->
          <div v-if="sec.armazones.loading" class="skeleton-wrap">
            <div v-for="i in 6" :key="i" class="skeleton-row" :style="`animation-delay:${i*60}ms`" />
          </div>

          <!-- Tabla -->
          <div v-else class="table-shell glass-card">
            <b-table :data="sec.armazones.items.filter(r=>sec.armazones.filterField==='all'||r.material===sec.armazones.filterField)"
              :mobile-cards="false"
              sticky-header :height="360" hoverable focusable :row-class="rowClass"
              v-model:selected="sec.armazones.selected" @click="(r)=>selectRow('armazones',r)"
              paginated :per-page="10" pagination-size="is-small"
              :loading="sec.armazones.loading">
              <b-table-column field="sku"      label="SKU"       sortable v-slot="{row}"><span class="mono-tag">{{ row.sku }}</span></b-table-column>
              <b-table-column field="marca"    label="Marca"     sortable v-slot="{row}"><strong>{{ row.marca }}</strong></b-table-column>
              <b-table-column field="modelo"   label="Modelo"    sortable v-slot="{row}">{{ row.modelo }}</b-table-column>
              <b-table-column field="color"    label="Color"     v-slot="{row}">{{ row.color||"—" }}</b-table-column>
              <b-table-column field="material" label="Material"  sortable v-slot="{row}"><b-tag type="is-light" size="is-small">{{ row.material }}</b-tag></b-table-column>
              <b-table-column field="tipo"     label="Tipo"      sortable v-slot="{row}"><b-tag type="is-info is-light" size="is-small">{{ row.tipo }}</b-tag></b-table-column>
              <b-table-column field="genero"   label="Género"    sortable v-slot="{row}">{{ row.genero }}</b-table-column>
              <b-table-column field="talla"    label="Talla"     v-slot="{row}"><span class="mono-tag">{{ row.talla||"—" }}</span></b-table-column>
              <b-table-column field="precio"   label="Precio"    sortable numeric v-slot="{row}">{{ fmt(row.precio) }}</b-table-column>
              <b-table-column field="stock"    label="Stock"     sortable numeric v-slot="{row}">
                <span class="stock-badge" :class="(row.stock||0)===0?'stock-badge--danger':(row.stock||0)<=3?'stock-badge--warn':'stock-badge--ok'">{{ row.stock }}</span>
              </b-table-column>
              <b-table-column field="estuche"  label="Estuche"   centered v-slot="{row}">
                <b-icon :icon="row.estuche?'check-circle':'times-circle'" :type="row.estuche?'is-success':'is-light'" size="is-small" />
              </b-table-column>
              <b-table-column label="Estado" v-slot="{row}">
                <b-tag :type="estadoTag(armazonEstado(row))" size="is-small">{{ armazonEstado(row) }}</b-tag>
              </b-table-column>
              <template #empty>
                <div class="table-empty"><i class="fas fa-glasses fa-2x mb-2"></i><p>Sin armazones encontrados</p></div>
              </template>
            </b-table>
          </div>
        </template>

        <!-- ═══════════════════════════ TAB 2: SOLUCIONES ════════════════════════════ -->
        <template #soluciones>

          <transition name="banner-slide">
            <div v-if="sec.soluciones.selected" class="item-banner"
                 :class="{ 'item-banner--pulse': sec.soluciones.bannerPulse }">
              <div class="item-banner__main">
                <div class="item-banner__sku-badge"><i class="fas fa-tint"></i><span>{{ sec.soluciones.selected.sku }}</span></div>
                <div class="item-banner__info">
                  <p class="item-banner__name">{{ sec.soluciones.selected.nombre }}</p>
                  <p class="item-banner__sub">{{ sec.soluciones.selected.marca }} · {{ sec.soluciones.selected.tipo }} · {{ sec.soluciones.selected.volumen }} ml</p>
                </div>
              </div>
              <div class="item-banner__chips">
                <span class="i-chip i-chip--price">{{ fmt(sec.soluciones.selected.precio) }}</span>
                <span class="i-chip" :class="(sec.soluciones.selected.stock||0)===0?'i-chip--danger':(sec.soluciones.selected.stock||0)<=10?'i-chip--warn':'i-chip--ok'">{{ sec.soluciones.selected.stock }} uds</span>
                <span v-if="sec.soluciones.selected.caducidad" class="i-chip" :class="caducidadClass(sec.soluciones.selected.caducidad)?'i-chip--warn':'i-chip--info'">Cad: {{ fmtDate(sec.soluciones.selected.caducidad) }}</span>
              </div>
              <div class="item-banner__actions">
                <b-button size="is-small" type="is-light" icon-left="pen" @click="openEdit('soluciones', sec.soluciones.selected)">Editar</b-button>
                <b-button v-if="!sec.soluciones.showTrash" size="is-small" type="is-warning" icon-left="trash" @click="doSoftDelete('soluciones', sec.soluciones.selected)">Papelera</b-button>
                <b-button v-else size="is-small" type="is-success" icon-left="undo" @click="doRestore('soluciones', sec.soluciones.selected)">Restaurar</b-button>
                <b-button size="is-small" type="is-danger" icon-left="times" @click="doHardDelete('soluciones', sec.soluciones.selected)">Eliminar</b-button>
              </div>
            </div>
          </transition>

          <div class="section-toolbar">
            <b-field grouped group-multiline class="mb-0">
              <b-field class="toolbar-field">
                <b-input v-model="sec.soluciones.searchQ" placeholder="Buscar SKU, nombre, marca…" icon="search" size="is-small" @input="load('soluciones')" />
              </b-field>
              <b-field class="toolbar-field">
                <b-select v-model="sec.soluciones.filterField" size="is-small">
                  <option value="all">Todos los tipos</option>
                  <option v-for="t in SOLUCIONES_CONFIG.tipos" :key="t" :value="t">{{ t }}</option>
                </b-select>
              </b-field>
            </b-field>
            <div class="toolbar-actions">
              <b-button size="is-small" :type="sec.soluciones.showTrash?'is-warning':'is-light'" icon-left="trash" @click="toggleTrash('soluciones')">{{ sec.soluciones.showTrash?"Ver activos":"Papelera" }}</b-button>
              <b-button size="is-small" icon-left="sync-alt" :loading="sec.soluciones.loading" @click="load('soluciones')" />
              <b-button v-if="!sec.soluciones.showTrash" size="is-small" type="is-primary" icon-left="plus" @click="openCreate('soluciones')">Agregar</b-button>
            </div>
          </div>

          <div v-if="sec.soluciones.loading" class="skeleton-wrap">
            <div v-for="i in 6" :key="i" class="skeleton-row" :style="`animation-delay:${i*60}ms`" />
          </div>
          <div v-else class="table-shell glass-card">
            <b-table :data="sec.soluciones.items.filter(r=>sec.soluciones.filterField==='all'||r.tipo===sec.soluciones.filterField)"
              :mobile-cards="false"
              sticky-header :height="360" hoverable focusable :row-class="rowClass"
              v-model:selected="sec.soluciones.selected" @click="(r)=>selectRow('soluciones',r)"
              paginated :per-page="10" pagination-size="is-small">
              <b-table-column field="sku"       label="SKU"       sortable v-slot="{row}"><span class="mono-tag">{{ row.sku }}</span></b-table-column>
              <b-table-column field="nombre"    label="Producto"  sortable v-slot="{row}"><strong>{{ row.nombre }}</strong></b-table-column>
              <b-table-column field="tipo"      label="Tipo"      sortable v-slot="{row}"><b-tag :type="tipoSolTag(row.tipo)" size="is-small">{{ row.tipo }}</b-tag></b-table-column>
              <b-table-column field="marca"     label="Marca"     sortable v-slot="{row}">{{ row.marca }}</b-table-column>
              <b-table-column field="volumen"   label="Volumen"   sortable numeric v-slot="{row}">{{ row.volumen }} ml</b-table-column>
              <b-table-column field="stock"     label="Stock"     sortable numeric v-slot="{row}">
                <span class="stock-badge" :class="(row.stock||0)===0?'stock-badge--danger':(row.stock||0)<=10?'stock-badge--warn':'stock-badge--ok'">{{ row.stock }}</span>
              </b-table-column>
              <b-table-column field="precio"    label="Precio"    sortable numeric v-slot="{row}">{{ fmt(row.precio) }}</b-table-column>
              <b-table-column field="caducidad" label="Caducidad" sortable v-slot="{row}">
                <span :class="caducidadClass(row.caducidad)" class="date-cell">{{ fmtDate(row.caducidad) }}</span>
              </b-table-column>
              <template #empty><div class="table-empty"><i class="fas fa-tint fa-2x mb-2"></i><p>Sin soluciones encontradas</p></div></template>
            </b-table>
          </div>
        </template>

        <!-- ═══════════════════════════ TAB 3: ACCESORIOS ════════════════════════════ -->
        <template #accesorios>

          <transition name="banner-slide">
            <div v-if="sec.accesorios.selected" class="item-banner"
                 :class="{ 'item-banner--pulse': sec.accesorios.bannerPulse }">
              <div class="item-banner__main">
                <div class="item-banner__sku-badge"><i class="fas fa-puzzle-piece"></i><span>{{ sec.accesorios.selected.sku }}</span></div>
                <div class="item-banner__info">
                  <p class="item-banner__name">{{ sec.accesorios.selected.nombre }}</p>
                  <p class="item-banner__sub">{{ sec.accesorios.selected.categoria }} · {{ sec.accesorios.selected.marca }} · Compatible: {{ sec.accesorios.selected.compatible }}</p>
                </div>
              </div>
              <div class="item-banner__chips">
                <span class="i-chip i-chip--price">{{ fmt(sec.accesorios.selected.precio) }}</span>
                <span class="i-chip" :class="(sec.accesorios.selected.stock||0)===0?'i-chip--danger':(sec.accesorios.selected.stock||0)<=5?'i-chip--warn':'i-chip--ok'">{{ sec.accesorios.selected.stock }} uds</span>
                <span class="i-chip i-chip--info">{{ sec.accesorios.selected.categoria }}</span>
              </div>
              <div class="item-banner__actions">
                <b-button size="is-small" type="is-light" icon-left="pen" @click="openEdit('accesorios', sec.accesorios.selected)">Editar</b-button>
                <b-button v-if="!sec.accesorios.showTrash" size="is-small" type="is-warning" icon-left="trash" @click="doSoftDelete('accesorios', sec.accesorios.selected)">Papelera</b-button>
                <b-button v-else size="is-small" type="is-success" icon-left="undo" @click="doRestore('accesorios', sec.accesorios.selected)">Restaurar</b-button>
                <b-button size="is-small" type="is-danger" icon-left="times" @click="doHardDelete('accesorios', sec.accesorios.selected)">Eliminar</b-button>
              </div>
            </div>
          </transition>

          <div class="section-toolbar">
            <b-field grouped group-multiline class="mb-0">
              <b-field class="toolbar-field">
                <b-input v-model="sec.accesorios.searchQ" placeholder="Buscar SKU, nombre, categoría…" icon="search" size="is-small" @input="load('accesorios')" />
              </b-field>
              <b-field class="toolbar-field">
                <b-select v-model="sec.accesorios.filterField" size="is-small">
                  <option value="all">Todas las categorías</option>
                  <option v-for="c in ACCESORIOS_CONFIG.categorias" :key="c" :value="c">{{ c }}</option>
                </b-select>
              </b-field>
            </b-field>
            <div class="toolbar-actions">
              <b-button size="is-small" :type="sec.accesorios.showTrash?'is-warning':'is-light'" icon-left="trash" @click="toggleTrash('accesorios')">{{ sec.accesorios.showTrash?"Ver activos":"Papelera" }}</b-button>
              <b-button size="is-small" icon-left="sync-alt" :loading="sec.accesorios.loading" @click="load('accesorios')" />
              <b-button v-if="!sec.accesorios.showTrash" size="is-small" type="is-primary" icon-left="plus" @click="openCreate('accesorios')">Agregar</b-button>
            </div>
          </div>

          <div v-if="sec.accesorios.loading" class="skeleton-wrap">
            <div v-for="i in 6" :key="i" class="skeleton-row" :style="`animation-delay:${i*60}ms`" />
          </div>
          <div v-else class="table-shell glass-card">
            <b-table :data="sec.accesorios.items.filter(r=>sec.accesorios.filterField==='all'||r.categoria===sec.accesorios.filterField)"
              :mobile-cards="false"
              sticky-header :height="360" hoverable focusable :row-class="rowClass"
              v-model:selected="sec.accesorios.selected" @click="(r)=>selectRow('accesorios',r)"
              paginated :per-page="10" pagination-size="is-small">
              <b-table-column field="sku"        label="SKU"       sortable v-slot="{row}"><span class="mono-tag">{{ row.sku }}</span></b-table-column>
              <b-table-column field="nombre"     label="Accesorio" sortable v-slot="{row}"><strong>{{ row.nombre }}</strong></b-table-column>
              <b-table-column field="categoria"  label="Categoría" sortable v-slot="{row}"><b-tag type="is-info is-light" size="is-small">{{ row.categoria }}</b-tag></b-table-column>
              <b-table-column field="marca"      label="Marca"     sortable v-slot="{row}">{{ row.marca }}</b-table-column>
              <b-table-column field="compatible" label="Compatible"         v-slot="{row}">{{ row.compatible }}</b-table-column>
              <b-table-column field="stock"      label="Stock"     sortable numeric v-slot="{row}">
                <span class="stock-badge" :class="(row.stock||0)===0?'stock-badge--danger':(row.stock||0)<=5?'stock-badge--warn':'stock-badge--ok'">{{ row.stock }}</span>
              </b-table-column>
              <b-table-column field="precio"     label="Precio"    sortable numeric v-slot="{row}">{{ fmt(row.precio) }}</b-table-column>
              <template #empty><div class="table-empty"><i class="fas fa-puzzle-piece fa-2x mb-2"></i><p>Sin accesorios encontrados</p></div></template>
            </b-table>
          </div>
        </template>

        <!-- ═══════════════════════════ TAB 4: ESTUCHES ════════════════════════════ -->
        <template #estuches>

          <transition name="banner-slide">
            <div v-if="sec.estuches.selected" class="item-banner"
                 :class="{ 'item-banner--pulse': sec.estuches.bannerPulse }">
              <div class="item-banner__main">
                <div class="item-banner__sku-badge"><i class="fas fa-box-open"></i><span>{{ sec.estuches.selected.sku }}</span></div>
                <div class="item-banner__info">
                  <p class="item-banner__name">{{ sec.estuches.selected.nombre }}</p>
                  <p class="item-banner__sub">{{ sec.estuches.selected.tipo }} · {{ sec.estuches.selected.material || "—" }} · {{ sec.estuches.selected.color || "—" }}</p>
                </div>
              </div>
              <div class="item-banner__chips">
                <span class="i-chip i-chip--price">{{ fmt(sec.estuches.selected.precio) }}</span>
                <span class="i-chip" :class="(sec.estuches.selected.stock||0)===0?'i-chip--danger':(sec.estuches.selected.stock||0)<=5?'i-chip--warn':'i-chip--ok'">{{ sec.estuches.selected.stock }} uds</span>
                <span class="i-chip i-chip--info">{{ sec.estuches.selected.compatible }}</span>
              </div>
              <div class="item-banner__actions">
                <b-button size="is-small" type="is-light" icon-left="pen" @click="openEdit('estuches', sec.estuches.selected)">Editar</b-button>
                <b-button v-if="!sec.estuches.showTrash" size="is-small" type="is-warning" icon-left="trash" @click="doSoftDelete('estuches', sec.estuches.selected)">Papelera</b-button>
                <b-button v-else size="is-small" type="is-success" icon-left="undo" @click="doRestore('estuches', sec.estuches.selected)">Restaurar</b-button>
                <b-button size="is-small" type="is-danger" icon-left="times" @click="doHardDelete('estuches', sec.estuches.selected)">Eliminar</b-button>
              </div>
            </div>
          </transition>

          <div class="section-toolbar">
            <b-field grouped group-multiline class="mb-0">
              <b-field class="toolbar-field">
                <b-input v-model="sec.estuches.searchQ" placeholder="Buscar SKU, nombre, tipo…" icon="search" size="is-small" @input="load('estuches')" />
              </b-field>
              <b-field class="toolbar-field">
                <b-select v-model="sec.estuches.filterField" size="is-small">
                  <option value="all">Todos los tipos</option>
                  <option v-for="t in ESTUCHES_CONFIG.tipos" :key="t" :value="t">{{ t }}</option>
                </b-select>
              </b-field>
            </b-field>
            <div class="toolbar-actions">
              <b-button size="is-small" :type="sec.estuches.showTrash?'is-warning':'is-light'" icon-left="trash" @click="toggleTrash('estuches')">{{ sec.estuches.showTrash?"Ver activos":"Papelera" }}</b-button>
              <b-button size="is-small" icon-left="sync-alt" :loading="sec.estuches.loading" @click="load('estuches')" />
              <b-button v-if="!sec.estuches.showTrash" size="is-small" type="is-primary" icon-left="plus" @click="openCreate('estuches')">Agregar</b-button>
            </div>
          </div>

          <div v-if="sec.estuches.loading" class="skeleton-wrap">
            <div v-for="i in 6" :key="i" class="skeleton-row" :style="`animation-delay:${i*60}ms`" />
          </div>
          <div v-else class="table-shell glass-card">
            <b-table :data="sec.estuches.items.filter(r=>sec.estuches.filterField==='all'||r.tipo===sec.estuches.filterField)"
              :mobile-cards="false"
              sticky-header :height="360" hoverable focusable :row-class="rowClass"
              v-model:selected="sec.estuches.selected" @click="(r)=>selectRow('estuches',r)"
              paginated :per-page="10" pagination-size="is-small">
              <b-table-column field="sku"        label="SKU"       sortable v-slot="{row}"><span class="mono-tag">{{ row.sku }}</span></b-table-column>
              <b-table-column field="nombre"     label="Estuche"   sortable v-slot="{row}"><strong>{{ row.nombre }}</strong></b-table-column>
              <b-table-column field="tipo"       label="Tipo"      sortable v-slot="{row}"><b-tag type="is-info is-light" size="is-small">{{ row.tipo }}</b-tag></b-table-column>
              <b-table-column field="material"   label="Material"          v-slot="{row}">{{ row.material||"—" }}</b-table-column>
              <b-table-column field="color"      label="Color"             v-slot="{row}">{{ row.color||"—" }}</b-table-column>
              <b-table-column field="compatible" label="Compatible"         v-slot="{row}">{{ row.compatible }}</b-table-column>
              <b-table-column field="stock"      label="Stock"     sortable numeric v-slot="{row}">
                <span class="stock-badge" :class="(row.stock||0)===0?'stock-badge--danger':(row.stock||0)<=5?'stock-badge--warn':'stock-badge--ok'">{{ row.stock }}</span>
              </b-table-column>
              <b-table-column field="precio"     label="Precio"    sortable numeric v-slot="{row}">{{ fmt(row.precio) }}</b-table-column>
              <template #empty><div class="table-empty"><i class="fas fa-box-open fa-2x mb-2"></i><p>Sin estuches encontrados</p></div></template>
            </b-table>
          </div>
        </template>

        <!-- ═══════════════════════════ TAB 5: EQUIPOS ════════════════════════════ -->
        <template #equipos>

          <transition name="banner-slide">
            <div v-if="sec.equipos.selected" class="item-banner item-banner--equipos"
                 :class="{ 'item-banner--pulse': sec.equipos.bannerPulse }">
              <div class="item-banner__main">
                <div class="item-banner__sku-badge"><i class="fas fa-tools"></i><span>{{ sec.equipos.selected.sku }}</span></div>
                <div class="item-banner__info">
                  <p class="item-banner__name">{{ sec.equipos.selected.nombre }}</p>
                  <p class="item-banner__sub">{{ sec.equipos.selected.marca }} {{ sec.equipos.selected.modelo }} · Serie: {{ sec.equipos.selected.serie||"—" }}</p>
                </div>
              </div>
              <div class="item-banner__chips">
                <span class="i-chip" :class="sec.equipos.selected.estado==='Operativo'?'i-chip--ok':sec.equipos.selected.estado==='Mantenimiento'?'i-chip--warn':'i-chip--danger'">
                  {{ sec.equipos.selected.estado }}
                </span>
                <span class="i-chip i-chip--info">{{ sec.equipos.selected.ubicacion||"—" }}</span>
                <span class="i-chip" :class="caducidadClass(sec.equipos.selected.mantenimiento)?'i-chip--warn':'i-chip--info'">Mantto: {{ fmtDate(sec.equipos.selected.mantenimiento) }}</span>
              </div>
              <div class="item-banner__actions">
                <b-button size="is-small" type="is-light" icon-left="pen" @click="openEdit('equipos', sec.equipos.selected)">Editar</b-button>
                <b-button v-if="!sec.equipos.showTrash" size="is-small" type="is-warning" icon-left="trash" @click="doSoftDelete('equipos', sec.equipos.selected)">Papelera</b-button>
                <b-button v-else size="is-small" type="is-success" icon-left="undo" @click="doRestore('equipos', sec.equipos.selected)">Restaurar</b-button>
                <b-button size="is-small" type="is-danger" icon-left="times" @click="doHardDelete('equipos', sec.equipos.selected)">Eliminar</b-button>
              </div>
            </div>
          </transition>

          <div class="section-toolbar">
            <b-field grouped group-multiline class="mb-0">
              <b-field class="toolbar-field">
                <b-input v-model="sec.equipos.searchQ" placeholder="Buscar SKU, nombre, serie…" icon="search" size="is-small" @input="load('equipos')" />
              </b-field>
              <b-field class="toolbar-field">
                <b-select v-model="sec.equipos.filterField" size="is-small">
                  <option value="all">Todos los estados</option>
                  <option v-for="e in EQUIPOS_CONFIG.estados" :key="e" :value="e">{{ e }}</option>
                </b-select>
              </b-field>
            </b-field>
            <div class="toolbar-actions">
              <b-button size="is-small" :type="sec.equipos.showTrash?'is-warning':'is-light'" icon-left="trash" @click="toggleTrash('equipos')">{{ sec.equipos.showTrash?"Ver activos":"Papelera" }}</b-button>
              <b-button size="is-small" icon-left="sync-alt" :loading="sec.equipos.loading" @click="load('equipos')" />
              <b-button v-if="!sec.equipos.showTrash" size="is-small" type="is-primary" icon-left="plus" @click="openCreate('equipos')">Agregar</b-button>
            </div>
          </div>

          <div v-if="sec.equipos.loading" class="skeleton-wrap">
            <div v-for="i in 6" :key="i" class="skeleton-row" :style="`animation-delay:${i*60}ms`" />
          </div>
          <div v-else class="table-shell glass-card">
            <b-table :data="sec.equipos.items.filter(r=>sec.equipos.filterField==='all'||r.estado===sec.equipos.filterField)"
              :mobile-cards="false"
              sticky-header :height="360" hoverable focusable :row-class="rowClass"
              v-model:selected="sec.equipos.selected" @click="(r)=>selectRow('equipos',r)"
              paginated :per-page="10" pagination-size="is-small">
              <b-table-column field="sku"          label="SKU"         sortable v-slot="{row}"><span class="mono-tag">{{ row.sku }}</span></b-table-column>
              <b-table-column field="nombre"       label="Equipo"      sortable v-slot="{row}"><strong>{{ row.nombre }}</strong></b-table-column>
              <b-table-column field="tipo"         label="Área"        sortable v-slot="{row}"><b-tag type="is-info" size="is-small">{{ row.tipo }}</b-tag></b-table-column>
              <b-table-column field="marca"        label="Marca"       sortable v-slot="{row}">{{ row.marca }}</b-table-column>
              <b-table-column field="modelo"       label="Modelo"              v-slot="{row}">{{ row.modelo||"—" }}</b-table-column>
              <b-table-column field="serie"        label="Serie"               v-slot="{row}"><span class="mono-tag">{{ row.serie||"—" }}</span></b-table-column>
              <b-table-column field="ubicacion"    label="Ubicación"   sortable v-slot="{row}">{{ row.ubicacion||"—" }}</b-table-column>
              <b-table-column field="estado"       label="Estado"      sortable v-slot="{row}">
                <b-tag :type="estadoTag(row.estado)" size="is-small">{{ row.estado }}</b-tag>
              </b-table-column>
              <b-table-column field="mantenimiento"label="Prox. Mantto."sortable v-slot="{row}">
                <span :class="caducidadClass(row.mantenimiento)" class="date-cell">{{ fmtDate(row.mantenimiento) }}</span>
              </b-table-column>
              <template #empty><div class="table-empty"><i class="fas fa-tools fa-2x mb-2"></i><p>Sin equipos encontrados</p></div></template>
            </b-table>
          </div>
        </template>

      </DynamicTabs>
    </div><!-- /glass-wrapper -->


    <!-- ════════════════════════════════════════════════════════
         MODAL CONFIRMACIÓN
    ════════════════════════════════════════════════════════ -->
    <b-modal v-model="confirm.active" has-modal-card trap-focus :destroy-on-hide="false" :can-cancel="['escape','outside']" :container="fullscreenContainer">
      <div class="modal-card glass-modal-card">
        <header class="modal-card-head glass-modal-head">
          <b-icon :icon="confirm.type==='is-danger'?'exclamation-triangle':confirm.type==='is-warning'?'exclamation-circle':'check-circle'"
                  :type="confirm.type" size="is-medium" class="mr-2" />
          <p class="modal-card-title">{{ confirm.title }}</p>
        </header>
        <section class="modal-card-body glass-modal-body">
          <p class="confirm-message">{{ confirm.message }}</p>
        </section>
        <footer class="modal-card-foot glass-modal-foot">
          <b-button @click="onConfirmCancel" icon-left="times">Cancelar</b-button>
          <b-button :type="confirm.type" icon-left="check" @click="onConfirmOk">{{ confirm.btnLabel }}</b-button>
        </footer>
      </div>
    </b-modal>

    <!-- ════════════════════════════════════════════════════════
         MODAL FORMULARIO (crear / editar)
    ════════════════════════════════════════════════════════ -->
    <b-modal v-model="fm.active" has-modal-card trap-focus :destroy-on-hide="false" :can-cancel="['escape','outside']" scroll="keep" :container="fullscreenContainer">
      <div class="modal-card glass-modal-card glass-modal-card--wide">
        <header class="modal-card-head glass-modal-head">
          <b-icon :icon="fm.mode==='create'?'plus-circle':'pen'" type="is-primary" size="is-small" class="mr-2" />
          <p class="modal-card-title">{{ formTitle }}</p>
          <button class="delete is-small ml-auto" @click="fm.active=false" aria-label="cerrar"></button>
        </header>

        <section class="modal-card-body glass-modal-body">

          <!-- ── ARMAZONES ── -->
          <template v-if="fm.section==='armazones'">
            <div class="form-section-title"><i class="fas fa-glasses mr-2"></i>Datos del armazón</div>
            <div class="form-grid">
              <b-field label="SKU *"><b-input v-model="fm.item.sku" placeholder="ARZ-001" /></b-field>
              <b-field label="Marca *"><b-input v-model="fm.item.marca" placeholder="Ray-Ban" /></b-field>
              <b-field label="Modelo *"><b-input v-model="fm.item.modelo" placeholder="RB5154" /></b-field>
              <b-field label="Color"><b-input v-model="fm.item.color" placeholder="Negro/Oro" /></b-field>
              <b-field label="Material">
                <b-select v-model="fm.item.material" expanded>
                  <option v-for="m in ARMAZONES_CONFIG.materiales" :key="m">{{ m }}</option>
                </b-select>
              </b-field>
              <b-field label="Tipo">
                <b-select v-model="fm.item.tipo" expanded>
                  <option v-for="t in ARMAZONES_CONFIG.tipos" :key="t">{{ t }}</option>
                </b-select>
              </b-field>
              <b-field label="Género">
                <b-select v-model="fm.item.genero" expanded>
                  <option v-for="g in ARMAZONES_CONFIG.generos" :key="g">{{ g }}</option>
                </b-select>
              </b-field>
              <b-field label="Talla"><b-input v-model="fm.item.talla" placeholder="51-21-145" /></b-field>
              <b-field label="Serie"><b-input v-model="fm.item.serie" placeholder="CLUB-2024A" /></b-field>
              <b-field label="Precio *"><b-input v-model.number="fm.item.precio" type="number" min="0" icon="dollar-sign" /></b-field>
              <b-field label="Stock *"><b-input v-model.number="fm.item.stock" type="number" min="0" icon="layer-group" /></b-field>
            </div>
            <b-field label="Incluye estuche" class="mt-3">
              <b-switch v-model="fm.item.estuche">{{ fm.item.estuche?"Sí incluye estuche":"No incluye estuche" }}</b-switch>
            </b-field>
            <b-field label="Notas" class="mt-2"><b-input v-model="fm.item.notas" type="textarea" rows="2" placeholder="Observaciones adicionales…" /></b-field>
          </template>

          <!-- ── SOLUCIONES ── -->
          <template v-else-if="fm.section==='soluciones'">
            <div class="form-section-title"><i class="fas fa-tint mr-2"></i>Datos del producto</div>
            <div class="form-grid">
              <b-field label="SKU *"><b-input v-model="fm.item.sku" placeholder="SOL-001" /></b-field>
              <b-field label="Nombre *"><b-input v-model="fm.item.nombre" placeholder="ReNu MultiPlus" /></b-field>
              <b-field label="Tipo">
                <b-select v-model="fm.item.tipo" expanded>
                  <option v-for="t in SOLUCIONES_CONFIG.tipos" :key="t">{{ t }}</option>
                </b-select>
              </b-field>
              <b-field label="Marca *"><b-input v-model="fm.item.marca" placeholder="Alcon" /></b-field>
              <b-field label="Volumen (ml) *"><b-input v-model.number="fm.item.volumen" type="number" min="0" /></b-field>
              <b-field label="Stock *"><b-input v-model.number="fm.item.stock" type="number" min="0" /></b-field>
              <b-field label="Precio *"><b-input v-model.number="fm.item.precio" type="number" min="0" /></b-field>
              <b-field label="Fecha caducidad"><b-input v-model="fm.item.caducidad" type="date" /></b-field>
            </div>
            <b-field label="Notas" class="mt-2"><b-input v-model="fm.item.notas" type="textarea" rows="2" /></b-field>
          </template>

          <!-- ── ACCESORIOS ── -->
          <template v-else-if="fm.section==='accesorios'">
            <div class="form-section-title"><i class="fas fa-puzzle-piece mr-2"></i>Datos del accesorio</div>
            <div class="form-grid">
              <b-field label="SKU *"><b-input v-model="fm.item.sku" placeholder="ACC-001" /></b-field>
              <b-field label="Nombre *"><b-input v-model="fm.item.nombre" placeholder="Paño Microfibra" /></b-field>
              <b-field label="Categoría">
                <b-select v-model="fm.item.categoria" expanded>
                  <option v-for="c in ACCESORIOS_CONFIG.categorias" :key="c">{{ c }}</option>
                </b-select>
              </b-field>
              <b-field label="Marca"><b-input v-model="fm.item.marca" placeholder="Zeiss" /></b-field>
              <b-field label="Compatible con"><b-input v-model="fm.item.compatible" placeholder="Universal" /></b-field>
              <b-field label="Stock *"><b-input v-model.number="fm.item.stock" type="number" min="0" /></b-field>
              <b-field label="Precio *"><b-input v-model.number="fm.item.precio" type="number" min="0" /></b-field>
            </div>
            <b-field label="Notas" class="mt-2"><b-input v-model="fm.item.notas" type="textarea" rows="2" /></b-field>
          </template>

          <!-- ── ESTUCHES ── -->
          <template v-else-if="fm.section==='estuches'">
            <div class="form-section-title"><i class="fas fa-box-open mr-2"></i>Datos del estuche</div>
            <div class="form-grid">
              <b-field label="SKU *"><b-input v-model="fm.item.sku" placeholder="EST-001" /></b-field>
              <b-field label="Nombre *"><b-input v-model="fm.item.nombre" placeholder="Estuche Rígido Clásico" /></b-field>
              <b-field label="Tipo">
                <b-select v-model="fm.item.tipo" expanded>
                  <option v-for="t in ESTUCHES_CONFIG.tipos" :key="t">{{ t }}</option>
                </b-select>
              </b-field>
              <b-field label="Material"><b-input v-model="fm.item.material" placeholder="Cuero sintético" /></b-field>
              <b-field label="Color"><b-input v-model="fm.item.color" placeholder="Negro" /></b-field>
              <b-field label="Compatible con"><b-input v-model="fm.item.compatible" placeholder="Universal" /></b-field>
              <b-field label="Stock *"><b-input v-model.number="fm.item.stock" type="number" min="0" /></b-field>
              <b-field label="Precio *"><b-input v-model.number="fm.item.precio" type="number" min="0" /></b-field>
            </div>
            <b-field label="Notas" class="mt-2"><b-input v-model="fm.item.notas" type="textarea" rows="2" /></b-field>
          </template>

          <!-- ── EQUIPOS ── -->
          <template v-else-if="fm.section==='equipos'">
            <div class="form-section-title"><i class="fas fa-tools mr-2"></i>Datos del equipo</div>
            <div class="form-grid">
              <b-field label="SKU *"><b-input v-model="fm.item.sku" placeholder="EQP-001" /></b-field>
              <b-field label="Nombre *"><b-input v-model="fm.item.nombre" placeholder="Autorefractómetro" /></b-field>
              <b-field label="Tipo">
                <b-select v-model="fm.item.tipo" expanded>
                  <option v-for="a in EQUIPOS_CONFIG.areas" :key="a">{{ a }}</option>
                </b-select>
              </b-field>
              <b-field label="Marca *"><b-input v-model="fm.item.marca" placeholder="Topcon" /></b-field>
              <b-field label="Modelo"><b-input v-model="fm.item.modelo" placeholder="KR-800" /></b-field>
              <b-field label="Número de serie"><b-input v-model="fm.item.serie" placeholder="TOP-2022-1041" /></b-field>
              <b-field label="Estado">
                <b-select v-model="fm.item.estado" expanded>
                  <option v-for="e in EQUIPOS_CONFIG.estados" :key="e">{{ e }}</option>
                </b-select>
              </b-field>
              <b-field label="Ubicación"><b-input v-model="fm.item.ubicacion" placeholder="Consultorio 1" /></b-field>
              <b-field label="Fecha adquisición"><b-input v-model="fm.item.adquisicion" type="date" /></b-field>
              <b-field label="Próx. mantenimiento"><b-input v-model="fm.item.mantenimiento" type="date" /></b-field>
            </div>
            <b-field label="Notas" class="mt-2"><b-input v-model="fm.item.notas" type="textarea" rows="2" /></b-field>
          </template>

        </section>

        <footer class="modal-card-foot glass-modal-foot" style="justify-content:flex-end;gap:.5rem">
          <b-button @click="fm.active=false" icon-left="times">Cancelar</b-button>
          <b-button type="is-primary" :loading="fm.saving" icon-left="check" @click="saveForm">
            {{ fm.mode==="create"?"Crear elemento":"Guardar cambios" }}
          </b-button>
        </footer>
      </div>
    </b-modal>

  </section>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   LAYOUT PRINCIPAL
   ═══════════════════════════════════════════════════════════════ */
.optica-section {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  animation: panel-fade-in 220ms ease-out;
}

.optica-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--c-primary);
  background: var(--c-primary-alpha);
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-pill);
  margin-bottom: 0.4rem;
}

.optica-page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
}
.optica-header-summary { text-align: right; }

/* ═══════════════════════════════════════════════════════════════
   GLASS WRAPPER
   ═══════════════════════════════════════════════════════════════ */
.glass-wrapper {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  -webkit-backdrop-filter: blur(var(--fx-blur, 12px));
  backdrop-filter: blur(var(--fx-blur, 12px));
  box-shadow: var(--shadow-md);
  overflow: hidden;
  padding: 1rem;
}

/* DynamicTabs inside glass-wrapper — remove outer spacing */
.glass-wrapper :deep(.dyn-tabs__bar) {
  background: var(--surface);
  border-color: var(--border-light);
}

/* ═══════════════════════════════════════════════════════════════
   BANNER DE ITEM SELECCIONADO
   ═══════════════════════════════════════════════════════════════ */
.item-banner {
  background: linear-gradient(120deg, #7957d5, #9a6dff, #3b82f6, #ec4899);
  background-size: 200% 200%;
  border-radius: var(--radius-lg);
  padding: 0.9rem 1.25rem;
  margin-bottom: 1rem;
  display: grid;
  grid-template-columns: minmax(0,2fr) minmax(0,1.4fr) auto;
  align-items: center;
  gap: 1rem;
  color: #f9fafb;
  box-shadow: 0 12px 28px rgba(88,28,135,0.4);
  position: relative;
  overflow: hidden;
  animation: banner-enter 220ms ease-out, banner-gradient-shift 14s ease-in-out infinite alternate;
}
.item-banner--equipos {
  background: linear-gradient(120deg, #1e3a5f, #2563eb, #7957d5, #0891b2);
}
.item-banner--pulse {
  box-shadow: 0 12px 28px rgba(88,28,135,0.4), 0 0 0 3px rgba(255,255,255,0.25);
}
.item-banner::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 0 0, rgba(255,255,255,0.22), transparent 55%),
              radial-gradient(circle at 100% 100%, rgba(0,0,0,0.18), transparent 55%);
  pointer-events: none;
}
.item-banner > * { position: relative; z-index: 1; }

.item-banner__main { display: flex; align-items: center; gap: 0.85rem; min-width: 0; }
.item-banner__sku-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(15,23,42,0.28);
  border: 1px solid rgba(255,255,255,0.2);
  backdrop-filter: blur(6px);
  padding: 0.3rem 0.7rem;
  border-radius: var(--radius-pill);
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}
.item-banner__info { min-width: 0; }
.item-banner__name {
  margin: 0;
  font-weight: 700;
  font-size: 0.98rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-banner__sub {
  margin: 0.1rem 0 0;
  font-size: 0.78rem;
  opacity: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-banner__chips { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
.item-banner__actions { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }

/* ═══════════════════════════════════════════════════════════════
   I-CHIPS (dentro del banner)
   ═══════════════════════════════════════════════════════════════ */
.i-chip {
  border-radius: var(--radius-pill);
  padding: 0.22rem 0.65rem;
  font-size: 0.74rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  background: rgba(15,23,42,0.2);
  color: #f9fafb;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.18);
  white-space: nowrap;
}
.i-chip--ok     { background: rgba(34,197,94,0.35); border-color: rgba(34,197,94,0.5); }
.i-chip--warn   { background: rgba(245,158,11,0.35); border-color: rgba(245,158,11,0.5); }
.i-chip--danger { background: rgba(239,68,68,0.35); border-color: rgba(239,68,68,0.5); }
.i-chip--info   { background: rgba(59,130,246,0.35); border-color: rgba(59,130,246,0.5); }
.i-chip--price  { background: rgba(144,111,225,0.4); border-color: rgba(144,111,225,0.6); font-weight: 800; }

/* ═══════════════════════════════════════════════════════════════
   STAT CARDS
   ═══════════════════════════════════════════════════════════════ */
.stat-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.stat-row--5 { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }

.stat-card {
  padding: 1rem 1.1rem 1rem 1.3rem;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  border-left: 3px solid var(--border);
  transition: transform 140ms ease, box-shadow 140ms ease;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.stat-card--neutral { border-left-color: var(--c-primary); }
.stat-card--primary { border-left-color: var(--c-primary); }
.stat-card--success { border-left-color: var(--c-success); }
.stat-card--warning { border-left-color: var(--c-warning); }
.stat-card--danger  { border-left-color: var(--c-danger); }
.stat-card--info    { border-left-color: var(--c-info); }

.stat-card__icon {
  font-size: 1.3rem;
  opacity: 0.55;
  flex-shrink: 0;
  width: 2rem;
  text-align: center;
}
.stat-card--primary .stat-card__icon { color: var(--c-primary); opacity: 0.7; }
.stat-card--success .stat-card__icon { color: var(--c-success); opacity: 0.7; }
.stat-card--warning .stat-card__icon { color: var(--c-warning); opacity: 0.7; }
.stat-card--danger  .stat-card__icon { color: var(--c-danger);  opacity: 0.7; }
.stat-card--info    .stat-card__icon { color: var(--c-info);    opacity: 0.7; }

.stat-label {
  display: block;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  font-weight: 700;
  margin-bottom: 0.1rem;
}
.stat-value {
  display: block;
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.1;
  font-family: "Switzer", sans-serif;
}
.stat-value.text-primary { color: var(--c-primary); }
.stat-value.text-warning { color: var(--c-warning); }
.stat-value.text-danger  { color: var(--c-danger); }
.stat-value.text-success { color: var(--c-success); }
.stat-value.text-info    { color: var(--c-info); }

/* ═══════════════════════════════════════════════════════════════
   TOOLBAR DE SECCIÓN
   ═══════════════════════════════════════════════════════════════ */
.section-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
  flex-wrap: wrap;
}
.toolbar-field { min-width: 200px; }
.toolbar-actions { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }

/* Labels del b-field dentro de toolbar */
.section-toolbar :deep(.label) { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); }

/* ═══════════════════════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════════════════════ */
.skeleton-wrap { display: flex; flex-direction: column; gap: 0.55rem; padding: 0.25rem 0 0.5rem; }
.skeleton-row {
  height: 2.6rem;
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, var(--surface-raised) 25%, var(--border-light) 50%, var(--surface-raised) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
}
@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ═══════════════════════════════════════════════════════════════
   TABLE SHELL + BUEFY TABLE OVERRIDES
   ═══════════════════════════════════════════════════════════════ */
.table-shell {
  overflow: hidden;
  border-radius: var(--radius-md);
}
.glass-card {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

:deep(.b-table .table) { background: transparent !important; color: var(--text-primary); }
:deep(.b-table .table thead th) {
  background: var(--surface) !important;
  color: var(--text-muted) !important;
  border-bottom: 1px solid var(--border) !important;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 800;
  white-space: nowrap;
  padding: 0.75rem 0.65rem;
}
:deep(.b-table .table tbody tr) {
  background: transparent !important;
  transition: background 100ms ease;
  cursor: pointer;
}
:deep(.b-table .table tbody tr:hover) {
  background: var(--c-primary-alpha) !important;
}
:deep(.b-table .table tbody tr.is-selected) {
  background: rgba(144,111,225,0.13) !important;
  box-shadow: inset 3px 0 0 var(--c-primary);
}
:deep(.b-table .table tbody tr.is-selected td) { color: var(--text-primary) !important; }
:deep(.b-table .table tbody tr.row--deleted) { opacity: 0.65; }
:deep(.b-table .table td) {
  border-bottom: 1px solid var(--border-light) !important;
  vertical-align: middle;
  font-size: 0.84rem;
  padding: 0.55rem 0.65rem;
}

/* Paginación */
:deep(.pagination-list li a),
:deep(.pagination-previous),
:deep(.pagination-next) {
  background: var(--surface-raised);
  border-color: var(--border);
  color: var(--text-primary);
  font-size: 0.8rem;
}
:deep(.pagination-link.is-current) {
  background: var(--c-primary);
  border-color: var(--c-primary);
}

/* ═══════════════════════════════════════════════════════════════
   STOCK BADGE + MONO TAG + DATE CELL
   ═══════════════════════════════════════════════════════════════ */
.stock-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  padding: 0.1rem 0.5rem;
  border-radius: var(--radius-pill);
  font-weight: 800;
  font-size: 0.82rem;
  border: 1px solid transparent;
}
.stock-badge--ok     { color: var(--c-success); background: var(--c-success-alpha); border-color: rgba(34,197,94,0.25); }
.stock-badge--warn   { color: var(--c-warning); background: var(--c-warning-alpha); border-color: rgba(245,158,11,0.25); }
.stock-badge--danger { color: var(--c-danger);  background: var(--c-danger-alpha);  border-color: rgba(239,68,68,0.25); }

.mono-tag {
  font-family: "JetBrains Mono","Fira Mono",monospace;
  font-size: 0.77rem;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border-light);
  padding: 0.08rem 0.45rem;
  border-radius: var(--radius-sm);
}
.date-cell { font-size: 0.82rem; font-weight: 500; }

/* ═══════════════════════════════════════════════════════════════
   TABLE EMPTY STATE
   ═══════════════════════════════════════════════════════════════ */
.table-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1rem;
  color: var(--text-muted);
  gap: 0.25rem;
  font-size: 0.88rem;
}
.table-empty i { opacity: 0.35; }

/* ═══════════════════════════════════════════════════════════════
   MODALES GLASSMORPHISM
   ═══════════════════════════════════════════════════════════════ */
.glass-modal-card {
  border-radius: var(--radius-lg) !important;
  border: 1px solid var(--border) !important;
  background: var(--surface) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  backdrop-filter: blur(20px) !important;
  box-shadow: var(--shadow-xl, 0 24px 48px rgba(0,0,0,0.22)) !important;
  overflow: hidden;
  max-width: 520px;
  width: 100%;
}
.glass-modal-card--wide { max-width: 660px; }

.glass-modal-head {
  background: linear-gradient(135deg, rgba(144,111,225,0.14), rgba(236,72,153,0.08)) !important;
  border-bottom: 1px solid var(--border-light) !important;
  padding: 1rem 1.5rem !important;
}
.glass-modal-head .modal-card-title {
  color: var(--text-primary) !important;
  font-weight: 700 !important;
  font-size: 0.95rem !important;
}

.glass-modal-body {
  background: transparent !important;
  padding: 1.25rem 1.5rem !important;
  max-height: 62vh;
  overflow-y: auto;
}
.glass-modal-body::-webkit-scrollbar { width: 5px; }
.glass-modal-body::-webkit-scrollbar-track { background: transparent; }
.glass-modal-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 999px; }

.glass-modal-foot {
  background: transparent !important;
  border-top: 1px solid var(--border-light) !important;
  padding: 0.85rem 1.5rem !important;
}

.confirm-message { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; }

/* Inputs dentro del modal */
:deep(.glass-modal-body .label) { font-size: 0.74rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.2rem; }
:deep(.glass-modal-body .input),
:deep(.glass-modal-body .select select),
:deep(.glass-modal-body .textarea) {
  background: var(--surface-raised) !important;
  border-color: var(--border) !important;
  color: var(--text-primary) !important;
  font-size: 0.87rem;
}
:deep(.glass-modal-body .input:focus),
:deep(.glass-modal-body .select select:focus),
:deep(.glass-modal-body .textarea:focus) {
  border-color: var(--c-primary) !important;
  box-shadow: 0 0 0 2px var(--c-primary-alpha) !important;
}

/* ── Form section title ── */
.form-section-title {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--c-primary);
  margin-bottom: 0.85rem;
  display: flex;
  align-items: center;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 0.7rem;
  margin-bottom: 0.5rem;
}

/* ═══════════════════════════════════════════════════════════════
   ANIMACIONES
   ═══════════════════════════════════════════════════════════════ */
@keyframes panel-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes banner-enter {
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes banner-gradient-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Transición del banner */
.banner-slide-enter-active,
.banner-slide-leave-active { transition: all 220ms cubic-bezier(0.34, 1.56, 0.64, 1); }
.banner-slide-enter-from,
.banner-slide-leave-to    { opacity: 0; transform: translateY(-8px) scale(0.97); }

/* ═══════════════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════════════ */
@media (max-width: 1024px) {
  .item-banner { grid-template-columns: 1fr auto; grid-template-rows: auto auto; }
  .item-banner__chips { grid-column: 1 / -1; }
}
@media (max-width: 768px) {
  .optica-section { padding: 1rem; }
  .item-banner { grid-template-columns: 1fr; }
  .item-banner__actions { flex-wrap: wrap; }
  .stat-row { grid-template-columns: repeat(2, 1fr); }
  .section-toolbar { flex-direction: column; align-items: stretch; }
  .toolbar-actions { justify-content: flex-end; }
}
</style>
