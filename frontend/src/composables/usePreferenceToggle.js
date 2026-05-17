import { usePreferences, setPreferences } from './usePreferences.js';

const usePreferenceToggle = (id) => {
  const prefs = usePreferences();
  return {
    value: Boolean(prefs[id]),
    setValue: (next) => setPreferences({ [id]: next }),
  };
};

export default usePreferenceToggle;
