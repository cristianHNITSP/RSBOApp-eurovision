import { usePreferences, setPreferences } from './usePreferences.js';

const useLanguage = () => {
  const { language } = usePreferences();
  return { language, setLanguage: (value) => setPreferences({ language: value }) };
};

export default useLanguage;
