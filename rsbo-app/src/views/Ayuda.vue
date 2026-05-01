<template>
  <!-- Encabezado -->
  <div class="view-hero">
    <header class="help-header">

      <div class="help-title-block">
        <span class="help-pill">
          <b-icon :icon="ICONS.help" size="is-small" class="mr-1" />
          Centro de ayuda
        </span>

        <h2>Guía completa del sistema RSBO</h2>
        <p>
          Todo lo que necesitas saber para usar el sistema: inventario, ventas, laboratorio,
          notificaciones y configuración de tu cuenta.
        </p>

        <!-- Tarjetas rápidas -->
        <div class="help-quick">
          <div class="help-quick__card">
            <div class="help-quick__icon">
              <b-icon :icon="ICONS.save" size="is-small" />
            </div>
            <div>
              <p class="help-quick__title">Siempre guarda</p>
              <p class="help-quick__text">
                Si editas el inventario, siempre termina con <strong>Guardar cambios</strong>.
              </p>
            </div>
          </div>

          <div class="help-quick__card">
            <div class="help-quick__icon">
              <b-icon :icon="ICONS.bell" size="is-small" />
            </div>
            <div>
              <p class="help-quick__title">Notificaciones</p>
              <p class="help-quick__text">
                El ícono de campana en la barra lateral te avisa de pedidos y eventos nuevos.
              </p>
            </div>
          </div>

          <div class="help-quick__card">
            <div class="help-quick__icon">
              <b-icon :icon="ICONS.refresh" size="is-small" />
            </div>
            <div>
              <p class="help-quick__title">¿Algo raro?</p>
              <p class="help-quick__text">
                Presiona <strong>Actualizar</strong> o <strong>Recargar</strong> para traer la información más reciente.
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
          Versión: <strong>{{ appVersion }}</strong>
        </p>
      </div>
    </header>
  </div>

  <section class="view-main">
    <!-- Buscador -->

    <div class="help-search">
      <b-field label="Buscar en la ayuda" label-position="on-border" custom-class="help-search-label">
        <b-input ref="searchInputRef" :value="search"
          placeholder='Ej: "guardar", "pedido", "laboratorio", "notificación", "contraseña"...' :icon="ICONS.search"
          size="is-small" @input="onSearchInput" @update:modelValue="onSearchInput" @keyup.esc="clearSearch" />
      </b-field>

      <div v-if="search.trim() && quickMatches.length" class="help-results">
        <div class="help-results__title">
          <b-icon :icon="ICONS.results" size="is-small" class="mr-1" />
          Resultados sugeridos
        </div>
        <div class="help-results__chips">
          <button v-for="m in quickMatches" :key="m.id" class="help-index__chip" type="button" @click="goTo(m.id)">
            <b-icon :icon="m.icon" size="is-small" class="mr-1" />
            {{ m.title }}
            <span class="help-chip-tab-badge">{{ tabLabelForSection(m.id) }}</span>
          </button>
        </div>
      </div>

      <p class="help-search-hint">
        Atajos: <strong>/</strong> enfoca la búsqueda · <strong>Esc</strong> limpia.
      </p>
    </div>

    <!-- Tabs principales -->
    <DynamicTabs v-model="activeTab" :tabs="HELP_TABS">

      <!-- ══ TAB 1: INICIO ════════════════════════════════════════════════════ -->
      <template #inicio>
        <div class="help-tab-content">

          <!-- 1) Pantalla de inicio -->
          <article id="sec_inicio" class="help-card help-anchor">
            <header class="help-card-header">
              <div class="help-card-title-block">
                <b-icon :icon="ICONS.home" size="is-small" class="mr-2" />
                <h3>Pantalla de inicio</h3>
              </div>
            </header>

            <p class="help-text">
              Al entrar al sistema verás el panel principal con un resumen del día: pedidos pendientes,
              conteos de inventario y accesos rápidos a las secciones más usadas.
            </p>

            <div class="help-steps2">
              <div class="help-step2">
                <div class="help-step2__n"><b-icon :icon="ICONS.sidebar" size="is-small" /></div>
                <div class="help-step2__body">
                  <p class="help-step2__title">Barra lateral (menú)</p>
                  <p class="help-step2__text">
                    A la izquierda está el menú principal. Puedes colapsarlo con la flecha para tener
                    más espacio de trabajo. En celular aparece con el botón de menú arriba.
                  </p>
                </div>
              </div>
              <div class="help-step2">
                <div class="help-step2__n"><b-icon :icon="ICONS.search" size="is-small" /></div>
                <div class="help-step2__body">
                  <p class="help-step2__title">Búsqueda global</p>
                  <p class="help-step2__text">
                    El ícono de lupa en la barra superior abre una búsqueda rápida para navegar a
                    cualquier sección sin usar el menú.
                  </p>
                </div>
              </div>
              <div class="help-step2">
                <div class="help-step2__n"><b-icon :icon="ICONS.bell" size="is-small" /></div>
                <div class="help-step2__body">
                  <p class="help-step2__title">Notificaciones</p>
                  <p class="help-step2__text">
                    El ícono de campana muestra un número en rojo cuando hay avisos nuevos.
                    Tócalo para ver el panel de notificaciones.
                  </p>
                </div>
              </div>
            </div>
          </article>

          <!-- Notificaciones en tiempo real -->
          <article id="sec_notificaciones" class="help-card help-anchor">
            <header class="help-card-header">
              <div class="help-card-title-block">
                <b-icon :icon="ICONS.bell" size="is-small" class="mr-2" />
                <h3>Notificaciones en tiempo real</h3>
              </div>
            </header>

            <p class="help-text">
              El sistema avisa automáticamente cuando hay pedidos nuevos, correcciones o eventos
              importantes. No necesitas recargar la página.
            </p>

            <div class="help-steps2">
              <div class="help-step2">
                <div class="help-step2__n"><b-icon :icon="ICONS.bell" size="is-small" /></div>
                <div class="help-step2__body">
                  <p class="help-step2__title">Número de avisos sin leer</p>
                  <p class="help-step2__text">
                    El número que aparece junto a la campana indica cuántas notificaciones
                    no has leído todavía. Toca la campana para verlas.
                  </p>
                </div>
              </div>
              <div class="help-step2">
                <div class="help-step2__n"><b-icon :icon="ICONS.pin" size="is-small" /></div>
                <div class="help-step2__body">
                  <p class="help-step2__title">Fijar una notificación importante</p>
                  <p class="help-step2__text">
                    Toca la estrella de una notificación para fijarla. Las fijadas siempre
                    aparecen arriba y no desaparecen aunque las marques como leídas.
                  </p>
                </div>
              </div>
              <div class="help-step2">
                <div class="help-step2__n"><b-icon :icon="ICONS.check" size="is-small" /></div>
                <div class="help-step2__body">
                  <p class="help-step2__title">Marcar como leída o descartar</p>
                  <p class="help-step2__text">
                    El palomita marca la notificación como leída. La <strong>X</strong> la descarta
                    (desaparece de tu vista). Ninguna acción borra la notificación para los demás.
                  </p>
                </div>
              </div>
            </div>

            <div class="help-note">
              <b-icon :icon="ICONS.info" size="is-small" class="mr-1" />
              <span>
                Los pedidos acumulados se agrupan en <strong>una sola notificación</strong> con el
                conteo total, para que no se llene de avisos repetidos.
              </span>
            </div>
          </article>

        </div>
      </template>

      <!-- ══ TAB 2: INVENTARIO ════════════════════════════════════════════════ -->
      <template #inventario>
        <div class="help-tab-content">

          <article id="sec_inventario" class="help-card help-anchor">
            <header class="help-card-header">
              <div class="help-card-title-block">
                <b-icon :icon="ICONS.inventory" size="is-small" class="mr-2" />
                <h3>Inventario (Bases, Micas, Óptica y Lentes)</h3>
              </div>
            </header>

            <p class="help-text">
              En la sección <strong>Inventario</strong> puedes ver y editar las existencias de tus
              productos. Hay tres áreas: Bases y Micas, Óptica y Lentes de Contacto.
            </p>

            <div class="help-steps2">
              <div class="help-step2">
                <div class="help-step2__n">1</div>
                <div class="help-step2__body">
                  <p class="help-step2__title">Elige la planilla</p>
                  <p class="help-step2__text">
                    Las pestañas de arriba muestran cada planilla. La pestaña <strong>Agregar</strong>
                    te permite crear una nueva planilla.
                  </p>
                </div>
              </div>
              <div class="help-step2">
                <div class="help-step2__n">2</div>
                <div class="help-step2__body">
                  <p class="help-step2__title">Edita una celda</p>
                  <p class="help-step2__text">
                    Toca o haz clic en cualquier celda del inventario, escribe el número y
                    confirma con <strong>Enter</strong>. Puedes editar varias celdas antes de guardar.
                  </p>
                </div>
              </div>
              <div class="help-step2">
                <div class="help-step2__n">3</div>
                <div class="help-step2__body">
                  <p class="help-step2__title">Guarda los cambios</p>
                  <p class="help-step2__text">
                    Cuando termines, presiona <strong>Guardar cambios</strong>. Si cierras la página
                    sin guardar, los cambios se perderán.
                  </p>
                </div>
              </div>
            </div>

            <div class="help-soft">
              <div class="help-soft__title">
                <b-icon :icon="ICONS.export" size="is-small" class="mr-1" />
                Exportar y generar plantilla
              </div>
              <p class="help-soft__text">
                <strong>Exportar</strong> descarga un archivo de Excel con lo que ves en pantalla.
                <strong>Generar plantilla</strong> crea la estructura vacía de la planilla si todavía
                no tiene datos. Úsalo solo cuando sea una planilla nueva.
              </p>
            </div>

            <div class="help-note">
              <b-icon :icon="ICONS.info" size="is-small" class="mr-1" />
              <span>
                En Bases y Micas puedes cambiar entre <strong>Vista Negativa</strong> y
                <strong>Vista Positiva</strong>. Esto solo cambia lo que ves, no modifica el inventario.
              </span>
            </div>
          </article>

        </div>
      </template>

      <!-- ══ TAB 3: VENTAS & LABORATORIO ═════════════════════════════════════ -->
      <template #ventas>
        <div class="help-tab-content">

          <!-- Ventas -->
          <article id="sec_ventas" class="help-card help-anchor">
            <header class="help-card-header">
              <div class="help-card-title-block">
                <b-icon :icon="ICONS.cart" size="is-small" class="mr-2" />
                <h3>Crear un pedido de ventas</h3>
              </div>
            </header>

            <p class="help-text">
              Desde <strong>Ventas → Bases y Micas</strong> puedes armar un pedido para enviar
              al laboratorio. El proceso es sencillo:
            </p>

            <div class="help-steps2">
              <div class="help-step2">
                <div class="help-step2__n">1</div>
                <div class="help-step2__body">
                  <p class="help-step2__title">Selecciona la planilla y busca el producto</p>
                  <p class="help-step2__text">
                    Elige la planilla del desplegable y usa el buscador para filtrar por graduación
                    o código. Solo se muestran productos con stock disponible.
                  </p>
                </div>
              </div>
              <div class="help-step2">
                <div class="help-step2__n">2</div>
                <div class="help-step2__body">
                  <p class="help-step2__title">Agrega al carrito</p>
                  <p class="help-step2__text">
                    Pulsa el botón de cada producto para añadirlo. Puedes ajustar la cantidad
                    con los botones <strong>+</strong> y <strong>−</strong> en el carrito.
                  </p>
                </div>
              </div>
              <div class="help-step2">
                <div class="help-step2__n">3</div>
                <div class="help-step2__body">
                  <p class="help-step2__title">Escribe el nombre del cliente y envía</p>
                  <p class="help-step2__text">
                    En el campo <strong>Cliente</strong> escribe el nombre. Opcionalmente agrega
                    una nota. Luego presiona <strong>Enviar al laboratorio</strong> y confirma.
                  </p>
                </div>
              </div>
              <div class="help-step2">
                <div class="help-step2__n">4</div>
                <div class="help-step2__body">
                  <p class="help-step2__title">Revisa el comprobante</p>
                  <p class="help-step2__text">
                    Aparecerá un comprobante con el folio del pedido. En la pestaña
                    <strong>Historial</strong> puedes ver todos los pedidos enviados y su estado.
                  </p>
                </div>
              </div>
            </div>

            <div class="help-note">
              <b-icon :icon="ICONS.bell" size="is-small" class="mr-1" />
              <span>
                Al crear un pedido, el laboratorio recibe automáticamente una notificación. No
                necesitas avisarles por otro medio.
              </span>
            </div>
          </article>

          <!-- Laboratorio -->
          <article id="sec_laboratorio" class="help-card help-anchor">
            <header class="help-card-header">
              <div class="help-card-title-block">
                <b-icon :icon="ICONS.lab" size="is-small" class="mr-2" />
                <h3>Laboratorio (atender pedidos)</h3>
              </div>
            </header>

            <p class="help-text">
              La vista de <strong>Laboratorio</strong> es donde se atienden los pedidos que envía
              ventas. El flujo normal es:
            </p>

            <div class="help-actions-grid">
              <div class="help-action">
                <div class="help-action__title">
                  <b-icon :icon="ICONS.list" size="is-small" class="mr-1" />
                  Ver pedidos pendientes
                </div>
                <p class="help-action__text">
                  En la pestaña <strong>Pedidos</strong> verás todos los pedidos con estado
                  <em>Pendiente</em> o <em>En proceso</em>. El número en rojo de la barra lateral
                  muestra cuántos hay.
                </p>
              </div>

              <div class="help-action">
                <div class="help-action__title">
                  <b-icon :icon="ICONS.scan" size="is-small" class="mr-1" />
                  Escanear o marcar producto
                </div>
                <p class="help-action__text">
                  Abre un pedido y escanea el código de barras de cada producto con el lector
                  o escríbelo manualmente. El sistema descuenta del inventario automáticamente.
                </p>
              </div>

              <div class="help-action">
                <div class="help-action__title">
                  <b-icon :icon="ICONS.check" size="is-small" class="mr-1" />
                  Cerrar pedido
                </div>
                <p class="help-action__text">
                  Cuando hayas surtido todos los productos, presiona <strong>Cerrar pedido</strong>.
                  El estado cambia a <em>Surtido completo</em> y ventas puede verlo.
                </p>
              </div>

              <div class="help-action">
                <div class="help-action__title">
                  <b-icon :icon="ICONS.correction" size="is-small" class="mr-1" />
                  Enviar corrección
                </div>
                <p class="help-action__text">
                  Si hay un problema con un pedido, usa <strong>Solicitar corrección</strong>
                  para notificar al supervisor con los detalles. Solo el supervisor recibirá esa
                  notificación.
                </p>
              </div>
            </div>

            <div class="help-soft">
              <div class="help-soft__title">
                <b-icon :icon="ICONS.history" size="is-small" class="mr-1" />
                Pestaña Bandeja y Catálogo
              </div>
              <p class="help-soft__text">
                <strong>Bandeja</strong> muestra el historial de todos los eventos registrados
                (escaneos, cierres, etc.). <strong>Catálogo</strong> te permite consultar el
                inventario actual sin salir del laboratorio.
              </p>
            </div>
          </article>

        </div>
      </template>

      <!-- ══ TAB 4: NOMENCLATURAS ══════════════════════════════════════════════ -->
      <template #nomenclaturas>
        <div class="help-tab-content">

          <!-- SKU -->
          <article id="sec_sku" class="help-card help-anchor">
            <header class="help-card-header">
              <div class="help-card-title-block">
                <b-icon :icon="ICONS.tags" size="is-small" class="mr-2" />
                <h3>SKU (Código de planilla)</h3>
              </div>
              <b-tag type="is-primary is-light" size="is-small" rounded>Inventario</b-tag>
            </header>

            <p class="help-text">
              El <strong>SKU</strong> es un código único que identifica cada planilla de inventario. Se genera
              automáticamente al crear una planilla y resume sus características principales.
            </p>

            <div class="nomenclatura-example">
              <div class="nomenclatura-example__code">JAP-TAI-BAS-POL-MON-BLN-A5F2</div>
              <div class="nomenclatura-example__label">Ejemplo de SKU</div>
            </div>

            <div class="nomenclatura-breakdown">
              <div class="nomenclatura-segment">
                <span class="nomenclatura-segment__part">JAP</span>
                <span class="nomenclatura-segment__desc">Proveedor (abreviatura, 3 letras)</span>
              </div>
              <span class="nomenclatura-sep">—</span>
              <div class="nomenclatura-segment">
                <span class="nomenclatura-segment__part">TAI</span>
                <span class="nomenclatura-segment__desc">Marca (abreviatura, 3 letras)</span>
              </div>
              <span class="nomenclatura-sep">—</span>
              <div class="nomenclatura-segment">
                <span class="nomenclatura-segment__part">BAS</span>
                <span class="nomenclatura-segment__desc">Tipo de matriz (ver sección Matrices)</span>
              </div>
              <span class="nomenclatura-sep">—</span>
              <div class="nomenclatura-segment">
                <span class="nomenclatura-segment__part">POL</span>
                <span class="nomenclatura-segment__desc">Material (POL = Policarbonato, CR3 = CR-39)</span>
              </div>
              <span class="nomenclatura-sep">—</span>
              <div class="nomenclatura-segment">
                <span class="nomenclatura-segment__part">MON</span>
                <span class="nomenclatura-segment__desc">Base / clave de la planilla</span>
              </div>
              <span class="nomenclatura-sep">—</span>
              <div class="nomenclatura-segment">
                <span class="nomenclatura-segment__part">BLN</span>
                <span class="nomenclatura-segment__desc">Tratamiento (BLN = Blanco, AR = Antirreflejante)</span>
              </div>
              <span class="nomenclatura-sep">—</span>
              <div class="nomenclatura-segment">
                <span class="nomenclatura-segment__part">A5F2</span>
                <span class="nomenclatura-segment__desc">Código aleatorio (evita duplicados)</span>
              </div>
            </div>

            <div class="help-note">
              <b-icon :icon="ICONS.info" size="is-small" class="mr-1" />
              <span>
                Las abreviaturas de proveedor y marca se generan tomando las primeras letras de cada
                palabra. Si el nombre tiene varias palabras, se toma la primera letra de cada una.
              </span>
            </div>
          </article>

          <!-- Folios -->
          <article id="sec_folios" class="help-card help-anchor">
            <header class="help-card-header">
              <div class="help-card-title-block">
                <b-icon :icon="ICONS.hashtag" size="is-small" class="mr-2" />
                <h3>Folios (Pedidos y Devoluciones)</h3>
              </div>
            </header>

            <p class="help-text">
              Cada pedido de laboratorio y cada devolución recibe un <strong>folio</strong> único que sirve
              como referencia para rastrear el documento en todo el sistema.
            </p>

            <div class="nomenclatura-duo">
              <div class="nomenclatura-duo__block">
                <div class="nomenclatura-example">
                  <div class="nomenclatura-example__code">LAB-20250328-A5F2</div>
                  <div class="nomenclatura-example__label">Folio de laboratorio</div>
                </div>
                <div class="nomenclatura-breakdown nomenclatura-breakdown--compact">
                  <div class="nomenclatura-segment">
                    <span class="nomenclatura-segment__part">LAB</span>
                    <span class="nomenclatura-segment__desc">Prefijo fijo: pedido de laboratorio</span>
                  </div>
                  <div class="nomenclatura-segment">
                    <span class="nomenclatura-segment__part">20250328</span>
                    <span class="nomenclatura-segment__desc">Fecha: AAAA MM DD (28 marzo 2025)</span>
                  </div>
                  <div class="nomenclatura-segment">
                    <span class="nomenclatura-segment__part">A5F2</span>
                    <span class="nomenclatura-segment__desc">4 caracteres hexadecimales aleatorios</span>
                  </div>
                </div>
              </div>

              <div class="nomenclatura-duo__block">
                <div class="nomenclatura-example">
                  <div class="nomenclatura-example__code">DEV-2025-00001</div>
                  <div class="nomenclatura-example__label">Folio de devolución</div>
                </div>
                <div class="nomenclatura-breakdown nomenclatura-breakdown--compact">
                  <div class="nomenclatura-segment">
                    <span class="nomenclatura-segment__part">DEV</span>
                    <span class="nomenclatura-segment__desc">Prefijo fijo: devolución</span>
                  </div>
                  <div class="nomenclatura-segment">
                    <span class="nomenclatura-segment__part">2025</span>
                    <span class="nomenclatura-segment__desc">Año en curso</span>
                  </div>
                  <div class="nomenclatura-segment">
                    <span class="nomenclatura-segment__part">00001</span>
                    <span class="nomenclatura-segment__desc">Consecutivo (5 dígitos, se reinicia cada año)</span>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <!-- Código de barras -->
          <article id="sec_codebar" class="help-card help-anchor">
            <header class="help-card-header">
              <div class="help-card-title-block">
                <b-icon icon="barcode" size="is-small" class="mr-2" />
                <h3>Código de barras (EAN-13)</h3>
              </div>
              <b-tag type="is-info is-light" size="is-small" rounded>13 dígitos</b-tag>
            </header>

            <p class="help-text">
              Cada producto en el inventario tiene un código de barras en formato <strong>EAN-13</strong>
              (estándar internacional de 13 dígitos). Se genera automáticamente a partir de la planilla
              y las coordenadas ópticas del producto.
            </p>

            <div class="nomenclatura-example">
              <div class="nomenclatura-example__code">2 7 9 0 1 2 3 4 5 6 7 8 9</div>
              <div class="nomenclatura-example__label">Ejemplo de código EAN-13</div>
            </div>

            <div class="nomenclatura-breakdown nomenclatura-breakdown--compact">
              <div class="nomenclatura-segment">
                <span class="nomenclatura-segment__part">279</span>
                <span class="nomenclatura-segment__desc">Prefijo interno fijo (identifica que es un producto
                  RSBO)</span>
              </div>
              <div class="nomenclatura-segment">
                <span class="nomenclatura-segment__part">012345678</span>
                <span class="nomenclatura-segment__desc">9 dígitos generados a partir del ID de planilla + tipo de
                  matriz + coordenadas ópticas</span>
              </div>
              <div class="nomenclatura-segment">
                <span class="nomenclatura-segment__part">9</span>
                <span class="nomenclatura-segment__desc">Dígito de control (verificación EAN-13)</span>
              </div>
            </div>

            <div class="help-note">
              <b-icon :icon="ICONS.info" size="is-small" class="mr-1" />
              <span>
                El código de barras se usa para <strong>escanear productos</strong> en el laboratorio.
                Si un producto no tiene código asignado, no puede incluirse en un pedido.
              </span>
            </div>
          </article>

          <!-- Tipos de matriz -->
          <article id="sec_matrices" class="help-card help-anchor">
            <header class="help-card-header">
              <div class="help-card-title-block">
                <b-icon :icon="ICONS.glasses" size="is-small" class="mr-2" />
                <h3>Tipos de matriz (tipo de lente)</h3>
              </div>
            </header>

            <p class="help-text">
              Cada planilla tiene un <strong>tipo de matriz</strong> que determina qué coordenadas ópticas
              maneja y cómo se organiza la grilla de inventario.
            </p>

            <div class="nomenclatura-table">
              <div class="nomenclatura-table__row nomenclatura-table__row--head">
                <span>Clave</span>
                <span>Tipo de lente</span>
                <span>Coordenadas</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">BASE</span>
                <span>Monofocal (base)</span>
                <span class="mono">base</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">SPH_CYL</span>
                <span>Monofocal esf. + cil.</span>
                <span class="mono">sph, cyl</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">SPH_ADD</span>
                <span>Bifocal</span>
                <span class="mono">sph, add, base_izq, base_der, eye</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">BASE_ADD</span>
                <span>Progresivo</span>
                <span class="mono">base_izq, base_der, add, eye</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">SPH_CYL_AXIS</span>
                <span>Lente de contacto tórico</span>
                <span class="mono">sph, cyl, axis</span>
              </div>
            </div>

            <div class="help-soft">
              <div class="help-soft__title">
                <b-icon :icon="ICONS.eye" size="is-small" class="mr-1" />
                Designación de ojo
              </div>
              <p class="help-soft__text">
                En bifocales y progresivos, cada producto especifica el ojo:
                <strong>OD</strong> = Ojo Derecho, <strong>OI</strong> = Ojo Izquierdo.
                Las matrices tipo BASE y SPH_CYL no distinguen ojo.
              </p>
            </div>
          </article>

          <!-- Tratamientos -->
          <article id="sec_tratamientos" class="help-card help-anchor">
            <header class="help-card-header">
              <div class="help-card-title-block">
                <b-icon :icon="ICONS.palette2" size="is-small" class="mr-2" />
                <h3>Claves de tratamiento</h3>
              </div>
            </header>

            <p class="help-text">
              Los tratamientos de lente se identifican con claves cortas que aparecen en el SKU y en los
              filtros del catálogo.
            </p>

            <div class="nomenclatura-table">
              <div class="nomenclatura-table__row nomenclatura-table__row--head">
                <span>Clave</span>
                <span>Tratamiento</span>
                <span>Notas</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">BCO</span>
                <span>Blanco (sin tratamiento)</span>
                <span class="muted">Todos los materiales</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">AR</span>
                <span>Antirreflejante</span>
                <span class="muted">Todos excepto cristal</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">ANTIBLE</span>
                <span>Anti luz azul</span>
                <span class="muted">Con o sin AR</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">FOTO</span>
                <span>Fotocromático</span>
                <span class="muted">Con o sin AR</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">FOTO_ANTIBLE</span>
                <span>Fotocromático + Anti luz azul</span>
                <span class="muted">Con o sin AR</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">TRANSITIONS</span>
                <span>Transitions (fotocromático marca)</span>
                <span class="muted">Variantes: Gris, Café, Verde</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">POLAR</span>
                <span>Polarizado</span>
                <span class="muted">Solo monofocal. Colores: Gris, Café, G15</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">POLAR_ESPEJO</span>
                <span>Polarizado + Espejado</span>
                <span class="muted">Solo monofocal. 15 combinaciones de color</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">CRISTAL_FOTO</span>
                <span>Fotocromático (cristal)</span>
                <span class="muted">Solo material Cristal</span>
              </div>
            </div>
          </article>

          <!-- Estados -->
          <article id="sec_estados" class="help-card help-anchor">
            <header class="help-card-header">
              <div class="help-card-title-block">
                <b-icon :icon="ICONS.list" size="is-small" class="mr-2" />
                <h3>Estados del sistema</h3>
              </div>
            </header>

            <p class="help-text">
              Los pedidos y devoluciones pasan por diferentes estados. Aquí tienes lo que significa cada uno.
            </p>

            <div class="nomenclatura-duo">
              <div class="nomenclatura-duo__block">
                <p class="help-text"><strong>Pedidos de laboratorio</strong></p>
                <div class="nomenclatura-status-list">
                  <div class="nomenclatura-status">
                    <span class="nomenclatura-status__dot nomenclatura-status__dot--pendiente"></span>
                    <span><strong>pendiente</strong> — Pedido creado, sin atender</span>
                  </div>
                  <div class="nomenclatura-status">
                    <span class="nomenclatura-status__dot nomenclatura-status__dot--parcial"></span>
                    <span><strong>parcial</strong> — Algunos productos ya fueron surtidos</span>
                  </div>
                  <div class="nomenclatura-status">
                    <span class="nomenclatura-status__dot nomenclatura-status__dot--cerrado"></span>
                    <span><strong>cerrado</strong> — Todos los productos surtidos</span>
                  </div>
                  <div class="nomenclatura-status">
                    <span class="nomenclatura-status__dot nomenclatura-status__dot--cancelado"></span>
                    <span><strong>cancelado</strong> — Pedido cancelado (stock devuelto)</span>
                  </div>
                </div>
              </div>

              <div class="nomenclatura-duo__block">
                <p class="help-text"><strong>Devoluciones</strong></p>
                <div class="nomenclatura-status-list">
                  <div class="nomenclatura-status">
                    <span class="nomenclatura-status__dot nomenclatura-status__dot--pendiente"></span>
                    <span><strong>pendiente</strong> — Devolución registrada</span>
                  </div>
                  <div class="nomenclatura-status">
                    <span class="nomenclatura-status__dot nomenclatura-status__dot--parcial"></span>
                    <span><strong>en_revision</strong> — En revisión</span>
                  </div>
                  <div class="nomenclatura-status">
                    <span class="nomenclatura-status__dot nomenclatura-status__dot--cerrado"></span>
                    <span><strong>aprobada</strong> / <strong>procesada</strong> — Aceptada y procesada</span>
                  </div>
                  <div class="nomenclatura-status">
                    <span class="nomenclatura-status__dot nomenclatura-status__dot--cancelado"></span>
                    <span><strong>rechazada</strong> — Devolución rechazada</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="help-soft">
              <div class="help-soft__title">
                <b-icon :icon="ICONS.info" size="is-small" class="mr-1" />
                Condición de artículo devuelto
              </div>
              <p class="help-soft__text">
                Al registrar una devolución, cada artículo se clasifica como:
                <strong>bueno</strong> (reutilizable),
                <strong>dañado</strong> o
                <strong>defectuoso</strong>.
              </p>
            </div>
          </article>

          <!-- Coordenadas ópticas -->
          <article id="sec_coordenadas" class="help-card help-anchor">
            <header class="help-card-header">
              <div class="help-card-title-block">
                <b-icon :icon="ICONS.ruler" size="is-small" class="mr-2" />
                <h3>Coordenadas ópticas y materiales</h3>
              </div>
            </header>

            <p class="help-text">
              Los valores ópticos de cada producto se representan con abreviaturas estándar de optometría.
            </p>

            <div class="nomenclatura-table">
              <div class="nomenclatura-table__row nomenclatura-table__row--head">
                <span>Abreviatura</span>
                <span>Significado</span>
                <span>Rango típico</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">SPH</span>
                <span>Esfera (poder esférico)</span>
                <span class="mono">-20.00 a +20.00</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">CYL</span>
                <span>Cilindro (astigmatismo)</span>
                <span class="mono">-6.00 a 0.00</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">ADD</span>
                <span>Adición (para lectura)</span>
                <span class="mono">+0.50 a +4.00</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">BASE</span>
                <span>Curva base del lente</span>
                <span class="mono">0.00 a 10.00</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">AXIS</span>
                <span>Eje del cilindro (grados)</span>
                <span class="mono">0 a 180</span>
              </div>
              <div class="nomenclatura-table__row">
                <span class="nomenclatura-segment__part">BI / BD</span>
                <span>Base izquierda / Base derecha</span>
                <span class="mono">Bifocales y progresivos</span>
              </div>
            </div>

            <div class="help-soft">
              <div class="help-soft__title">
                <b-icon :icon="ICONS.glasses" size="is-small" class="mr-1" />
                Materiales disponibles
              </div>
              <p class="help-soft__text">
                <strong>CR-39</strong> (plástico estándar) ·
                <strong>Policarbonato</strong> ·
                <strong>1.56</strong> ·
                <strong>1.61 MR-8</strong> ·
                <strong>1.67</strong> ·
                <strong>1.74</strong> (ultra delgado) ·
                <strong>Cristal</strong> (vidrio).
                El índice de refracción más alto = lente más delgado.
              </p>
            </div>
            
            <!-- 
            <div class="help-note">
              <b-icon :icon="ICONS.info" size="is-small" class="mr-1" />
              <span>
                En el sistema, los valores negativos se representan internamente con <strong>m</strong>
                (ej: <code>m1d50</code> = -1.50) y el punto decimal con <strong>d</strong>
                (ej: <code>2d50</code> = 2.50). Esto es solo interno; en pantalla siempre se muestra el
                formato normal con signo y punto decimal.
              </span>
            </div>           
            -->
          </article>

        </div>
      </template>

      <!-- ══ TAB 5: MI CUENTA ══════════════════════════════════════════════════ -->
      <template #cuenta>
        <div class="help-tab-content">

          <!-- Configuración -->
          <article id="sec_config" class="help-card help-anchor">
            <header class="help-card-header">
              <div class="help-card-title-block">
                <b-icon :icon="ICONS.config" size="is-small" class="mr-2" />
                <h3>Configuración de tu cuenta</h3>
              </div>
            </header>

            <p class="help-text">
              En <strong>Configuración</strong> (ícono de engranaje en el menú) encuentras tres secciones:
            </p>

            <div class="help-actions-grid">
              <div class="help-action">
                <div class="help-action__title">
                  <b-icon :icon="ICONS.user" size="is-small" class="mr-1" />
                  Mi perfil
                </div>
                <p class="help-action__text">
                  Cambia tu nombre, teléfono, descripción y foto de perfil. Presiona
                  <strong>Editar</strong>, ajusta lo que necesites y luego <strong>Guardar perfil</strong>.
                </p>
              </div>

              <div class="help-action">
                <div class="help-action__title">
                  <b-icon :icon="ICONS.palette" size="is-small" class="mr-1" />
                  Preferencias
                </div>
                <p class="help-action__text">
                  Activa el <strong>modo oscuro</strong>, ajusta el tamaño de texto, reduce animaciones
                  o activa opciones de accesibilidad como alto contraste y fuente legible.
                </p>
              </div>

              <div class="help-action">
                <div class="help-action__title">
                  <b-icon :icon="ICONS.shield" size="is-small" class="mr-1" />
                  Seguridad — Sesiones activas
                </div>
                <p class="help-action__text">
                  Aquí verás todos los dispositivos donde has iniciado sesión (navegador, hora, IP).
                  Puedes cerrar cualquier sesión remota con un solo toque.
                </p>
              </div>

              <div class="help-action">
                <div class="help-action__title">
                  <b-icon :icon="ICONS.key" size="is-small" class="mr-1" />
                  Seguridad — Cambiar contraseña
                </div>
                <p class="help-action__text">
                  Escribe tu contraseña actual, luego la nueva (mínimo 8 caracteres) y confírmala.
                  Al guardar, todas tus sesiones se cierran y deberás entrar de nuevo.
                </p>
              </div>
            </div>
          </article>

          <!-- Usuarios -->
          <article id="sec_usuarios" class="help-card help-anchor">
            <header class="help-card-header">
              <div class="help-card-title-block">
                <b-icon :icon="ICONS.users" size="is-small" class="mr-2" />
                <h3>Gestión de usuarios</h3>
              </div>
              <b-tag type="is-warning is-light" size="is-small" rounded>Solo supervisores y admins</b-tag>
            </header>

            <div class="help-actions-grid">
              <div class="help-action">
                <div class="help-action__title">
                  <b-icon :icon="ICONS.userPlus" size="is-small" class="mr-1" />
                  Crear usuario
                </div>
                <p class="help-action__text">
                  Pulsa <strong>Nuevo usuario</strong>, completa nombre, correo, rol y contraseña,
                  luego presiona <strong>Crear</strong>.
                </p>
              </div>

              <div class="help-action">
                <div class="help-action__title">
                  <b-icon :icon="ICONS.edit" size="is-small" class="mr-1" />
                  Editar datos
                </div>
                <p class="help-action__text">
                  Selecciona el usuario en la lista, presiona <strong>Editar</strong>, cambia lo
                  necesario y guarda.
                </p>
              </div>

              <div class="help-action">
                <div class="help-action__title">
                  <b-icon :icon="ICONS.key" size="is-small" class="mr-1" />
                  Restablecer contraseña
                </div>
                <p class="help-action__text">
                  Selecciona el usuario, entra a la sección <strong>Contraseña</strong>, escribe
                  la nueva y presiona <strong>Actualizar</strong>.
                </p>
              </div>

              <div class="help-action">
                <div class="help-action__title">
                  <b-icon :icon="ICONS.trash" size="is-small" class="mr-1" />
                  Papelera y restaurar
                </div>
                <p class="help-action__text">
                  Enviar a <strong>Papelera</strong> retira al usuario sin borrarlo definitivamente.
                  En el filtro <em>Papelera</em> puedes <strong>Restaurar</strong> cuando sea necesario.
                </p>
              </div>
            </div>

            <div class="help-note">
              <b-icon :icon="ICONS.shield" size="is-small" class="mr-1" />
              <span>
                El <strong>rol</strong> determina qué puede ver y hacer cada persona en el sistema.
                Si alguien no puede acceder a algo, revisa que tenga el rol correcto.
              </span>
            </div>
          </article>

        </div>
      </template>

      <!-- ══ TAB 6: REFERENCIA RÁPIDA ════════════════════════════════════════ -->
      <template #referencia>
        <div class="help-tab-content">

          <!-- Atajos de teclado -->
          <article id="sec_atajos" class="help-card help-anchor">
            <header class="help-card-header">
              <div class="help-card-title-block">
                <b-icon :icon="ICONS.keyboard" size="is-small" class="mr-2" />
                <h3>Atajos de teclado</h3>
              </div>
            </header>

            <p class="help-text">En computadora estos atajos aceleran el trabajo:</p>

            <div class="help-split">
              <div class="help-split__block">
                <p class="help-text"><strong>En el inventario</strong></p>
                <ul class="help-list">
                  <li><strong>Ctrl + S</strong> — guardar cambios de la planilla</li>
                  <li><strong>Ctrl + Z</strong> — deshacer última edición</li>
                  <li><strong>Ctrl + Y</strong> — rehacer</li>
                  <li><strong>Enter</strong> — confirmar valor en celda</li>
                  <li><strong>Esc</strong> — cancelar edición de celda</li>
                  <li><strong>Ctrl + C / V</strong> — copiar / pegar</li>
                </ul>
              </div>
              <div class="help-split__block">
                <p class="help-text"><strong>Navegación general</strong></p>
                <ul class="help-list">
                  <li><strong>/</strong> — enfocar búsqueda en esta página</li>
                  <li><strong>Esc</strong> — cerrar paneles y modales</li>
                </ul>
                <p class="help-text mt-3"><strong>En la búsqueda global</strong></p>
                <ul class="help-list">
                  <li>Escribe el nombre de cualquier sección para navegar rápido</li>
                </ul>
              </div>
            </div>

            <div class="help-note">
              <b-icon :icon="ICONS.info" size="is-small" class="mr-1" />
              <span>En Mac usa <strong>Cmd</strong> en lugar de Ctrl.</span>
            </div>
          </article>

          <!-- Solución rápida -->
          <article id="sec_solucion" class="help-card help-anchor">
            <header class="help-card-header">
              <div class="help-card-title-block">
                <b-icon :icon="ICONS.wrench" size="is-small" class="mr-2" />
                <h3>Solución rápida</h3>
              </div>
            </header>

            <div class="help-fixes">
              <div class="help-fix">
                <div class="help-fix__q">No se guardaron los cambios del inventario</div>
                <div class="help-fix__a">
                  Revisa que hayas presionado <strong>Guardar cambios</strong>. Luego usa
                  <strong>Recargar</strong> para confirmar que se aplicaron.
                </div>
              </div>

              <div class="help-fix">
                <div class="help-fix__q">No veo las notificaciones aunque hay pedidos</div>
                <div class="help-fix__a">
                  Cierra y vuelve a abrir el panel de notificaciones. Si persiste, recarga la
                  página. Las notificaciones llegan en tiempo real pero necesitas conexión activa.
                </div>
              </div>

              <div class="help-fix">
                <div class="help-fix__q">El pedido no aparece en el laboratorio</div>
                <div class="help-fix__a">
                  En la vista de Laboratorio presiona <strong>Actualizar</strong>. Los pedidos
                  aparecen en segundos tras ser creados en ventas.
                </div>
              </div>

              <div class="help-fix">
                <div class="help-fix__q">No puedo escanear / el código no funciona</div>
                <div class="help-fix__a">
                  Verifica que el producto tenga código de barras asignado en el inventario.
                  Si no tiene, el pedido no puede surtirse por ese método.
                </div>
              </div>

              <div class="help-fix">
                <div class="help-fix__q">El sistema me sacó de sesión solo</div>
                <div class="help-fix__a">
                  La sesión dura 8 horas. Si cambiaste tu contraseña o un administrador cerró
                  tu sesión remotamente, deberás iniciar sesión de nuevo.
                </div>
              </div>

              <div class="help-fix">
                <div class="help-fix__q">No veo cierta sección del menú</div>
                <div class="help-fix__a">
                  Cada sección es visible según tu <strong>rol</strong>. Si necesitas acceso a
                  algo, pide a un administrador que ajuste tu rol.
                </div>
              </div>
            </div>
          </article>

          <!-- FAQ -->
          <article id="sec_faq" class="help-card help-anchor">
            <header class="help-card-header">
              <div class="help-card-title-block">
                <b-icon :icon="ICONS.faq" size="is-small" class="mr-2" />
                <h3>Preguntas frecuentes</h3>
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
                Prueba: "guardar", "pedido", "notificación", "contraseña", "sesión".
              </p>
            </div>
          </article>

          <!-- Soporte -->
          <article id="sec_soporte" class="help-card help-card--support help-anchor">
            <header class="help-card-header">
              <div class="help-card-title-block">
                <b-icon :icon="ICONS.support" size="is-small" class="mr-2" />
                <h3>Soporte</h3>
              </div>
            </header>

            <p class="help-text">
              Si algo no funciona como se describe aquí, escríbenos. Para ayudarte más rápido incluye:
            </p>

            <ul class="help-list">
              <li>Qué estabas haciendo (pasos cortos: "entré a ventas, elegí una planilla, presioné Enviar y...").</li>
              <li>Nombre del pedido, folio o planilla (si aplica).</li>
              <li>Una captura de pantalla del error (si puedes).</li>
              <li>Hora aproximada en que ocurrió.</li>
            </ul>

            <div class="help-contact">
              <div class="help-contact__chip">
                <b-icon :icon="ICONS.mail" size="is-small" class="mr-1" />
                <span>Correo de soporte</span>
              </div>
              <p class="help-contact__email">soporte.rsbo@icloud.com</p>
            </div>
          </article>

        </div>
      </template>

    </DynamicTabs>
  </section>
