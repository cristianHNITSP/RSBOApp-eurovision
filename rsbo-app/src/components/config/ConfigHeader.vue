<template>
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
          <div class="psh-quick__icon">
            <b-icon icon="user-circle" size="is-small" />
          </div>
          <div>
            <p class="psh-quick__title">Mi perfil</p>
            <p class="psh-quick__text">Nombre, avatar y contraseña</p>
          </div>
        </div>

        <div class="psh-quick__card">
          <div class="psh-quick__icon">
            <b-icon icon="sliders-h" size="is-small" />
          </div>
          <div>
            <p class="psh-quick__title">Preferencias</p>
            <p class="psh-quick__text">Tema, fuente y efectos visuales</p>
          </div>
        </div>

        <div class="psh-quick__card">
          <div class="psh-quick__icon">
            <b-icon icon="shield-alt" size="is-small" />
          </div>
          <div>
            <p class="psh-quick__title">Seguridad</p>
            <p class="psh-quick__text">Opciones avanzadas de acceso</p>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import './ConfigHeader.css';
</script>
