import { useState } from 'react';
import Badge from '../../../../components/ui/Badge/Badge.jsx';
import Button from '../../../../components/ui/Button/Button.jsx';
import Input from '../../../../components/ui/Input/Input.jsx';
import { IconShield, IconLock, IconKey, IconClock, IconCheck } from '../../../../components/icons/Icons.jsx';

export const searchConfig = {
  id: 'ajustes-seguridad',
  title: 'Seguridad',
  description: 'Contraseña, sesiones activas y 2FA',
  icon: 'shield',
  group: 'otros',
  tags: ['contraseña', 'password', 'sesiones', '2fa', 'autenticación', 'login', 'cerrar sesión'],
};

const SESSIONS = [
  { id: 1, device: 'Chrome · Windows',  location: 'Mérida, MX', time: 'Ahora mismo',   active: true },
  { id: 2, device: 'Safari · iPhone',   location: 'Mérida, MX', time: 'Hace 2 horas',  active: false },
  { id: 3, device: 'Firefox · macOS',   location: 'CDMX, MX',   time: 'Hace 3 días',   active: false },
];

const Toggle = ({ checked, onChange }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`settings-toggle${checked ? ' settings-toggle--on' : ''}`}
  >
    <span className="settings-toggle__thumb" />
  </button>
);

const SeguridadTab = () => {
  const [twoFactor, setTwoFactor] = useState(false);
  const [form, setForm] = useState({ actual: '', nueva: '', confirmar: '' });
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="settings-grid">
      <div className="settings-form-card">
        <div className="settings-form-card__eyebrow">
          <IconLock width={16} height={16} />
          <Badge variant="primary">CONTRASEÑA</Badge>
        </div>
        <h3 className="settings-form-card__title">Cambiar contraseña</h3>

        <div className="settings-form-card__fields">
          <div className="settings-form-card__field">
            <label>Contraseña actual</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={form.actual}
              icon={<IconKey width={16} height={16} />}
              onChange={e => set('actual', e.target.value)}
            />
          </div>
          <div className="settings-form-card__field">
            <label>Nueva contraseña</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={form.nueva}
              icon={<IconLock width={16} height={16} />}
              onChange={e => set('nueva', e.target.value)}
            />
          </div>
          <div className="settings-form-card__field">
            <label>Confirmar nueva contraseña</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={form.confirmar}
              icon={<IconCheck width={16} height={16} />}
              onChange={e => set('confirmar', e.target.value)}
            />
          </div>
          <Button variant="primary" icon={<IconLock width={16} height={16} />} style={{ width: '100%' }}>
            Actualizar contraseña
          </Button>
        </div>

        <div className="settings-2fa">
          <div className="settings-form-card__eyebrow" style={{ marginTop: 'var(--space-6)' }}>
            <IconShield width={16} height={16} />
            <Badge variant={twoFactor ? 'success' : 'glass'}>2FA</Badge>
          </div>
          <div className="settings-toggle-row">
            <div className="settings-toggle-row__info">
              <span className="settings-toggle-row__label">Autenticación de dos factores</span>
              <span className="settings-toggle-row__desc">Requiere un código adicional al iniciar sesión</span>
            </div>
            <Toggle checked={twoFactor} onChange={setTwoFactor} />
          </div>
        </div>
      </div>

      <div className="settings-form-card">
        <div className="settings-form-card__eyebrow">
          <IconClock width={16} height={16} />
          <Badge variant="glass">SESIONES</Badge>
        </div>
        <h3 className="settings-form-card__title">Sesiones activas</h3>

        <div className="settings-sessions">
          {SESSIONS.map(s => (
            <div key={s.id} className="settings-session-row">
              <div className="settings-session-row__dot-wrap">
                <span className={`settings-session-row__dot${s.active ? ' settings-session-row__dot--active' : ''}`} />
              </div>
              <div className="settings-session-row__info">
                <span className="settings-session-row__device">{s.device}</span>
                <span className="settings-session-row__meta">{s.location} · {s.time}</span>
              </div>
              {!s.active && (
                <Button variant="danger" size="small">Cerrar</Button>
              )}
              {s.active && <Badge variant="success">Esta sesión</Badge>}
            </div>
          ))}
        </div>

        <Button variant="danger" style={{ width: '100%', marginTop: 'var(--space-4)' }}>
          Cerrar todas las sesiones
        </Button>
      </div>
    </div>
  );
};

export default SeguridadTab;
