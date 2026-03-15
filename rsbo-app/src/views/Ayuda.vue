<template>
  <section class="ayuda-section" v-motion-fade-visible-once>
    <!-- Encabezado -->
    <header class="help-header">
      <div class="help-title-block">
        <span class="help-pill">
          <b-icon :icon="ICONS.help" size="is-small" class="mr-1" />
          Centro de ayuda
        </span>

        <h2>¿Cómo usar el sistema? (explicado fácil)</h2>
        <p>
          Aquí tienes pasos claros para trabajar en Inventario, Usuarios y Mi Perfil.
          También hay soluciones rápidas cuando algo no se guarda o no aparece.
        </p>

        <!-- Tarjetas rápidas -->
        <div class="help-quick">
          <div class="help-quick__card">
            <div class="help-quick__icon">
              <b-icon :icon="ICONS.save" size="is-small" />
            </div>
            <div>
              <p class="help-quick__title">Regla de oro</p>
              <p class="help-quick__text">
                Si cambias números, al final pulsa <strong>Guardar cambios</strong>.
              </p>
            </div>
          </div>

          <div class="help-quick__card">
            <div class="help-quick__icon">
              <b-icon :icon="ICONS.refresh" size="is-small" />
            </div>
            <div>
              <p class="help-quick__title">Si ves algo raro</p>
              <p class="help-quick__text">
                Primero intenta <strong>Recargar</strong> para traer datos actualizados.
              </p>
            </div>
          </div>

          <div class="help-quick__card">
            <div class="help-quick__icon">
              <b-icon :icon="ICONS.restore" size="is-small" />
            </div>
            <div>
              <p class="help-quick__title">Papelera</p>
              <p class="help-quick__text">
                Papelera no borra definitivo: <strong>se puede restaurar</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="help-meta">
        <p class="help-meta-line">
          <b-icon :icon="ICONS.user" size="is-small" class="mr-1" />
         
          <strong>{{ displayRole }}</strong>
        </p>

        <p v-if="appVersion" class="help-meta-line">
          <b-icon :icon="ICONS.version" size="is-small" class="mr-1" />
          Versión:
          <strong>{{ appVersion }}</strong>
        </p>
      </div>
    </header>

    <!-- Buscador -->
    <div class="help-search">
      <b-field label="Buscar en la ayuda" label-position="on-border" custom-class="help-search-label">
        <b-input ref="searchInputRef" :value="search"
          placeholder='Ej: "guardar", "recargar", "usuarios", "contraseña", "papelera", "exportar"...'
          :icon="ICONS.search" size="is-small" @input="onSearchInput" @update:modelValue="onSearchInput"
          @keyup.esc="clearSearch" />
      </b-field>

      <!-- Resultados rápidos del buscador (navegación) -->
      <div v-if="search.trim() && quickMatches.length" class="help-results">
        <div class="help-results__title">
          <b-icon :icon="ICONS.results" size="is-small" class="mr-1" />
          Resultados sugeridos
        </div>

        <div class="help-results__chips">
          <button v-for="m in quickMatches" :key="m.id" class="help-index__chip" type="button" @click="goTo(m.id)">
            <b-icon :icon="m.icon" size="is-small" class="mr-1" />
            {{ m.title }}
          </button>
        </div>
      </div>

      <!-- Índice -->
      <div class="help-index">
        <span class="help-index__label">Ir a:</span>
        <button v-for="sec in sectionIndex" :key="sec.id" class="help-index__chip" type="button" @click="goTo(sec.id)">
          <b-icon :icon="sec.icon" size="is-small" class="mr-1" />
          {{ sec.title }}
        </button>
      </div>

      <p class="help-search-hint">
        Atajos: <strong>/</strong> enfoca la búsqueda. <strong>Esc</strong> limpia.
      </p>
    </div>

    <div class="columns is-multiline help-content">
      <!-- Columna izquierda -->
      <div class="column is-12-tablet is-6-desktop">
        <!-- 1) Empezar -->
        <article id="sec_empezar" class="help-card help-anchor">
          <header class="help-card-header">
            <div class="help-card-title-block">
              <b-icon :icon="ICONS.play" size="is-small" class="mr-2" />
              <h3>1) Empezar en Inventario (pasos sencillos)</h3>
            </div>
          </header>

          <div class="help-steps2">
            <div class="help-step2">
              <div class="help-step2__n">1</div>
              <div class="help-step2__body">
                <p class="help-step2__title">Elige una planilla</p>
                <p class="help-step2__text">
                  Arriba verás <strong>pestañas</strong>. Cada pestaña es una planilla.
                  La pestaña <strong>Agregar</strong> crea una nueva.
                </p>
              </div>
            </div>

            <div class="help-step2">
              <div class="help-step2__n">2</div>
              <div class="help-step2__body">
                <p class="help-step2__title">Cambia de vista (Negativa / Positiva)</p>
                <p class="help-step2__text">
                  Algunas planillas tienen dos vistas. Esto <strong>no modifica tu inventario</strong>;
                  solo cambia lo que estás viendo.
                </p>
              </div>
            </div>

            <div class="help-step2">
              <div class="help-step2__n">3</div>
              <div class="help-step2__body">
                <p class="help-step2__title">Edita y guarda</p>
                <p class="help-step2__text">
                  Toca una celda, escribe el número y al final pulsa <strong>Guardar cambios</strong>.
                </p>
              </div>
            </div>
          </div>

          <div class="help-note">
            <b-icon :icon="ICONS.info" size="is-small" class="mr-1" />
            <span>
              Verás el <strong>0 al inicio</strong> en ambas vistas para ubicarte más rápido.
            </span>
          </div>
        </article>

        <!-- 2) Editar -->
        <article id="sec_editar" class="help-card help-anchor">
          <header class="help-card-header">
            <div class="help-card-title-block">
              <b-icon :icon="ICONS.edit" size="is-small" class="mr-2" />
              <h3>2) Cómo editar bien (sin perder cambios)</h3>
            </div>
          </header>

          <ul class="help-list">
            <li>
              <strong>Editar una celda:</strong> toca la celda → escribe el número → confirma con <strong>Enter</strong>
              (si aplica).
            </li>
            <li>
              <strong>Guardar:</strong> pulsa <strong>Guardar cambios</strong>. Si cierras sin guardar, se pierde lo
              editado.
            </li>
            <li>
              <strong>Descartar:</strong> si te equivocaste, usa <strong>Descartar cambios</strong> (antes de guardar).
            </li>
            <li>
              <strong>Recargar:</strong> si algo no se actualiza, pulsa <strong>Recargar</strong>.
            </li>
          </ul>

          <div class="help-soft">
            <div class="help-soft__title">
              <b-icon :icon="ICONS.formula" size="is-small" class="mr-1" />
              Barra superior (edición rápida)
            </div>
            <p class="help-soft__text">
              Si lo prefieres, puedes escribir el valor en la barra superior.
              Para aplicar: <strong>Enter</strong> o <strong>Aplicar</strong>.
              Después, no olvides <strong>Guardar cambios</strong>.
            </p>
          </div>
        </article>

        <!-- 3) Atajos -->
        <article id="sec_atajos" class="help-card help-anchor">
          <header class="help-card-header">
            <div class="help-card-title-block">
              <b-icon :icon="ICONS.keyboard" size="is-small" class="mr-2" />
              <h3>3) Atajos de teclado (rápidos)</h3>
            </div>
          </header>

          <p class="help-text">
            En computadora, estos atajos te ayudan a trabajar más rápido:
          </p>

          <ul class="help-list">
            <li><strong>Ctrl + S</strong>: guardar cambios de la planilla</li>
            <li><strong>Ctrl + Z</strong>: deshacer</li>
            <li><strong>Ctrl + Y</strong>: rehacer</li>
            <li><strong>Ctrl + C</strong>: copiar</li>
            <li><strong>Ctrl + X</strong>: cortar</li>
            <li><strong>Ctrl + V</strong>: pegar</li>
            <li><strong>Enter</strong>: confirmar un valor (si aplica)</li>
            <li><strong>Esc</strong>: cerrar/limpiar (según la pantalla)</li>
          </ul>

          <div class="help-note">
            <b-icon :icon="ICONS.info" size="is-small" class="mr-1" />
            <span>
              En Mac se usa <strong>Cmd</strong> en lugar de Ctrl.
            </span>
          </div>
        </article>

        <!-- 4) Exportar / Generar plantilla -->
        <article id="sec_exportar" class="help-card help-anchor">
          <header class="help-card-header">
            <div class="help-card-title-block">
              <b-icon :icon="ICONS.export" size="is-small" class="mr-2" />
              <h3>4) Exportar y Generar plantilla</h3>
            </div>
          </header>

          <div class="help-split">
            <div class="help-split__block">
              <p class="help-text"><strong>Exportar</strong></p>
              <p class="help-text">
                Descarga un archivo para abrirlo en Excel/LibreOffice con lo que estás viendo.
              </p>
            </div>

            <div class="help-split__block">
              <p class="help-text"><strong>Generar plantilla</strong> (si está vacío)</p>
              <p class="help-text">
                Si una planilla está vacía o incompleta, esta opción la prepara con su estructura mínima.
                Luego usa <strong>Recargar</strong> y captura existencias reales.
              </p>
            </div>
          </div>
        </article>

        <!-- 5) Usuarios -->
        <article id="sec_usuarios" class="help-card help-anchor">
          <header class="help-card-header">
            <div class="help-card-title-block">
              <b-icon :icon="ICONS.users" size="is-small" class="mr-2" />
              <h3>5) Usuarios del sistema (personal)</h3>
            </div>
          </header>

          <div class="help-actions-grid">
            <div class="help-action">
              <div class="help-action__title">
                <b-icon :icon="ICONS.userPlus" size="is-small" class="mr-1" />
                Crear usuario
              </div>
              <p class="help-action__text">
                Pulsa <strong>Nuevo usuario</strong>, llena nombre/correo/rol/contraseña y presiona
                <strong>Crear</strong>.
              </p>
            </div>

            <div class="help-action">
              <div class="help-action__title">
                <b-icon :icon="ICONS.edit" size="is-small" class="mr-1" />
                Editar usuario
              </div>
              <p class="help-action__text">
                Selecciona un usuario, presiona <strong>Editar</strong>, ajusta datos y guarda.
              </p>
            </div>

            <div class="help-action">
              <div class="help-action__title">
                <b-icon :icon="ICONS.key" size="is-small" class="mr-1" />
                Cambiar contraseña
              </div>
              <p class="help-action__text">
                Selecciona el usuario, entra a <strong>Contraseña</strong>, escribe la nueva y presiona
                <strong>Actualizar</strong>.
              </p>
            </div>

            <div class="help-action">
              <div class="help-action__title">
                <b-icon :icon="ICONS.trash" size="is-small" class="mr-1" />
                Papelera / Restaurar
              </div>
              <p class="help-action__text">
                <strong>Papelera</strong> retira un usuario sin borrarlo definitivo.
                En el filtro “Papelera” puedes <strong>Restaurar</strong>.
              </p>
            </div>
          </div>

          <div class="help-note">
            <b-icon :icon="ICONS.shield" size="is-small" class="mr-1" />
            <span>
              El <strong>rol</strong> define lo que cada usuario puede ver/hacer. Si algo no aparece, puede ser por
              permisos.
            </span>
          </div>
        </article>
      </div>

      <!-- Columna derecha -->
      <div class="column is-12-tablet is-6-desktop">
        <!-- 6) Mi perfil -->
        <article id="sec_miperfil" class="help-card help-anchor">
          <header class="help-card-header">
            <div class="help-card-title-block">
              <b-icon :icon="ICONS.user" size="is-small" class="mr-2" />
              <h3>6) Mi Perfil (tu cuenta)</h3>
            </div>
          </header>

          <ol class="help-steps">
            <li>
              <strong>Editar perfil:</strong> presiona <strong>Editar</strong>, cambia tus datos y pulsa <strong>Guardar
                perfil</strong>.
            </li>
            <li>
              <strong>Cancelar:</strong> presiona <strong>Cancelar</strong> para volver a como estaba.
            </li>
            <li>
              <strong>Cambiar avatar:</strong> toca tu foto para cambiarla.
            </li>
            <li>
              <strong>Cambiar contraseña:</strong> entra a <em>Seguridad</em> → <em>Cambiar contraseña</em> → confirma y
              actualiza.
            </li>
          </ol>

          <div class="help-soft">
            <div class="help-soft__title">
              <b-icon :icon="ICONS.lock" size="is-small" class="mr-1" />
              Consejos de contraseña
            </div>
            <p class="help-soft__text">
              Usa una contraseña larga, y confirma que ambas contraseñas sean iguales.
            </p>
          </div>
        </article>

        <!-- 7) Solución rápida -->
        <article id="sec_solucion" class="help-card help-anchor">
          <header class="help-card-header">
            <div class="help-card-title-block">
              <b-icon :icon="ICONS.wrench" size="is-small" class="mr-2" />
              <h3>7) Solución rápida (cuando algo falla)</h3>
            </div>
          </header>

          <div class="help-fixes">
            <div class="help-fix">
              <div class="help-fix__q">No se guardó</div>
              <div class="help-fix__a">
                Verifica que hayas pulsado <strong>Guardar cambios</strong>. Luego usa <strong>Recargar</strong>.
              </div>
            </div>

            <div class="help-fix">
              <div class="help-fix__q">No veo un valor, fila o columna</div>
              <div class="help-fix__a">
                Cambia la vista (Negativa/Positiva) y pulsa <strong>Recargar</strong>.
              </div>
            </div>

            <div class="help-fix">
              <div class="help-fix__q">Me equivoqué editando</div>
              <div class="help-fix__a">
                Usa <strong>Descartar cambios</strong> si todavía no guardaste.
              </div>
            </div>

            <div class="help-fix">
              <div class="help-fix__q">El sistema no me deja agregar un valor</div>
              <div class="help-fix__a">
                Algunos valores solo se permiten en pasos específicos (por ejemplo 0.25) y dentro de límites.
                Si sigue bloqueado, contacta soporte.
              </div>
            </div>
          </div>
        </article>

        <!-- 8) FAQ -->
        <article id="sec_faq" class="help-card help-anchor">
          <header class="help-card-header">
            <div class="help-card-title-block">
              <b-icon :icon="ICONS.faq" size="is-small" class="mr-2" />
              <h3>8) Preguntas frecuentes</h3>
            </div>
          </header>

          <div class="help-faq-list">
            <template v-for="sec in filteredSections" :key="sec.id">
              <div class="help-faq-section">
                <div class="help-faq-section__title">
                  <b-icon :icon="sec.icon" size="is-small" class="mr-1" />
                  <strong>{{ sec.title }}</strong>
                  <span class="help-faq-section__count">{{ sec.items.length }}</span>
                </div>

                <b-collapse v-for="qa in sec.items" :key="qa.id" class="help-faq-item" animation="fade"
                  :open="openMap[qa.id] ?? qa.openByDefault">
                  <template #trigger="{ open }">
                    <div class="help-faq-trigger">
                      <span>{{ qa.q }}</span>
                      <b-icon :icon="open ? ICONS.chevUp : ICONS.chevDown" size="is-small" />
                    </div>
                  </template>

                  <div class="help-faq-body">
                    <p v-for="(p, idx) in qa.a" :key="idx">{{ p }}</p>
                    <div v-if="qa.tags?.length" class="help-tags">
                      <span v-for="t in qa.tags" :key="t" class="help-tag">#{{ t }}</span>
                    </div>
                  </div>
                </b-collapse>
              </div>
            </template>

            <p v-if="!hasAnyResults" class="help-no-results has-text-grey is-size-7">
              No encontré resultados para <strong>"{{ search }}"</strong>.
              Prueba: "guardar", "recargar", "usuarios", "contraseña", "papelera", "exportar".
            </p>
          </div>
        </article>

        <!-- 9) Soporte -->
        <article id="sec_soporte" class="help-card help-card--support help-anchor">
          <header class="help-card-header">
            <div class="help-card-title-block">
              <b-icon :icon="ICONS.support" size="is-small" class="mr-2" />
              <h3>9) Soporte</h3>
            </div>
          </header>

          <p class="help-text">
            Para ayudarte más rápido, incluye:
          </p>

          <ul class="help-list">
            <li>Qué estabas haciendo (pasos cortos).</li>
            <li>Nombre de la planilla o usuario (si aplica).</li>
            <li>Captura de pantalla (si puedes) y hora aproximada.</li>
          </ul>

          <div class="help-contact">
            <div class="help-contact__chip">
              <b-icon :icon="ICONS.mail" size="is-small" class="mr-1" />
              <span>Correo de soporte</span>
            </div>
            <p class="help-contact__email">
              soporte.rsbo@icloud.com
            </p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";

