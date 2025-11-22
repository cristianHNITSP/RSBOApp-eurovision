<template>
  <section class="ayuda-section" v-motion-fade-visible-once>
    <!-- Encabezado -->
    <header class="help-header">
      <div class="help-title-block">
        <span class="help-pill">
          <b-icon icon="life-ring" size="is-small" class="mr-1" />
          Centro de ayuda
        </span>
        <h2>¿Necesitas ayuda con el panel de inventario?</h2>
        <p>
          Aquí encuentras una guía rápida para entender cómo funcionan las hojas,
          los movimientos de inventario y las acciones principales del sistema.
        </p>
      </div>

      <div class="help-meta">
        <p class="help-meta-line">
          <b-icon icon="user-shield" size="is-small" class="mr-1" />
          Rol actual:
          <strong>{{ displayRole }}</strong>
        </p>
        <p v-if="appVersion" class="help-meta-line">
          <b-icon icon="code-branch" size="is-small" class="mr-1" />
          Versión:
          <strong>{{ appVersion }}</strong>
        </p>
      </div>
    </header>

    <!-- Buscador simple de ayuda -->
    <div class="help-search">
      <b-field
        label="Buscar en la ayuda"
        label-position="on-border"
        custom-class="help-search-label"
      >
        <b-input
          v-model="search"
          placeholder="Ejemplo: “editar existencias”, “exportar CSV”, “combinaciones en riesgo”…"
          icon="search"
          size="is-small"
        />
      </b-field>
      <p class="help-search-hint">
        El buscador filtra las preguntas frecuentes de abajo. Para dudas complejas,
        contacta al responsable de inventario o soporte.
      </p>
    </div>

    <div class="columns is-multiline help-content">
      <!-- Columna izquierda -->
      <div class="column is-12-tablet is-6-desktop">
        <!-- Cómo usar las hojas de inventario -->
        <article class="help-card">
          <header class="help-card-header">
            <div class="help-card-title-block">
              <b-icon icon="clipboard-list" size="is-small" class="mr-2" />
              <h3>Flujo básico de trabajo</h3>
            </div>
          </header>
          <ol class="help-steps">
            <li>
              <strong>Selecciona la hoja correcta.</strong>
              Usa el menú de hojas para elegir
              <em>Monofocal, Bifocal, Progresivo o Base</em> según el tipo de lente
              que quieres revisar o actualizar.
            </li>
            <li>
              <strong>Filtra y ordena.</strong>
              Puedes ordenar por SPH, CYL, ADD o Base desde el encabezado de cada
              columna y aplicar filtros numéricos para centrarte solo en el rango
              que te interesa.
            </li>
            <li>
              <strong>Edita existencias.</strong>
              Haz clic sobre la celda del inventario, escribe la cantidad y valida
              visualmente que el valor sea correcto. También puedes usar la barra de
              fórmula superior si necesitas ajustar varias celdas seguidas.
            </li>
            <li>
              <strong>Guarda los cambios.</strong>
              Cuando termines, pulsa <em>“Guardar cambios”</em> en la barra superior.
              El sistema enviará únicamente las combinaciones modificadas al backend
              y registrará la operación en la bitácora de cambios.
            </li>
            <li>
              <strong>Revisa o deshaz.</strong>
              Si algo no se ve bien, puedes usar <em>“Descartar cambios”</em> para
              recargar la hoja desde la base de datos y empezar de nuevo.
            </li>
          </ol>
        </article>

        <!-- Buenas prácticas -->
        <article class="help-card">
          <header class="help-card-header">
            <div class="help-card-title-block">
              <b-icon icon="lightbulb" size="is-small" class="mr-2" />
              <h3>Buenas prácticas de captura</h3>
            </div>
          </header>
          <ul class="help-list">
            <li>
              <strong>Valida antes de guardar:</strong>
              recorre visualmente las filas modificadas (normalmente se muestran
              resaltadas o son las últimas que tocaste) antes de confirmar.
            </li>
            <li>
              <strong>Evita valores “mágicos”:</strong>
              usa <code>0</code> solo cuando realmente no hay existencias. Si
              desconoces el stock, consulta primero o anota una observación en el
              sistema correspondiente.
            </li>
            <li>
              <strong>Un cambio, un responsable:</strong>
              cuando se hagan ajustes grandes (por ejemplo, después de un inventario
              físico), procura que una sola persona sea la responsable de capturarlos
              para evitar datos cruzados.
            </li>
            <li>
              <strong>Usa filtros en lugar de exportar siempre:</strong>
              muchas consultas que antes se hacían en Excel pueden resolverse filtrando
              dentro de la propia grilla.
            </li>
          </ul>
        </article>
      </div>

      <!-- Columna derecha -->
      <div class="column is-12-tablet is-6-desktop">
        <!-- FAQ -->
        <article class="help-card">
          <header class="help-card-header">
            <div class="help-card-title-block">
              <b-icon icon="question-circle" size="is-small" class="mr-2" />
              <h3>Preguntas frecuentes</h3>
            </div>
          </header>

          <div class="help-faq-list">
            <b-collapse
              v-for="faq in filteredFaqs"
              :key="faq.id"
              class="help-faq-item"
              animation="fade"
              :open="faq.id === 1"
            >
              <template #trigger="{ open }">
                <div class="help-faq-trigger">
                  <span>{{ faq.question }}</span>
                  <b-icon
                    :icon="open ? 'chevron-up' : 'chevron-down'"
                    size="is-small"
                  />
                </div>
              </template>

              <div class="help-faq-body">
                <p v-for="(p, idx) in faq.answer" :key="idx">
                  {{ p }}
                </p>
              </div>
            </b-collapse>

            <p
              v-if="!filteredFaqs.length"
              class="help-no-results has-text-grey is-size-7"
            >
              No se encontraron resultados para
              <strong>“{{ search }}”</strong>. Intenta con otras palabras clave.
            </p>
          </div>
        </article>

        <!-- Soporte -->
        <article class="help-card">
          <header class="help-card-header">
            <div class="help-card-title-block">
              <b-icon icon="headset" size="is-small" class="mr-2" />
              <h3>Soporte y reporte de incidencias</h3>
            </div>
          </header>

          <p class="help-text">
            Si detectas un error en la información del inventario, lentitud en el sistema
            o un comportamiento extraño de la grilla, intenta primero:
          </p>

          <ol class="help-steps">
            <li>
              Usar el botón <strong>“Recargar datos”</strong> de la hoja.
            </li>
            <li>
              Comprobar tu conexión a internet si ves mensajes de
              <strong>tiempo de espera agotado</strong> o <strong>timeout</strong>.
            </li>
            <li>
              Verificar si otros compañeros tienen el mismo problema.
            </li>
          </ol>

          <p class="help-text mt-2">
            Si el problema continúa, envía un reporte al responsable de soporte con:
          </p>

          <ul class="help-list">
            <li>Nombre de la hoja o tipo de lente (Monofocal, Bifocal, etc.).</li>
            <li>ID de la hoja, si está visible en la interfaz.</li>
            <li>Captura de pantalla del error o mensaje mostrado.</li>
            <li>Fecha y hora aproximada del problema.</li>
          </ul>

          <p class="help-contact">
            <b-icon icon="envelope" size="is-small" class="mr-1" />
            Correo sugerido de soporte:
            <strong>soporte.inventario@laboratorio.com</strong>
            <span class="has-text-grey is-size-7">
              (favor de ajustar)
            </span>
          </p>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  user: {
    type: Object,
    default: () => null
  },
  appVersion: {
    type: String,
    default: ''
  }
})

