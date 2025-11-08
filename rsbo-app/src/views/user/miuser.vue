<template>
  <section class="section-miuser">

    <div class="columns is-multiline">

      <!-- Columna izquierda: Avatar y estadísticas -->
      <div class="column is-4">

        <!-- Avatar -->
        <div class="box has-text-centered">
          <figure class="image is-128x128 is-inline-block mb-3 avatar-frame" @click="avatarModal = true">
            <img :src="avatarUrl" alt="Avatar" class="is-rounded"/>
          </figure>

          <div class="tags is-centered mb-3">
            <span class="tag is-light">Estado</span>
            <span class="tag is-success">Activo</span>
          </div>

          <h2 class="title is-4">Juan Pérez</h2>
          <p class="subtitle is-6 has-text-grey mt-1">juan.perez@ejemplo.com</p>

          <div class="mb-3">
            <b-tag type="is-info" rounded>Administrador</b-tag>
          </div>

          <div class="columns is-mobile is-centered is-multiline user-stats">
            <div class="column has-text-centered">
              <p class="has-text-weight-bold has-text-info">15 Ene 2024</p>
              <p class="is-size-7 has-text-grey">Miembro desde</p>
            </div>
            <div class="column has-text-centered">
              <p class="has-text-weight-bold has-text-info">Hace 2 horas</p>
              <p class="is-size-7 has-text-grey">Último acceso</p>
            </div>
          </div>
        </div>

        <!-- Seguridad -->
        <div class="box">
          <p class="has-text-weight-semibold mb-2">
            <span class="icon mr-1"><i class="fas fa-shield-alt"></i></span>
            Seguridad
          </p>

          <b-field label="Cambiar contraseña">
            <b-input type="password" placeholder="Nueva contraseña"></b-input>
          </b-field>
          <b-field>
            <b-input type="password" placeholder="Confirmar contraseña"></b-input>
          </b-field>
          <b-button type="is-primary" size="is-small">Actualizar</b-button>
        </div>

      </div>

      <!-- Columna derecha: Formulario de perfil -->
      <div class="column is-8">
        <div class="box">
          <p class="has-text-weight-semibold mb-3">
            <span class="icon mr-1"><i class="fas fa-user-edit"></i></span>
            Información del perfil
          </p>

          <b-field label="Nombre completo">
            <b-input placeholder="Tu nombre" value="Juan Pérez" expanded></b-input>
          </b-field>

          <b-field label="Correo electrónico">
            <b-input type="email" placeholder="Tu correo" value="juan.perez@ejemplo.com" expanded></b-input>
          </b-field>

          <b-field label="Teléfono">
            <b-input placeholder="Tu teléfono" value="+34 612 345 678" expanded></b-input>
          </b-field>

          <b-field label="Biografía">
            <b-input type="textarea" placeholder="Cuéntanos sobre ti..."
                     value="Desarrollador full-stack con experiencia en Vue.js y Node.js."
                     maxlength="500" show-counter>
            </b-input>
          </b-field>

          <div class="field is-grouped mt-3">
            <div class="control">
              <b-button type="is-primary" icon-left="check">Guardar</b-button>
            </div>
            <div class="control">
              <b-button type="is-warning is-light" icon-left="circle-xmark">Cancelar</b-button>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Modal Avatar -->
    <b-modal v-model="avatarModal" :width="640" scroll="keep" :can-cancel="['escape', 'outside']">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Selecciona un avatar</p>
          <button class="delete" aria-label="close" @click="avatarModal = false"></button>
        </header>
        <section class="modal-card-body">
          <b-tabs v-model="activeAvatarTab" animated>
            <b-tab-item v-for="(category, name) in avatarCategories" :key="name" :label="name">
              <div class="columns is-multiline is-mobile">
                <div class="column is-3" v-for="(img, index) in category" :key="index">
                  <figure class="image is-64x64 avatar-option-container">
                    <img :src="img" class="avatar-option" :class="{ 'is-selected': img === currentAvatar }" />
                  </figure>
                </div>
              </div>
            </b-tab-item>
          </b-tabs>
        </section>
        <footer class="modal-card-foot">
          <div class="level is-mobile is-flex-wrap-wrap">
            <b-button @click="avatarModal = false">Cerrar</b-button>
            <b-button type="is-primary" @click="avatarModal = false">Seleccionar</b-button>
            <div class="ml-3 mt-2">
              <span class="mr-2">Vista previa:</span>
              <figure class="image is-48x48 is-inline-block">
                <img :src="currentAvatar" alt="Avatar seleccionado" class="is-rounded" />
              </figure>
            </div>
          </div>
        </footer>
      </div>
    </b-modal>

  </section>
</template>

<script setup>
import { ref } from 'vue'

const avatarModal = ref(false)
const activeAvatarTab = ref(0)
const currentAvatar = ref('https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_1.png')
const avatarUrl = 'https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_1.png'

function generateAvatarCategory(prefix, count) {
  return Array.from({ length: count }, (_, i) =>
    `https://cdn.jsdelivr.net/gh/alohe/avatars/png/${prefix}_${i + 1}.png`
  )
}

const avatarCategories = {
  Vibrent: generateAvatarCategory('vibrent', 12),
  '3D': generateAvatarCategory('3d', 5),
  Bluey: generateAvatarCategory('bluey', 8),
  Memo: generateAvatarCategory('memo', 10),
  Notion: generateAvatarCategory('notion', 8),
  Teams: generateAvatarCategory('teams', 6),
  Toon: generateAvatarCategory('toon', 8),
  Upstream: generateAvatarCategory('upstream', 8)
}
</script>

<style scoped>

.section-miuser {
  border-radius: 12px;
  padding: 1.5rem;

  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);

  border-bottom: 1px solid #ccc;
}


.avatar-frame img { cursor: pointer; transition: transform 0.2s ease; }
.avatar-frame img:hover { transform: scale(1.03); }
.avatar-option { border-radius: 50%; width: 64px; height: 64px; transition: transform 0.2s; }
.avatar-option:hover { transform: scale(1.05); }
.avatar-option.is-selected { border: 2px solid #3273dc; }
</style>
