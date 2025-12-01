<!-- src/components/laboratorio/CatalogoTab.vue -->
<template>
  <div class="columns is-multiline is-variable is-4">
    <div class="column is-4">
      <div class="panel panel--sticky">
        <div class="panel__head">
          <div>
            <h2 class="panel__title">Catálogo de códigos</h2>
            <p class="panel__hint">Vista previa (mock): tarjetas con barcode real (EAN-13) en SVG.</p>
          </div>
        </div>

        <div class="panel__body">
          <b-field label="Planilla" class="mb-2">
            <b-select v-model="lab.selectedSheetId.value" expanded>
              <option v-for="s in lab.filteredSheets.value" :key="s.id" :value="s.id">
                {{ lab.sheetTitle(s) }}
              </option>
            </b-select>
          </b-field>

          <div v-if="lab.selectedSheet.value" class="sheet-card">
            <div class="sheet-card__top">
              <div class="sheet-card__title">{{ lab.selectedSheet.value.nombre }}</div>
              <span class="tag is-primary is-light">{{ lab.selectedSheet.value.tipo_matriz }}</span>
            </div>

            <div class="sheet-card__meta">
              <div><b>Material:</b> {{ lab.selectedSheet.value.material }}</div>
              <div><b>Tratamientos:</b> {{ lab.prettyTrat(lab.selectedSheet.value.tratamientos) }}</div>
            </div>

            <div class="sheet-card__actions">
              <b-button type="is-primary" icon-left="sync" expanded @click="lab.noop">Cargar/Actualizar (mock)</b-button>

              <div class="columns is-mobile is-variable is-2 mt-2">
                <div class="column">
                  <b-button type="is-light" expanded icon-left="print" :disabled="!lab.filteredCatalogRows.value.length" @click="lab.noop">
                    Imprimir
                  </b-button>
                </div>
                <div class="column">
                  <b-button type="is-light" expanded icon-left="download" :disabled="!lab.filteredCatalogRows.value.length" @click="lab.noop">
                    CSV
                  </b-button>
                </div>
              </div>
            </div>
          </div>

          <hr class="soft-hr" />

          <b-field label="Filtrar códigos" class="mb-2">
            <b-input v-model="lab.catalogQuery.value" icon="search" placeholder="Código, parámetros (SPH/CYL/ADD/BASE)…" />
          </b-field>

          <b-field label="Mostrar" class="mb-0">
            <b-select v-model="lab.catalogFilter.value" expanded>
              <option value="withStock">Solo con stock</option>
              <option value="allCodes">Todo con código</option>
              <option value="allRows">Todo (incluye sin código)</option>
            </b-select>
          </b-field>
        </div>
      </div>
    </div>

    <div class="column is-8">
      <div class="panel">
        <div class="panel__head">
          <div>
            <h2 class="panel__title">
              Códigos disponibles
              <span class="panel__badge">{{ lab.filteredCatalogRows.value.length }}</span>
            </h2>
            <p class="panel__hint">Click para copiar el codebar. (Barcode SVG EAN-13).</p>
          </div>

          <div class="panel__headActions">
            <b-button type="is-light" icon-left="bolt" :disabled="!lab.selectedSheetId.value" @click="lab.noop">
              Preparar
            </b-button>
          </div>
        </div>

        <div class="panel__body">
          <div v-if="!lab.filteredCatalogRows.value.length" class="empty">
            <i class="fas fa-qrcode empty__icon"></i>
            <p class="empty__title">Sin códigos para mostrar</p>
            <p class="empty__text">Cambia filtros o planilla (mock).</p>
          </div>

          <div v-else class="qr-grid">
            <button
              v-for="row in lab.paginatedCatalog.value"
              :key="row._k"
              class="qr-card"
              type="button"
              @click="lab.copyCodebar(row.codebar)"
              :title="'Copiar: ' + (row.codebar || '')"
            >
              <div class="qr-card__head">
                <div class="qr-card__title">{{ lab.buildRowTitle(row, lab.selectedSheet.value) }}</div>
                <span class="tag is-light qty-tag" :class="row.existencias > 0 ? 'is-success' : ''">
                  {{ row.existencias }} pzas
                </span>
              </div>

              <div class="qr-card__meta">
                <div class="meta-line">
                  <i class="fas fa-barcode mr-1"></i>
                  <span class="mono big-code">{{ row.codebar || "sin código" }}</span>
                </div>
                <div class="meta-line meta-line--muted">{{ lab.buildRowParams(row, lab.selectedSheet.value) }}</div>
              </div>

              <div class="qr-card__qr">
                <div v-if="row.codebar && lab.isEan13(row.codebar)" class="barcode-wrap">
                  <BarcodeEAN13 :value="row.codebar" :scale="2" :height="82" />
                </div>
                <div v-else class="barcode-fallback">
                  <i class="fas fa-exclamation-circle mr-1"></i>
                  Sin barcode válido
                </div>
              </div>

              <div class="qr-card__foot">
                <span class="foot-hint">Click para copiar</span>
                <i class="fas fa-copy"></i>
              </div>
            </button>
          </div>

          <nav v-if="lab.filteredCatalogRows.value.length > lab.catalogPageSize.value" class="pager">
            <b-button size="is-small" type="is-light" icon-left="chevron-left" :disabled="lab.catalogPage.value === 1" @click="lab.catalogPage.value--">
              Prev
            </b-button>

            <span class="pager__text">Página {{ lab.catalogPage.value }} / {{ lab.catalogPages.value }}</span>

            <b-button size="is-small" type="is-light" icon-left="chevron-right" :disabled="lab.catalogPage.value === lab.catalogPages.value" @click="lab.catalogPage.value++">
              Next
            </b-button>
          </nav>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject } from "vue";
import BarcodeEAN13 from "../laboratorio/barcode/BarcodeEAN13.vue";

const lab = inject("lab");
if (!lab) throw new Error("CatalogoTab necesita provide('lab', ...)");
</script>