const search = ref('')

const faqs = ref([
  {
    id: 1,
    question: '¿Qué pasa si cierro la página sin pulsar “Guardar cambios”?',
    answer: [
      'Los cambios que no se hayan guardado no se envían al servidor.',
      'Cuando vuelvas a abrir la hoja, se recargarán los datos que están almacenados en la base de datos.',
      'Por eso es importante pulsar “Guardar cambios” una vez que termines de capturar.'
    ]
  },
  {
    id: 2,
    question: '¿Cómo exporto una hoja de inventario a CSV?',
    answer: [
      'Desde la barra superior de la hoja, utiliza la opción “Exportar” o el botón de exportación.',
      'El sistema generará un archivo CSV con las combinaciones y existencias visibles en la grilla.',
      'Este archivo lo puedes abrir en Excel, LibreOffice o cualquier editor de hojas de cálculo.'
    ]
  },
  {
    id: 3,
    question: '¿Por qué algunas combinaciones SPH/CYL/ADD no aparecen en la hoja?',
    answer: [
      'El sistema solo muestra las combinaciones configuradas para esa hoja y tipo de lente.',
      'Si falta una combinación que sí se vende, puedes pedir que se agregue desde el módulo de plantillas o reportarlo a soporte.'
    ]
  },
  {
    id: 4,
    question: '¿Puedo ver quién modificó una existencia?',
    answer: [
      'Cada cambio queda registrado con usuario, fecha, hora y detalle en la bitácora de cambios.',
      'Si cuentas con permisos de consulta, podrás revisar ese historial desde el módulo de auditoría o registros.'
    ]
  }
])

