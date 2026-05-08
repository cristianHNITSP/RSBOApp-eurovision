<template>
  <div class="ayuda-view-wrapper">
    <HelpHeader :user="user" :app-version="appVersion" />

    <section class="view-main">
      <HelpSearchBar
        ref="searchBarRef"
        :model-value="search"
        :quick-matches="quickMatches"
        :tab-label-for-section="tabLabelForSection"
        @update:model-value="onSearchInput"
        @clear="clearSearch"
        @go-to="goTo"
      />

      <DynamicTabs v-model="activeTab" :tabs="HELP_TABS">

        <!-- ══ INICIO ══════════════════════════════════════════════════════════ -->
        <template #inicio>
          <div class="help-tab-content">

            <HelpCard id="sec_inicio" icon="home" title="Pantalla de inicio">
              <p class="help-text">
                Al entrar al sistema verás el panel principal con un resumen del día: pedidos pendientes,
                conteos de inventario y accesos rápidos a las secciones más usadas.
              </p>
              <div class="help-steps2">
                <HelpStepCard n="bars" title="Barra lateral (menú)"
                  text="A la izquierda está el menú principal. Puedes colapsarlo con la flecha para tener más espacio de trabajo. En celular aparece con el botón de menú arriba." />
                <HelpStepCard n="search" title="Búsqueda global"
                  text="El ícono de lupa en la barra superior abre una búsqueda rápida para navegar a cualquier sección sin usar el menú." />
                <HelpStepCard n="bell" title="Avisos"
                  text="El ícono de campana muestra un número en rojo cuando hay avisos nuevos. Tócalo para ver el panel de avisos." />
              </div>
            </HelpCard>

            <HelpCard id="sec_notificaciones" icon="bell" title="Avisos en tiempo real">
              <p class="help-text">
                El sistema avisa automáticamente cuando hay pedidos nuevos, correcciones o eventos
                importantes. No necesitas recargar la página.
              </p>
              <div class="help-steps2">
                <HelpStepCard n="bell" title="Número de avisos sin leer"
                  text="El número que aparece junto a la campana indica cuántos avisos no has leído todavía. Toca la campana para verlos." />
                <HelpStepCard n="star" title="Fijar un aviso importante"
                  text="Toca la estrella de un aviso para fijarlo. Los fijados siempre aparecen arriba y no desaparecen aunque los marques como leídos." />
                <HelpStepCard n="check-circle" title="Marcar como leído o descartar"
                  text="La palomita marca el aviso como leído. La X lo descarta (desaparece de tu vista). Ninguna acción lo borra para los demás." />
              </div>
              <HelpNoteBox>
                Los pedidos acumulados se agrupan en <strong>un solo aviso</strong> con el conteo total,
                para que no se llene de avisos repetidos.
              </HelpNoteBox>
            </HelpCard>

          </div>
        </template>

        <!-- ══ PANTALLAS ══════════════════════════════════════════════════════ -->
        <template #pantallas>
          <div class="help-tab-content">
            <HelpViewGuide />
          </div>
        </template>

        <!-- ══ INVENTARIO ══════════════════════════════════════════════════════ -->
        <template #inventario>
          <div class="help-tab-content">
            <HelpCard id="sec_inventario" icon="layer-group" title="Inventario (Bases, Micas, Óptica y Lentes)">
              <p class="help-text">
                En la sección <strong>Inventario</strong> puedes ver y editar las existencias de tus
                productos. Hay tres áreas: Bases y Micas, Óptica y Lentes de Contacto.
              </p>
              <div class="help-steps2">
                <HelpStepCard :n="1" title="Elige la planilla"
                  text="Las pestañas de arriba muestran cada planilla. La pestaña Agregar te permite crear una nueva." />
                <HelpStepCard :n="2" title="Edita una celda"
                  text="Toca o haz clic en cualquier celda del inventario, escribe el número y confirma con Enter. Puedes editar varias celdas antes de guardar." />
                <HelpStepCard :n="3" title="Guarda los cambios"
                  text="Cuando termines, presiona Guardar cambios. Si cierras la página sin guardar, los cambios se perderán." />
              </div>
              <HelpSoftBox icon="file-export" title="Exportar y generar plantilla">
                <strong>Exportar</strong> descarga un archivo de Excel con lo que ves en pantalla.
                <strong>Generar plantilla</strong> crea la estructura vacía de la planilla si todavía
                no tiene datos. Úsalo solo cuando sea una planilla nueva.
              </HelpSoftBox>
              <HelpNoteBox>
                En Bases y Micas puedes cambiar entre <strong>Vista Negativa</strong> y
                <strong>Vista Positiva</strong>. Esto solo cambia lo que ves, no modifica el inventario.
              </HelpNoteBox>
            </HelpCard>
          </div>
        </template>

        <!-- ══ VENTAS & LAB ════════════════════════════════════════════════════ -->
        <template #ventas>
          <div class="help-tab-content">

            <HelpCard id="sec_ventas" icon="shopping-cart" title="Crear un pedido de ventas">
              <p class="help-text">
                Desde <strong>Ventas → Bases y Micas</strong> puedes armar un pedido para enviar
                al laboratorio. El proceso es sencillo:
              </p>
              <div class="help-steps2">
                <HelpStepCard :n="1" title="Selecciona la planilla y busca el producto"
                  text="Elige la planilla del desplegable y usa el buscador para filtrar por graduación o código. Solo se muestran productos con stock disponible." />
                <HelpStepCard :n="2" title="Agrega al carrito"
                  text="Pulsa el botón de cada producto para añadirlo. Puedes ajustar la cantidad con los botones + y − en el carrito." />
                <HelpStepCard :n="3" title="Escribe el nombre del cliente y envía"
                  text="En el campo Cliente escribe el nombre. Opcionalmente agrega una nota. Luego presiona Enviar al laboratorio y confirma." />
                <HelpStepCard :n="4" title="Revisa el comprobante"
                  text="Aparecerá un comprobante con el folio del pedido. En la pestaña Historial puedes ver todos los pedidos enviados y su estado." />
              </div>
              <HelpNoteBox icon="bell">
                Al crear un pedido, el laboratorio recibe automáticamente un aviso.
                No necesitas avisarles por otro medio.
              </HelpNoteBox>
            </HelpCard>

            <HelpCard id="sec_laboratorio" icon="flask" title="Laboratorio (atender pedidos)">
              <p class="help-text">
                La vista de <strong>Laboratorio</strong> es donde se atienden los pedidos que envía
                ventas. El flujo normal es:
              </p>
              <div class="help-actions-grid">
                <div class="help-action">
                  <div class="help-action__title">
                    <b-icon icon="list-ul" size="is-small" class="mr-1" />
                    Ver pedidos pendientes
                  </div>
                  <p class="help-action__text">
                    En la pestaña <strong>Pedidos</strong> verás todos los pedidos con estado
                    <em>Pendiente</em> o <em>En proceso</em>. El número en rojo de la barra lateral muestra cuántos hay.
                  </p>
                </div>
                <div class="help-action">
                  <div class="help-action__title">
                    <b-icon icon="barcode" size="is-small" class="mr-1" />
                    Escanear o marcar producto
                  </div>
                  <p class="help-action__text">
                    Abre un pedido y escanea el código de barras con el lector o escríbelo manualmente.
                    El sistema descuenta del inventario automáticamente.
                  </p>
                </div>
                <div class="help-action">
                  <div class="help-action__title">
                    <b-icon icon="check-circle" size="is-small" class="mr-1" />
                    Cerrar pedido
                  </div>
                  <p class="help-action__text">
                    Cuando hayas surtido todos los productos, presiona <strong>Cerrar pedido</strong>.
                    El estado cambia a <em>Surtido completo</em> y ventas puede verlo.
                  </p>
                </div>
                <div class="help-action">
                  <div class="help-action__title">
                    <b-icon icon="exclamation-circle" size="is-small" class="mr-1" />
                    Enviar corrección
                  </div>
                  <p class="help-action__text">
                    Si hay un problema con un pedido, usa <strong>Solicitar corrección</strong>
                    para notificar al supervisor con los detalles.
                  </p>
                </div>
              </div>
              <HelpSoftBox icon="history" title="Pestaña Bandeja y Catálogo">
                <strong>Bandeja</strong> muestra el historial de todos los eventos registrados
                (escaneos, cierres, etc.). <strong>Catálogo</strong> te permite consultar el
                inventario actual sin salir del laboratorio.
              </HelpSoftBox>
            </HelpCard>

          </div>
        </template>

        <!-- ══ NOMENCLATURAS ══════════════════════════════════════════════════ -->
        <template #nomenclaturas>
          <div class="help-tab-content">
            <HelpNomenclatura />
          </div>
        </template>

        <!-- ══ MI CUENTA ══════════════════════════════════════════════════════ -->
        <template #cuenta>
          <div class="help-tab-content">

            <HelpCard id="sec_config" icon="cog" title="Configuración de tu cuenta">
              <p class="help-text">
                En <strong>Configuración</strong> (ícono de engranaje en el menú) encuentras tres secciones:
              </p>
              <div class="help-actions-grid">
                <div class="help-action">
                  <div class="help-action__title">
                    <b-icon icon="user" size="is-small" class="mr-1" />
                    Mi perfil
                  </div>
                  <p class="help-action__text">
                    Cambia tu nombre, teléfono, descripción y foto de perfil. Presiona
                    <strong>Editar</strong>, ajusta lo que necesites y luego <strong>Guardar perfil</strong>.
                  </p>
                </div>
                <div class="help-action">
                  <div class="help-action__title">
                    <b-icon icon="palette" size="is-small" class="mr-1" />
                    Preferencias
                  </div>
                  <p class="help-action__text">
                    Activa el <strong>modo oscuro</strong>, ajusta el tamaño de texto, reduce animaciones
                    o activa opciones de accesibilidad como alto contraste y fuente legible.
                  </p>
                </div>
                <div class="help-action">
                  <div class="help-action__title">
                    <b-icon icon="user-shield" size="is-small" class="mr-1" />
                    Seguridad — Sesiones activas
                  </div>
                  <p class="help-action__text">
                    Aquí verás todos los dispositivos donde has iniciado sesión (navegador, hora, IP).
                    Puedes cerrar cualquier sesión remota con un solo toque.
                  </p>
                </div>
                <div class="help-action">
                  <div class="help-action__title">
                    <b-icon icon="key" size="is-small" class="mr-1" />
                    Seguridad — Cambiar contraseña
                  </div>
                  <p class="help-action__text">
                    Escribe tu contraseña actual, luego la nueva (mínimo 8 caracteres) y confírmala.
                    Al guardar, todas tus sesiones se cierran y deberás entrar de nuevo.
                  </p>
                </div>
              </div>
            </HelpCard>

            <HelpCard id="sec_usuarios" icon="users" title="Gestión de usuarios">
              <template #badge>
                <b-tag type="is-warning is-light" size="is-small" rounded>Solo supervisores y admins</b-tag>
              </template>
              <div class="help-actions-grid">
                <div class="help-action">
                  <div class="help-action__title">
                    <b-icon icon="user-plus" size="is-small" class="mr-1" />
                    Crear usuario
                  </div>
                  <p class="help-action__text">
                    Pulsa <strong>Nuevo usuario</strong>, completa nombre, correo, rol y contraseña,
                    luego presiona <strong>Crear</strong>.
                  </p>
                </div>
                <div class="help-action">
                  <div class="help-action__title">
                    <b-icon icon="pen" size="is-small" class="mr-1" />
                    Editar datos
                  </div>
                  <p class="help-action__text">
                    Selecciona el usuario en la lista, presiona <strong>Editar</strong>, cambia lo
                    necesario y guarda.
                  </p>
                </div>
                <div class="help-action">
                  <div class="help-action__title">
                    <b-icon icon="key" size="is-small" class="mr-1" />
                    Restablecer contraseña
                  </div>
                  <p class="help-action__text">
                    Selecciona el usuario, entra a la sección <strong>Contraseña</strong>, escribe
                    la nueva y presiona <strong>Actualizar</strong>.
                  </p>
                </div>
                <div class="help-action">
                  <div class="help-action__title">
                    <b-icon icon="trash-alt" size="is-small" class="mr-1" />
                    Papelera y restaurar
                  </div>
                  <p class="help-action__text">
                    Enviar a <strong>Papelera</strong> retira al usuario sin borrarlo definitivamente.
                    En el filtro <em>Papelera</em> puedes <strong>Restaurar</strong> cuando sea necesario.
                  </p>
                </div>
              </div>
              <HelpNoteBox icon="user-shield">
                El <strong>rol</strong> determina qué puede ver y hacer cada persona en el sistema.
                Si alguien no puede acceder a algo, revisa que tenga el rol correcto.
              </HelpNoteBox>
            </HelpCard>

          </div>
        </template>

        <!-- ══ ¿CÓMO FUNCIONA? ════════════════════════════════════════════════ -->
        <template #sistema>
          <div class="help-tab-content">
            <HelpBackendOverview />
          </div>
        </template>

        <!-- ══ REFERENCIA ══════════════════════════════════════════════════════ -->
        <template #referencia>
          <div class="help-tab-content">

            <HelpCard id="sec_atajos" icon="keyboard" title="Atajos de teclado">
              <p class="help-text">En computadora estos atajos aceleran el trabajo:</p>
              <HelpKeyboardShortcuts />
              <HelpNoteBox>En Mac usa <strong>Cmd</strong> en lugar de Ctrl.</HelpNoteBox>
            </HelpCard>

            <HelpCard id="sec_solucion" icon="wrench" title="Solución rápida">
              <div class="help-fixes">
                <HelpFix
                  v-for="fix in QUICK_FIXES"
                  :key="fix.q"
                  :question="fix.q"
                  :answer="fix.a"
                />
              </div>
            </HelpCard>

            <HelpCard id="sec_faq" icon="question-circle" title="Preguntas frecuentes">
              <div class="help-faq-list">
                <template v-for="sec in filteredSections" :key="sec.id">
                  <HelpFAQSection :section="sec" :open-map="openMap" />
                </template>
                <p v-if="!hasAnyResults" class="help-no-results has-text-grey is-size-7">
                  No encontré resultados para <strong>"{{ search }}"</strong>.
                  Prueba: "guardar", "pedido", "aviso", "contraseña", "sesión".
                </p>
              </div>
            </HelpCard>

            <HelpCard id="sec_soporte" icon="headset" title="Soporte" :support="true">
              <p class="help-text">
                Si algo no funciona como se describe aquí, escríbenos. Para ayudarte más rápido incluye:
              </p>
              <ul class="help-list">
                <li>Qué estabas haciendo (pasos cortos: "entré a ventas, elegí una planilla, presioné Enviar y…").</li>
                <li>Nombre del pedido, folio o planilla (si aplica).</li>
                <li>Una captura de pantalla del error (si puedes).</li>
                <li>Hora aproximada en que ocurrió.</li>
              </ul>
              <div class="help-contact">
                <div class="help-contact__chip">
                  <b-icon icon="envelope" size="is-small" class="mr-1" />
                  <span>Correo de soporte</span>
                </div>
                <p class="help-contact__email">soporte.rsbo@icloud.com</p>
              </div>
            </HelpCard>

          </div>
        </template>

      </DynamicTabs>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import './Ayuda.css';

