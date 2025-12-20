<template>
  <section class="section-config" v-motion-fade-visible-once>

    <span class="config-pill">
      <b-icon icon="life-ring" size="is-small" class="mr-1" />
      Configuración
    </span>


    <b-tabs v-model="activeTab" type="is-boxed" expanded animated>
      <!-- TAB PERFIL -->
      <b-tab-item label="Mi perfil" icon="user" value="profile">
        <!-- Le pasamos lo que llega por props -->
        <MiUser :user="props.user" :loading="props.loading" />
      </b-tab-item>

      <!-- OTRAS TABS (relleno por ahora) -->
      <b-tab-item label="Preferencias" icon="sliders-h" value="preferences">
        <Preferencias />
      </b-tab-item>

      <b-tab-item label="Seguridad" icon="shield-alt" value="security">
        <div class="box">
          <p class="has-text-grey">
            Aquí se agregarán opciones avanzadas de seguridad más adelante.
          </p>
        </div>
      </b-tab-item>
    </b-tabs>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MiUser from '../../views/config/options/MiUser.vue'
import Preferencias from '../../views/config/options/Preferencias.vue'

// 🔹 Props que vienen del layout (por router-view): :user, :loading
const props = defineProps({
  user: { type: Object, default: null },
  loading: { type: Boolean, default: false }
})

console.log('[Config] props iniciales:', props)

const router = useRouter()
const route = useRoute()

const VALID_TABS = ['profile', 'preferences', 'security']

// Tab activa (se sincroniza con ?tab= en la URL)
const activeTab = ref('profile')

const syncTabFromRoute = () => {
  const fromQuery = route.query.tab
  console.log('[Config] syncTabFromRoute -> route.query.tab:', fromQuery)

  if (typeof fromQuery === 'string' && VALID_TABS.includes(fromQuery)) {
    activeTab.value = fromQuery
  } else {
    activeTab.value = 'profile'
  }

  console.log('[Config] activeTab después de sync:', activeTab.value)
}

// Inicializar
syncTabFromRoute()

// Si cambia la query (?tab=...) desde fuera, actualiza la tab
watch(
  () => route.query.tab,
  (newVal, oldVal) => {
    console.log('[Config] watch route.query.tab ->', { oldVal, newVal })
    syncTabFromRoute()
  }
)

// Si cambia la tab desde el UI, actualiza la query
watch(
  () => activeTab.value,
  (newTab, oldTab) => {
    console.log('[Config] watch activeTab ->', { oldTab, newTab })

    if (route.query.tab === newTab) return

    router.replace({
      name: route.name || 'configuración',
      params: route.params,
      query: {
        ...route.query,
        tab: newTab
      }
    })
  }
)
</script>

<style scoped>
.section-config {
  border-radius: 12px;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid #ccc;
}


/* ✅ Quitar padding que mete Buefy en el contenido de las tabs */
:deep(.b-tabs .tab-content) {
  position: relative;
  overflow: visible;
  display: flex;
  flex-direction: column;
  padding: 0 !important;
  margin-top: 1rem;
  /* <- lo que quieres */
}

/* Opcional: si también ves padding en el wrapper de cada tab */
:deep(.b-tabs .tab-content > .tab-item) {
  padding: 0 !important;
}


.config-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #4f46e5;
  background: #eef2ff;
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  margin-bottom: 1rem;
}
</style>