</template>



<script setup>
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import DynamicTabs from "@/components/DynamicTabs.vue";

const HELP_TABS = [
  { key: "inicio", label: "Inicio", icon: "home" },
  { key: "inventario", label: "Inventario", icon: "layer-group" },
  { key: "ventas", label: "Ventas & Lab", icon: "flask" },
  { key: "nomenclaturas", label: "Nomenclaturas", icon: "tags" },
  { key: "cuenta", label: "Mi cuenta", icon: "cog" },
  { key: "referencia", label: "Referencia", icon: "question-circle" },
];

const props = defineProps({
  user: { type: Object, default: () => null },
  loading: { type: Boolean, default: false },
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
  home: "home",
  bell: "bell",
  sidebar: "bars",
  inventory: "layer-group",
  cart: "shopping-cart",
  lab: "flask",
  scan: "barcode",
  check: "check-circle",
  correction: "exclamation-circle",
  history: "history",
  config: "cog",
  palette: "palette",
  pin: "star",
  list: "list-ul",
  tags: "tags",
  hashtag: "hashtag",
  barcode: "barcode",
  eye: "eye",
  glasses: "glasses",
  palette2: "fill-drip",
  ruler: "ruler-combined",
});

/* ── Tabs ─────────────────────────────────────────────────────────────────── */
const VALID_TABS = ["inicio", "inventario", "ventas", "nomenclaturas", "cuenta", "referencia"];

