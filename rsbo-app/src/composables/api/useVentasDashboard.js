import { computed, reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBasesMicasVentas } from './useBasesMicasVentas';
import { useVentasHistory } from './useVentasHistory';

import { useOpticaVentas } from './useOpticaVentas';
import { useLentesContactoVentas } from './useLentesContactoVentas';

export const VENTAS_TABS = [
  { key: 'bases-micas',     label: 'Bases y Micas',  icon: 'glasses' },
  { key: 'optica',          label: 'Óptica',         icon: 'eye' },
  { key: 'lentes-contacto', label: 'Lentes Contacto',icon: 'circle' },
  { key: 'historial',       label: 'Historial',      icon: 'history' },
];

export function useVentasDashboard(getUser) {
  const route  = useRoute();
  const router = useRouter();

  // reactive() auto-unwraps nested Refs so template bindings receive plain values.
  const strategies = reactive({
    'bases-micas':     useBasesMicasVentas(getUser),
    'optica':          useOpticaVentas(getUser),
    'lentes-contacto': useLentesContactoVentas(getUser),
  });

  const activeTab = computed({
    get: () => route.params.category || 'bases-micas',
    set: (key) => {
      // If the name is defined in router, use it. Otherwise fallback.
      router.replace({ 
        name: 'ventas-dashboard', 
        params: { category: key } 
      }).catch(() => {
        // Fallback if route name doesn't exist yet
        router.replace(`/l/ventas/${key}`);
      });
    },
  });

  const activeStrategy = computed(() =>
    activeTab.value === 'historial' ? null : strategies[activeTab.value]
  );

  const history = reactive(useVentasHistory(getUser));

  // Sync history filter with active tab
  watch(activeTab, (k) => {
    if (k !== 'historial' && history) {
      history.category = k;
    }
  });

  return { activeTab, activeStrategy, history, strategies, VENTAS_TABS };
}