const props = defineProps({
  user: { type: Object, default: () => null },
  appVersion: { type: String, default: "" },
});

const router = useRouter();
const route = useRoute();

const ICONS = Object.freeze({
  help: "life-ring",
  save: "save",
  refresh: "sync-alt",
  restore: "trash-restore",
  user: "user",
  version: "code-branch",
  search: "search",
  results: "list",
  play: "play-circle",
  edit: "pen",
  export: "file-export",
  users: "users",
  userPlus: "user-plus",
  key: "key",
  trash: "trash-alt",
  shield: "user-shield",
  lock: "lock",
  wrench: "wrench",
  faq: "question-circle",
  support: "headset",
  mail: "envelope",
  formula: "calculator",
  keyboard: "keyboard",
  info: "info-circle",
  chevUp: "chevron-up",
  chevDown: "chevron-down",
});

const search = ref("");
const searchInputRef = ref(null);

// ✅ si tu Buefy emite "input" (Vue2-like), esto siempre funciona
const onSearchInput = (payload) => {
  // Caso 1: ya viene el texto
  if (typeof payload === "string" || typeof payload === "number") {
    search.value = String(payload);
    return;
  }

  // Caso 2: viene un evento (InputEvent)
  const t = payload?.target || payload?.srcElement;
  if (t && typeof t.value !== "undefined") {
    search.value = String(t.value ?? "");
    return;
  }

  // Caso 3: fallback por si alguna lib manda { value: "..." }
  if (payload && typeof payload === "object" && "value" in payload) {
    search.value = String(payload.value ?? "");
    return;
  }

  // Fallback final
  search.value = "";
};


