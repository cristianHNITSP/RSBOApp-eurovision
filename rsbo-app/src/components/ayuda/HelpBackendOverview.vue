<template>
  <article id="sec_sistema" class="help-card help-anchor">
    <header class="help-card-header">
      <div class="help-card-title-block">
        <b-icon icon="server" size="is-small" class="mr-2" />
        <h3>¿Cómo funciona el sistema?</h3>
      </div>
    </header>
    <p class="help-text">
      Respuestas sencillas a las preguntas más comunes sobre cómo trabaja el sistema
      "por dentro", sin tecnicismos.
    </p>

    <div class="bo-grid">
      <div v-for="block in BACKEND_BLOCKS" :key="block.id" class="bo-card">
        <b-collapse animation="fade">
          <template #trigger="{ open }">
            <div class="bo-card__trigger">
              <div class="bo-card__icon">
                <b-icon :icon="block.icon" size="is-small" />
              </div>
              <span class="bo-card__title">{{ block.title }}</span>
              <b-icon :icon="open ? 'chevron-up' : 'chevron-down'" size="is-small" />
            </div>
          </template>
          <div class="bo-card__body">
            <p v-for="(line, i) in block.body" :key="i">{{ line }}</p>
          </div>
        </b-collapse>
      </div>
    </div>
  </article>
</template>

<script setup>
import './HelpBackendOverview.css';
import './HelpCard.css';
import { BACKEND_BLOCKS } from './data/backendOverview.js';
</script>
