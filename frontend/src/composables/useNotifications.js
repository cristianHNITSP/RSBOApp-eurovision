import { useState } from 'react';
import { defaultNotifications } from '../data/notifications.js';

const useNotifications = () => {
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const dismiss = (index) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  };

  const openPanel = () => setIsPanelOpen(true);
  const closePanel = () => setIsPanelOpen(false);

  return {
    notifications,
    count: notifications.length,
    isPanelOpen,
    openPanel,
    closePanel,
    dismiss,
  };
};

export default useNotifications;
