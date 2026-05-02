<template>
  <div class="panel">
    <div class="panel__head">
      <div>
        <h2 class="panel__title">
          Catálogo
          <span class="panel__badge">{{ filteredItemsLength }}</span>
        </h2>
        <p class="panel__hint">Selecciona productos para agregar a la venta.</p>
      </div>

      <div v-if="showSheetPicker" class="panel__headActions">
        <b-field label="Planilla" class="mb-0 catalog-sheet-field">
          <SheetPickerInput
            :model-value="selectedSheetId"
            @update:model-value="$emit('update:selectedSheetId', $event)"
            :sheet-title="sheetTitle"
            :search-fn="searchSheets"
            :results="sheetSearchResults"
            :loading="loadingSheets || sheetSearchLoading"
            :placeholder="pickerPlaceholder"
            :icon="pickerIcon"
          />
        </b-field>
      </div>
    </div>

    <div v-if="$slots['extra-filters']" class="panel__filters">
      <slot name="extra-filters"></slot>
    </div>

    <div class="panel__body">
      <!-- Filtros -->
      <div class="columns is-mobile is-variable is-3 mb-3">
        <div class="column is-8">
          <b-field class="mb-0">
            <b-input
              v-model="localItemQuery"
              icon="search"
              placeholder="Parámetros o código de barra…"
            />
          </b-field>
        </div>
        <div class="column is-4">
          <b-field class="mb-0">
            <b-select 
              v-model="localStockFilter" 
              expanded
            >
              <option value="withStock">Con stock</option>
              <option value="all">Todos</option>
              <option value="zero">Sin stock</option>
            </b-select>
          </b-field>
        </div>
      </div>

      <b-loading :is-full-page="false" :active="loadingItems" />

      <!-- Estado vacío -->
      <div v-if="!loadingItems && !filteredItemsLength" class="empty">
        <i class="fas fa-boxes empty__icon"></i>
        <p class="empty__title">Sin productos</p>
        <p class="empty__text">Cambia filtros o selecciona otra categoría.</p>
      </div>

      <!-- Tabla -->
      <b-table
        v-else-if="!loadingItems"
        :data="paginatedItems"
        hoverable
        mobile-cards
        class="nice-table"
      >
        <b-table-column field="existencias" label="PZAS." width="90" v-slot="{ row }">
          <span
            class="qty-pill"
            :class="row.existencias > 0 ? 'qty-pill--ok' : 'qty-pill--zero'"
          >
            {{ row.existencias }}
          </span>
        </b-table-column>

        <b-table-column field="product" label="PRODUCTO" v-slot="{ row }">
          <div class="prod__name">
            {{ buildRowTitle(row, selectedSheet) }}
          </div>
          <div class="prod__meta">
            <span class="meta-k mono">
              <i class="fas fa-barcode mr-1"></i>{{ (codeLabel === 'SKU' ? (row.sku || row.codebar) : (row.codebar || row.sku)) || `sin ${codeLabel}` }}
            </span>
          </div>
        </b-table-column>

        <b-table-column field="precioVenta" label="PRECIO" width="100" v-slot="{ row }">
          <span v-if="row.precioVenta" class="mono has-text-weight-bold">
            ${{ row.precioVenta.toFixed(2) }}
          </span>
        </b-table-column>

        <b-table-column label="" width="120" v-slot="{ row }">
          <b-button
            type="is-primary"
            size="is-small"
            icon-left="plus"
            class="premium-btn"
            :disabled="row.existencias < 1"
            @click="$emit('add-to-cart', row)"
          >
            Agregar
          </b-button>
        </b-table-column>
      </b-table>

      <!-- Paginación -->
      <nav v-if="filteredItemsLength > catalogPageSize" class="pager">
        <b-button
          size="is-small"
          type="is-light"
          icon-left="chevron-left"
          :disabled="catalogPage === 1"
          @click="$emit('update:catalogPage', catalogPage - 1)"
        >
          Prev
        </b-button>
        <span class="pager__text">{{ catalogPage }} / {{ catalogPages }}</span>
        <b-button
          size="is-small"
          type="is-light"
          icon-right="chevron-right"
          :disabled="catalogPage === catalogPages"
          @click="$emit('update:catalogPage', catalogPage + 1)"
        >
          Next
        </b-button>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import SheetPickerInput from "@/components/ui/SheetPickerInput.vue";

const props = defineProps({
  filteredItemsLength: { type: Number, default: 0 },
  showSheetPicker: { type: Boolean, default: false },
  selectedSheetId: { type: String, default: "" },
  loadingSheets: { type: Boolean, default: false },
  itemQuery: { type: String, default: "" },
  stockFilter: { type: String, default: "withStock" },
  loadingItems: { type: Boolean, default: false },
  paginatedItems: { type: Array, default: () => [] },
  catalogPage: { type: Number, default: 1 },
  catalogPages: { type: Number, default: 1 },
  catalogPageSize: { type: Number, default: 15 },
  selectedSheet: { type: Object, default: null },
  sheetTitle: { type: Function, default: () => '' },
  buildRowTitle: { type: Function, required: true },
  sheetSearchLoading: { type: Boolean, default: false },
  sheetSearchResults: { type: Array, default: () => [] },
  searchSheets: { type: Function, default: () => {} },
  pickerPlaceholder: { type: String, default: "Buscar planilla…" },
  pickerIcon: { type: String, default: "fa-layer-group" },
  codeLabel: { type: String, default: "código" }
});

const emit = defineEmits([
  "update:selectedSheetId",
  "update:itemQuery",
  "update:stockFilter",
  "update:catalogPage",
  "add-to-cart"
]);

const localItemQuery = computed({
  get: () => props.itemQuery,
  set: (val) => emit("update:itemQuery", val)
});

const localStockFilter = computed({
  get: () => props.stockFilter,
  set: (val) => emit("update:stockFilter", val)
});
</script>

<style src="./VentasCatalog.css" scoped></style>
