<template>
  <section class="hero section-user" v-motion-fade-visible-once>
    <div class="hero-body p-0">
      <div class="columns is-vcentered is-multiline">

        <!-- Avatar -->
        <div class="column is-narrow has-text-centered-touch">
          <figure class="image is-128x128 is-inline-block" style="border-radius: 50%; overflow: hidden;">
            <b-skeleton v-if="!avatarLoaded" :width="128" :height="128" :animated="true" style="border-radius: 50%;" />
            <img v-else :src="avatarUrl" alt="User avatar"
              style="width: 128px; height: 128px; object-fit: cover; border-radius: 50%; display: block;" />
          </figure>
        </div>

        <!-- Información del usuario -->
        <div class="column is-flex is-flex-direction-column is-justify-content-center has-text-centered-touch">
          <!-- Nombre -->
          <h1 class="title is-size-3 has-text-weight-bold mb-5">
            <template v-if="!loading">
              Hola, <b>{{ user?.name || 'Usuario' }}</b>
            </template>
            <template v-else>
              <b-skeleton :width="180" :height="32" animated />
            </template>
          </h1>

          <!-- Última conexión -->
          <h3 class="subtitle is-size-4 mb-3">
            <template v-if="!loading">
              Última conexión
              <b>
                {{
                  user?.lastLogin
                    ? new Intl.DateTimeFormat('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }).format(new Date(user.lastLogin))
                    : 'N/A'
                }}
              </b>
            </template>
            <template v-else>
              <b-skeleton :width="220" :height="24" animated />
            </template>
          </h3>

          <!-- Rol y descripción -->
          <p class="is-size-6 has-text-primary">
            <template v-if="!loading">
              Has iniciado sesión como <b>{{ user?.role?.name || 'Usuario' }}</b>, descripción: <b>{{ user?.bio || 'Sin descripción' }}</b>
            </template>
            <template v-else>
              <b-skeleton :width="280" :height="20" animated />
            </template>
          </p>
        </div>

        <!-- Botón de perfil -->
        <div class="column is-narrow has-text-centered-touch">
          <template v-if="!loading">
            <a href="/layouts/mi.perfil.panel" class="button is-light mt-4 mt-0-tablet" title="Perfil">
              <span class="icon"><i class="fas fa-user"></i></span>
              <span>Administrar perfil</span>
            </a>
          </template>
          <template v-else>
            <b-skeleton :width="140" :height="36" animated style="border-radius: 4px" />
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch, onMounted, onActivated } from 'vue'

// Props desde el padre
const props = defineProps({
  user: Object,
  loading: Boolean
})

// States internos
const avatarLoaded = ref(false)
const avatarUrl = ref('https://github.com/octocat.png')

// Función de pre-carga de avatar
function loadAvatar(url) {
  avatarLoaded.value = false
  avatarUrl.value = url
  const img = new Image()
  img.src = url
  img.onload = () => { avatarLoaded.value = true }
  img.onerror = () => {
    avatarUrl.value = 'https://github.com/octocat.png'
    avatarLoaded.value = true
  }
}

// Watcher: solo cuando cambia la URL del avatar
watch(
  () => props.user?.avatar,
  (newAvatar) => {
    const url = newAvatar && newAvatar.trim() !== '' ? newAvatar : 'https://github.com/octocat.png'
    loadAvatar(url)
  },
  { immediate: true }
)

// Reiniciar avatarLoaded si el componente se activa de nuevo (vuelve desde otra página)
onActivated(() => {
  const url = props.user?.avatar && props.user.avatar.trim() !== '' ? props.user.avatar : 'https://github.com/octocat.png'
  loadAvatar(url)
})

// Animated counters (opcional)
const finalValues = ref({
  clientes: 512,
  ventas: 349,
  visitas: 5219,
  suscripciones: 98
})
const animatedValues = ref({
  clientes: 0,
  ventas: 0,
  visitas: 0,
  suscripciones: 0
})
const animationDuration = 1000

function formatNumber(value) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function animateCounters() {
  const startTime = performance.now()
  function animate(now) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / animationDuration, 1)

    animatedValues.value.clientes = Math.floor(progress * finalValues.value.clientes)
    animatedValues.value.ventas = Math.floor(progress * finalValues.value.ventas)
    const visitasValue = Math.floor(progress * finalValues.value.visitas)
    animatedValues.value.visitas = progress < 1 ? visitasValue.toString() : formatNumber(visitasValue)
    animatedValues.value.suscripciones = Math.floor(progress * finalValues.value.suscripciones)

    if (progress < 1) requestAnimationFrame(animate)
  }
  requestAnimationFrame(animate)
}

// Animar counters al montar
onMounted(() => {
  animateCounters()
})
</script>


<style scoped>
* {
  transition: all 0.3s ease-in-out !important;
}

.section-user {
  padding: 1.5rem;
  border-bottom: 1px solid #ccc;
}
</style>
