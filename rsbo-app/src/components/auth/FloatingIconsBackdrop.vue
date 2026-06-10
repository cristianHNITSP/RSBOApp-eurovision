<!-- src/components/auth/FloatingIconsBackdrop.vue
     Fondo decorativo: iconos que derivan en "caída libre" (microgravedad),
     aparecen, flotan y se desvanecen en ciclo infinito.

     Optimización:
     - Cero JS en runtime: sin setInterval ni manipulación del DOM; todo
       son @keyframes CSS sobre transform/opacity (composición GPU pura).
     - Pool fijo de nodos que se reciclan vía animación infinita; los
       delays NEGATIVOS hacen que al montar ya estén a mitad de vuelo
       (sin "pop" inicial).
     - contain: strict + pointer-events: none → el navegador aísla la capa.
     - Respeta prefers-reduced-motion y el modo de efectos reducidos. -->
<template>
  <div class="fib" :class="{ 'fib--in': ready }" aria-hidden="true">
    <template v-if="ready">
      <i
        v-for="(item, i) in items"
        :key="i"
        class="fas fib__icon"
        :class="`fa-${item.icon}`"
        :style="item.style"
      ></i>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from "vue";

const props = defineProps({
  icons: { type: Array, default: () => ["glasses", "eye", "magnifying-glass"] },
  count: { type: Number, default: 16 },
});

/* Montaje diferido: en una carga de página (p. ej. tras logout) el hilo
   principal está ocupado con parseo/hidratación/fuentes; crear 16 nodos
   animados en ese instante produce un tirón. Esperamos a que el navegador
   esté ocioso y entramos con un fade del contenedor (sin "pop"). */
const ready = ref(false);
let idleId = null;

onMounted(() => {
  const start = () => { ready.value = true; };
  if ("requestIdleCallback" in window) {
    idleId = requestIdleCallback(start, { timeout: 800 });
  } else {
    idleId = setTimeout(start, 350);
  }
});

onBeforeUnmount(() => {
  if (idleId == null) return;
  if ("cancelIdleCallback" in window) cancelIdleCallback(idleId);
  else clearTimeout(idleId);
});

/* PRNG determinista: misma constelación en cada montaje (evita layout-shift
   visual entre navegaciones y permite snapshots estables). */
function makeRng(seed) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

const items = computed(() => {
  const rand = makeRng(48271);
  // Muestreo estratificado: la pantalla se divide en una cuadrícula y cada
  // icono vive en su propia celda (con jitter). Garantiza cobertura uniforme
  // de TODO el viewport — nunca se agrupan en el centro.
  const cols = Math.ceil(Math.sqrt(props.count));
  const rows = Math.ceil(props.count / cols);

  return Array.from({ length: props.count }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const dur = 10 + rand() * 8;            // ciclo completo: 10–18s
    const delay = -(rand() * dur);          // arranca a mitad de ciclo
    return {
      icon: props.icons[i % props.icons.length],
      style: {
        top: `${(((row + 0.15 + rand() * 0.7) / rows) * 100).toFixed(1)}%`,
        left: `${(((col + 0.15 + rand() * 0.7) / cols) * 100).toFixed(1)}%`,
        fontSize: `${(1.1 + rand() * 1.5).toFixed(2)}rem`,
        "--fib-dur": `${dur.toFixed(1)}s`,
        "--fib-delay": `${delay.toFixed(1)}s`,
        "--fib-dx": `${(rand() * 70 - 35).toFixed(0)}px`,   // deriva lateral
        "--fib-dy": `${(-20 - rand() * 70).toFixed(0)}px`,  // siempre "sube" suave
        "--fib-rot": `${(rand() * 50 - 25).toFixed(0)}deg`, // giro ingrávido
      },
    };
  });
});
</script>

<style scoped>
.fib {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  z-index: 0;
  contain: strict;
}

/* Fade-in del conjunto cuando los iconos montan en idle (la opacidad del
   contenedor se multiplica con la de cada icono → entrada suave sin "pop"). */
.fib {
  opacity: 0;
}

.fib--in {
  animation: fib-layer-in 0.9s ease-out both;
}

@keyframes fib-layer-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.fib__icon {
  position: absolute;
  color: var(--c-primary);
  opacity: 0;
  /* Sin will-change: 16 capas forzadas a la vez cuestan más de lo que
     ahorran; transform/opacity ya se componen en GPU durante la animación. */
  animation: fib-drift var(--fib-dur) linear var(--fib-delay) infinite;
}

/* Deriva ingrávida: fade-in → flota girando → fade-out, y recicla. */
@keyframes fib-drift {
  0% {
    opacity: 0;
    transform: translate3d(0, 0, 0) rotate(0deg);
  }

  14% {
    opacity: 0.18;
  }

  72% {
    opacity: 0.18;
  }

  100% {
    opacity: 0;
    transform: translate3d(var(--fib-dx), var(--fib-dy), 0) rotate(var(--fib-rot));
  }
}

@media (prefers-reduced-motion: reduce) {
  .fib__icon {
    animation: none;
    opacity: 0.07;
  }
}

:global([data-reduced-effects="true"]) .fib {
  display: none;
}
</style>
