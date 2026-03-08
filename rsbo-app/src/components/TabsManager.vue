<!-- src/components/TabsManager.vue -->
<template>
  <div>
    <!-- TABS -->
    <div ref="tabsContainer" class="tabs-wrapper tabs-wrapper--glass">
      <template v-if="loadingTabs">
        <div v-for="n in 3" :key="'sk-' + n" class="tab-item skeleton-tab">
          <span class="skeleton-bar"></span>
        </div>
      </template>

      <template v-else>
        <div v-for="planilla in sheets" :key="planilla.id" :data-id="planilla.id" :class="[
          'tab-item',
          'tab-item--glass',
          { 'tab-agregar': planilla.id === 'nueva', active: planilla.id === activeId }
        ]" @click="handleTabClick(planilla.id)">
          <template v-if="planilla.id === 'nueva'">
            <i class="fas fa-plus"></i>
          </template>

          <template v-else>
            <div class="tab-text">
              <span class="tab-label" :title="planilla.name">{{ planilla.name }}</span>

              <span v-if="planilla.sku" class="tab-sku" :title="planilla.sku">
                {{ planilla.sku }}
              </span>
              <span v-else class="tab-sku tab-sku--empty" title="Sin SKU (pendiente de backfill)">
                SIN-SKU
              </span>
            </div>

            <button class="tab-menu-btn" title="Más acciones" aria-label="Más acciones"
              @click.stop="openActions(planilla)">
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
          <!-- PROVEEDOR / MARCA (CREAR) -->
          <div class="columns is-multiline">
            <div class="column is-12-mobile is-6-tablet">
              <b-field label="Proveedor (opcional)">
                <b-autocomplete v-model="newProveedorName" :data="filteredProveedorOptions"
                  placeholder="Ej. Eurovisión / Luxottica / …" open-on-focus keep-first :clear-on-select="false"
                  :max-height="220" :check-infinite-scroll="false" @select="onSelectProveedor">
                  <template #empty>
                    <span class="has-text-grey">Sin coincidencias (puedes crear uno nuevo escribiéndolo).</span>
                  </template>
                </b-autocomplete>
              </b-field>
            </div>

            <div class="column is-12-mobile is-6-tablet">
              <b-field label="Marca (opcional)">
                <b-autocomplete v-model="newMarcaName" :data="filteredMarcaOptions"
                  placeholder="Ej. Essilor / Zeiss / …" open-on-focus keep-first :clear-on-select="false"
                  :max-height="220" :check-infinite-scroll="false" @select="onSelectMarca">
                  <template #empty>
                    <span class="has-text-grey">Sin coincidencias (puedes crear una nueva escribiéndola).</span>
                  </template>
                </b-autocomplete>
              </b-field>
            </div>
          </div>

          <!-- BASE -->
          <b-field label="Selecciona la Base">
            <div class="tabs tabs-opciones is-toggle is-small">
              <ul>
                <li v-for="(val, key) in configuracion.bases" :key="key" :class="{ 'is-active': selectedBase === key }"
                  @click="selectBase(key)">
                  <a>{{ val.label }}</a>
                </li>
              </ul>
            </div>
          </b-field>

          <!-- MATERIALES -->
          <b-field v-if="selectedBase" label="Selecciona el Material">
            <div class="tabs tabs-opciones is-toggle is-small">
              <ul>
                <li v-for="mat in allMaterials" :key="mat" :class="[
                  { 'is-active': selectedMaterial === mat },
                  { 'is-disabled': !isMaterialAllowed(mat) }
                ]" :aria-disabled="!isMaterialAllowed(mat)">
                  <b-tooltip v-if="!isMaterialAllowed(mat)" :label="`No disponible con ${baseLabel}`" position="is-top"
                    type="is-dark" multilined>
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

          <!-- TRATAMIENTO -->
          <b-field v-if="selectedMaterial" label="Selecciona el Tratamiento">
            <div class="tabs tabs-opciones is-toggle is-small">
              <ul>
                <li v-for="t in allowedTratamientos" :key="t.key"
                  :class="{ 'is-active': selectedTratamientoKey === t.key }" @click="selectTratamiento(t.key)">
                  <a>{{ t.label }}</a>
                </li>
              </ul>
            </div>
            <p class="help is-danger mt-2" v-if="selectedMaterial && !allowedTratamientos.length">
              No hay tratamientos compatibles con la selección actual.
            </p>
          </b-field>

          <!-- VARIANTE -->
          <b-field v-if="selectedTratamientoKey && varianteOptions.length" label="Selecciona la Variante">
            <div class="tabs tabs-opciones is-toggle is-small">
              <ul>
                <li v-for="v in varianteOptions" :key="v" :class="{ 'is-active': selectedVariante === v }"
                  @click="selectVariante(v)">
                  <a>{{ v }}</a>
                </li>
              </ul>
            </div>
          </b-field>

          <!-- ✅ DATOS DE COMPRA (CREAR) -->
          <div class="action-card" style="margin-top: 1rem;">
            <div class="action-icon"><i class="far fa-receipt"></i></div>
            <div class="action-content">
              <div class="action-title">Datos de compra (opcional)</div>
              <div class="action-desc">
                Al elegir <b>Fecha de compra</b>, la <b>Caducidad</b> se calcula automáticamente a {{
                  DEFAULT_EXPIRY_MONTHS
                }} meses.
                Puedes editarla después.
              </div>

              <div class="columns is-multiline mt-2">

                <div class="column is-12-mobile is-6-tablet">
                  <b-field label="Precio de venta (actual)">
                    <b-input v-model="newPrecioVenta" type="number" min="0" step="0.01" placeholder="Ej. 1200.00" />
                    <p class="help is-light">Opcional. Si lo dejas vacío, queda null.</p>
                  </b-field>
                </div>

                <div class="column is-12-mobile is-6-tablet">
                  <b-field label="Número de nota / factura">
                    <b-input v-model.trim="newNumFactura" placeholder="Ej. FAC-10293" />
                  </b-field>
                </div>

                <div class="column is-12-mobile is-6-tablet">
                  <b-field label="Lote del producto">
                    <b-input v-model.trim="newLoteProducto" placeholder="Ej. LOTE-2026-03" />
                  </b-field>
                </div>

                <div class="column is-12-mobile is-6-tablet">
                  <b-field label="Fecha de compra">
                    <b-input v-model="newFechaCompra" type="date" />
                  </b-field>
                </div>

                <div class="column is-12-mobile is-6-tablet">
                  <b-field label="Fecha de caducidad">
                    <b-input v-model="newFechaCaducidad" type="date" />
                    <p class="help is-light">Sugerida automáticamente (compra + {{ DEFAULT_EXPIRY_MONTHS }} meses).</p>
                  </b-field>
                </div>
              </div>
            </div>
          </div>

          <!-- Nombre autogenerado -->
          <b-field label="Nombre generado automáticamente">
            <b-input v-model="newSheetName" disabled expanded />
          </b-field>

          <div class="create-actions">
            <b-button type="is-primary" native-type="submit" size="is-small" :disabled="!canCreate || creatingSheet"
              :loading="creatingSheet">
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
          <div v-for="tab in internalTabs" :key="tab.id" class="sheet-tab"
            :class="{ active: activeInternalTab === tab.id }" @click="handleInternalTabClick(tab.id)">
            {{ tab.label }}
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL ACCIONES -->
    <teleport to="body">
      <b-modal v-model="isActionsOpen" has-modal-card :can-cancel="['escape']" :width="760" trap-focus scroll="keep"
        custom-class="rsbo-sheet-actions-modal">
        <div class="modal-card rsbo-actions-card">
          <header class="modal-card-head rsbo-actions-head">
            <div class="pill-row">
              <span class="pill strong">{{ selectedSheet?.name || "Planilla" }}</span>
              <span class="pill" v-if="selectedSheet?.sku">SKU: {{ selectedSheet.sku }}</span>
              <span class="pill">Tipo: {{ tipoHuman(selectedSheet?.tipo_matriz) }}</span>
              <span class="pill" v-if="selectedSheet?.material">Material: {{ selectedSheet.material }}</span>

              <span class="pill" v-if="displayTratamiento(selectedSheet)">
                {{ displayTratamiento(selectedSheet) }}
              </span>

              <span class="pill" v-if="selectedSheet?.fechaCaducidad">
                Caduca: {{ fmtDateOnly(selectedSheet.fechaCaducidad) }}
              </span>
            </div>

            <button class="delete" :class="{ 'is-disabled': anySaving }" :disabled="anySaving" aria-label="close"
              :title="anySaving ? 'Hay cambios en proceso…' : 'Cerrar'" @click="isActionsOpen = false"></button>
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

            <!-- ✅ DATOS DE COMPRA (EDITAR) -->
            <div class="action-card" :class="{ 'meta-glow': purchaseGlow }">
              <div class="action-icon"><i class="far fa-receipt"></i></div>
              <div class="action-content">
                <div class="action-title">Datos de compra</div>

                <div class="columns is-multiline mt-2">
                  <div class="column is-12-mobile is-6-tablet">
                    <b-field label="Fecha de creación (solo lectura)">
                      <b-input :value="purchaseFechaCreacion" disabled />
                    </b-field>
                  </div>


                  <div class="column is-12-mobile is-6-tablet">
                    <b-field label="Precio de venta (actual)">
                      <b-input v-model="editPrecioVenta" type="number" min="0" step="0.01" :disabled="savingPurchase" />
                    </b-field>
                  </div>

                  <div class="column is-12-mobile is-6-tablet">
                    <b-field label="Fecha de caducidad">
                      <b-input v-model="editFechaCaducidad" type="date" :disabled="savingPurchase" />
                    </b-field>
                  </div>

                  <div class="column is-12-mobile is-6-tablet">
                    <b-field label="Fecha de compra">
                      <b-input v-model="editFechaCompra" type="date" :disabled="savingPurchase" />
                    </b-field>
                  </div>

                  <div class="column is-12-mobile is-6-tablet">
                    <b-field label="Número de nota / factura">
                      <b-input v-model.trim="editNumFactura" :disabled="savingPurchase" />
                    </b-field>
                  </div>

                  <div class="column is-12-mobile is-6-tablet">
                    <b-field label="Lote del producto">
                      <b-input v-model.trim="editLoteProducto" :disabled="savingPurchase" />
                    </b-field>
                  </div>
                </div>

                <div class="buttons is-right mt-2 meta-actions-row">
                  <div class="meta-status-wrapper" aria-live="polite" role="status">
                    <transition name="fade-status">
                      <div v-if="purchaseStatus !== 'idle'" class="meta-status" :class="purchaseStatus">
                        <span v-if="purchaseStatus === 'saving'" class="dot-pulse"></span>
                        <i v-else-if="purchaseStatus === 'saved'" class="far fa-check-circle"></i>
                        <i v-else-if="purchaseStatus === 'error'" class="far fa-exclamation-triangle"></i>
                        <span class="meta-status-text">{{ purchaseStatusMessage }}</span>
                      </div>
                    </transition>
                  </div>

                  <b-button type="is-primary" size="is-small" :loading="savingPurchase"
                    :disabled="!canSavePurchase || savingPurchase" @click="confirmSavePurchase">
                    <span v-if="!savingPurchase">Guardar datos</span>
                    <span v-else>Sincronizando…</span>
                  </b-button>
                </div>
              </div>
            </div>


            <!-- ✅ PROVEEDOR / MARCA (EDITAR) -->
            <div class="action-card" :class="{ 'vendor-glow': vendorGlow }">
              <div class="action-icon"><i class="far fa-building"></i></div>
              <div class="action-content">
                <div class="action-title">Proveedor y Marca</div>
                <div class="action-desc">Editar proveedor y marca asociados a esta planilla.</div>

                <div class="columns is-multiline mt-2">
                  <div class="column is-12-mobile is-6-tablet">
                    <b-field label="Proveedor">
                      <b-autocomplete v-model="editProveedorName" :data="filteredProveedorOptionsEdit"
                        placeholder="Ej. Eurovisión / Luxottica / …" open-on-focus keep-first :clear-on-select="false"
                        :max-height="220" :check-infinite-scroll="false" :disabled="savingVendor"
                        @select="(v) => (editProveedorName = typeof v === 'string' ? v : editProveedorName)">
                        <template #empty>
                          <span class="has-text-grey">Sin coincidencias (puedes escribir uno nuevo).</span>
                        </template>
                      </b-autocomplete>
                    </b-field>
                  </div>

                  <div class="column is-12-mobile is-6-tablet">
                    <b-field label="Marca">
                      <b-autocomplete v-model="editMarcaName" :data="filteredMarcaOptionsEdit"
                        placeholder="Ej. Essilor / Zeiss / …" open-on-focus keep-first :clear-on-select="false"
                        :max-height="220" :check-infinite-scroll="false" :disabled="savingVendor"
                        @select="(v) => (editMarcaName = typeof v === 'string' ? v : editMarcaName)">
                        <template #empty>
                          <span class="has-text-grey">Sin coincidencias (puedes escribir una nueva).</span>
                        </template>
                      </b-autocomplete>
                    </b-field>
                  </div>
                </div>

                <div class="buttons is-right mt-2 meta-actions-row">
                  <div class="meta-status-wrapper" aria-live="polite" role="status">
                    <transition name="fade-status">
                      <div v-if="vendorStatus !== 'idle'" class="meta-status" :class="vendorStatus">
                        <span v-if="vendorStatus === 'saving'" class="dot-pulse"></span>
                        <i v-else-if="vendorStatus === 'saved'" class="far fa-check-circle"></i>
                        <i v-else-if="vendorStatus === 'error'" class="far fa-exclamation-triangle"></i>
                        <span class="meta-status-text">{{ vendorStatusMessage }}</span>
                      </div>
                    </transition>
                  </div>

                  <b-button type="is-primary" size="is-small" :loading="savingVendor"
                    :disabled="!canSaveVendor || savingVendor" @click="confirmSaveVendor">
                    <span v-if="!savingVendor">Guardar proveedor/marca</span>
                    <span v-else>Sincronizando…</span>
                  </b-button>
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
                    <b-input v-model.trim="renameName" placeholder="Escribe el nuevo nombre" maxlength="80"
                      :disabled="renaming" />
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

                    <b-button type="is-primary" :disabled="!canRename || renaming" :loading="renaming"
                      @click="confirmRename">
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
                    <b-input v-model.trim="metaForm.observaciones" type="textarea" rows="2" maxlength="500"
                      :disabled="savingMeta" />
                  </b-field>

                  <b-field label="Notas">
                    <b-input v-model.trim="metaForm.notas" type="textarea" rows="2" maxlength="500"
                      :disabled="savingMeta" />
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

                  <b-button type="is-primary" size="is-small" :loading="savingMeta"
                    :disabled="!canSaveMeta || savingMeta" @click="confirmSaveMeta">
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

            <!-- Lo demás (proveedor/marca, rename, meta, trash) lo dejas igual en tu archivo real -->
          </section>

          <footer class="modal-card-foot rsbo-actions-foot">
            <b-button :disabled="anySaving" @click="isActionsOpen = false">
              Cerrar
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

