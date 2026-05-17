import { useState, useEffect } from 'react';
import { playNotificationSound } from './useSound.js';

const listeners = new Set();

export const showToast = (title, message, type = 'success', duration = 5000) => {
  const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
  const toast = { id, title, message, type, duration };
  playNotificationSound();
  listeners.forEach(l => l(toast));
};

export const useToastState = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleNewToast = (toast) => {
      setToasts(prev => [...prev, toast]);
      if (toast.duration > 0) {
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toast.id));
        }, toast.duration);
      }
    };
    listeners.add(handleNewToast);
    return () => listeners.delete(handleNewToast);
  }, []);

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return { toasts, removeToast };
};