// Map: section anchor id → tab value
const SECTION_TAB = {
  sec_inicio: "inicio",
  sec_notificaciones: "inicio",
  sec_inventario: "inventario",
  sec_ventas: "ventas",
  sec_laboratorio: "ventas",
  sec_config: "cuenta",
  sec_usuarios: "cuenta",
  sec_sku: "nomenclaturas",
  sec_folios: "nomenclaturas",
  sec_codebar: "nomenclaturas",
  sec_matrices: "nomenclaturas",
  sec_tratamientos: "nomenclaturas",
  sec_estados: "nomenclaturas",
  sec_coordenadas: "nomenclaturas",
  sec_atajos: "referencia",
  sec_solucion: "referencia",
  sec_faq: "referencia",
  sec_soporte: "referencia",
};

const TAB_LABELS = {
  inicio: "Inicio",
  inventario: "Inventario",
  ventas: "Ventas & Lab",
  nomenclaturas: "Nomenclaturas",
  cuenta: "Mi cuenta",
  referencia: "Referencia",
};

const activeTab = ref("inicio");

const syncTabFromRoute = () => {
  const t = route.query.tab;
  activeTab.value = (typeof t === "string" && VALID_TABS.includes(t)) ? t : "inicio";
};
syncTabFromRoute();

watch(() => route.query.tab, syncTabFromRoute);