const clearSearch = () => {
  search.value = "";
};

const displayRole = computed(() => {
  if (!props.user) return "Usuario";
  return props.user.role?.name || props.user.name || "Usuario";
});

const sectionIndex = [
  { id: "sec_empezar", title: "Empezar", icon: ICONS.play },
  { id: "sec_editar", title: "Editar", icon: ICONS.edit },
  { id: "sec_atajos", title: "Atajos", icon: ICONS.keyboard },
  { id: "sec_exportar", title: "Exportar", icon: ICONS.export },
  { id: "sec_usuarios", title: "Usuarios", icon: ICONS.users },
  { id: "sec_miperfil", title: "Mi perfil", icon: ICONS.user },
  { id: "sec_solucion", title: "Solución rápida", icon: ICONS.wrench },
  { id: "sec_faq", title: "FAQ", icon: ICONS.faq },
  { id: "sec_soporte", title: "Soporte", icon: ICONS.support },
];

// ✅ catálogo corto para “resultados sugeridos”
const searchCatalog = computed(() => [
  { id: "sec_empezar", title: "Empezar en Inventario", icon: ICONS.play, text: "planilla pestañas agregar vista negativa positiva" },
  { id: "sec_editar", title: "Editar y guardar", icon: ICONS.edit, text: "guardar descartar recargar barra superior" },
  { id: "sec_atajos", title: "Atajos de teclado", icon: ICONS.keyboard, text: "ctrl s ctrl z ctrl y copiar pegar" },
  { id: "sec_exportar", title: "Exportar y generar plantilla", icon: ICONS.export, text: "exportar excel libreoffice generar plantilla" },
  { id: "sec_usuarios", title: "Usuarios y permisos", icon: ICONS.users, text: "nuevo usuario rol contraseña papelera restaurar" },
  { id: "sec_solucion", title: "Solución rápida", icon: ICONS.wrench, text: "no guarda no aparece recargar limites" },
  { id: "sec_soporte", title: "Soporte", icon: ICONS.support, text: "correo soporte reporte captura" },
]);

