import { usePreferences, setPreferences } from './usePreferences.js';

const useFontSize = () => {
  const { fontSize } = usePreferences();
  return { fontSize, setFontSize: (value) => setPreferences({ fontSize: value }) };
};

export default useFontSize;
