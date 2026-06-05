# 🫧 Guía: Animaciones "Liquid Glass"

> Cuando pida una **animación liquid glass**, me refiero a ESTO. Este documento es el
> contrato visual/técnico para que las animaciones se sientan líquidas y de cristal,
> sin romper el layout ni "despegarse" de su anclaje.

---

## 1. Principios (el "feel")

Una animación liquid glass debe transmitir **vidrio que se asienta / líquido que cuaja**:

1. **Enfoque (blur → 0).** Entra desde un `filter: blur()` (8–12px) que se **enfoca** a 0.
   Es el rasgo #1 del "glass": el contenido nítida de golpe al asentarse.
2. **Respiración con escala, no con salto.** El "rebote"/vida se hace con `scale`/`scaleY`,
   **nunca** con un `translate` que sobrepase la posición final.
3. **Anclaje sagrado.** Un panel pegado a un borde (bottom sheet, dropdown) **NUNCA** se
   despega de ese borde durante la animación. → `transform-origin` en el borde de anclaje.
4. **Suave, no brusco.** Curvas ease-out largas (0.45–0.6s entrada). La salida es más
   corta (0.25–0.3s) y directa.
5. **Opacidad acompaña**, no protagoniza (fade sutil 0 → 1).

---

## 2. Reglas duras (qué SÍ y qué NO)

| ✅ Hacer | ❌ Evitar |
|---------|----------|
| Rebote en `scaleY`/`scale` con `transform-origin` en el borde anclado | Overshoot en `translateY`/`translateX` (despega el panel del borde → "flota") |
| `cubic-bezier` ease-out sin pasar de 1 en Y para el `translate` (ej. `cubic-bezier(0.22,0.61,0.36,1)`) | `cubic-bezier(...,1.275)` o `linear(... >1 ...)` aplicado al **transform completo** |
| `filter: blur()` que se enfoca a 0 | Animar `top/left/height` (reflow, janky) |
| Animación de apertura **antes** de cargar datos (ver §4) | Disparar fetch/API durante la animación (la entrecorta) |
| `@keyframes` cuando el rebote de escala y el slide necesitan curvas distintas | Un solo `cubic-bezier` con overshoot para mover Y y escalar a la vez |
| Respetar `prefers-reduced-motion` | Animaciones largas/elásticas sin fallback |

**La regla de oro:** si el elemento está anclado a un borde, el rebote va en **escala con
origin en ese borde** (el borde queda clavado, el resto "respira"). El `translate` solo
desliza hasta su sitio y **para** (monótono, sin pasarse).

---

## 3. Receta de referencia (bottom-sheet liquid glass)

Implementada en `rsbo-app/src/components/NotificationPanel.css` (animación del panel de
notificaciones en móvil). Sirve de plantilla:

```css
.panel { transform-origin: bottom center; } /* el borde anclado */

.enter-active { animation: liquid-in 0.55s cubic-bezier(0.22, 0.61, 0.36, 1) both; }
.leave-active { animation: liquid-out 0.30s cubic-bezier(0.4, 0, 1, 1) both; }

@keyframes liquid-in {
  0%   { opacity: 0; transform: translateY(100%) scaleY(0.92); filter: blur(12px); }
  60%  { opacity: 1; transform: translateY(0)    scaleY(1.012); filter: blur(0); } /* respira */
  100% {            transform: translateY(0)    scaleY(1); }                       /* asienta */
}
@keyframes liquid-out {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(100%); }
}
```

- `scaleY(0.92 → 1.012 → 1)` con `origin: bottom` → el borde inferior **clavado**, la parte
  de arriba respira (rebote líquido) sin despegar.
- `translateY(100% → 0)` **monótono** → sube y se queda; nunca pasa de 0.
- `blur(12 → 0)` → el "glass" que se enfoca.

Para un dropdown (anclado arriba): `transform-origin: top center` y `translateY(-8px → 0)`
monótono, mismo blur + escala.

---

## 4. Orden: animación primero, datos después

La animación de apertura debe correr **fluida**; los efectos secundarios (fetch a la API,
render pesado) van **después** de que termine, no durante.

- Mostrar el **loader centrado** durante la animación (el contenedor ya abre a su tamaño final).
- Disparar el `fetch`/carga en el hook de fin de transición (`@after-enter` en Vue, o
  `animationend`).