const quickMatches = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return [];
  const has = (t) => String(t || "").toLowerCase().includes(q);
  return searchCatalog.value.filter((x) => has(x.title) || has(x.text)).slice(0, 6);
});

/* ===== FAQ simple (filtrado) ===== */
const sections = ref([
  {
    id: "inv",
    title: "Inventario",
    icon: ICONS.export,
    items: [
      {
        id: "inv1",
        q: "¿Si cambio un número, se guarda solo?",
        a: [
          "No. Para guardar los cambios debes presionar “Guardar cambios”.",
          "Si cierras la página sin guardar, se quedará como estaba antes.",
        ],
        tags: ["guardar", "cambios"],
        openByDefault: true,
      },
      {
        id: "inv2",
        q: "¿Qué significa la vista Negativa y Positiva?",
        a: [
          "Solo cambia la parte que estás viendo de la planilla.",
          "No borra nada ni crea datos nuevos: es como cambiar de sección.",
        ],
        tags: ["vista", "negativa", "positiva"],
      },
      {
        id: "inv3",
        q: "¿Qué hago si algo no aparece o se ve incompleto?",
        a: [
          "1) Presiona “Recargar”.",
          "2) Cambia de vista (Negativa/Positiva) y revisa de nuevo.",
          "3) Si sigue igual, contacta soporte.",
        ],
        tags: ["recargar", "no aparece"],
      },
    ],
  },
  {
    id: "users",
    title: "Usuarios",
    icon: ICONS.users,
    items: [
      {
        id: "u1",
        q: "¿Cómo creo un usuario nuevo?",
        a: ["Pulsa “Nuevo usuario”.", "Completa nombre, correo, rol y contraseña.", "Pulsa “Crear” y listo."],
        tags: ["usuarios", "crear"],
      },
      {
        id: "u2",
        q: "¿Qué es Papelera?",
        a: [
          "Es una forma segura de retirar un usuario sin borrarlo definitivo.",
          "Si lo necesitas, se puede restaurar desde el filtro “Papelera”.",
        ],
        tags: ["papelera", "restaurar"],
      },
      {
        id: "u3",
        q: "¿Cómo cambio la contraseña de alguien?",
        a: ["Selecciona al usuario.", "Entra a “Contraseña”, escribe la nueva y presiona “Actualizar”."],
        tags: ["contraseña", "usuarios"],
      },
    ],
  },
  {
    id: "me",
    title: "Mi Perfil",
    icon: ICONS.user,
    items: [
      {
        id: "me1",
        q: "¿Cómo edito mis datos?",
        a: ["Pulsa “Editar”.", "Cambia lo que necesites y presiona “Guardar perfil”."],
        tags: ["perfil", "editar"],
      },
      {
        id: "me2",
        q: "¿Cómo cambio mi contraseña?",
        a: ["En “Seguridad” pulsa “Cambiar contraseña”.", "Escribe y confirma, luego “Actualizar contraseña”."],
        tags: ["perfil", "contraseña"],
      },
    ],
  },
]);