watch(() => activeTab.value, (newTab) => {
  if (route.query.tab === newTab) return;
  router.replace({
    name: route.name,
    params: route.params,
    query: { ...route.query, tab: newTab },
    hash: route.hash,
  }).catch(() => { });
});

const tabLabelForSection = (sectionId) => TAB_LABELS[SECTION_TAB[sectionId]] ?? "";

/* ── Search ───────────────────────────────────────────────────────────────── */
const search = ref("");
const searchInputRef = ref(null);

const onSearchInput = (payload) => {
  if (typeof payload === "string" || typeof payload === "number") {
    search.value = String(payload);
    return;
  }
  const t = payload?.target || payload?.srcElement;
  if (t && typeof t.value !== "undefined") { search.value = String(t.value ?? ""); return; }
  if (payload && typeof payload === "object" && "value" in payload) {
    search.value = String(payload.value ?? "");
    return;
  }
  search.value = "";
};

const clearSearch = () => { search.value = ""; };

const displayRole = computed(() => {
  if (!props.user) return "Usuario";
  return props.user.role?.name || props.user.name || "Usuario";
});

const searchCatalog = computed(() => [
  { id: "sec_inicio", title: "Inicio y menú", icon: ICONS.home, text: "inicio dashboard barra lateral menú notificaciones búsqueda global campana" },
  { id: "sec_inventario", title: "Inventario", icon: ICONS.inventory, text: "planilla celda guardar exportar plantilla bases micas negativa positiva existencias" },
  { id: "sec_ventas", title: "Crear pedido de ventas", icon: ICONS.cart, text: "ventas pedido carrito cliente enviar laboratorio historial comprobante folio" },
  { id: "sec_laboratorio", title: "Laboratorio", icon: ICONS.lab, text: "laboratorio pedido escanear código barras cerrar pedido surtir corrección bandeja catálogo" },
  { id: "sec_notificaciones", title: "Notificaciones", icon: ICONS.bell, text: "notificación aviso campana badge no leída fijar estrella descartar tiempo real" },
  { id: "sec_config", title: "Configuración y seguridad", icon: ICONS.config, text: "perfil editar avatar foto contraseña seguridad sesiones dispositivos tema oscuro fuente accesibilidad" },
  { id: "sec_usuarios", title: "Usuarios", icon: ICONS.users, text: "usuario nuevo rol crear editar contraseña papelera restaurar permisos" },
  { id: "sec_sku", title: "SKU (código de planilla)", icon: ICONS.tags, text: "sku código planilla proveedor marca material tratamiento abreviatura inventario" },
  { id: "sec_folios", title: "Folios de pedido", icon: ICONS.hashtag, text: "folio LAB DEV pedido laboratorio devolución número consecutivo fecha referencia" },
  { id: "sec_codebar", title: "Código de barras EAN-13", icon: ICONS.barcode, text: "código barras ean 13 dígitos escanear producto 279 prefijo" },
  { id: "sec_matrices", title: "Tipos de matriz", icon: ICONS.glasses, text: "matriz tipo lente BASE SPH CYL ADD monofocal bifocal progresivo tórico ojo OD OI" },
  { id: "sec_tratamientos", title: "Claves de tratamiento", icon: ICONS.palette2, text: "tratamiento BCO AR ANTIBLE FOTO TRANSITIONS POLAR espejo cristal blanco antirreflejante fotocromático polarizado" },
  { id: "sec_estados", title: "Estados del sistema", icon: ICONS.list, text: "estado pendiente parcial cerrado cancelado devolución aprobada rechazada procesada condición bueno dañado" },
  { id: "sec_coordenadas", title: "Coordenadas ópticas", icon: ICONS.ruler, text: "coordenada SPH CYL ADD BASE AXIS ojo material CR-39 policarbonato índice refracción" },
  { id: "sec_atajos", title: "Atajos de teclado", icon: ICONS.keyboard, text: "ctrl s guardar ctrl z deshacer enter esc escape mac cmd" },
  { id: "sec_solucion", title: "Solución rápida", icon: ICONS.wrench, text: "no guarda no aparece pedido laboratorio escanear sesión cerrada menú rol" },
  { id: "sec_soporte", title: "Soporte", icon: ICONS.support, text: "correo soporte reporte captura pantalla error" },
]);

