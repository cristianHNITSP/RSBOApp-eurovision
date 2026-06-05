/**
 * Registro de componentes por tipo de notificación (metadata.type).
 *
 * Patrón open/closed: para soportar un tipo nuevo, crea su componente en esta
 * carpeta y añádelo aquí — el shell (NotificationCard.vue) lo resuelve solo.
 */
import StockAlertCard from "./StockAlertCard.vue";
import PendingOrdersCard from "./PendingOrdersCard.vue";
import NewOrderCard from "./NewOrderCard.vue";
import CorrectionCard from "./CorrectionCard.vue";
import DevApprovalCard from "./DevApprovalCard.vue";

export const NOTIF_TYPE_COMPONENTS = {
  stock_alert: StockAlertCard,
  pending_orders: PendingOrdersCard,
  new_order: NewOrderCard,
  correction: CorrectionCard,
  dev_approval: DevApprovalCard,
};

/** Devuelve el componente de cuerpo para un tipo, o null si no hay detalle. */
export function notifBodyComponent(type) {
  return NOTIF_TYPE_COMPONENTS[type] || null;
}
