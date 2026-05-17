import { useState } from 'react';
import Avatar from '../../../../components/ui/Avatar/Avatar.jsx';
import Badge from '../../../../components/ui/Badge/Badge.jsx';
import Button from '../../../../components/ui/Button/Button.jsx';
import Input, { Select } from '../../../../components/ui/Input/Input.jsx';
import ConfirmDropdown from '../../../../components/ui/ConfirmDropdown/ConfirmDropdown.jsx';
import { IconUser, IconAt, IconPhone, IconEdit, IconCopy } from '../../../../components/icons/Icons.jsx';
import { userRoles } from '../../../../data/users.js';

export const searchConfig = {
  id: 'ajustes-perfil',
  title: 'Mi Perfil',
  description: 'Datos personales, avatar y rol',
  icon: 'user',
  group: 'otros',
  tags: ['perfil', 'cuenta', 'datos', 'avatar', 'nombre', 'foto', 'mi usuario'],
};

const PerfilTab = ({ openAvatarModal, commitGlobalAvatar, user }) => {
  const [pendingAvatar, setPendingAvatar] = useState(user.avatar);

  const handlePickAvatar = () => {
    openAvatarModal((av) => setPendingAvatar(av));
  };

  const handleSave = () => {
    commitGlobalAvatar(pendingAvatar);
  };

  return (
    <div className="settings-grid">
      <div className="settings-profile-card">
        <div className="settings-profile-card__badges">
          <Badge variant="primary">PERFIL</Badge>
          <Badge variant="success">ACTIVO</Badge>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="settings-profile-card__avatar-wrap" onClick={handlePickAvatar}>
            <Avatar src={pendingAvatar} size="xxlarge" status="online" />
            <div className="settings-profile-card__avatar-overlay">
              <span>Cambiar foto</span>
            </div>
          </div>
        </div>

        <div className="settings-profile-card__name-center">
          <h3 className="settings-profile-card__name">{user.name}</h3>
          <div className="settings-profile-card__username">
            <span>@{user.username}</span>
            <button className="settings-profile-card__copy-btn">
              <IconCopy width={14} height={14} />
            </button>
          </div>
        </div>

        <div className="settings-profile-card__stats">
          <div className="settings-stat-box">
            <div className="settings-stat-box__label">Miembro desde</div>
            <div className="settings-stat-box__value">{user.memberSince}</div>
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
            <Input value={user.name} icon={<IconUser width={16} height={16} />} onChange={() => {}} />
          </div>
          <div className="settings-form-card__field">
            <label>Nombre de usuario</label>
            <Input value={user.username} icon={<IconAt width={16} height={16} />} onChange={() => {}} />
          </div>
          <div className="settings-form-card__row">
            <div className="settings-form-card__field">
              <label>Teléfono</label>
              <Input placeholder="—" icon={<IconPhone width={16} height={16} />} onChange={() => {}} />
            </div>
            <div className="settings-form-card__field">
              <label>Rol asignado</label>
              <Select value={user.role} onChange={() => {}}>
                {userRoles.map(r => <option key={r}>{r}</option>)}
              </Select>
            </div>
          </div>
          <ConfirmDropdown onConfirm={handleSave} placement="top">
            <Button variant="primary" icon={<IconEdit width={16} height={16} />} style={{ width: '100%' }}>
              Guardar cambios
            </Button>
          </ConfirmDropdown>
        </div>
      </div>
    </div>
  );
};

export default PerfilTab;