const DEBUG_PURCHASE = true;

/** Caducidad por defecto: 24 meses (= 2 años) */
const DEFAULT_EXPIRY_MONTHS = 24;

/* ===================== Fechas “date-only” sin bugs de zona horaria ===================== */
const ISO_DATE_ONLY_RX = /^\d{4}-\d{2}-\d{2}$/;

const todayISO = () => new Date().toISOString().slice(0, 10);

const fmtDateOnly = (v) => {
  if (!v) return "";
  if (typeof v === "string" && ISO_DATE_ONLY_RX.test(v.trim())) return v.trim();
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const addMonthsToISODate = (isoDate, months) => {
  if (!isoDate || !ISO_DATE_ONLY_RX.test(String(isoDate).trim())) return "";
  const [y, m, d] = String(isoDate).trim().split("-").map((n) => Number(n));
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const day = dt.getUTCDate();
  dt.setUTCMonth(dt.getUTCMonth() + Number(months || 0));
  if (dt.getUTCDate() < day) dt.setUTCDate(0);
  return dt.toISOString().slice(0, 10);
};

// create: "" -> undefined (no enviar)
// edit: "" -> null (enviar intención de limpiar)
const dateForCreate = (v) => {
  const s = String(v || "").trim();
  if (!s) return undefined;
  return ISO_DATE_ONLY_RX.test(s) ? s : undefined;
};
const dateForEdit = (v) => {
  const s = String(v || "").trim();
  if (!s) return null;
  return ISO_DATE_ONLY_RX.test(s) ? s : null;
};

// ✅ números opcionales (precioVenta)
const numForCreate = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};
const numForEdit = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const props = defineProps({
  initialSheets: { type: Array, required: true },
  activeId: { type: String, required: true },
  configuracion: { type: Object, required: true },
  actor: { type: Object, default: null },
  loadingTabs: { type: Boolean, default: false }
});

