import Badge from '../../../../components/ui/Badge/Badge.jsx';
import Toggle from '../../../../components/ui/Toggle/Toggle.jsx';
import { Select } from '../../../../components/ui/Input/Input.jsx';
import { IconPalette, IconCheck } from '../../../../components/icons/Icons.jsx';
import { THEMES, FONT_SIZES, LANGUAGES, TOGGLE_DEFINITIONS } from '../../../../data/preferences.js';
import useTheme from '../../../../composables/useTheme.js';
import useFontSize from '../../../../composables/useFontSize.js';
import useLanguage from '../../../../composables/useLanguage.js';
import usePreferenceToggle from '../../../../composables/usePreferenceToggle.js';
import useTranslation from '../../../../composables/useTranslation.js';

const ToggleRow = ({ id, label, desc }) => {
  const { value, setValue } = usePreferenceToggle(id);
  return (
    <div className="settings-toggle-row">
      <div className="settings-toggle-row__info">
        <span className="settings-toggle-row__label">{label}</span>
        <span className="settings-toggle-row__desc">{desc}</span>
      </div>
      <Toggle checked={value} onChange={setValue} ariaLabel={label} />
    </div>
  );
};

const PreferenciasTab = () => {
  const { theme, setTheme } = useTheme();
  const { fontSize, setFontSize } = useFontSize();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <div className="settings-grid">
      <div className="settings-form-card">
        <div className="settings-form-card__eyebrow">
          <IconPalette width={16} height={16} />
          <Badge variant="primary">{t('prefs.appearance')}</Badge>
        </div>
        <h3 className="settings-form-card__title">{t('prefs.theme')}</h3>

        <div className="settings-theme-options">
          {THEMES.map(opt => (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={`settings-theme-card${theme === opt.id ? ' settings-theme-card--active' : ''}`}
            >
              <div className={`settings-theme-preview settings-theme-preview--${opt.id}`} />
              <div className="settings-theme-card__info">
                <span className="settings-theme-card__label">{opt.label}</span>
                <span className="settings-theme-card__desc">{opt.desc}</span>
              </div>
              {theme === opt.id && <IconCheck width={16} height={16} className="settings-theme-card__check" />}
            </button>
          ))}
        </div>

        <div className="settings-form-card__fields" style={{ marginTop: 'var(--space-6)' }}>
          <div className="settings-form-card__row">
            <div className="settings-form-card__field">
              <label>{t('prefs.fontSize')}</label>
              <Select value={fontSize} onChange={e => setFontSize(e.target.value)}>
                {FONT_SIZES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </Select>
            </div>
            <div className="settings-form-card__field">
              <label>{t('prefs.language')}</label>
              <Select value={language} onChange={e => setLanguage(e.target.value)}>
                {LANGUAGES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-form-card">
        <div className="settings-form-card__eyebrow">
          <Badge variant="glass">{t('prefs.options')}</Badge>
        </div>
        <h3 className="settings-form-card__title">{t('prefs.behavior')}</h3>

        <div className="settings-toggle-list">
          {TOGGLE_DEFINITIONS.map(row => (
            <ToggleRow key={row.id} id={row.id} label={row.label} desc={row.desc} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PreferenciasTab;
