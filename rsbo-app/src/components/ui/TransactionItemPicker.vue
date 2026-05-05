<template>
  <div class="item-picker">
    <div class="picker-header mb-2">
      <span class="is-size-7 has-text-weight-bold has-text-grey">
        PRODUCTOS EN {{ transactionFolio }}
      </span>
    </div>
    
    <div class="items-list">
      <div 
        v-for="item in items" 
        :key="item.id" 
        class="picker-item"
        :class="{ 'is-selected': selectedId === item.id }"
        @click="select(item)"
      >
        <div class="picker-item__icon">
          <i class="fas fa-box"></i>
        </div>
        <div class="picker-item__info">
          <div class="picker-item__title">{{ item.title }}</div>
          <div class="picker-item__sub">
            {{ formatParams(item.params) }}
            <span v-if="item.sku" class="ml-2 tag is-light is-small">SKU: {{ item.sku }}</span>
          </div>
        </div>
        <div class="picker-item__qty">
          <span class="tag is-primary is-light">Cant: {{ item.qty }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  items: { type: Array, default: () => [] },
  transactionFolio: { type: String, default: "" },
  selectedId: { type: [String, Number], default: null }
});

const emit = defineEmits(['select']);

function select(item) {
  emit('select', item);
}

function formatParams(p) {
  if (!p) return "";
  if (typeof p === 'string') return p;
  
  const fv = (v) => Number(v ?? 0).toFixed(2);
  const parts = [];
  if (p.sph !== undefined && p.sph !== null) parts.push(`SPH ${fv(p.sph)}`);
  if (p.cyl !== undefined && p.cyl !== null) parts.push(`CYL ${fv(p.cyl)}`);
  if (p.add !== undefined && p.add !== null) parts.push(`ADD ${fv(p.add)}`);
  if (p.base !== undefined && p.base !== null) parts.push(`BASE ${fv(p.base)}`);
  
  if (parts.length === 0) return "";
  return parts.join(" | ");
}
</script>

<style scoped>
.item-picker {
  border: 1px solid #eee;
  border-radius: 8px;
  background: #fcfcfc;
  padding: 0.75rem;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 250px;
  overflow-y: auto;
}

.picker-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border: 1px solid #eee;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.picker-item:hover {
  border-color: var(--primary);
  background: #f9f9ff;
}

.picker-item.is-selected {
  border-color: var(--primary);
  background: #f0f4ff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.picker-item__icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 50%;
  margin-right: 0.75rem;
  color: #999;
}

.picker-item.is-selected .picker-item__icon {
  background: var(--primary);
  color: white;
}

.picker-item__info {
  flex: 1;
}

.picker-item__title {
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.2;
}

.picker-item__sub {
  font-size: 0.7rem;
  color: #888;
  margin-top: 2px;
}

.picker-item__qty {
  margin-left: 0.5rem;
}
</style>
