import { useState } from 'react';
import Avatar from '../../../../components/ui/Avatar/Avatar.jsx';
import Badge from '../../../../components/ui/Badge/Badge.jsx';
import Button from '../../../../components/ui/Button/Button.jsx';
import Input, { Select } from '../../../../components/ui/Input/Input.jsx';
import EditModal from '../../../../components/reusable/EditModal/EditModal.jsx';
import QuickActionCard from '../../../../components/reusable/QuickActionCard/QuickActionCard.jsx';
import { IconUsers, IconSearch, IconUser, IconAt, IconPlus, IconRefresh, IconInfo, IconEdit, IconKey, IconTrash } from '../../../../components/icons/Icons.jsx';
import { systemUsers, userRoles, userStatuses, currentUser } from '../../../../data/users.js';
import SectionBanner from '../../../../components/reusable/SectionBanner/SectionBanner.jsx';
import './UsersSection.css';

const UsersSection = ({ onOpenAvatarModal }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const openEdit = (user) => { setSelectedUser({ ...user }); setIsEditOpen(true); };
  const handleSave = () => { setIsEditOpen(false); };

  return (
    <div className="users-section">
      <SectionBanner 
        avatar={<Avatar src={currentUser.avatar} size="xlarge" status="online" />}
        tags={[
          { label: 'Luis Angel Chable' },
          { label: 'Yo', size: 'sm' },
          { label: 'Eurovisión', size: 'sm' },
          { label: 'eurovision', size: 'sm' }
        ]}
        subtitle="16/05/2026, 09:24 a.m."
        badge={<Badge variant="success">Activo</Badge>}
        actions={
          <>
            <Button variant="success" icon={<IconPlus width={16} height={16} />} size="medium">Nuevo usuario</Button>
            <Button variant="glass" icon={<IconRefresh width={16} height={16} />} size="medium">Recargar</Button>
            <Button variant="glass" icon={<IconInfo width={16} height={16} />} size="medium">Ver detalles</Button>
            <Button variant="glass" icon={<IconEdit width={16} height={16} />} size="medium" onClick={() => openEdit(systemUsers[0])}>Editar</Button>
            <Button variant="glass" icon={<IconKey width={16} height={16} />} size="medium">Contraseña</Button>
            <Button variant="danger" icon={<IconTrash width={16} height={16} />} size="medium">Papelera</Button>
          </>
        }
      />

      {/* Content */}
      <div className="users-content">
        <div className="users-content__header">
          <div className="users-content__eyebrow">
            <IconUsers width={16} height={16} /> GESTIÓN DE USUARIOS
          </div>
          <h2 className="users-content__title">Usuarios del sistema</h2>
          <p className="users-content__desc">Control de cuentas, roles y accesos del personal.</p>
          <div className="users-content__summary">
            <div>
              <span className="users-content__count">1 usuarios</span>
              <span className="users-content__count-active">1 activos</span>
            </div>
            <span className="users-content__roles">4 roles actuales</span>
          </div>
        </div>

        <div className="users-quick-actions">
          <QuickActionCard icon="user" title="Crear usuario" description="Asigna rol, nombre y correo" />
          <QuickActionCard icon="trash" title="Papelera" description="Los eliminados se pueden restaurar" />
        </div>

        <div className="users-filters">
          {[
            { label: 'Buscar usuario', el: <Input placeholder="Buscar por nombre o usuario..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} icon={<IconSearch width={16} height={16} />} /> },
            { label: 'Filtrar por rol', el: <Select><option>Todos los roles</option>{userRoles.map(r => <option key={r}>{r}</option>)}</Select> },
            { label: 'Filtrar por estado', el: <Select><option>Todos</option>{userStatuses.map(s => <option key={s}>{s}</option>)}</Select> },
          ].map(({ label, el }) => (
            <div key={label}>
              <label className="users-filter__label">{label}</label>
              {el}
            </div>
          ))}
        </div>

        <div className="users-table">
          <table className="users-table__el">
            <thead>
              <tr className="users-table__head">
                <th>Usuario</th>
                <th>Nombre de usuario</th>
                <th>Último acceso</th>
                <th>Estado</th>
                <th>Alta</th>
              </tr>
            </thead>
            <tbody>
              {systemUsers.map((user) => (
                <tr key={user.id} className="users-table__row" onClick={() => openEdit(user)}>
                  <td className="users-table__cell">
                    <div className="users-table__user">
                      <Avatar size="medium" />
                      <div>
                        <div className="users-table__user-name">
                          {user.name}
                          {user.isCurrentUser && <span className="users-table__you">Yo</span>}
                        </div>
                        <div className="users-table__user-role">{user.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="users-table__cell">
                    <div className="users-table__username">
                      <IconAt width={14} height={14} /> {user.username}
                    </div>
                  </td>
                  <td className="users-table__cell">{user.lastAccess}</td>
                  <td className="users-table__cell"><Badge variant="success">{user.status}</Badge></td>
                  <td className="users-table__cell">{user.createdDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isEditOpen && selectedUser && (
        <EditModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Editar usuario" onSave={handleSave} onCancel={() => setIsEditOpen(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={onOpenAvatarModal}>
                <Avatar size="xxlarge" status="online" />
              </div>
            </div>
            <div>
              <label className="users-filter__label">Nombre completo</label>
              <Input value={selectedUser.name} onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })} />
            </div>
            <div>
              <label className="users-filter__label">Nombre de usuario</label>
              <Input value={selectedUser.username} icon={<IconAt width={16} height={16} />} onChange={(e) => setSelectedUser({ ...selectedUser, username: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div>
                <label className="users-filter__label">Rol</label>
                <Select value={selectedUser.role} onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}>
                  {userRoles.map(r => <option key={r}>{r}</option>)}
                </Select>
              </div>
              <div>
                <label className="users-filter__label">Estado</label>
                <Select value={selectedUser.status} onChange={(e) => setSelectedUser({ ...selectedUser, status: e.target.value })}>
                  {userStatuses.map(s => <option key={s}>{s}</option>)}
                </Select>
              </div>
            </div>
          </div>
        </EditModal>
      )}
    </div>
  );
};

export default UsersSection;
