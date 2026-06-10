import { createApp } from "vue";
import App from "./App.vue";
import { MotionPlugin } from "@vueuse/motion";

import Buefy from "buefy";
import "buefy/dist/css/buefy.css";
import "@fortawesome/fontawesome-free/css/all.css";



import "./assets/css/tokens.css";
import "./assets/css/global.css";
import "./assets/css/liquid-glass.css";
import router from "./router";

const app = createApp(App);

app.use(Buefy, {
  defaultIconPack: "fas",
});

app.use(router);
app.use(MotionPlugin);
app.mount("#app");
