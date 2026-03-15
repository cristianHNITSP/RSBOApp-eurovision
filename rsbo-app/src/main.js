import { createApp } from "vue";
import App from "./App.vue";
import { MotionPlugin } from "@vueuse/motion";

import "bulma/css/bulma.css";
import Buefy from "buefy";
import "buefy/dist/buefy.css";
import "@fortawesome/fontawesome-free/css/all.css";

import ExtendedTooltip from "./global-components/ExtendedTooltip.js";

import "./assets/css/tokens.css";
import "./assets/css/global.css";
import router from "./router";

const style = document.createElement("style");
style.textContent = `
@import url('https://api.fontshare.com/v2/css?f[]=satoshi@1&f[]=switzer@1&display=swap');

/* Texto principal */
body, html, #app {
  font-family: 'Satoshi', sans-serif;
  font-weight: 400;
}

/* Encabezados y títulos */
h1, h2, h3, h4, h5, h6 {
  font-family: 'Switzer', sans-serif;
  font-weight: 600;
}

/* Opcional: botones, etiquetas, UI pequeña */
button, label, .subtitle, .menu {
  font-family: 'Satoshi', sans-serif;
  font-weight: 500;
}
`;
document.head.appendChild(style);

const app = createApp(App);

// Reemplaza globalmente el componente original b-tooltip con el extendido
app.component("b-tooltip", ExtendedTooltip);

app.use(Buefy, {
  defaultIconPack: "fas",
});

app.use(router);
app.use(MotionPlugin);
app.mount("#app");