- Si los datos ya están en caché y frescos → abrir directo con el contenido.

(Implementado en `NotificationPanel.vue`: `@after-enter="onPanelOpened"` → `load()`.)

---

## 5. Tokens y accesibilidad

- **Colores/blur:** usar tokens de `tokens.css` (`--surface-overlay`, `--fx-blur`, etc.),
  nunca hardcodear. `--fx-blur` ya vale `0px` en el tema de alto contraste.
- **Reduced motion:** envolver lo elástico en `@media (prefers-reduced-motion: reduce)` y
  dejar solo un fade corto (o nada). El tema de accesibilidad (keratocono) desactiva blur
  vía `--fx-blur: 0`, así que respetarlo es obligatorio.
- **Containing block:** ojo con `transform`/`filter`/`backdrop-filter` en ancestros — crean
  containing-block para `position: fixed`. Para overlays/sheets fijos, **teleportar a `<body>`**
  (`<Teleport to="body">`) para anclar al viewport real.

---

## 6. Checklist antes de dar por buena una animación liquid glass

- [ ] ¿Hay `blur → 0` (enfoque) en la entrada?
- [ ] ¿El rebote es en `scale`/`scaleY`, NO en `translate`?
- [ ] ¿`transform-origin` está en el borde anclado y el borde queda clavado?
- [ ] ¿El `translate` es monótono (no se pasa de la posición final)?
- [ ] ¿La API/carga corre DESPUÉS de la animación, con loader centrado durante?
- [ ] ¿Respeta `prefers-reduced-motion` y los tokens de blur?
- [ ] ¿Si es `fixed`, está teleportado a `body` para no flotar por un ancestro con transform?

## 7. Adicional liquid glass.
<main class="main">
  <h1 class="heading">Liquid Glass Menu</h1>
  <div class="liquid-glass">
    <div class="liquid-glass--bend"></div>
    <div class="liquid-glass--face"></div>
    <div class="liquid-glass--edge"></div>
    <div class="liquid-glass__menus">
      <a class="liquid-glass__link link-linkedin" href="https://www.linkedin.com/in/iamryanyu/" target="_blank">
        <svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 93.06 93.06">
          <path class="liquid-glass__icon" fill="#fff" d="M11.185.08C5.004.08.001 5.092 0 11.259c0 6.173 5.003 11.184 11.186 11.184 6.166 0 11.176-5.011 11.176-11.184C22.362 5.091 17.351.08 11.185.08zM1.538 30.926h19.287V92.98H1.538zM69.925 29.383c-9.382 0-15.673 5.144-18.248 10.022h-.258v-8.479H32.92v62.053h19.27V62.281c0-8.093 1.541-15.932 11.575-15.932 9.89 0 10.022 9.256 10.022 16.451v30.178H93.06V58.942c0-16.707-3.605-29.559-23.135-29.559z" />
        </svg>
      </a>
      <a class="liquid-glass__link link-frontendly" href="http://frontendly.io" target="_blank">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 212" fill="none">
          <path fill="#cf84fc" d="M100.5 180.25.5 123V97l100-57.25 18.25 37.5L36 118.75v-17.5l82.75 41.5-18.25 37.5Zm14.106 31.25L219.106 0h46.5l-104 211.5h-47Zm168.84-31.25-18.25-37.5 82.75-41.5v17.5l-82.75-41.5 18.25-37.5 100 57.25v26l-100 57.25Z" />
        </svg>
      </a>
    </div>
</main>

<div class="description">Click to expand & drag to move</div>

<svg style="display: none" xmlns="http://www.w3.org/2000/svg">


  <filter id="glass-blur" x="0" y="0" width="100%" height="100%" filterUnits="objectBoundingBox">
    <feTurbulence type="fractalNoise" baseFrequency="0.003 0.007" numOctaves="1" result="turbulence" />
    <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="200" xChannelSelector="R" yChannelSelector="G" />
  </filter>
</svg>

@function pxToRem($pixel) {
  @return $pixel / 16 + rem;
}

.main {
  align-items: center;
  background: url("https://assets.codepen.io/204808/berkay-gumustekin-ngqyo2AYYnE-unsplash%281%29.jpg")
    center / cover no-repeat;
  display: flex;
  justify-content: center;
  min-height: 100vh;
  min-width: 100vw;
}

