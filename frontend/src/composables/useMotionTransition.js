import { usePreferences } from './usePreferences.js';

export const INSTANT = { type: 'tween', duration: 0 };

const useMotionTransition = (normalTransition) => {
  const { animacion } = usePreferences();
  return animacion ? INSTANT : normalTransition;
};

export default useMotionTransition;
