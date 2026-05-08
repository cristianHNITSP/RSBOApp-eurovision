<template>
  <article id="sec_pantallas" class="help-card help-anchor">
    <header class="help-card-header">
      <div class="help-card-title-block">
        <b-icon icon="desktop" size="is-small" class="mr-2" />
        <h3>¿Qué hago en cada pantalla?</h3>
      </div>
    </header>
    <p class="help-text">
      Aquí tienes un resumen de cada sección del sistema explicado en palabras sencillas,
      para que sepas para qué sirve y qué puedes hacer desde cada pantalla.
    </p>

    <div class="vg-section">
      <template v-for="area in VIEWS_GUIDE" :key="area.area">
        <p class="vg-area-title">{{ area.area }}</p>
        <div class="vg-grid">
          <div v-for="item in area.items" :key="item.id" class="vg-card">
            <div class="vg-card__head">
              <div class="vg-card__icon">
                <b-icon :icon="item.icon" size="is-small" />
              </div>
              <span class="vg-card__name">{{ item.name }}</span>
            </div>
            <p class="vg-card__purpose">{{ item.purpose }}</p>
            <ul class="vg-card__actions">
              <li v-for="action in item.actions" :key="action" class="vg-card__action-item">
                {{ action }}
              </li>
            </ul>
          </div>
        </div>
      </template>
    </div>
  </article>
</template>

<script setup>
import './HelpViewGuide.css';
import './HelpCard.css';
import { VIEWS_GUIDE } from './data/viewsGuide.js';
</script>
