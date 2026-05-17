import { useEffect, useRef, useState } from 'react';
import { usePreferences } from './usePreferences.js';

const DEFAULTS = { bootstrap: 600, change: 450 };

const useSectionLoading = (key, durations = {}) => {
  const { animacion } = usePreferences();
  const { bootstrap, change } = { ...DEFAULTS, ...durations };
  const mountedRef = useRef(false);
  const timerRef = useRef(null);
  const [loading, setLoading] = useState(!animacion && bootstrap > 0);

  useEffect(() => {
    if (animacion) {
      setLoading(false);
      return undefined;
    }
    const delay = mountedRef.current ? change : bootstrap;
    if (delay <= 0) {
      setLoading(false);
      mountedRef.current = true;
      return undefined;
    }
    setLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setLoading(false);
      mountedRef.current = true;
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key, animacion, bootstrap, change]);

  return { loading };
};

export default useSectionLoading;