const emit = defineEmits(["update:active", "reorder", "crear", "update:internal", "deleted", "renamed"]);

/* ===================== CATÁLOGO TRATAMIENTO/VARIANTE ===================== */
const ESPEJO_COLORS = ["Verde", "Rojo", "Morado", "Plata", "Naranja"];
const POLAR_BASES = ["Gris", "Café", "G15"];

const TREATMENTS = {
  BCO: { label: "BCO", variants: [] },
  AR: { label: "AR", variants: [] },
  ANTIBLE: { label: "Antible", variants: ["sin AR", "con AR"] },
  FOTO: { label: "Foto", variants: ["sin AR", "con AR"] },
  FOTO_ANTIBLE: { label: "Foto + Antible", variants: ["sin AR", "con AR"] },
  TRANSITIONS: {
    label: "Transitions",
    variantsByMaterial: { "CR-39": ["Gris", "Café", "Verde"], Policarbonato: ["Gris", "Café"] }
  },
  POLAR: { label: "Polarizado", variants: [...POLAR_BASES] },
  POLAR_ESPEJO: {
    label: "Polarizado + Espejado",
    variants: POLAR_BASES.flatMap((b) => ESPEJO_COLORS.map((c) => `Base ${b} + Espejo ${c}`))
  },
  CRISTAL_FOTO: { label: "Fotocromático", variants: [] }
};

const composeTratamientoDisplay = (tratamiento, variante) => {
  const t = String(tratamiento || "").trim();
  const v = String(variante || "").trim();
  if (!t) return "";
  return v ? `${t} (${v})` : t;
};

const displayTratamiento = (sheet) => {
  if (!sheet) return "";
  const t = sheet.tratamiento || null;
  const v = sheet.variante || null;
  const text = composeTratamientoDisplay(t, v);
  return text ? `Tratamiento: ${text}` : "";
};

