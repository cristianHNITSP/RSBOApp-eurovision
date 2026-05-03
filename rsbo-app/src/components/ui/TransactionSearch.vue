<template>
  <div class="transaction-search">
    <b-field :label="label">
      <b-autocomplete
        v-model="query"
        :data="results"
        placeholder="Buscar por Folio (VNT/LAB) o Cliente..."
        icon="magnifying-glass"
        :loading="isSearching"
        field="folio"
        @typing="onTyping"
        @select="onSelect"
        expanded
        keep-first
      >
        <template #default="{ option }">
          <div class="tx-result">
            <div class="tx-result__main">
              <span class="tx-result__folio">{{ option.folio }}</span>
              <span class="tx-result__type" :class="'is-' + option.type.toLowerCase()">
                {{ option.type }}
              </span>
            </div>
            <div class="tx-result__sub">
              <i class="fas fa-user mr-1"></i> {{ option.cliente }}
              <span class="ml-3"><i class="fas fa-calendar mr-1"></i> {{ formatDate(option.fecha) }}</span>
            </div>
          </div>
        </template>
        <template #empty>
          <div class="has-text-centered p-2" v-if="query.length >= 2">
            <span class="is-size-7 has-text-grey">No se encontraron resultados</span>
          </div>
        </template>
      </b-autocomplete>
    </b-field>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { searchTransactions } from '@/services/transactions';

const props = defineProps({
  label: { type: String, default: "Buscar Venta o Pedido" }
});

const emit = defineEmits(['select']);

const query = ref("");
const results = ref([]);
const isSearching = ref(false);

let timeout = null;
function onTyping(text) {
  clearTimeout(timeout);
  if (!text || text.length < 2) {
    results.value = [];
    return;
  }

  timeout = setTimeout(async () => {
    isSearching.value = true;
    try {
      const res = await searchTransactions(text);
      results.value = res.data || [];
    } catch (e) {
      console.error("[TX-SEARCH] Error:", e);
    } finally {
      isSearching.value = false;
    }
  }, 400);
}

function onSelect(option) {
  if (option) {
    emit('select', option);
  }
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString('es-MX', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
}
</script>

<style scoped>
.tx-result {
  padding: 0.25rem 0;
}
.tx-result__main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}
.tx-result__folio {
  font-weight: 700;
  color: var(--primary);
  font-family: 'Roboto Mono', monospace;
}
.tx-result__type {
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 4px;
  background: #eee;
  color: #666;
  font-weight: 900;
}
.tx-result__type.is-lab { background: #e3f2fd; color: #1976d2; }
.tx-result__type.is-vnt { background: #e8f5e9; color: #388e3c; }

.tx-result__sub {
  font-size: 0.75rem;
  color: #777;
}
</style>