import DynamicTabs from '@/components/DynamicTabs.vue';

import HelpHeader from '@/components/ayuda/HelpHeader.vue';
import HelpSearchBar from '@/components/ayuda/HelpSearchBar.vue';
import HelpCard from '@/components/ayuda/HelpCard.vue';
import HelpStepCard from '@/components/ayuda/HelpStepCard.vue';
import HelpNoteBox from '@/components/ayuda/HelpNoteBox.vue';
import HelpSoftBox from '@/components/ayuda/HelpSoftBox.vue';
import HelpFix from '@/components/ayuda/HelpFix.vue';
import HelpFAQSection from '@/components/ayuda/HelpFAQSection.vue';
import HelpKeyboardShortcuts from '@/components/ayuda/HelpKeyboardShortcuts.vue';
import HelpNomenclatura from '@/components/ayuda/HelpNomenclatura.vue';
import HelpViewGuide from '@/components/ayuda/HelpViewGuide.vue';
import HelpBackendOverview from '@/components/ayuda/HelpBackendOverview.vue';

import { HELP_TABS } from '@/components/ayuda/data/helpTabs.js';
import { FAQ_SECTIONS } from '@/components/ayuda/data/faqs.js';
import { useHelpSearch } from '@/components/ayuda/composables/useHelpSearch.js';
import { useHelpTabs } from '@/components/ayuda/composables/useHelpTabs.js';
import { useHelpScroll } from '@/components/ayuda/composables/useHelpScroll.js';