/* ===================== NORMALIZADOR ===================== */
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

  const pvRaw = s.precioVenta;
  const pvNum = pvRaw === null || pvRaw === undefined || String(pvRaw).trim() === "" ? null : Number(pvRaw);
  const precioVenta = Number.isFinite(pvNum) ? pvNum : null;

  return {
    ...s,
    id,
    name,
    sku: skuRaw ? String(skuRaw) : null,

    proveedor,
    marca,

    tratamiento: s.tratamiento ?? null,
    variante: s.variante ?? null,

    fechaCreacion: s.fechaCreacion ?? s.createdAt ?? null,
    fechaCaducidad: s.fechaCaducidad ?? null,
    fechaCompra: s.fechaCompra ?? null,
    numFactura: s.numFactura ?? "",
    loteProducto: s.loteProducto ?? "",

    // ✅ nuevo campo
    precioVenta,

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

/* ===================== Autocomplete Proveedor/Marca ===================== */
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

/* ===================== Helpers ===================== */
const errMsg = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

const actorRef = computed(() => {
  const src = props.actor || (typeof window !== "undefined" ? window.__currentUser : null) || null;
  return src && (src.id || src.userId) ? { userId: src.id || src.userId, name: src.name } : null;
});

/** ✅ ESTO era lo que te faltaba */
const tipoHuman = (t) =>
({
  BASE: "Monofocal (Base)",
  SPH_CYL: "Monofocal (Esf/Cil)",
  SPH_ADD: "Bifocal (SPH + ADD)",
  BASE_ADD: "Progresivo (BASE + ADD)"
}[t] || t);

/* ===================== Crear ===================== */
const selectedBase = ref(null);
const selectedMaterial = ref(null);
const selectedTratamientoKey = ref(null);
const selectedVariante = ref("");

const newSheetName = ref("");
const creatingSheet = ref(false);

const createStatus = ref("idle");
const createStatusMessage = ref("");
const resetCreateStatus = () => {
  createStatus.value = "idle";
  createStatusMessage.value = "";
};

// compra (crear)
const newNumFactura = ref("");
const newLoteProducto = ref("");
const newFechaCompra = ref("");
const newFechaCaducidad = ref("");
const newPrecioVenta = ref("");

const resetPurchaseCreateDefaults = () => {
  const base = newFechaCompra.value && ISO_DATE_ONLY_RX.test(newFechaCompra.value) ? newFechaCompra.value : todayISO();
  newFechaCaducidad.value = addMonthsToISODate(base, DEFAULT_EXPIRY_MONTHS);
};
resetPurchaseCreateDefaults();

watch(
  () => newFechaCompra.value,
  (v) => {
    const base = v && ISO_DATE_ONLY_RX.test(v) ? v : todayISO();
    newFechaCaducidad.value = addMonthsToISODate(base, DEFAULT_EXPIRY_MONTHS);
  }
);

watch([newNumFactura, newLoteProducto, newFechaCompra, newFechaCaducidad, newPrecioVenta], () => {
  if (!DEBUG_PURCHASE) return;
  console.log("[INV][UI] create purchase fields changed", {
    newNumFactura: newNumFactura.value,
    newLoteProducto: newLoteProducto.value,
    newFechaCompra: newFechaCompra.value,
    newFechaCaducidad: newFechaCaducidad.value,
    newPrecioVenta: newPrecioVenta.value
  });
});

const allMaterials = computed(() => {
  const all = new Set();
  const bases = props.configuracion?.bases || {};
  for (const key of Object.keys(bases)) {
    (bases[key]?.materiales || []).forEach((m) => all.add(String(m)));
  }
  return Array.from(all).sort((a, b) => a.localeCompare(b));
});

const baseLabel = computed(() => {
  const b = selectedBase.value && props.configuracion.bases[selectedBase.value];
  return b ? b.label : "";
});

const selectBase = (base) => {
  selectedBase.value = base;
  selectedMaterial.value = null;
  selectedTratamientoKey.value = null;
  selectedVariante.value = "";
};

const isMaterialAllowed = (mat) => {
  if (!selectedBase.value) return false;
  const b = props.configuracion.bases[selectedBase.value];
  return b && b.materiales.includes(mat);
};

const selectMaterial = (mat) => {
  if (!isMaterialAllowed(mat)) return;
  selectedMaterial.value = mat;
  selectedTratamientoKey.value = null;
  selectedVariante.value = "";
};

const hasAnyAllowedMaterial = computed(() => allMaterials.value.some((m) => isMaterialAllowed(m)));

const allowedTratamientos = computed(() => {
  if (!selectedBase.value || !selectedMaterial.value) return [];
  const baseCfg = props.configuracion.bases[selectedBase.value];
  if (!baseCfg) return [];

  if (String(selectedMaterial.value) === "Cristal") {
    return ["BCO", "CRISTAL_FOTO"]
      .filter((k) => baseCfg.tratamientos.includes(k))
      .map((k) => ({ key: k, label: TREATMENTS[k]?.label || k }));
  }

  return (baseCfg.tratamientos || [])
    .filter((k) => k in TREATMENTS)
    .filter((k) => {
      if ((k === "POLAR" || k === "POLAR_ESPEJO") && !["monofocal", "monofocalEsfCil"].includes(selectedBase.value)) return false;
      if (k === "TRANSITIONS" && !["CR-39", "Policarbonato"].includes(selectedMaterial.value)) return false;
      if ((k === "POLAR" || k === "POLAR_ESPEJO") && !["CR-39", "Policarbonato"].includes(selectedMaterial.value)) return false;
      return true;
    })
    .map((k) => ({ key: k, label: TREATMENTS[k]?.label || k }));
});

const selectTratamiento = (key) => {
  selectedTratamientoKey.value = key;
  selectedVariante.value = "";
};

const varianteOptions = computed(() => {
  const key = selectedTratamientoKey.value;
  if (!key) return [];

  if (key === "TRANSITIONS") {
    const mat = String(selectedMaterial.value || "");
    return TREATMENTS.TRANSITIONS.variantsByMaterial?.[mat] || [];
  }

  const obj = TREATMENTS[key];
  return obj?.variants ? [...obj.variants] : [];
});

const selectVariante = (v) => {
  selectedVariante.value = v;
};

watch([selectedBase, selectedMaterial, selectedTratamientoKey, selectedVariante], () => {
  const baseCfg = selectedBase.value && props.configuracion.bases[selectedBase.value];
  const baseLabelTxt = baseCfg ? baseCfg.label : "";
  const materialLabel = selectedMaterial.value || "";
  const tKey = selectedTratamientoKey.value;
  const tLabel = tKey ? (TREATMENTS[tKey]?.label || tKey) : "";
  const nameTrat = composeTratamientoDisplay(tLabel, selectedVariante.value || "");
  newSheetName.value = [baseLabelTxt, materialLabel, nameTrat].filter(Boolean).join(" | ");
});

const canCreate = computed(() => {
  if (!selectedBase.value) return false;
  if (!selectedMaterial.value) return false;
  if (!selectedTratamientoKey.value) return false;
  if (!newSheetName.value) return false;
  if (creatingSheet.value) return false;
  if (varianteOptions.value.length > 0 && !String(selectedVariante.value || "").trim()) return false;
  return true;
});

const mapBaseToTipoMatriz = (baseKey) => {
  const cfg = props.configuracion.bases[baseKey];
  if (cfg?.tipo_matriz) return cfg.tipo_matriz;

  if (baseKey === "monofocal") return "BASE";
  if (baseKey === "monofocalEsfCil") return "SPH_CYL";
  if (baseKey === "bifocal") return "SPH_ADD";
  if (baseKey === "bifocalFT") return "SPH_ADD";
  if (baseKey === "bifocalYounger") return "SPH_ADD";
  if (baseKey === "progresivo") return "BASE_ADD";
  return "SPH_CYL";
};

const handleCrear = async () => {
  if (!canCreate.value || creatingSheet.value) return;

  creatingSheet.value = true;
  createStatus.value = "saving";
  createStatusMessage.value = "Validando selección…";
  await nextTick();

  try {
    const baseCfg = props.configuracion.bases[selectedBase.value];
    const tipo_matriz = mapBaseToTipoMatriz(selectedBase.value);

    const tKey = selectedTratamientoKey.value;
    const tratamientoLabel = tKey ? (TREATMENTS[tKey]?.label || tKey) : "";
    const varianteLabel = String(selectedVariante.value || "").trim();

    const tratamientoDisplay = composeTratamientoDisplay(tratamientoLabel, varianteLabel);
    const tratamientosLegacy = tratamientoDisplay ? [tratamientoDisplay] : [];

    const baseCad = newFechaCompra.value && ISO_DATE_ONLY_RX.test(newFechaCompra.value) ? newFechaCompra.value : todayISO();
    const cadFinal =
      newFechaCaducidad.value && ISO_DATE_ONLY_RX.test(newFechaCaducidad.value)
        ? newFechaCaducidad.value
        : addMonthsToISODate(baseCad, DEFAULT_EXPIRY_MONTHS);

    const payload = {
      nombre: newSheetName.value,
      baseKey: selectedBase.value,
      base: baseCfg?.label || selectedBase.value,
      material: selectedMaterial.value,

      tratamiento: tratamientoLabel || null,
      variante: varianteLabel || null,
      tratamientos: tratamientosLegacy,

      numFactura: String(newNumFactura.value || "").trim(),
      loteProducto: String(newLoteProducto.value || "").trim(),
      fechaCompra: dateForCreate(newFechaCompra.value),
      fechaCaducidad: dateForCreate(cadFinal),

      // ✅ nuevo campo
      precioVenta: numForCreate(newPrecioVenta.value),

      tipo_matriz,
      seed: true,
      autoGenerate: true,

      proveedor: { id: null, name: (newProveedorName.value || "").trim() },
      marca: { id: null, name: (newMarcaName.value || "").trim() },

      actor: actorRef.value || undefined
    };

    if (DEBUG_PURCHASE) {
      console.groupCollapsed("[INV][UI] handleCrear payload");
      console.log(payload);
      console.groupEnd();
    }

    createStatusMessage.value = "Subiendo planilla…";
    const { data } = await createSheet(payload);

    const s = data?.data?.sheet;
    const tabs = data?.data?.tabs || [];
    if (!s) throw new Error("Sin hoja en respuesta");

    const newTab = normalizeSheet({ ...s, tabs });
    const addIndex = sheets.value.findIndex((x) => x.id === "nueva");
    sheets.value.splice(addIndex >= 0 ? addIndex : sheets.value.length, 0, newTab);

    emit("update:active", newTab.id);
    emit("crear", { result: s, tabs });

    selectedBase.value = null;
    selectedMaterial.value = null;
    selectedTratamientoKey.value = null;
    selectedVariante.value = "";
    newSheetName.value = "";
    newProveedorName.value = "";
    newMarcaName.value = "";

    newNumFactura.value = "";
    newLoteProducto.value = "";
    newFechaCompra.value = "";
    resetPurchaseCreateDefaults();

    newPrecioVenta.value = "";

    createStatus.value = "saved";
    createStatusMessage.value = "Planilla creada correctamente";
    setTimeout(() => resetCreateStatus(), 1800);
  } catch (e) {
    console.error("[INV][UI] Error al crear planilla:", e?.response?.data || e);
    createStatus.value = "error";
    createStatusMessage.value = errMsg(e, "No se pudo crear la planilla");
    setTimeout(() => resetCreateStatus(), 2600);
  } finally {
    creatingSheet.value = false;
  }
};

/* ===================== Drag & Drop de tabs ===================== */
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
    onEnd: (evt) => {
      if (props.loadingTabs) return;

      const maxIndex = sheets.value.length - 1; // último es "nueva"
      const oldIndex = evt.oldIndex;
      const newIndex = evt.newIndex;

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

/* ===================== Modal acciones ===================== */
const isActionsOpen = ref(false);
const selectedSheet = ref(null);

/* ===== Compra (editar) ===== */
const editNumFactura = ref("");
const editLoteProducto = ref("");
const editFechaCompra = ref("");
const editFechaCaducidad = ref("");
const editPrecioVenta = ref("");

const savingPurchase = ref(false);
const purchaseStatus = ref("idle");
const purchaseStatusMessage = ref("");
const purchaseGlow = ref(false);

const resetPurchaseStatus = () => {
  purchaseStatus.value = "idle";
  purchaseStatusMessage.value = "";
  purchaseGlow.value = false;
};

const purchaseFechaCreacion = computed(() => {
  const d = selectedSheet.value?.fechaCreacion || selectedSheet.value?.createdAt || null;
  return d ? fmtDateOnly(d) : "";
});

const suppressEditAutoExpiry = ref(false);
watch(
  () => editFechaCompra.value,
  (v) => {
    if (suppressEditAutoExpiry.value) return;
    if (v && ISO_DATE_ONLY_RX.test(v)) {
      editFechaCaducidad.value = addMonthsToISODate(v, DEFAULT_EXPIRY_MONTHS);
    }
  }
);

const canSavePurchase = computed(() => {
  if (!selectedSheet.value || savingPurchase.value) return false;

  const curNum = String(selectedSheet.value?.numFactura || "");
  const curLote = String(selectedSheet.value?.loteProducto || "");
  const curCompra = selectedSheet.value?.fechaCompra ? fmtDateOnly(selectedSheet.value.fechaCompra) : "";
  const curCad = selectedSheet.value?.fechaCaducidad ? fmtDateOnly(selectedSheet.value.fechaCaducidad) : "";

  const curPV =
    selectedSheet.value?.precioVenta === null || selectedSheet.value?.precioVenta === undefined
      ? ""
      : String(selectedSheet.value.precioVenta);

  const nextNum = String(editNumFactura.value || "").trim();
  const nextLote = String(editLoteProducto.value || "").trim();
  const nextCompra = String(editFechaCompra.value || "").trim();
  const nextCad = String(editFechaCaducidad.value || "").trim();
  const nextPV = String(editPrecioVenta.value ?? "").trim();

  return nextNum !== curNum || nextLote !== curLote || nextCompra !== curCompra || nextCad !== curCad || nextPV !== curPV;
});

watch([editNumFactura, editLoteProducto, editFechaCompra, editFechaCaducidad, editPrecioVenta], () => {
  if (!DEBUG_PURCHASE) return;
  console.log("[INV][UI] edit purchase changed", {
    editNumFactura: editNumFactura.value,
    editLoteProducto: editLoteProducto.value,
    editFechaCompra: editFechaCompra.value,
    editFechaCaducidad: editFechaCaducidad.value,
    editPrecioVenta: editPrecioVenta.value,
    canSavePurchase: canSavePurchase.value
  });
});

const confirmSavePurchase = async () => {
  if (!selectedSheet.value || savingPurchase.value) return;
  if (!canSavePurchase.value) return;

  savingPurchase.value = true;
  purchaseStatus.value = "saving";
  purchaseStatusMessage.value = "Sincronizando…";
  purchaseGlow.value = false;

  try {
    const id = selectedSheet.value.id;

    const payload = {
      numFactura: String(editNumFactura.value ?? "").trim(),
      loteProducto: String(editLoteProducto.value ?? "").trim(),
      fechaCompra: dateForEdit(editFechaCompra.value),
      fechaCaducidad: dateForEdit(editFechaCaducidad.value),
      precioVenta: numForEdit(editPrecioVenta.value),
      actor: actorRef.value || undefined
    };

    const { data } = await updateSheet(id, payload);
    if (!data || data.ok === false) throw new Error(data?.message || "El servidor rechazó el cambio");

    const updated = data?.data?.sheet;
    const tabs = data?.data?.tabs;
    if (!updated) throw new Error("Respuesta inválida: falta data.sheet");

    const norm = normalizeSheet(updated);
    const idx = sheets.value.findIndex((s) => s.id === id);
    const newTabs = tabs || (idx >= 0 ? sheets.value[idx].tabs : selectedSheet.value?.tabs || []);

    if (idx >= 0) sheets.value[idx] = normalizeSheet({ ...sheets.value[idx], ...norm, tabs: newTabs });
    selectedSheet.value = normalizeSheet({ ...selectedSheet.value, ...norm, tabs: newTabs });

    editNumFactura.value = String(selectedSheet.value?.numFactura || "");
    editLoteProducto.value = String(selectedSheet.value?.loteProducto || "");
    editFechaCompra.value = selectedSheet.value?.fechaCompra ? fmtDateOnly(selectedSheet.value.fechaCompra) : "";
    editFechaCaducidad.value = selectedSheet.value?.fechaCaducidad ? fmtDateOnly(selectedSheet.value.fechaCaducidad) : "";
    editPrecioVenta.value =
      selectedSheet.value?.precioVenta === null || selectedSheet.value?.precioVenta === undefined
        ? ""
        : String(selectedSheet.value.precioVenta);

    purchaseStatus.value = "saved";
    purchaseStatusMessage.value = "Datos guardados";
    purchaseGlow.value = true;
    setTimeout(() => (purchaseGlow.value = false), 900);
    setTimeout(() => resetPurchaseStatus(), 1800);
  } catch (e) {
    console.error("[INV][UI] purchase save error:", e?.response?.data || e);
    purchaseStatus.value = "error";
    purchaseStatusMessage.value = errMsg(e, "No se pudo guardar");
    setTimeout(() => resetPurchaseStatus(), 2400);
  } finally {
    savingPurchase.value = false;
  }
};

/* ===== Vendor (editar proveedor/marca) ===== */
const editProveedorName = ref("");
const editMarcaName = ref("");

const savingVendor = ref(false);
const vendorStatus = ref("idle");
const vendorStatusMessage = ref("");
const vendorGlow = ref(false);

const resetVendorStatus = () => {
  vendorStatus.value = "idle";
  vendorStatusMessage.value = "";
  vendorGlow.value = false;
};

const filteredProveedorOptionsEdit = computed(() => {
  const q = normTxt(editProveedorName.value);
  const base = proveedorOptions.value;
  if (!q) return base.slice(0, 30);
  return base.filter((x) => normTxt(x).includes(q)).slice(0, 30);
});

const filteredMarcaOptionsEdit = computed(() => {
  const q = normTxt(editMarcaName.value);
  const base = marcaOptions.value;
  if (!q) return base.slice(0, 30);
  return base.filter((x) => normTxt(x).includes(q)).slice(0, 30);
});

const canSaveVendor = computed(() => {
  if (!selectedSheet.value || savingVendor.value) return false;

  const currentProv = String(selectedSheet.value?.proveedor?.name || "").trim();
  const currentMarca = String(selectedSheet.value?.marca?.name || "").trim();

  const nextProv = String(editProveedorName.value || "").trim();
  const nextMarca = String(editMarcaName.value || "").trim();

  return nextProv !== currentProv || nextMarca !== currentMarca;
});

const confirmSaveVendor = async () => {
  if (!selectedSheet.value || savingVendor.value) return;
  if (!canSaveVendor.value) return;

  savingVendor.value = true;
  vendorStatus.value = "saving";
  vendorStatusMessage.value = "Sincronizando…";
  vendorGlow.value = false;

  try {
    const id = selectedSheet.value.id;

    const payload = {
      proveedor: { id: null, name: String(editProveedorName.value || "").trim() },
      marca: { id: null, name: String(editMarcaName.value || "").trim() },
      actor: actorRef.value || undefined
    };

    const { data } = await updateSheet(id, payload);
    if (!data || data.ok === false) throw new Error(data?.message || "El servidor rechazó el cambio");

    const updated = data?.data?.sheet;
    const tabs = data?.data?.tabs;
    if (!updated) throw new Error("Respuesta inválida: falta data.sheet");

    const norm = normalizeSheet(updated);
    const idx = sheets.value.findIndex((s) => s.id === id);
    const newTabs = tabs || (idx >= 0 ? sheets.value[idx].tabs : selectedSheet.value?.tabs || []);

    if (idx >= 0) sheets.value[idx] = normalizeSheet({ ...sheets.value[idx], ...norm, tabs: newTabs });
    selectedSheet.value = normalizeSheet({ ...selectedSheet.value, ...norm, tabs: newTabs });

    editProveedorName.value = String(selectedSheet.value?.proveedor?.name || "");
    editMarcaName.value = String(selectedSheet.value?.marca?.name || "");

    vendorStatus.value = "saved";
    vendorStatusMessage.value = "Proveedor/marca actualizados";
    vendorGlow.value = true;
    setTimeout(() => (vendorGlow.value = false), 900);
    setTimeout(() => resetVendorStatus(), 1800);
  } catch (e) {
    console.error("[INV][UI] vendor save error:", e?.response?.data || e);
    vendorStatus.value = "error";
    vendorStatusMessage.value = errMsg(e, "No se pudo guardar proveedor/marca");
    setTimeout(() => resetVendorStatus(), 2400);
  } finally {
    savingVendor.value = false;
  }
};

/* ===== Rename ===== */
const renameName = ref("");
const renaming = ref(false);
const renameStatus = ref("idle");
const renameStatusMessage = ref("");
const renameGlow = ref(false);

const resetRenameStatus = () => {
  renameStatus.value = "idle";
  renameStatusMessage.value = "";
  renameGlow.value = false;
};

const canRename = computed(() => {
  if (!selectedSheet.value || renaming.value) return false;
  const current = String(selectedSheet.value?.name || "").trim();
  const next = String(renameName.value || "").trim();
  return next.length > 0 && next !== current;
});

const confirmRename = async () => {
  if (!selectedSheet.value || renaming.value) return;
  if (!canRename.value) return;

  renaming.value = true;
  renameStatus.value = "saving";
  renameStatusMessage.value = "Guardando…";
  renameGlow.value = false;

  try {
    const id = selectedSheet.value.id;
    const payload = { nombre: String(renameName.value || "").trim(), actor: actorRef.value || undefined };

    const { data } = await updateSheet(id, payload);
    if (!data || data.ok === false) throw new Error(data?.message || "El servidor rechazó el cambio");

    const updated = data?.data?.sheet;
    const tabs = data?.data?.tabs;
    if (!updated) throw new Error("Respuesta inválida: falta data.sheet");

    const norm = normalizeSheet(updated);
    const idx = sheets.value.findIndex((s) => s.id === id);
    const newTabs = tabs || (idx >= 0 ? sheets.value[idx].tabs : selectedSheet.value?.tabs || []);

    if (idx >= 0) sheets.value[idx] = normalizeSheet({ ...sheets.value[idx], ...norm, tabs: newTabs });
    selectedSheet.value = normalizeSheet({ ...selectedSheet.value, ...norm, tabs: newTabs });

    renameName.value = String(selectedSheet.value?.name || "");

    renameStatus.value = "saved";
    renameStatusMessage.value = "Nombre actualizado";
    renameGlow.value = true;
    emit("renamed", { id, name: renameName.value });
    setTimeout(() => (renameGlow.value = false), 900);
    setTimeout(() => resetRenameStatus(), 1800);
  } catch (e) {
    console.error("[INV][UI] rename error:", e?.response?.data || e);
    renameStatus.value = "error";
    renameStatusMessage.value = errMsg(e, "No se pudo renombrar");
    setTimeout(() => resetRenameStatus(), 2400);
  } finally {
    renaming.value = false;
  }
};

/* ===== Meta ===== */
const metaForm = ref({ observaciones: "", notas: "" });
const savingMeta = ref(false);
const metaStatus = ref("idle");
const metaStatusMessage = ref("");
const metaGlow = ref(false);

const resetMetaStatus = () => {
  metaStatus.value = "idle";
  metaStatusMessage.value = "";
  metaGlow.value = false;
};

const loadMetaFromSheet = (sheet) => {
  const meta = sheet?.meta || {};
  metaForm.value = { observaciones: meta.observaciones || "", notas: meta.notas || "" };
  resetMetaStatus();
};

const canSaveMeta = computed(() => !!selectedSheet.value && !savingMeta.value);

const confirmSaveMeta = async () => {
  if (!selectedSheet.value || savingMeta.value) return;

  savingMeta.value = true;
  metaStatus.value = "saving";
  metaStatusMessage.value = "Sincronizando…";
  metaGlow.value = false;

  try {
    const id = selectedSheet.value.id;
    const payload = {
      meta: {
        observaciones: String(metaForm.value?.observaciones || ""),
        notas: String(metaForm.value?.notas || "")
      },
      actor: actorRef.value || undefined
    };

    const { data } = await updateSheet(id, payload);
    if (!data || data.ok === false) throw new Error(data?.message || "El servidor rechazó el cambio");

    const updated = data?.data?.sheet;
    const tabs = data?.data?.tabs;
    if (!updated) throw new Error("Respuesta inválida: falta data.sheet");

    const norm = normalizeSheet(updated);
    const idx = sheets.value.findIndex((s) => s.id === id);
    const newTabs = tabs || (idx >= 0 ? sheets.value[idx].tabs : selectedSheet.value?.tabs || []);

    if (idx >= 0) sheets.value[idx] = normalizeSheet({ ...sheets.value[idx], ...norm, tabs: newTabs });
    selectedSheet.value = normalizeSheet({ ...selectedSheet.value, ...norm, tabs: newTabs });

    loadMetaFromSheet(selectedSheet.value);

    metaStatus.value = "saved";
    metaStatusMessage.value = "Notas guardadas";
    metaGlow.value = true;
    setTimeout(() => (metaGlow.value = false), 900);
    setTimeout(() => resetMetaStatus(), 1800);
  } catch (e) {
    console.error("[INV][UI] meta save error:", e?.response?.data || e);
    metaStatus.value = "error";
    metaStatusMessage.value = errMsg(e, "No se pudo guardar");
    setTimeout(() => resetMetaStatus(), 2400);
  } finally {
    savingMeta.value = false;
  }
};

/* ===== Trash ===== */
const confirmingDelete = ref(false);
const deleting = ref(false);
const trashStatus = ref("idle");
const trashStatusMessage = ref("");

const resetTrashStatus = () => {
  trashStatus.value = "idle";
  trashStatusMessage.value = "";
};

const softDelete = async () => {
  if (!selectedSheet.value || deleting.value) return;

  deleting.value = true;
  trashStatus.value = "saving";
  trashStatusMessage.value = "Enviando a papelera…";

  try {
    const id = selectedSheet.value.id;
    const { data } = await moveSheetToTrash(id, actorRef.value || undefined);

    if (!data || data.ok === false) throw new Error(data?.message || "El servidor rechazó el cambio");

    const updated = data?.data?.sheet || data?.data || null;

    const idx = sheets.value.findIndex((s) => s.id === id);
    if (idx >= 0) sheets.value.splice(idx, 1);

    trashStatus.value = "saved";
    trashStatusMessage.value = "Enviada a papelera";
    emit("deleted", { id, sheet: updated });

    confirmingDelete.value = false;
    isActionsOpen.value = false;

    if (activeId.value === id) emit("update:active", "nueva");

    setTimeout(() => resetTrashStatus(), 1500);
  } catch (e) {
    console.error("[INV][UI] trash error:", e?.response?.data || e);
    trashStatus.value = "error";
    trashStatusMessage.value = errMsg(e, "No se pudo enviar a papelera");
    setTimeout(() => resetTrashStatus(), 2400);
  } finally {
    deleting.value = false;
  }
};

const anySaving = computed(
  () =>
    creatingSheet.value ||
    renaming.value ||
    savingMeta.value ||
    deleting.value ||
    savingVendor.value ||
    savingPurchase.value
);

/* ===================== openActions / openSheet / tabs click ===================== */
const openActions = async (sheet) => {
  selectedSheet.value = normalizeSheet(sheet);

  if (DEBUG_PURCHASE) {
    console.groupCollapsed("[INV][UI] openActions selectedSheet");
    console.log("keys:", selectedSheet.value ? Object.keys(selectedSheet.value) : []);
    console.log("purchase:", {
      numFactura: selectedSheet.value?.numFactura,
      loteProducto: selectedSheet.value?.loteProducto,
      fechaCompra: selectedSheet.value?.fechaCompra,
      fechaCaducidad: selectedSheet.value?.fechaCaducidad,
      precioVenta: selectedSheet.value?.precioVenta
    });
    console.groupEnd();
  }

  confirmingDelete.value = false;
  resetPurchaseStatus();
  resetVendorStatus();
  resetRenameStatus();
  resetMetaStatus();
  resetTrashStatus();

  renameName.value = String(selectedSheet.value?.name || "");
  loadMetaFromSheet(selectedSheet.value);

  editProveedorName.value = String(selectedSheet.value?.proveedor?.name || "");
  editMarcaName.value = String(selectedSheet.value?.marca?.name || "");

  suppressEditAutoExpiry.value = true;

  editNumFactura.value = String(selectedSheet.value?.numFactura || "");
  editLoteProducto.value = String(selectedSheet.value?.loteProducto || "");
  editFechaCompra.value = selectedSheet.value?.fechaCompra ? fmtDateOnly(selectedSheet.value.fechaCompra) : "";
  editFechaCaducidad.value = selectedSheet.value?.fechaCaducidad ? fmtDateOnly(selectedSheet.value.fechaCaducidad) : "";

  editPrecioVenta.value =
    selectedSheet.value?.precioVenta === null || selectedSheet.value?.precioVenta === undefined
      ? ""
      : String(selectedSheet.value.precioVenta);

  if (!editFechaCaducidad.value && editFechaCompra.value) {
    editFechaCaducidad.value = addMonthsToISODate(editFechaCompra.value, DEFAULT_EXPIRY_MONTHS);
  }

  isActionsOpen.value = true;
  await nextTick();
  suppressEditAutoExpiry.value = false;
};

const openSheet = () => {
  if (!selectedSheet.value) return;
  emit("update:active", selectedSheet.value.id);
  isActionsOpen.value = false;
};

const handleTabClick = (id) => {
  if (props.loadingTabs) return;
  emit("update:active", id);
};
</script>

<style scoped>
/* ✅ tu CSS tal cual lo traías (sin cambios) */
.plantillas-contenedor {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 14px;
  min-height: 140px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.10);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  overflow: hidden;
}

.tabs-wrapper {
  position: relative;
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
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
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0));
}

