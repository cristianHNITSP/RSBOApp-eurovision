<template>
  <footer class="dashboard-footer">
    <div class="content has-text-centered">
      <p>
        <strong>RSBO</strong> v{{ version }} · Laboratorio Eurovision
        <br />
        <small style="opacity: 0.8;">
          Desarrollado por
          <a href="https://github.com/ofpec" target="_blank"
            style="color: inherit; text-decoration: underline;">OFPEC</a>
          &amp;
          <a href="https://github.com/cristianHNITSP" target="_blank"
            style="color: inherit; text-decoration: underline;">cristianHNITSP</a>
        </small> <br />
        <small style="opacity: 0.6;">
          &copy; {{ new Date().getFullYear() }} Laboratorio Eurovision. Todos los derechos reservados.
        </small>
      </p>
    </div>
  </footer>
</template>

<script setup>
import { version } from "../../../package.json";
</script>

<style scoped>
@import "./DashboardFooter.css";
</style>
