import { useMemo, useState } from 'react';
import Button from '../../ui/Button/Button.jsx';
import IconButton from '../../ui/IconButton/IconButton.jsx';
import Dropdown, { DropdownItem } from '../../ui/Dropdown/Dropdown.jsx';
import CommandPalette from '../CommandPalette/CommandPalette.jsx';
import useCommandPalette from '../../../composables/useCommandPalette.js';
import useBreakpoint from '../../../composables/useBreakpoint.js';
import {
  IconBell,
  IconUser,
  IconPalette,
  IconShield,
  IconLogout,
  IconSearch,
  IconCommand,
} from '../../icons/Icons.jsx';
import './Header.css';

const isMacPlatform = () => {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || '');
};

const Header = ({
  title,
  breadcrumbs,
  onNotificationClick,
  notificationCount = 0,
  onUserClick,
  onNavigate,
  showSearch = false,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const palette = useCommandPalette();
  const isMac = useMemo(() => isMacPlatform(), []);
  const { isMobileOrTablet } = useBreakpoint();
  const showCompactTrigger = isMobileOrTablet;

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

        {showSearch && !showCompactTrigger && (
          <div className="app-header__search">
            <button
              type="button"
              className="app-header__search-trigger command-palette-anchor"
              onClick={palette.open}
              aria-label="Abrir buscador (Ctrl+K)"
            >
              <span className="app-header__search-trigger-icon">
                <IconSearch width={18} height={18} />
              </span>
              <span className="app-header__search-trigger-text">Buscar secciones…</span>
              <span className="app-header__search-trigger-kbd">
                {isMac ? <IconCommand width={11} height={11} /> : 'Ctrl'}
                <span>+ K</span>
              </span>
            </button>
          </div>
        )}

        <div className="app-header__right">
          {showSearch && showCompactTrigger && (
            <IconButton
              icon={<IconSearch width={20} height={20} />}
              variant="glass"
              onClick={palette.open}
              className="command-palette-anchor"
              title="Buscar (Ctrl+K)"
            />
          )}

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

      <CommandPalette
        isOpen={palette.isOpen}
        onClose={palette.close}
        onNavigate={onNavigate}
        anchorSelector=".command-palette-anchor"
      />
    </header>
  );
};

export default Header;