.tabs-wrapper::after {
  right: 0;
  margin-right: -0.55rem;
  background: linear-gradient(270deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0));
}

.tabs-wrapper::-webkit-scrollbar {
  height: 8px;
}

.tabs-wrapper::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.35);
  border-radius: 999px;
}

.tabs-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

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

.tab-item.active::after {
  content: "";
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: -1px;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(121, 87, 213, 1), rgba(236, 72, 153, 0.95));
}

.tab-agregar {
  background: rgba(15, 23, 42, 0.92);
  color: #fff;
  border-color: rgba(15, 23, 42, 0.25);
  padding-right: 0.85rem;
}

.tab-agregar:hover {
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.18);
}

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
  color: rgba(15, 23, 42, 0.58);
}

.tab-item.active .tab-sku {
  color: rgba(15, 23, 42, 0.70);
}

.tab-sku--empty {
  opacity: 0.55;
  font-weight: 700;
}

.tab-menu-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(255, 255, 255, 0.72);
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
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.10);
}

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
  background: linear-gradient(90deg, rgba(226, 232, 240, 0.9) 0%, rgba(248, 250, 252, 0.9) 50%, rgba(226, 232, 240, 0.9) 100%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.2s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

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

.sheet-tabs {
  display: flex;
  height: 38px;
  align-items: center;
  border-top: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.66);
  padding: 0.2rem 0.35rem;
}