defineProps({
  user: { type: Object, default: () => null },
  loading: { type: Boolean, default: false },
  appVersion: { type: String, default: '' },
});

const faqSectionsRef = ref(FAQ_SECTIONS);

const {
  search,
  onSearchInput,
  clearSearch,
  quickMatches,
  filteredSections,
  hasAnyResults,
  openMap,
} = useHelpSearch(faqSectionsRef);

const searchBarRef = ref(null);
const focusSearch = () => searchBarRef.value?.focus();

const { activeTab, tabLabelForSection, tabForSection, route, router } = useHelpTabs();

const { goTo } = useHelpScroll({
  activeTab,
  tabForSection,
  focusSearch,
  clearSearch,
  route,
  router,
});

const QUICK_FIXES = [
  { q: 'No se guardaron los cambios del inventario', a: 'Revisa que hayas presionado Guardar cambios. Luego usa Recargar para confirmar que se aplicaron.' },
  { q: 'No veo los avisos aunque hay pedidos', a: 'Cierra y vuelve a abrir el panel de avisos. Si persiste, recarga la página. Los avisos llegan en tiempo real pero necesitas conexión activa.' },
  { q: 'El pedido no aparece en el laboratorio', a: 'En la vista de Laboratorio presiona Actualizar. Los pedidos aparecen en segundos tras ser creados en ventas.' },
  { q: 'No puedo escanear / el código no funciona', a: 'Verifica que el producto tenga código de barras asignado en el inventario. Si no tiene, el pedido no puede surtirse por ese método.' },
  { q: 'El sistema me sacó de sesión solo', a: 'Por seguridad, si dejas el sistema sin uso por mucho tiempo te pide entrar de nuevo. También ocurre si cambiaste tu contraseña o un administrador cerró tu sesión.' },
  { q: 'No veo cierta sección del menú', a: 'Cada sección es visible según tu rol. Si necesitas acceso a algo, pide a un administrador que ajuste tu rol.' },
];
</script>