const filteredSections = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return sections.value;

  const has = (txt) => String(txt || "").toLowerCase().includes(q);

  return sections.value
    .map((sec) => {
      const items = (sec.items || []).filter((it) => {
        if (has(it.q)) return true;
        if ((it.a || []).some(has)) return true;
        if ((it.tags || []).some(has)) return true;
        return false;
      });
      return { ...sec, items };
    })
    .filter((sec) => sec.items.length > 0);
});

const hasAnyResults = computed(() => filteredSections.value.length > 0);

// ✅ abre automáticamente las preguntas que coinciden
const openMap = ref({});
watch(
  () => search.value,
  (q) => {
    const query = q.trim().toLowerCase();
    if (!query) {
      openMap.value = {};
      return;
    }
    const next = {};
    filteredSections.value.forEach((sec) => sec.items.forEach((it) => (next[it.id] = true)));
    openMap.value = next;
  }
);

/* ===== Scroll robusto (offset + hash + contenedor) ===== */
const SCROLL_OFFSET = 88;

const isScrollable = (el) => {
  if (!el) return false;
  const st = window.getComputedStyle(el);
  return /(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight;
};

const getScrollParent = (el) => {
  let p = el?.parentElement;
  while (p && p !== document.body) {
    if (isScrollable(p)) return p;
    p = p.parentElement;
  }
  return window;
};

const scrollToId = async (id) => {
  await nextTick();
  const el = document.getElementById(id);
  if (!el) return;

  const parent = getScrollParent(el);

  if (parent === window) {
    const top = el.getBoundingClientRect().top + window.pageYOffset - SCROLL_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
    return;
  }

  const parentRect = parent.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const top = elRect.top - parentRect.top + parent.scrollTop - SCROLL_OFFSET;
  parent.scrollTo({ top, behavior: "smooth" });
};

const goTo = async (id) => {
  // ✅ mantiene el hash para que la navegación externa (sidebar) sea consistente
  try {
    await router.replace({ ...route, hash: `#${id}` });
  } catch {
    // ignore
  }
  await scrollToId(id);
};

// ✅ si entras con /ayuda#sec_usuarios (o similar), lo respeta
watch(
  () => route.hash,
  async (h) => {
    const id = String(h || "").replace("#", "").trim();
    if (!id) return;
    await scrollToId(id);
  },
  { immediate: true }
);

/* ===== Atajo: "/" enfoca búsqueda ===== */
const focusSearch = () => {
  const root = searchInputRef.value?.$el || searchInputRef.value;
  const input = root?.querySelector?.("input");
  if (input) {
    input.focus();
    input.select?.();
  }
};

const onKeyDown = (e) => {
  const tag = (e.target?.tagName || "").toLowerCase();
  const typing = tag === "input" || tag === "textarea" || e.target?.isContentEditable;

  if (!typing && e.key === "/") {
    e.preventDefault();
    focusSearch();
  }
};

onMounted(() => window.addEventListener("keydown", onKeyDown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeyDown));
</script>

<style scoped>
/* ✅ mejora anclas: evita que quede “corrida” por barras superiores */
.help-anchor {
  scroll-margin-top: 96px;
}

.ayuda-section {
  border-radius: 14px;
  padding: 1.5rem;
  background-color: var(--surface-solid);
  border: 1px solid var(--border-solid);
  box-shadow: var(--shadow-soft);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  animation: panel-fade-in 220ms ease-out;
}

/* Header */
.help-header {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  align-items: flex-start;
  padding: 1rem;
  border-radius: 14px;
  background:
    radial-gradient(circle at 0 0, rgba(79, 70, 229, 0.12), transparent 55%),
    radial-gradient(circle at 100% 0, rgba(236, 72, 153, 0.10), transparent 55%),
    radial-gradient(circle at 60% 100%, rgba(249, 115, 22, 0.10), transparent 55%),
    var(--surface-solid);
  border: 1px solid var(--border);
}

.help-title-block h2 {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.help-title-block p {
  font-size: 0.82rem;
  color: var(--text-muted);
}

.help-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--c-primary);
  background: var(--c-primary-alpha);
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  margin-bottom: 0.45rem;
  border: 1px solid rgba(79, 70, 229, 0.18);
}