.sheet-tab {
  padding: 0.35rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 800;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.18s ease;
  color: rgba(15, 23, 42, 0.70);
}

.sheet-tab:hover {
  background: rgba(121, 87, 213, 0.10);
}

.sheet-tab.active {
  background: rgba(121, 87, 213, 0.16);
  color: rgba(15, 23, 42, 0.92);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.10);
}

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
  background: rgba(220, 38, 38, 0.16);
  border-color: rgba(220, 38, 38, 0.35);
}

.fade-status-enter-active,
.fade-status-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.fade-status-enter-from,
.fade-status-leave-to {
  opacity: 0;
  transform: translateY(3px);
}

.rsbo-sheet-actions-modal .modal-card {
  width: 100%;
  max-width: 760px;
}

.rsbo-actions-card {
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.90);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.22);
}

.rsbo-actions-head {
  background: rgba(255, 255, 255, 0.70);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
}

.pill-row {
  display: flex;
  gap: 0.45rem;
  align-items: center;
  flex-wrap: wrap;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.78rem;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.22);
  color: rgba(15, 23, 42, 0.78);
}

.pill.strong {
  background: linear-gradient(90deg, rgba(121, 87, 213, 0.16), rgba(236, 72, 153, 0.10));
  border-color: rgba(121, 87, 213, 0.35);
  color: rgba(15, 23, 42, 0.88);
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
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 16px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.10);
  margin-bottom: 1rem;
  transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.16s ease;
}

