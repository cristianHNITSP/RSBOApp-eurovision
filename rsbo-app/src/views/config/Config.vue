<template>
  <section class="section-config" v-motion-fade-visible-once>

    <header class="page-section-header mb-4">
      <div>
        <span class="config-pill">
          <b-icon icon="cog" size="is-small" class="mr-1" />
          Configuración
        </span>
        <h2>Configuración del sistema</h2>
        <p class="psh-desc">Gestiona tu perfil, preferencias visuales y seguridad de la cuenta.</p>

        <div class="psh-quick mt-3">
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-user-circle"></i></div>
            <div>
              <p class="psh-quick__title">Mi perfil</p>
              <p class="psh-quick__text">Nombre, avatar y contraseña</p>
            </div>
          </div>
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-sliders-h"></i></div>
            <div>
              <p class="psh-quick__title">Preferencias</p>
              <p class="psh-quick__text">Tema, fuente y efectos visuales</p>
            </div>
          </div>
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-shield-alt"></i></div>
            <div>
              <p class="psh-quick__title">Seguridad</p>
              <p class="psh-quick__text">Opciones avanzadas de acceso</p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <DynamicTabs v-model="activeTab" :tabs="CONFIG_TABS">
      <template #profile>
        <MiUser :user="props.user" :loading="props.loading" />
      </template>
      <template #preferences>
        <Preferencias />
      </template>
      <template #security>
        <Seguridad :user="props.user" />
      </template>
    </DynamicTabs>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DynamicTabs  from '@/components/DynamicTabs.vue'
import MiUser       from '../../views/config/options/MiUser.vue'
import Preferencias from '../../views/config/options/Preferencias.vue'
import Seguridad    from '../../views/config/options/Seguridad.vue'

const CONFIG_TABS = [
  { key: 'profile',     label: 'Mi perfil',    icon: 'user' },
  { key: 'preferences', label: 'Preferencias', icon: 'sliders-h' },
  { key: 'security',    label: 'Seguridad',    icon: 'shield-alt' },
]

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
  background: linear-gradient(135deg, var(--bg-subtle) 0%, var(--bg-muted) 100%);
  box-shadow: var(--shadow-sm);
  border-bottom: 1px solid var(--border);
}


:deep(.dyn-tabs__content) {
  margin-top: 1rem;
}


.config-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--c-primary);
  background: var(--c-primary-alpha);
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  margin-bottom: 1rem;
}
</style>
