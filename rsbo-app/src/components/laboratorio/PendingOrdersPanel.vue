<template>
  <div class="panel">
    <div class="panel__head panel__head--compact">
      <div>
        <h3 class="panel__title mb-0">
          <i class="fas fa-clipboard-list mr-2"></i>
          Bandeja de pedidos
        </h3>
        <p class="panel__hint mt-1">
          Pendiente/parcial/cerrado + entradas/salidas (DB).
        </p>
      </div>

      <div style="display:flex; gap:.4rem; flex-wrap:wrap; align-items:center;">
        <b-button size="is-small" type="is-light" icon-left="download" @click="lab.exportOrdersCsv">
          CSV
        </b-button>

        <b-button
          v-if="!standalone"
          size="is-small"
          type="is-light"
          icon-left="chevron-down"
          @click="open = !open"
        >
          {{ open ? "Ocultar" : "Mostrar" }}
        </b-button>
      </div>
    </div>

    <template v-if="standalone">
      <div class="panel__body">
        <ContentInner />
      </div>
    </template>

    <b-collapse v-else :open="open">
      <div class="panel__body">
        <ContentInner />
      </div>
    </b-collapse>
  </div>
</template>

<script setup>
import { inject, ref, defineComponent, h } from "vue";

const lab = inject("lab");
if (!lab) throw new Error("PendingOrdersPanel necesita provide('lab', ...)");

const props = defineProps({
  standalone: { type: Boolean, default: false },
});

const open = ref(props.standalone ? true : false);

const ContentInner = defineComponent({
  name: "PendingOrdersPanelInner",
  setup() {
    return () =>
      h("div", {}, [
        h("div", { class: "columns is-mobile is-variable is-2 mb-2" }, [
          h("div", { class: "column" }, [
            h("b-field", { class: "mb-0", label: "Estado (backend)" }, () =>
              h(
                "b-select",
                {
                  modelValue: lab.orderStatusFilter.value,
                  "onUpdate:modelValue": (v) => (lab.orderStatusFilter.value = v),
                  expanded: true,
                },
                () => [
                  h("option", { value: "pendiente" }, "Pendientes"),
                  h("option", { value: "parcial" }, "Parciales"),
                  h("option", { value: "cerrado" }, "Cerrados"),
                  h("option", { value: "all" }, "Todos"),
                ]
              )
            ),
          ]),
          h("div", { class: "column" }, [
            h("b-field", { class: "mb-0", label: "Buscar (backend)" }, () =>
              h("b-input", {
                modelValue: lab.orderQuery.value,
                "onUpdate:modelValue": (v) => (lab.orderQuery.value = v),
                icon: "search",
                placeholder: "Folio, cliente, nota…",
              })
            ),
          ]),
        ]),

        h("div", { class: "order-inbox" }, [
          ...(lab.ordersDB.value || []).map((o) =>
            h(
              "button",
              {
                key: o.id,
                type: "button",
                class: ["order-inbox__item", { "is-active": o.id === lab.selectedOrderId.value }],
                onClick: () => (lab.selectedOrderId.value = o.id),
              },
              [
                h("div", { class: "order-inbox__top" }, [
                  h("div", { class: "order-inbox__folio" }, o.folio),
                  h("span", { class: ["tag", "is-light", lab.statusTagClass(o.status)] }, lab.statusHuman(o.status)),
                ]),
                h("div", { class: "order-inbox__sub" }, [
                  h("b", {}, o.cliente),
                  h("span", { class: "muted" }, `· ${lab.sheetNameById(o.sheetId)}`),
                ]),
                h("div", { class: "order-inbox__meta" }, [
                  h("span", { class: "muted" }, o.createdAtShort),
                  h("span", { class: "muted" }, `${lab.orderPickedCount(o)}/${lab.orderTotalCount(o)} surtidas`),
                ]),
                h("div", { class: "progress-bar mt-2" }, [
                  h("div", { class: "progress-bar__fill", style: { width: `${lab.orderProgressPct(o)}%` } }),
                ]),
              ]
            )
          ),

          (!lab.ordersDB.value || !lab.ordersDB.value.length)
            ? h("div", { class: "empty empty--mini" }, [
                h("i", { class: "fas fa-inbox empty__icon" }),
                h("p", { class: "empty__title" }, "Sin pedidos"),
                h("p", { class: "empty__text" }, "Crea uno en “Pedidos” o cambia filtros."),
              ])
            : null,
        ]),

        h("hr", { class: "soft-hr" }),

        h("div", { class: "logs" }, [
          h("div", { class: "logs__col" }, [
            h("div", { class: "logs__title" }, [h("i", { class: "fas fa-arrow-down mr-2" }), "Entradas (ORDER_CREATE)"]),
            !lab.entryEvents.value.length
              ? h("div", { class: "muted" }, "Sin entradas.")
              : h(
                  "div",
                  { class: "logs__list" },
                  lab.entryEvents.value.map((e) =>
                    h("div", { key: e.id, class: "log-item" }, [
                      h("div", { class: "log-item__top" }, [h("b", {}, e.folio), h("span", { class: "muted" }, e.at)]),
                      h("div", { class: "muted" }, `${e.cliente} · ${lab.sheetNameById(e.sheetId)} · ${e.linesTotal} líneas`),
                    ])
                  )
                ),
          ]),
          h("div", { class: "logs__col" }, [
            h("div", { class: "logs__title" }, [h("i", { class: "fas fa-arrow-up mr-2" }), "Salidas (EXIT_SCAN)"]),
            !lab.exitEvents.value.length
              ? h("div", { class: "muted" }, "Sin salidas.")
              : h(
                  "div",
                  { class: "logs__list" },
                  lab.exitEvents.value.map((e) =>
                    h("div", { key: e.id, class: "log-item" }, [
                      h("div", { class: "log-item__top" }, [h("b", {}, e.folio), h("span", { class: "muted" }, e.at)]),
                      h("div", { class: "muted mono" }, e.codebar),
                      h("div", { class: "muted" }, e.title),
                    ])
                  )
                ),
          ]),
        ]),
      ]);
  },
});
</script>