.action-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 26px 70px rgba(15, 23, 42, 0.14);
}

.action-card.primary {
  border-color: rgba(121, 87, 213, 0.35);
}

.action-card.danger {
  border-color: rgba(220, 38, 38, 0.28);
}

.action-icon {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: rgba(121, 87, 213, 0.12);
  color: rgba(121, 87, 213, 1);
}

.action-icon.danger {
  background: rgba(220, 38, 38, 0.12);
  color: rgba(220, 38, 38, 1);
}

.action-content {
  flex: 1;
  min-width: 0;
}

.action-title {
  font-weight: 900;
  font-size: 1rem;
  margin-bottom: 0.15rem;
}

.action-desc {
  opacity: 0.85;
  font-size: 0.9rem;
  color: rgba(15, 23, 42, 0.72);
}

.meta-status {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 800;
  border: 1px solid transparent;
  background: rgba(248, 250, 252, 0.85);
  color: rgba(15, 23, 42, 0.72);
}

.meta-status.saving {
  border-color: rgba(59, 130, 246, 0.25);
  background: rgba(59, 130, 246, 0.08);
}

.meta-status.saved {
  border-color: rgba(34, 197, 94, 0.25);
  background: rgba(34, 197, 94, 0.08);
  color: rgba(15, 23, 42, 0.86);
}

.meta-status.error {
  border-color: rgba(220, 38, 38, 0.25);
  background: rgba(220, 38, 38, 0.08);
  color: rgba(15, 23, 42, 0.86);
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

.vendor-glow {
  outline: 2px solid rgba(34, 197, 94, 0.25);
}

.rename-glow {
  outline: 2px solid rgba(34, 197, 94, 0.25);
}

.meta-glow {
  outline: 2px solid rgba(34, 197, 94, 0.25);
}

.confirm-inline {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.8rem;
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.20);
  border-radius: 14px;
}

.rsbo-actions-foot {
  justify-content: flex-end;
}

.delete.is-disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

@media screen and (max-width: 768px) {
  .tab-item {
    max-width: 220px;
  }

  .rsbo-actions-body {
    padding: 0.9rem;
  }
}
</style>