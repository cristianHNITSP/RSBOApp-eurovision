import { useState } from 'react';
import Button from '../../ui/Button/Button.jsx';
import IconButton from '../../ui/IconButton/IconButton.jsx';
import Dropdown, { DropdownItem } from '../../ui/Dropdown/Dropdown.jsx';
import SearchBar from '../SearchBar/SearchBar.jsx';
import { IconBell, IconUser, IconPalette, IconShield, IconLogout } from '../../icons/Icons.jsx';
import './Header.css';

const Header = ({
  title,
  breadcrumbs,
  onNotificationClick,
  notificationCount = 0,
  onUserClick,
  onSearchChange,
  searchValue,
  showSearch = false,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__left">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="app-header__breadcrumbs">
              {breadcrumbs.map((crumb, idx) => (
                <span key={idx} className={idx === breadcrumbs.length - 1 ? 'app-header__breadcrumb-last' : ''}>
                  {crumb}
                  {idx < breadcrumbs.length - 1 && <span className="app-header__breadcrumb-sep"> /</span>}
                </span>
              ))}
            </div>
          )}
          <h1 className="app-header__title">{title}</h1>
        </div>

        {showSearch && (
          <div className="app-header__search">
            <SearchBar placeholder="Buscar..." value={searchValue} onChange={onSearchChange} />
          </div>
        )}

        <div className="app-header__right">
          <div className="app-header__notif">
            <IconButton
              icon={<IconBell width={20} height={20} />}
              variant="glass"
              onClick={onNotificationClick}
              className="notification-trigger"
              title="Notificaciones"
            />
            {notificationCount > 0 && (
              <span className="app-header__notif-badge">{notificationCount}</span>
            )}
          </div>

          <Dropdown
            isOpen={userDropdownOpen}
            onToggle={setUserDropdownOpen}
            trigger={
              <Button variant="primary" icon={<IconUser width={16} height={16} />}>
                Usuario
              </Button>
            }
          >
            <DropdownItem icon={<IconUser width={16} height={16} />} onClick={() => { onUserClick?.('perfil'); setUserDropdownOpen(false); }}>
              Mi Usuario
            </DropdownItem>
            <DropdownItem icon={<IconPalette width={16} height={16} />} onClick={() => { onUserClick?.('preferencias'); setUserDropdownOpen(false); }}>
              Preferencias
            </DropdownItem>
            <DropdownItem icon={<IconShield width={16} height={16} />} onClick={() => { onUserClick?.('seguridad'); setUserDropdownOpen(false); }}>
              Seguridad
            </DropdownItem>
            <div className="dropdown-divider" />
            <DropdownItem icon={<IconLogout width={16} height={16} />} onClick={() => { onUserClick?.('logout'); setUserDropdownOpen(false); }}>
              Cerrar Sesión
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
    </header>
  );
};

export default Header;
