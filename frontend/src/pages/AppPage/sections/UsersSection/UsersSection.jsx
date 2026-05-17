import { useRef, useState } from 'react';
import Avatar from '../../../../components/ui/Avatar/Avatar.jsx';
import Badge from '../../../../components/ui/Badge/Badge.jsx';
import Button from '../../../../components/ui/Button/Button.jsx';
import Input, { Select } from '../../../../components/ui/Input/Input.jsx';
import EditModal from '../../../../components/reusable/EditModal/EditModal.jsx';
import QuickActionCard from '../../../../components/reusable/QuickActionCard/QuickActionCard.jsx';
import UsersTable from '../../../../components/reusable/UsersTable/UsersTable.jsx';
import {
  IconUsers,
  IconSearch,
  IconAt,
  IconPlus,
  IconRefresh,
  IconInfo,
  IconEdit,
  IconKey,
  IconTrash,
} from '../../../../components/icons/Icons.jsx';
import { systemUsers, userRoles, userStatuses } from '../../../../data/users.js';
import SectionBanner from '../../../../components/reusable/SectionBanner/SectionBanner.jsx';
import useBreakpoint from '../../../../composables/useBreakpoint.js';
import useSectionLoading from '../../../../composables/useSectionLoading.js';
import UsersSectionSkeleton from './UsersSectionSkeleton.jsx';
import './UsersSection.css';

export const searchConfig = {
  id: 'usuarios',
  title: 'Gestión de Usuarios',
  description: 'Administrar cuentas, roles y permisos del sistema',
  icon: 'users',
  group: 'gestion',
  tags: ['cuentas', 'personas', 'permisos', 'roles', 'admin', 'team', 'equipo'],
};

const DEFAULT_USER = systemUsers.find((u) => u.isCurrentUser) || systemUsers[0];

const UsersSection = ({ openAvatarModal, commitGlobalAvatar }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [bannerUser, setBannerUser] = useState(DEFAULT_USER);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const bannerRef = useRef(null);
  const { isMobile, isTablet } = useBreakpoint();
  const { loading } = useSectionLoading('usuarios');

  if (loading) return <UsersSectionSkeleton />;

  const selectUserFromTable = (user) => {
    setBannerUser(user);
    const block = isMobile ? 'start' : isTablet ? 'center' : 'nearest';
    bannerRef.current?.scrollIntoView({ behavior: 'smooth', block });
  };

  const openEdit = () => { setSelectedUser({ ...bannerUser }); setIsEditOpen(true); };

  const handleSave = () => {
    if (selectedUser) {
      if (selectedUser.isCurrentUser && selectedUser.avatar) {
        commitGlobalAvatar(selectedUser.avatar);
      }
      setBannerUser((prev) => ({ ...prev, ...selectedUser }));
    }
    setIsEditOpen(false);
  };

  const handlePickAvatar = () => {
    openAvatarModal((av) => setSelectedUser((prev) => ({ ...prev, avatar: av })));
  };

  const statusVariant = bannerUser.status === 'Activo' ? 'success' : 'danger';
  const avatarStatus = bannerUser.status === 'Activo' ? 'online' : undefined;

  return (
    <div className="users-section">
      <div ref={bannerRef}>
        <SectionBanner
          avatar={<Avatar src={bannerUser.avatar} size="xlarge" status={avatarStatus} />}
          tags={[
            { label: bannerUser.name },
            ...(bannerUser.isCurrentUser ? [{ label: 'Yo', size: 'sm' }] : []),
            { label: bannerUser.role, size: 'sm' },
            { label: bannerUser.username, size: 'sm' },
          ]}
          subtitle={bannerUser.lastAccess}
          badge={<Badge variant={statusVariant}>{bannerUser.status}</Badge>}
          actions={
            <>
              <Button variant="success" icon={<IconPlus width={16} height={16} />} size="medium">Nuevo usuario</Button>
              <Button variant="glass" icon={<IconRefresh width={16} height={16} />} size="medium">Recargar</Button>
              <Button variant="glass" icon={<IconInfo width={16} height={16} />} size="medium">Ver detalles</Button>
              <Button variant="glass" icon={<IconEdit width={16} height={16} />} size="medium" onClick={openEdit}>Editar</Button>
              <Button variant="glass" icon={<IconKey width={16} height={16} />} size="medium">Contraseña</Button>
              <Button variant="danger" icon={<IconTrash width={16} height={16} />} size="medium">Papelera</Button>
            </>
          }
        />
      </div>

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

        <UsersTable
          users={systemUsers}
          selectedUserId={bannerUser.id}
          onSelectUser={selectUserFromTable}
        />
      </div>

      {isEditOpen && selectedUser && (
        <EditModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Editar usuario" onSave={handleSave} onCancel={() => setIsEditOpen(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={handlePickAvatar}>
                <Avatar src={selectedUser.avatar} size="xxlarge" status="online" />
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