const quickMatches = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return [];
  const has = (t) => String(t || "").toLowerCase().includes(q);
  return searchCatalog.value.filter((x) => has(x.title) || has(x.text)).slice(0, 6);
});

/* ── FAQ ──────────────────────────────────────────────────────────────────── */
const sections = ref([
  {
    id: "inv", title: "Inventario", icon: ICONS.inventory,
    items: [
      {
        id: "inv1", openByDefault: true,
        q: "¿Si edito una celda se guarda solo?",
        a: [
          "No. Después de editar las celdas que necesites, debes presionar el botón Guardar cambios.",
          "Si cierras la pestaña o recargas sin guardar, todo vuelve a como estaba.",
        ],
        tags: ["guardar", "inventario", "celda"],
      },
      {
        id: "inv2",
        q: "¿Qué significa Vista Negativa y Vista Positiva?",
        a: [
          "Son dos grupos de graduaciones dentro de la misma planilla. Cambiar entre ellas solo mueve lo que estás viendo, no borra ni crea datos.",
          "Úsalas para ubicarte mejor en el inventario sin necesitar dos planillas separadas.",
        ],
        tags: ["negativa", "positiva", "vista"],
      },
      {
        id: "inv3",
        q: "¿Para qué sirve Generar plantilla?",
        a: [
          "Si una planilla está vacía, este botón crea las filas y columnas con la estructura correcta para ese tipo de producto.",
          "Solo úsalo en planillas nuevas o completamente vacías. Después recarga y captura las existencias reales.",
        ],
        tags: ["plantilla", "generar", "nueva"],
      },
      {
        id: "inv4",
        q: "¿Cómo exporto el inventario a Excel?",
        a: [
          "Abre la planilla que quieres exportar y presiona el botón Exportar.",
          "Se descargará un archivo que puedes abrir en Excel, LibreOffice o Google Sheets.",
        ],
        tags: ["exportar", "excel"],
      },
    ],
  },
  {
    id: "ventas", title: "Ventas y pedidos", icon: ICONS.cart,
    items: [
      {
        id: "v1",
        q: "¿Cómo sé si el laboratorio recibió mi pedido?",
        a: [
          "Al crear el pedido, el laboratorio recibe una notificación automática en el sistema.",
          "En la pestaña Historial de ventas puedes ver el estado de cada pedido (Pendiente, En proceso, Surtido completo).",
        ],
        tags: ["pedido", "laboratorio", "estado"],
      },
      {
        id: "v2",
        q: "¿Puedo cancelar un pedido después de enviarlo?",
        a: [
          "Los pedidos enviados al laboratorio los atiende directamente el personal de laboratorio.",
          "Si necesitas cancelar uno, comunícate con el laboratorio o con un supervisor para que lo procesen.",
        ],
        tags: ["cancelar", "pedido"],
      },
      {
        id: "v3",
        q: "¿Por qué no puedo agregar un producto al carrito?",
        a: [
          "Solo se pueden agregar productos que tengan existencias disponibles en el inventario.",
          "Si el producto aparece con 0 en stock, no estará disponible hasta que se reabastezca.",
        ],
        tags: ["carrito", "stock", "sin existencias"],
      },
    ],
  },
  {
    id: "lab", title: "Laboratorio", icon: ICONS.lab,
    items: [
      {
        id: "l1",
        q: "¿Cómo sé qué pedidos atender primero?",
        a: [
          "Los pedidos se muestran ordenados por fecha de creación. Los más antiguos aparecen primero.",
          "También puedes usar los filtros por estado (Pendiente, En proceso) para ver solo los que faltan.",
        ],
        tags: ["pedido", "orden", "prioridad"],
      },
      {
        id: "l2",
        q: "¿Qué pasa si escaneo mal un código?",
        a: [
          "Si el código no existe o no corresponde al pedido, el sistema te mostrará un aviso y no realizará ningún descuento.",
          "Verifica el código en el inventario antes de volver a intentarlo.",
        ],
        tags: ["escanear", "código", "error"],
      },
      {
        id: "l3",
        q: "¿Cuándo debo usar Solicitar corrección?",
        a: [
          "Cuando hay un problema con un pedido que necesita revisión del supervisor: producto dañado, datos incorrectos, etc.",
          "El supervisor recibirá una notificación específica. No uses esta opción para cancelar pedidos.",
        ],
        tags: ["corrección", "supervisor"],
      },
    ],
  },
  {
    id: "nomen", title: "Nomenclaturas y códigos", icon: ICONS.tags,
    items: [
      {
        id: "nm1",
        q: "¿Cómo leo un SKU de planilla?",
        a: [
          "El SKU se divide en segmentos separados por guiones. De izquierda a derecha: proveedor, marca, tipo de matriz, material, base, tratamiento y un código aleatorio.",
          "Por ejemplo: JAP-TAI-BAS-POL-MON-BLN-A5F2 significa proveedor JAP, marca TAI, tipo BASE, material Policarbonato, base MON, tratamiento Blanco.",
        ],
        tags: ["sku", "código", "planilla", "leer"],
      },
      {
        id: "nm2",
        q: "¿Qué significan LAB y DEV en los folios?",
        a: [
          "LAB es el prefijo de los pedidos de laboratorio (ej: LAB-20250328-A5F2). Después viene la fecha y un código aleatorio.",
          "DEV es el prefijo de las devoluciones (ej: DEV-2025-00001). Después viene el año y un número consecutivo.",
        ],
        tags: ["folio", "LAB", "DEV", "pedido", "devolución"],
      },
      {
        id: "nm3",
        q: "¿Qué significa SPH, CYL, ADD en los productos?",
        a: [
          "SPH (esfera) es el poder óptico principal del lente. CYL (cilindro) corrige el astigmatismo. ADD (adición) es la potencia extra para lectura en bifocales/progresivos.",
          "Estos valores se muestran con signo (+/-) y dos decimales. Por ejemplo: SPH -2.50 · CYL -1.00 · ADD +2.00.",
        ],
        tags: ["SPH", "CYL", "ADD", "coordenadas", "óptica"],
      },
      {
        id: "nm4",
        q: "¿Qué significan las claves de tratamiento como BCO, AR, FOTO?",
        a: [
          "BCO = Blanco (sin tratamiento), AR = Antirreflejante, FOTO = Fotocromático (se oscurece con el sol), ANTIBLE = Anti luz azul, POLAR = Polarizado.",
          "Algunos tratamientos tienen variantes de color (Transitions: Gris, Café, Verde) o restricciones de material (CRISTAL_FOTO solo aplica a cristal).",
        ],
        tags: ["tratamiento", "BCO", "AR", "FOTO", "POLAR"],
      },
      {
        id: "nm5",
        q: "¿Qué es OD y OI?",
        a: [
          "OD significa Ojo Derecho (del latín 'Oculus Dexter') y OI significa Ojo Izquierdo ('Oculus Sinister').",
          "Se usan en bifocales y progresivos donde cada ojo puede tener prescripción diferente. Las planillas monofocales tipo BASE y SPH_CYL no distinguen ojo.",
        ],
        tags: ["OD", "OI", "ojo", "bifocal", "progresivo"],
      },
    ],
  },
  {
    id: "notif", title: "Notificaciones", icon: ICONS.bell,
    items: [
      {
        id: "n1",
        q: "¿Por qué no me llegan notificaciones?",
        a: [
          "Las notificaciones se envían a los roles que corresponden: pedidos de laboratorio van a laboratorio, supervisor y ventas; correcciones solo van al supervisor.",
          "Si tienes el rol correcto y no ves notificaciones, recarga la página para reconectar.",
        ],
        tags: ["notificación", "rol", "no llega"],
      },
      {
        id: "n2",
        q: "¿Por qué solo hay una notificación aunque haya muchos pedidos?",
        a: [
          "El sistema agrupa pedidos del mismo tipo en una sola notificación con el conteo total.",
          "Por ejemplo: '5 pedidos pendientes de atención' en lugar de 5 avisos separados. Así es más fácil de leer.",
        ],
        tags: ["agrupar", "pedidos", "conteo"],
      },
    ],
  },
  {
    id: "seg", title: "Seguridad y cuenta", icon: ICONS.shield,
    items: [
      {
        id: "s1",
        q: "¿Por qué me cerró sesión solo?",
        a: [
          "La sesión tiene una duración de 8 horas. Al pasar ese tiempo, debes iniciar sesión de nuevo.",
          "También puede cerrarse si un administrador revocó tu acceso, o si tú mismo cambiaste tu contraseña.",
        ],
        tags: ["sesión", "cerrar", "expirar"],
      },
      {
        id: "s2",
        q: "¿Cómo cierro mi sesión en otro dispositivo?",
        a: [
          "Ve a Configuración → Seguridad → Sesiones activas.",
          "Verás todos los dispositivos donde tienes sesión abierta. Toca el botón de cerrar en el que quieras revocar.",
        ],
        tags: ["sesión", "dispositivo", "cerrar remoto"],
      },
      {
        id: "s3",
        q: "¿Qué pasa si cambio mi contraseña?",
        a: [
          "Al cambiar la contraseña, todas tus sesiones en todos los dispositivos se cierran automáticamente.",
          "Tendrás que iniciar sesión de nuevo con tu nueva contraseña.",
        ],
        tags: ["contraseña", "sesión", "seguridad"],
      },
    ],
  },
  {
    id: "users", title: "Usuarios", icon: ICONS.users,
    items: [
      {
        id: "u1",
        q: "¿Cómo creo un usuario nuevo?",
        a: ["Ve a Gestión → Usuarios.", "Pulsa Nuevo usuario, completa nombre, correo, rol y contraseña.", "Presiona Crear y el usuario ya puede entrar."],
        tags: ["usuario", "crear"],
      },
      {
        id: "u2",
        q: "¿Qué es la Papelera de usuarios?",
        a: [
          "Enviar un usuario a Papelera lo desactiva sin borrarlo definitivamente.",
          "Puedes restaurarlo en cualquier momento filtrando por Papelera en la lista de usuarios.",
        ],
        tags: ["papelera", "restaurar", "usuario"],
      },
      {
        id: "u3",
        q: "¿Cómo defino qué puede ver cada persona?",
        a: [
          "Cuando creas o editas un usuario, asignas un Rol (por ejemplo: ventas, laboratorio, supervisor).",
          "Cada rol tiene acceso a secciones específicas. Si alguien no puede ver algo, revisa su rol.",
        ],
        tags: ["rol", "permisos", "acceso"],
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
      const items = (sec.items || []).filter(
        (it) => has(it.q) || (it.a || []).some(has) || (it.tags || []).some(has)
      );
      return { ...sec, items };
    })
    .filter((sec) => sec.items.length > 0);
});

const hasAnyResults = computed(() => filteredSections.value.length > 0);

const openMap = ref({});
watch(
  () => search.value,
  (q) => {
    const query = q.trim().toLowerCase();
    if (!query) { openMap.value = {}; return; }
    const next = {};
    filteredSections.value.forEach((sec) => sec.items.forEach((it) => (next[it.id] = true)));
    openMap.value = next;
  }
);

/* ── Scroll ───────────────────────────────────────────────────────────────── */
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
    window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - SCROLL_OFFSET, behavior: "smooth" });
    return;
  }
  const parentRect = parent.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  parent.scrollTo({ top: elRect.top - parentRect.top + parent.scrollTop - SCROLL_OFFSET, behavior: "smooth" });
};

