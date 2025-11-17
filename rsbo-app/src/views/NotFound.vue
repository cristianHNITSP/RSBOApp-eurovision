<template>
    <section class="section notfound-section">
        <h1 class="title is-size-1">404</h1>
        <p class="subtitle is-size-4 mt-2">Página no encontrada</p>
        <figure class="mb-4" style="width: 200px;">
            <img :src="notfoundlog" alt="Logo" style="width: 100%;" />
        </figure>
        <router-link to="/" class="button is-primary mt-4" role="button">
            Volver al inicio
        </router-link>
    </section>
</template>

<script setup>
import notfoundlog from '@/assets/img/huohuo.png'
</script>

<script>
export default {
    name: 'NotFound'
}
</script>

<style scoped>
.notfound-section {
    /* Ocupa todo el viewport */
    height: 100vh;
    width: 100vw;

    /* Centrado flexbox vertical y horizontal */
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    /* Fondo: cambia el color o pon una imagen */
    /* background-image: url('../assets/img/fondo.jpg'); */
    /* background-size: cover; */
    /* background-position: center; */
}

</style>
