<script>
import { computed, defineComponent, h } from "vue";

export default defineComponent({
  name: "BarcodeEAN13",
  props: {
    value: { type: String, required: true },
    scale: { type: Number, default: 2 },
    height: { type: Number, default: 90 },
  },
  setup(props) {
    const quiet = 10;

    const L = ["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];
    const G = ["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"];
    const R = ["1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100"];
    const PARITY = ["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"];

    const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

    function checksumEan13(d12) {
      const digits = d12.split("").map((x) => Number(x));
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const pos = i + 1;
        const w = (pos % 2 === 0) ? 3 : 1;
        sum += digits[i] * w;
      }
      const mod = sum % 10;
      return (10 - mod) % 10;
    }

    function normalizeEan13(raw) {
      const d = onlyDigits(raw);
      if (d.length === 12) return d + String(checksumEan13(d));
      if (d.length === 13) return d;
      return "";
    }

    function buildBits(ean13) {
      const first = Number(ean13[0]);
      const left = ean13.slice(1, 7).split("").map(Number);
      const right = ean13.slice(7, 13).split("").map(Number);

      const parity = PARITY[first];
      let bits = "101";

      for (let i = 0; i < 6; i++) {
        const d = left[i];
        bits += parity[i] === "L" ? L[d] : G[d];
      }

      bits += "01010";

      for (let i = 0; i < 6; i++) bits += R[right[i]];

      bits += "101";
      return bits;
    }

    function isGuardBit(i) {
      return (i >= 0 && i <= 2) || (i >= 45 && i <= 49) || (i >= 92 && i <= 94);
    }

    const ean = computed(() => normalizeEan13(props.value));
    const bits = computed(() => (ean.value ? buildBits(ean.value) : ""));
    const totalModules = computed(() => (bits.value ? bits.value.length + quiet * 2 : 0));

    const svgModel = computed(() => {
      if (!bits.value) return null;

      const scale = Math.max(1, Number(props.scale || 2));
      const normalH = Math.max(40, Number(props.height || 90));
      const guardH = normalH + 10;
      const textH = 18;

      const w = totalModules.value * scale;
      const hSvg = guardH + textH + 6;

      const rects = [];
      let runStart = -1;
      let runGuard = false;

      for (let i = 0; i < bits.value.length; i++) {
        const bit = bits.value[i];
        const guard = isGuardBit(i);

        if (bit === "1" && runStart === -1) {
          runStart = i;
          runGuard = guard;
        } else if (bit === "1" && runStart !== -1) {
          if (runGuard !== guard) {
            rects.push({ start: runStart, end: i - 1, guard: runGuard });
            runStart = i;
            runGuard = guard;
          }
        } else if (bit === "0" && runStart !== -1) {
          rects.push({ start: runStart, end: i - 1, guard: runGuard });
          runStart = -1;
        }
      }
      if (runStart !== -1) rects.push({ start: runStart, end: bits.value.length - 1, guard: runGuard });

      return { w, hSvg, scale, normalH, guardH, textH, rects, quiet, code: ean.value };
    });

    return () => {
      const m = svgModel.value;
      if (!m) return null;

      return h(
        "svg",
        { width: m.w, height: m.hSvg, viewBox: `0 0 ${m.w} ${m.hSvg}`, role: "img", "aria-label": "Barcode EAN-13", style: { display: "block" } },
        [
          h("rect", { x: 0, y: 0, width: m.w, height: m.hSvg, fill: "#fff" }),
          ...m.rects.map((r, idx) =>
            h("rect", {
              key: idx,
              x: (m.quiet + r.start) * m.scale,
              y: 6,
              width: (r.end - r.start + 1) * m.scale,
              height: r.guard ? m.guardH : m.normalH,
              fill: "#000",
            })
          ),
          h(
            "text",
            {
              x: m.w / 2,
              y: m.guardH + m.textH,
              "text-anchor": "middle",
              "font-size": 14,
              fill: "#111",
              "font-family":
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            },
            m.code
          ),
        ]
      );
    };
  },
});
</script>