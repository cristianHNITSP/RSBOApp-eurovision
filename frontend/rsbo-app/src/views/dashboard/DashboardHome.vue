<template >
  <section class="hero section-user" v-motion-fade-visible-once>
    <div class="hero-body p-0">
      <div class="columns is-vcentered is-multiline">
        <!-- Avatar -->
        <div class="column is-narrow has-text-centered-touch">
          <figure class="image is-128x128 is-inline-block" style="border-radius: 50%; overflow: hidden;">
            <b-skeleton v-show="!avatarLoaded" :width="128" :height="128" :animated="true"
              style="border-radius: 50%;" />
            <img v-show="avatarLoaded" :src="avatarUrl" alt="User avatar"
              style="width: 128px; height: 128px; object-fit: cover; border-radius: 50%; display: block;"
              @load="avatarLoaded = true" />
          </figure>
        </div>

        <!-- Texto -->
        <div class="column is-flex is-flex-direction-column is-justify-content-center has-text-centered-touch">
          <h1 class="title is-size-3 has-text-weight-bold mb-5">
            <template v-if="!loading">Howdy, <b>John Doe</b></template>
            <template v-else><b-skeleton :width="180" :height="32" animated /></template>
          </h1>
          <h3 class="subtitle is-size-4 mb-3">
            <template v-if="!loading">
              Last login <b>12 mins ago</b> from <b>192.168.1.1</b>
            </template>
            <template v-else><b-skeleton :width="280" :height="24" animated /></template>
          </h3>
          <p class="is-size-6 has-text-primary">
            <template v-if="!loading">You have <b>6 tasks</b> due today and <b>84 inquiries</b></template>
            <template v-else><b-skeleton :width="220" :height="20" animated /></template>
          </p>
        </div>

        <div class="column is-narrow has-text-centered-touch">
          <a v-if="!loading" href="#/profile" class="button is-light mt-4 mt-0-tablet" title="Profile">
            <span class="icon"><i class="fas fa-user"></i></span>
            <span>Manage profile</span>
          </a>
          <b-skeleton v-else :width="140" :height="36" animated style="border-radius: 4px" />
        </div>
      </div>
    </div>
  </section>

  <section class="section-content" v-motion-fade-visible-once>
    <div class="columns is-multiline">
      <!-- Carta 1 -->
      <div class="column is-3-desktop is-6-tablet is-flex is-flex-direction-column">
        <div class="card is-flex is-flex-direction-column is-flex-grow-1">
          <header class="card-header is-align-items-center is-justify-content-space-between">
            <p class="card-header-title is-align-items-center">
              <span class="icon mr-2">
                <i class="fas fa-arrow-up has-text-success"></i>
              </span>
              <span>
                <template v-if="!loading"><strong>384</strong> en <strong>Mar, 2021</strong></template>
                <template v-else><b-skeleton :width="100" :height="20" animated /></template>
              </span>
            </p>
            <b-button size="is-small" type="is-light" icon-left="cog" class="mr-2" />
          </header>
          <div class="card-content">
            <div class="columns is-mobile is-vcentered is-variable is-1">
              <div class="column has-text-centered">
                <p class="heading">Clientes</p>
                <p class="title is-3">
                  <template v-if="!loading">{{ animatedValues.clientes }}</template>
                  <template v-else><b-skeleton :width="50" :height="32" animated /></template>
                </p>
              </div>
              <div class="column has-text-centered">
                <span class="icon has-text-primary is-large">
                  <i class="fas fa-users fa-3x"></i>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Carta 2 -->
      <div class="column is-3-desktop is-6-tablet is-flex is-flex-direction-column">
        <div class="card is-flex is-flex-direction-column is-flex-grow-1">
          <header class="card-header is-align-items-center is-justify-content-space-between">
            <p class="card-header-title is-align-items-center">
              <span class="icon mr-2">
                <i class="fas fa-dollar-sign has-text-info"></i>
              </span>
              <span>
                <template v-if="!loading"><strong>$12.4K</strong> en <strong>Mar, 2021</strong></template>
                <template v-else><b-skeleton :width="110" :height="20" animated /></template>
              </span>
            </p>
            <b-button size="is-small" type="is-light" icon-left="cog" class="mr-2" />
          </header>
          <div class="card-content">
            <div class="columns is-mobile is-vcentered is-variable is-1">
              <div class="column has-text-centered">
                <p class="heading">Ventas</p>
                <p class="title is-3">
                  <template v-if="!loading">{{ animatedValues.ventas }}</template>
                  <template v-else><b-skeleton :width="50" :height="32" animated /></template>
                </p>
              </div>
              <div class="column has-text-centered">
                <span class="icon has-text-success is-large">
                  <i class="fas fa-chart-line fa-3x"></i>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Carta 3 -->
      <div class="column is-3-desktop is-6-tablet is-flex is-flex-direction-column">
        <div class="card is-flex is-flex-direction-column is-flex-grow-1">
          <header class="card-header is-align-items-center is-justify-content-space-between">
            <p class="card-header-title is-align-items-center">
              <span class="icon mr-2">
                <i class="fas fa-eye has-text-warning"></i>
              </span>
              <span>
                <template v-if="!loading"><strong>5.2K</strong> en <strong>Mar, 2021</strong></template>
                <template v-else><b-skeleton :width="90" :height="20" animated /></template>
              </span>
            </p>
            <b-button size="is-small" type="is-light" icon-left="cog" class="mr-2" />
          </header>
          <div class="card-content">
            <div class="columns is-mobile is-vcentered is-variable is-1">
              <div class="column has-text-centered">
                <p class="heading">Visitas</p>
                <p class="title is-3">
                  <template v-if="!loading">{{ animatedValues.visitas }}</template>
                  <template v-else><b-skeleton :width="70" :height="32" animated /></template>
                </p>
              </div>
              <div class="column has-text-centered">
                <span class="icon has-text-warning is-large">
                  <i class="fas fa-eye fa-3x"></i>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Carta 4 -->
      <div class="column is-3-desktop is-6-tablet is-flex is-flex-direction-column">
        <div class="card is-flex is-flex-direction-column is-flex-grow-1">
          <header class="card-header is-align-items-center is-justify-content-space-between">
            <p class="card-header-title is-align-items-center">
              <span class="icon mr-2">
                <i class="fas fa-envelope-open-text has-text-danger"></i>
              </span>
              <span>
                <template v-if="!loading"><strong>98</strong> nuevas en <strong>Mar, 2021</strong></template>
                <template v-else><b-skeleton :width="90" :height="20" animated /></template>
              </span>
            </p>
            <b-button size="is-small" type="is-light" icon-left="cog" class="mr-2" />
          </header>
          <div class="card-content">
            <div class="columns is-mobile is-vcentered is-variable is-1">
              <div class="column has-text-centered">
                <p class="heading">Suscripciones</p>
                <p class="title is-3">
                  <template v-if="!loading">{{ animatedValues.suscripciones }}</template>
                  <template v-else><b-skeleton :width="40" :height="32" animated /></template>
                </p>
              </div>
              <div class="column has-text-centered">
                <span class="icon has-text-danger is-large">
                  <i class="fas fa-envelope-open-text fa-3x"></i>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  data() {
    return {
      avatarLoaded: false,
      avatarUrl: 'https://github.com/octocat.png',
      loading: true,

      // Valores finales para animar
      finalValues: {
        clientes: 512,
        ventas: 349,
        visitas: 5219,
        suscripciones: 98,
      },
      animatedValues: {
        clientes: 0,
        ventas: 0,
        visitas: 0,
        suscripciones: 0,
      },
      animationDuration: 1000, // duración animación en ms
    };
  },
  mounted() {
    setTimeout(() => {
      this.loading = false;
      this.avatarLoaded = true;
      this.animateCounters();
    }, 2000);
  },
  methods: {
    animateCounters() {
      const startTime = performance.now();
      const duration = this.animationDuration;

      const animate = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        this.animatedValues.clientes = Math.floor(progress * this.finalValues.clientes);
        this.animatedValues.ventas = Math.floor(progress * this.finalValues.ventas);

        // Para visitas, guardamos el número sin formatear durante la animación
        const visitasValue = Math.floor(progress * this.finalValues.visitas);
        if (progress < 1) {
          this.animatedValues.visitas = visitasValue.toString();
        } else {
          this.animatedValues.visitas = this.formatNumber(visitasValue);
        }

        this.animatedValues.suscripciones = Math.floor(progress * this.finalValues.suscripciones);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    },
    formatNumber(value) {
      return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
  },

};
</script>

<script setup>
import { useMotionEffects } from '../../composables/useMotionEffects'

const { motionRef2 } = useMotionEffects()
</script>

<style scoped>
* {
  transition: all 0.3s ease-in-out !important;
}


.section-user {
  padding: 1.5rem;
  border-bottom: 1px solid #ccc;
}

.section-content {
  padding: 1.5rem;
  border-bottom: 1px solid #ccc;
  padding-bottom: 1rem;
}
</style>
