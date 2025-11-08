<template>
  <section class="section section-miuser">
    <div class="columns is-multiline">

      <!-- Avatar y selector (solo visual) -->
      <div class="column is-narrow has-text-centered-touch">
        <figure class="image is-128x128 is-inline-block avatar-frame" @click="avatarModal = true">
          <img :src="avatarUrl" alt="Avatar" />
        </figure>

        <!-- Modal para seleccionar avatar -->
        <b-modal v-model="avatarModal" :has-modal-card="true">
          <div class="modal-card">
            <header class="modal-card-head">
              <p class="modal-card-title">Selecciona un avatar</p>
              <button class="delete" aria-label="close" @click="avatarModal = false"></button>
            </header>
            <section class="modal-card-body">
              <div v-for="(category, name) in avatarCategories" :key="name" class="mb-4">
                <h6 class="title is-6">{{ name }}</h6>
                <div class="columns is-multiline is-mobile">
                  <div class="column is-2" v-for="(img, index) in category" :key="index">
                    <figure class="image is-64x64">
                      <img :src="img" class="avatar-option" />
                    </figure>
                  </div>
                </div>
              </div>
            </section>
            <footer class="modal-card-foot">
              <button class="button" @click="avatarModal = false">Cerrar</button>
            </footer>
          </div>
        </b-modal>
      </div>

      <!-- Formulario de perfil (solo visual) -->
      <div class="column is-8">
        <b-field label="Nombre">
          <b-input placeholder="Tu nombre"></b-input>
        </b-field>

        <b-field label="Email">
          <b-input type="email" placeholder="Tu correo"></b-input>
        </b-field>

        <b-field label="Biografía">
          <b-input type="textarea" placeholder="Cuéntanos sobre ti"></b-input>
        </b-field>

        <b-field>
          <b-button type="is-primary">Guardar cambios</b-button>
          <b-button type="is-light">Cancelar</b-button>
        </b-field>
      </div>

    </div>
  </section>
</template>

<script setup>
// Estados solo visuales
import { ref } from 'vue'

const avatarModal = ref(false)
const avatarUrl = 'https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_1.png'

// Generar URLs de avatar dinámicamente (solo para mostrar)
function generateAvatarCategory(prefix, count) {
  return Array.from({ length: count }, (_, i) => `https://cdn.jsdelivr.net/gh/alohe/avatars/png/${prefix}_${i+1}.png`)
}

// Categorías de avatar
const avatarCategories = {
  Vibrent: generateAvatarCategory('vibrent', 27),
  '3D': generateAvatarCategory('3d', 5),
  Bluey: generateAvatarCategory('bluey', 10),
  Memo: generateAvatarCategory('memo', 35),
  Notion: generateAvatarCategory('notion', 15),
  Teams: generateAvatarCategory('teams', 9),
  Toon: generateAvatarCategory('toon', 10),
  Upstream: generateAvatarCategory('upstream', 22)
}
</script>

<style scoped>
.section-miuser {
  border-bottom: 1px solid #ccc;
  border-radius: 8px;
  padding: 1rem;
  background-color: white;
}

.avatar-frame img {
  width: 128px;
  height: 128px;
  object-fit: cover;
  border-radius: 50%;
  cursor: pointer;
}

.avatar-option {
  cursor: pointer;
  border-radius: 50%;
  transition: transform 0.2s, border 0.2s;
}
.avatar-option:hover {
  transform: scale(1.2);
  border: 2px solid #3273dc;
}
</style>