const goTo = async (id) => {
  // Switch to the right tab first
  const tab = SECTION_TAB[id];
  if (tab && activeTab.value !== tab) {
    activeTab.value = tab;
    await nextTick();
    await nextTick(); // Wait for tab content to render
  }
  try { await router.replace({ ...route, hash: `#${id}` }); } catch { }
  await scrollToId(id);
};

watch(
  () => route.hash,
  async (h) => {
    const id = String(h || "").replace("#", "").trim();
    if (!id) return;
    // Also switch tab on direct URL navigation
    const tab = SECTION_TAB[id];
    if (tab && activeTab.value !== tab) {
      activeTab.value = tab;
      await nextTick();
      await nextTick();
    }
    await scrollToId(id);
  },
  { immediate: true }
);

/* ── Atajo "/" ────────────────────────────────────────────────────────────── */
const focusSearch = () => {
  const root = searchInputRef.value?.$el || searchInputRef.value;
  const input = root?.querySelector?.("input");
  if (input) { input.focus(); input.select?.(); }
};

const onKeyDown = (e) => {
  const tag = (e.target?.tagName || "").toLowerCase();
  const typing = tag === "input" || tag === "textarea" || e.target?.isContentEditable;
  if (!typing && e.key === "/") { e.preventDefault(); focusSearch(); }
};

