import Avatar from '../../../../components/ui/Avatar/Avatar.jsx';
import Badge from '../../../../components/ui/Badge/Badge.jsx';
import Button from '../../../../components/ui/Button/Button.jsx';
import Input, { Select } from '../../../../components/ui/Input/Input.jsx';
import { IconUser, IconAt, IconPhone, IconEdit, IconCopy } from '../../../../components/icons/Icons.jsx';
import { currentUser, userRoles } from '../../../../data/users.js';

const PerfilTab = ({ onOpenAvatarModal }) => (
  <div className="settings-grid">
    <div className="settings-profile-card">
      <div className="settings-profile-card__badges">
        <Badge variant="primary">PERFIL</Badge>
        <Badge variant="success">ACTIVO</Badge>
        <Badge variant="glass">EUROVISION</Badge>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="settings-profile-card__avatar-wrap" onClick={onOpenAvatarModal}>
          <Avatar size="xxlarge" status="online" />
          <div className="settings-profile-card__avatar-overlay">
            <span>Cambiar foto</span>
          </div>
        </div>
      </div>

      <div className="settings-profile-card__name-center">
        <h3 className="settings-profile-card__name">{currentUser.name}</h3>
        <div className="settings-profile-card__username">
          <span>@{currentUser.username}</span>
          <button className="settings-profile-card__copy-btn">
            <IconCopy width={14} height={14} />
          </button>
        </div>
      </div>

      <div className="settings-profile-card__stats">
        <div className="settings-stat-box">
          <div className="settings-stat-box__label">Miembro desde</div>
          <div className="settings-stat-box__value">{currentUser.memberSince}</div>
        </div>
        <div className="settings-stat-box">
          <div className="settings-stat-box__label">Último acceso</div>
          <div className="settings-stat-box__value">Hace 1 minuto</div>
        </div>
      </div>
    </div>

    <div className="settings-form-card">
      <div className="settings-form-card__eyebrow">
        <IconUser width={16} height={16} />
        <Badge variant="primary">PERFIL</Badge>
      </div>
      <h3 className="settings-form-card__title">Información del perfil</h3>

      <div className="settings-form-card__fields">
        <div className="settings-form-card__field">
          <label>Nombre completo</label>
          <Input value={currentUser.name} icon={<IconUser width={16} height={16} />} onChange={() => {}} />
        </div>
        <div className="settings-form-card__field">
          <label>Nombre de usuario</label>
          <Input value={currentUser.username} icon={<IconAt width={16} height={16} />} onChange={() => {}} />
        </div>
        <div className="settings-form-card__row">
          <div className="settings-form-card__field">
            <label>Teléfono</label>
            <Input placeholder="—" icon={<IconPhone width={16} height={16} />} onChange={() => {}} />
          </div>
          <div className="settings-form-card__field">
            <label>Rol asignado</label>
            <Select value={currentUser.role} onChange={() => {}}>
              {userRoles.map(r => <option key={r}>{r}</option>)}
            </Select>
          </div>
        </div>
        <Button variant="primary" icon={<IconEdit width={16} height={16} />} style={{ width: '100%' }}>
          Guardar cambios
        </Button>
      </div>
    </div>
  </div>
);

export default PerfilTab;
