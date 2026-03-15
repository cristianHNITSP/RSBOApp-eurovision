<template>
  <div class="loading-bar-container">
    <div class="loading-bar"></div>
  </div>
</template>

<style scoped>
.loading-bar-container {
  width: 100%;
  height: 6px;
  background-color: var(--c-primary-alpha); /* lavanda claro */
  border-radius: 3px;
  overflow: hidden;
  margin-top: 1rem;
}

.loading-bar {
  height: 100%;
  width: 30%;
  background-color: var(--c-primary); /* morado Buefy-ish */
  border-radius: 3px;
  animation: loading 1.2s infinite ease-in-out;
}

@keyframes loading {
  0% {
    margin-left: -30%;
    width: 30%;
  }
  50% {
    margin-left: 50%;
    width: 30%;
  }
  100% {
    margin-left: 100%;
    width: 30%;
  }
}
</style>