.heading {
  color: #fff;
  font-size: clamp(3.125rem, 8.083vw + 1.033rem, 7.5rem);
  line-height: clamp(3.75rem, 6.928vw + 1.957rem, 7.5rem);
  position: fixed;
  top: pxToRem(20);
}

.liquid-glass {
  --glass-size-w: #{pxToRem(270)};
  --glass-size-h: #{pxToRem(270)};
  --glass-padding: #{pxToRem(30)};
  --border-radius: #{pxToRem(32)};
  --transition: 0.4s cubic-bezier(0.5, 1.5, 0.5, 1);
  --menu-gap: #{pxToRem(16)};
  --icon-size: #{pxToRem(64)};
  --icon-border-radius: #{pxToRem(16)};
  --icon-padding: #{pxToRem(12)};

  border-radius: var(--border-radius);
  cursor: grab;
  height: var(--glass-size-h);
  padding: var(--glass-padding);
  position: relative;
  transition: width var(--transition), height var(--transition),
    padding var(--transition);
  width: var(--glass-size-w);

  &.is-expanded {
    --glass-size-w: #{pxToRem(550)};
    --glass-size-h: #{pxToRem(700)};
    --glass-padding: #{pxToRem(40)};
  }
}

.liquid-glass--bend {
  backdrop-filter: blur(3px);
  border-radius: var(--border-radius);
  filter: url(#glass-blur);
  inset: 0;
  position: absolute;
  z-index: 0;
}

.liquid-glass--face {
  border-radius: var(--border-radius);
  box-shadow: 0 4px 4px rgba(0, 0, 0, 0.15), 0 0 12px rgba(0, 0, 0, 0.08);
  inset: 0;
  position: absolute;
  z-index: 1;
}

.liquid-glass--edge {
  border-radius: var(--border-radius);
  box-shadow: inset 3px 3px 3px 0 rgba(255, 255, 255, 0.45),
    inset -3px -3px 3px 0 rgba(255, 255, 255, 0.45);
  inset: 0;
  position: absolute;
  z-index: 2;
}

.liquid-glass__menus {
  display: flex;
  gap: var(--menu-gap);
  transition: gap var(--transition);

  .is-expanded & {
    --menu-gap: #{pxToRem(32)};
  }
}

.liquid-glass__link {
  border-radius: var(--icon-border-radius);
  box-shadow: inset 1px 1px 1px 0 rgba(255, 255, 255, 0.45),
    inset -1px -1px 1px 0 rgba(255, 255, 255, 0.45);
  display: flex;
  height: var(--icon-size);
  padding: var(--icon-padding);
  pointer-events: none;
  transition: width var(--transition), height var(--transition),
    border-radius var(--transition);
  width: var(--icon-size);
  z-index: 3;

  .is-expanded & {
    --icon-size: #{pxToRem(128)};
    --icon-border-radius: #{pxToRem(32)};
    --icon-padding: #{pxToRem(24)};
    cursor: default;
    pointer-events: auto;
    box-shadow: inset 1px 2px 2px 0 rgba(255, 255, 255, 0.45),
      inset -1px -2px 2px 0 rgba(255, 255, 255, 0.45);
  }
}

.link-linkedin {
  background: #1a76ad;
  background: linear-gradient(
    90deg,
    rgba(26, 118, 173, 1) 0%,
    rgba(40, 142, 201, 1) 100%
  );
}

.link-frontendly {
  // background: #a82dfb;
  background: #262626;
  background: linear-gradient(
    90deg,
    rgba(38, 38, 38, 1) 0%,
    rgba(48, 48, 48, 1) 100%
  );
}

.description {
  bottom: pxToRem(50);
  color: #fff;
  font-family: "Open Sans", sans-serif;
  font-optical-sizing: auto;
  font-size: pxToRem(24);
  left: 50%;
  position: fixed;
  text-align: center;
  transform: translateX(-50%);
}


gsap.registerPlugin(Draggable);

Draggable.create(".liquid-glass", {
  type: "x, y",
  inertia: true,
  onRelease: function () {
    gsap.to(this.target, {
      x: 0,
      y: 0,
      duration: 1.5,
      ease: "elastic.out(1,0.3)"
    });
  }
});

document.querySelector(".liquid-glass").addEventListener("click", (e) => {
  if (e.target.closest(".liquid-glass__icon")) return;

  e.currentTarget.classList.toggle("is-expanded");
});


