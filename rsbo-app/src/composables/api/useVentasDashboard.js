import { computed, reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBasesMicasVentas } from './useBasesMicasVentas';
import { useVentasHistory } from './useVentasHistory';

import { useOpticaVentas } from './useOpticaVentas';
import { useLentesContactoVentas } from './useLentesContactoVentas';

export const VENTAS_TABS = [
  { key: 'bases-micas', label: 'Bases y Micas', icon: 'glasses' },
  { key: 'optica', label: 'Óptica', icon: 'eye' },
  { key: 'lentes-contacto', label: 'Lentes Contacto', icon: 'circle' },
  { key: 'historial', label: 'Historial', icon: 'history' },
  { key: 'cortes', label: 'Cortes', icon: 'cash-register' },
];

export function useVentasDashboard(getUser) {
  const route = useRoute();
  const router = useRouter();

  // Usamos reactive() para que las propiedades se "desenvuelvan" (unwrap) automáticamente,
  // permitiendo que los componentes hijos reciban valores planos y no Refs en sus props.
  const strategies = reactive({
    'bases-micas': useBasesMicasVentas(getUser),
    'optica': useOpticaVentas(getUser),
    'lentes-contacto': useLentesContactoVentas(getUser),
  });

  const activeTab = computed({
    get: () => {
      const t = route.query.tab;
      const valid = VENTAS_TABS.map(t => t.key);
      return typeof t === 'string' && valid.includes(t) ? t : 'bases-micas';
    },
    set: (key) => {
      if (route.query.tab === key) return;
      router.replace({
        name: route.name || 'ventas-dashboard',
        params: route.params,
        query: { ...route.query, tab: key },
      }).catch(() => { });
    },
  });

  const activeStrategy = computed(() =>
    activeTab.value === 'historial' ? null : strategies[activeTab.value]
  );

  const history = reactive(useVentasHistory(getUser));

  // Sync history filter with active tab
  watch(activeTab, (k) => {
    if (k === 'historial' && history) {
      // Si entramos al historial directamente, mantenemos la última categoría o usamos la de defecto
      if (!history.category) history.category = 'bases-micas';
    } else if (k !== 'cortes' && history) {
      history.category = k;
    }
  });

  return { activeTab, activeStrategy, history, strategies, VENTAS_TABS };
}
