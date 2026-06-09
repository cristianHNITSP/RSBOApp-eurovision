<script>
import { defineComponent, h, ref, watch, onMounted } from "vue";
import QRCode from "qrcode";

/**
 * QrCode.vue — Render de un código QR interno (no es EAN-13).
 * Reemplaza a BarcodeEAN13 para el nuevo `qr` único por dioptría.
 *
 * Usa la librería `qrcode` (declarada en package.json). Si aún no está instalada,
 * ejecutar en rsbo-app:  npm install qrcode
 */
export default defineComponent({
  name: "QrCode",
  props: {
    value: { type: String, required: true },
    size: { type: Number, default: 120 },
    margin: { type: Number, default: 1 },
  },
  setup(props) {
    const dataUrl = ref("");

    const render = async () => {
      const v = String(props.value || "").trim();
      if (!v) { dataUrl.value = ""; return; }
      try {
        dataUrl.value = await QRCode.toDataURL(v, {
          width: props.size,
          margin: props.margin,
          errorCorrectionLevel: "M",
        });
      } catch {
        dataUrl.value = "";
      }
    };

    onMounted(render);
    watch(() => [props.value, props.size], render);

    return () =>
      dataUrl.value
        ? h("img", {
            src: dataUrl.value,
            width: props.size,
            height: props.size,
            alt: "QR",
            class: "qr-img",
          })
        : h("div", { class: "qr-img qr-img--empty" }, "—");
  },
});
</script>
