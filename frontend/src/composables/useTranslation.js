import { usePreferences } from './usePreferences.js';
import { translations } from '../data/translations.js';

const useTranslation = () => {
  const { language } = usePreferences();
  const dict = translations[language] || translations.es;
  const t = (key) => dict[key] ?? key;
  return { t, language };
};

export default useTranslation;