.help-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.help-meta-line {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Quick cards */
.help-quick {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.55rem;
  margin-top: 0.75rem;
}

.help-quick__card {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  background: var(--surface-solid);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.65rem 0.75rem;
  box-shadow: var(--shadow-sm);
}

.help-quick__icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--c-primary-alpha);
  color: var(--c-primary);
  border: 1px solid rgba(79, 70, 229, 0.18);
  flex: 0 0 auto;
}

.help-quick__title {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.2;
}

.help-quick__text {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin: 0.15rem 0 0;
  line-height: 1.25;
}

/* Search */
.help-search {
  margin-top: 0.25rem;
}

.help-search-label {
  font-size: 0.75rem;
}

.help-search-hint {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 0.15rem;
}

/* Resultados */
.help-results {
  margin-top: 0.35rem;
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  border-radius: 12px;
  padding: 0.55rem 0.65rem;
}

.help-results__title {
  font-size: 0.75rem;
  font-weight: 900;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.help-results__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.35rem;
}

/* Index chips */
.help-index {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-top: 0.45rem;
}

.help-index__label {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.help-index__chip {
  border: 1px solid var(--border-solid);
  background: var(--bg-subtle);
  color: var(--text-primary);
  font-size: 0.72rem;
  border-radius: 999px;
  padding: 0.28rem 0.6rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
}

.help-index__chip:hover {
  transform: translateY(-1px);
  background: var(--c-primary-alpha);
  box-shadow: var(--shadow-md);
}

/* Cards */
.help-card {
  background-color: var(--surface-solid);
  border-radius: 1rem;
  padding: 0.95rem 1rem;
  box-shadow: var(--shadow-sm);
  margin-bottom: 0.75rem;
}

.help-card--support {
  border: 1px solid rgba(79, 70, 229, 0.18);
  background:
    radial-gradient(circle at 0 0, rgba(79, 70, 229, 0.08), transparent 60%),
    var(--surface-solid);
}

.help-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.help-card-title-block {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.help-card-header h3 {
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--text-primary);
}

/* Classic lists */
.help-steps {
  margin-left: 1.1rem;
  margin-top: 0.45rem;
  font-size: 0.79rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
}

.help-list {
  margin-top: 0.45rem;
  margin-left: 0.95rem;
  list-style: disc;
  font-size: 0.79rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.help-text {
  font-size: 0.79rem;
  color: var(--text-secondary);
}

/* Numbered blocks */
.help-steps2 {
  margin-top: 0.55rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.help-step2 {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  padding: 0.65rem 0.7rem;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--bg-subtle);
}

.help-step2__n {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 0.78rem;
  font-weight: 800;
  background: var(--c-primary-alpha);
  color: var(--c-primary);
  border: 1px solid rgba(79, 70, 229, 0.20);
  flex: 0 0 auto;
}

.help-step2__title {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--text-primary);
}

.help-step2__text {
  margin: 0.15rem 0 0;
  font-size: 0.79rem;
  color: var(--text-secondary);
  line-height: 1.25;
}

/* Soft info block */
.help-soft {
  margin-top: 0.7rem;
  border: 1px dashed rgba(79, 70, 229, 0.25);
  background: var(--c-primary-alpha);
  border-radius: 12px;
  padding: 0.65rem 0.7rem;
}

.help-soft__title {
  font-size: 0.78rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  color: var(--text-primary);
}

.help-soft__text {
  margin: 0.25rem 0 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.25;
}

/* Note */
.help-note {
  margin-top: 0.75rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
  background: var(--c-primary-alpha);
  border: 1px solid #e9d5ff;
  padding: 0.55rem 0.65rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
}

/* Split */
.help-split {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.6rem;
  margin-top: 0.55rem;
}

.help-split__block {
  border: 1px solid var(--border-solid);
  background: var(--bg-subtle);
  border-radius: 0.85rem;
  padding: 0.7rem 0.8rem;
}

/* Actions grid */
.help-actions-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.6rem;
  margin-top: 0.55rem;
}

