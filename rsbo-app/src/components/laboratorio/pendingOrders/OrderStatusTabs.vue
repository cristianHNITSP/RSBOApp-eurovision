<template>
  <div class="status-filter-row mb-3">
    <button
      v-for="tab in statusTabs"
      :key="tab.value"
      type="button"
      class="status-tab"
      :class="{ 'status-tab--active': modelValue === tab.value }"
      @click="$emit('update:modelValue', tab.value)"
    >
      <span class="status-tab__dot" :class="tab.dotClass"></span>
      {{ tab.label }}
      <span class="status-tab__count">{{ countByStatus(tab.value) }}</span>
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: String,
  counts: Object
});

const emit = defineEmits(["update:modelValue"]);

const statusTabs = [
  { value: "open",      label: "Abiertos",   dotClass: "dot--warning" },
  { value: "pendiente", label: "Pendiente",  dotClass: "dot--warning" },
  { value: "parcial",   label: "Parcial",    dotClass: "dot--info" },
  { value: "cerrado",   label: "Cerrado",    dotClass: "dot--success" },
  { value: "all",       label: "Todos",      dotClass: "dot--muted" },
];

function countByStatus(tabValue) {
  const c = props.counts || {};
  if (tabValue === "all") return Object.values(c).reduce((s, n) => s + n, 0);
  if (tabValue === "open") return (c.pendiente || 0) + (c.parcial || 0);
  return c[tabValue] || 0;
}
</script>

<style scoped>
.status-filter-row {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.status-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-overlay);
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 120ms ease;
}

.status-tab:hover {
  border-color: var(--c-primary);
  background: var(--c-primary-alpha);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}

.status-tab--active {
  background: linear-gradient(135deg, rgba(144, 111, 225, 0.18), rgba(236, 72, 153, 0.10));
  border-color: rgba(144, 111, 225, 0.45);
  color: var(--text-primary);
}

.status-tab__dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  flex-shrink: 0;
}

.dot--warning { background: var(--c-warning); }
.dot--info    { background: var(--c-info); }
.dot--success { background: var(--c-success); }
.dot--muted   { background: rgba(148, 163, 184, 0.6); }

.status-tab__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--border);
  font-size: 0.72rem;
  font-weight: 900;
}

.status-tab--active .status-tab__count {
  background: var(--c-primary-alpha);
}
</style>
