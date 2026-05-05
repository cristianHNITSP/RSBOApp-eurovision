<template>
  <router-view />
  <LabToast />
  <SessionExpiryModal />
</template>

<script setup>
import { onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import LabToast from "@/components/ui/LabToast.vue";
import SessionExpiryModal from "@/components/auth/SessionExpiryModal.vue";
import { useAccessibility } from "@/composables/ui/useAccessibility";
import { useSessionWatcher } from "@/composables/auth/useSessionWatcher";

const router  = useRouter();
const watcher = useSessionWatcher();

function syncWatcherWithRoute(path) {
  if (path && path.startsWith("/l/")) watcher.start();
  else watcher.stop();
}

function onLoggedOut() {
  watcher.stop();
}

let _unhookRouter = null;

onMounted(() => {
  useAccessibility();
  syncWatcherWithRoute(window.location.pathname);
  _unhookRouter = router.afterEach((to) => syncWatcherWithRoute(to.path));
  window.addEventListener("auth:session-expired", onLoggedOut);
});

onBeforeUnmount(() => {
  if (_unhookRouter) _unhookRouter();
  window.removeEventListener("auth:session-expired", onLoggedOut);
  watcher.stop();
});
</script>