const filteredFaqs = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return faqs.value
  return faqs.value.filter(
    (f) =>
      f.question.toLowerCase().includes(q) ||
      f.answer.some((p) => p.toLowerCase().includes(q))
  )
})

const displayRole = computed(() => {
  if (!props.user) return 'Usuario'
  return props.user.role?.name || props.user.name || 'Usuario'
})
</script>

<style scoped>
.ayuda-section {
  border-radius: 12px;
  padding: 1.5rem;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  animation: panel-fade-in 220ms ease-out;
}

/* Encabezado */
.help-header {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  align-items: flex-start;
}

.help-title-block h2 {
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.25rem;
}

.help-title-block p {
  font-size: 0.8rem;
  color: #6b7280;
}

.help-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #4f46e5;
  background: #eef2ff;
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  margin-bottom: 0.35rem;
}

.help-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.help-meta-line {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Buscador */
.help-search {
  margin-top: 0.5rem;
}

.help-search-label {
  font-size: 0.75rem;
}

.help-search-hint {
  font-size: 0.7rem;
  color: #9ca3af;
  margin-top: 0.15rem;
}

/* Tarjetas */
.help-card {
  background-color: #ffffff;
  border-radius: 0.9rem;
  padding: 0.9rem 1rem;
  box-shadow:
    0 0 0 1px rgba(148, 163, 184, 0.16),
    0 10px 30px rgba(15, 23, 42, 0.04);
  margin-bottom: 0.7rem;
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
  gap: 0.3rem;
}

.help-card-header h3 {
  font-size: 0.9rem;
  font-weight: 600;
  color: #111827;
}

/* Listas */
.help-steps {
  margin-left: 1.1rem;
  margin-top: 0.4rem;
  font-size: 0.78rem;
  color: #4b5563;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.help-list {
  margin-top: 0.4rem;
  margin-left: 0.9rem;
  list-style: disc;
  font-size: 0.78rem;
  color: #4b5563;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.help-text {
  font-size: 0.78rem;
  color: #4b5563;
}

/* FAQ */
.help-faq-list {
  margin-top: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.help-faq-item {
  border-radius: 0.6rem;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  padding: 0.45rem 0.55rem;
}

.help-faq-trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.78rem;
  color: #111827;
  cursor: pointer;
}

.help-faq-body {
  margin-top: 0.35rem;
  font-size: 0.76rem;
  color: #4b5563;
}

.help-faq-body p + p {
  margin-top: 0.15rem;
}

.help-no-results {
  margin-top: 0.4rem;
}

/* Contacto */
.help-contact {
  margin-top: 0.6rem;
  font-size: 0.78rem;
  color: #374151;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
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
