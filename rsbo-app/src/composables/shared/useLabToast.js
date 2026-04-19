// src/composables/useLabToast.js
// Singleton module-level toast store — works from Vue components AND plain JS modules
import { reactive, computed } from "vue";

const _state = reactive({ 
  notifications: [],
  isDirtyFloatVisible: false
});
let _nextId = 1;

function show(message, type = "is-info", duration = 3500) {
  const id = _nextId++;
  _state.notifications.push({ id, message, type, duration });
  let timer = null;
  if (duration > 0) {
    timer = setTimeout(() => dismiss(id), duration);
  }
  return {
    id,
    close: () => {
      if (timer) clearTimeout(timer);
      dismiss(id);
    },
    update: ({ message: newMsg } = {}) => {
      const found = _state.notifications.find((x) => x.id === id);
      if (found && newMsg != null) found.message = newMsg;
    },
  };
}

function dismiss(id) {
  const idx = _state.notifications.findIndex((n) => n.id === id);
  if (idx !== -1) _state.notifications.splice(idx, 1);
}

export const labToast = {
  show,
  dismiss,
  success: (msg, dur = 3500) => show(msg, "is-success", dur),
  danger:  (msg, dur = 4000) => show(msg, "is-danger",  dur),
  warning: (msg, dur = 4000) => show(msg, "is-warning", dur),
  info:    (msg, dur = 3500) => show(msg, "is-info",    dur),
};

// Vue composable wrapper for use inside <script setup>
export function useLabToast() {
  return { 
    notifications: _state.notifications,
    isDirtyFloatVisible: computed({
      get: () => _state.isDirtyFloatVisible,
      set: (val) => { _state.isDirtyFloatVisible = val; }
    }),
    ...labToast 
  };
}
