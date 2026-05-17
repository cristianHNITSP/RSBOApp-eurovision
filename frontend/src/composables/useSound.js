import { getPreferences } from './usePreferences.js';
import { NOTIFICATION_SOUND } from '../data/sounds.js';

let audioCtx = null;
const getAudioCtx = () => {
  if (typeof window === 'undefined') return null;
  if (audioCtx) return audioCtx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audioCtx = new Ctx();
  return audioCtx;
};

export const playNotificationSound = () => {
  if (!getPreferences().sonido) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const { frequency, duration, volume, type } = NOTIFICATION_SOUND;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
};

const useSound = () => ({ playNotificationSound });

export default useSound;