.help-action {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface-solid);
  padding: 0.7rem 0.8rem;
  box-shadow: var(--shadow-sm);
}

.help-action__title {
  font-size: 0.82rem;
  font-weight: 900;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
}

.help-action__text {
  margin: 0.25rem 0 0;
  font-size: 0.79rem;
  color: var(--text-secondary);
  line-height: 1.25;
}

/* Fixes */
.help-fixes {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.help-fix {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.7rem 0.8rem;
  background: var(--bg-subtle);
}

.help-fix__q {
  font-size: 0.82rem;
  font-weight: 900;
  color: var(--text-primary);
}

.help-fix__a {
  margin-top: 0.25rem;
  font-size: 0.79rem;
  color: var(--text-secondary);
  line-height: 1.25;
}

/* FAQ */
.help-faq-list {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.help-faq-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.help-faq-section__title {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
  color: var(--text-primary);
}

.help-faq-section__count {
  margin-left: 0.25rem;
  font-size: 0.72rem;
  color: var(--text-muted);
  background: var(--bg-muted);
  border-radius: 999px;
  padding: 0.05rem 0.45rem;
}

.help-faq-item {
  border-radius: 0.75rem;
  border: 1px solid var(--border-solid);
  background: var(--bg-subtle);
  padding: 0.5rem 0.6rem;
}

.help-faq-trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.79rem;
  color: var(--text-primary);
  cursor: pointer;
}

.help-faq-body {
  margin-top: 0.4rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.help-faq-body p+p {
  margin-top: 0.18rem;
}

.help-tags {
  margin-top: 0.4rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.help-tag {
  font-size: 0.7rem;
  color: var(--c-primary);
  background: var(--c-primary-alpha);
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  border: 1px solid rgba(79, 70, 229, 0.15);
}

.help-no-results {
  margin-top: 0.4rem;
}

/* Contact */
.help-contact {
  margin-top: 0.85rem;
  border-radius: 14px;
  border: 1px solid rgba(79, 70, 229, 0.18);
  background: var(--c-primary-alpha);
  padding: 0.75rem 0.85rem;
}

.help-contact__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  font-weight: 900;
  color: var(--text-primary);
  background: var(--surface-overlay);
  border: 1px solid rgba(79, 70, 229, 0.18);
  padding: 0.18rem 0.55rem;
  border-radius: 999px;
}

.help-contact__email {
  margin: 0.45rem 0 0;
  font-size: 0.98rem;
  font-weight: 900;
  color: var(--text-primary);
  letter-spacing: 0.01em;
}

/* Animación */
@keyframes panel-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (min-width: 1024px) {
  .help-split {
    grid-template-columns: 1fr 1fr;
  }

  .help-actions-grid {
    grid-template-columns: 1fr 1fr;
  }

  .help-quick {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .ayuda-section {
    padding: 1rem;
  }

  .help-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .help-meta {
    align-items: flex-start;
  }
}
</style>
