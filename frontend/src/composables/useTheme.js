import { usePreferences, setPreferences } from './usePreferences.js';

const useTheme = () => {
  const { theme } = usePreferences();
  return { theme, setTheme: (value) => setPreferences({ theme: value }) };
};

export default useTheme;