onMounted(() => window.addEventListener("keydown", onKeyDown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeyDown));
</script>

<style scoped>
.help-anchor {
  scroll-margin-top: 96px;
}

/* Se eliminó .ayuda-section para permitir bloques independientes en el layout */
.view-hero {
  margin: 1.25rem 1.25rem 0;
}

.view-main {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}


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
  gap: 0.2rem;
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
}

.help-index__chip:hover {
  transform: translateY(-1px);
  background: var(--c-primary-alpha);
  box-shadow: var(--shadow-md);
}

.help-chip-tab-badge {
  font-size: 0.65rem;
  color: var(--text-muted);
  background: var(--bg-muted);
  border-radius: 999px;
  padding: 0.05rem 0.4rem;
  margin-left: 0.1rem;
}

/* ── Tabs ─────────────────────────────────────────────────────────────────── */
:deep(.dyn-tabs__content) {
  margin-top: 0.75rem;
}

.help-tab-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ── Cards ────────────────────────────────────────────────────────────────── */
.help-card {
  background-color: var(--surface-solid);
  border-radius: 1rem;
  padding: 0.95rem 1rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
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
  flex-wrap: wrap;
  gap: 0.35rem;
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

.help-text {
  font-size: 0.79rem;
  color: var(--text-secondary);
}

.mt-3 {
  margin-top: 0.75rem;
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

/* ── Nomenclatura components ─────────────────────────────────────────────── */
.nomenclatura-example {
  margin: 0.65rem 0;
  text-align: center;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  border: 1px dashed var(--border);
  background: var(--bg-subtle);
}

.nomenclatura-example__code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 1.05rem;
  font-weight: 1000;
  color: var(--c-primary);
  letter-spacing: 0.06em;
  word-break: break-all;
}

.nomenclatura-example__label {
  margin-top: 0.3rem;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.nomenclatura-breakdown {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.nomenclatura-breakdown--compact {
  flex-direction: column;
  align-items: stretch;
  gap: 0.35rem;
}

.nomenclatura-segment {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.6rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface-solid);
}

.nomenclatura-segment__part {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-weight: 1000;
  font-size: 0.82rem;
  color: var(--c-primary);
  background: var(--c-primary-alpha);
  padding: 0.1rem 0.4rem;
  border-radius: 6px;
  white-space: nowrap;
  flex-shrink: 0;
}

.nomenclatura-segment__desc {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.nomenclatura-sep {
  color: var(--text-muted);
  font-weight: 900;
  font-size: 0.85rem;
}

.nomenclatura-duo {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-top: 0.55rem;
}

.nomenclatura-duo__block {
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  border-radius: 14px;
  padding: 0.75rem 0.85rem;
}

.nomenclatura-table {
  margin-top: 0.55rem;
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
}

.nomenclatura-table__row {
  display: grid;
  grid-template-columns: minmax(80px, auto) 1fr 1fr;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.79rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  align-items: center;
}

.nomenclatura-table__row:last-child {
  border-bottom: none;
}

.nomenclatura-table__row--head {
  background: var(--c-primary-alpha);
  font-weight: 900;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-primary);
}

.nomenclatura-status-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-top: 0.45rem;
}

.nomenclatura-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.79rem;
  color: var(--text-secondary);
}

.nomenclatura-status__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex-shrink: 0;
}

.nomenclatura-status__dot--pendiente {
  background: rgba(245, 158, 11, 0.85);
}

.nomenclatura-status__dot--parcial {
  background: rgba(59, 130, 246, 0.85);
}

.nomenclatura-status__dot--cerrado {
  background: rgba(34, 197, 94, 0.85);
}

.nomenclatura-status__dot--cancelado {
  background: rgba(239, 68, 68, 0.85);
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.muted {
  color: var(--text-muted);
  font-weight: 700;
}

@media (min-width: 1024px) {
  .nomenclatura-duo {
    grid-template-columns: 1fr 1fr;
  }
}

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


  .help-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .help-meta {
    align-items: flex-start;
  }
}
</style>
