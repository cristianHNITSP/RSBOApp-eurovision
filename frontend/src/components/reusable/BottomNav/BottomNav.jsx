import { getIcon } from '../../icons/Icons.jsx';
import './BottomNav.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Inicio', icon: 'dashboard' },
  { id: 'usuarios', label: 'Usuarios', icon: 'users' },
  { id: 'inventario', label: 'Inventario', icon: 'box' },
  { id: 'ventas', label: 'Ventas', icon: 'cart' },
  { id: 'ajustes', label: 'Ajustes', icon: 'settings' },
];

const BottomNav = ({ activeSection, onSectionChange }) => {
  const isActive = (id) => activeSection === id || activeSection.startsWith(`${id}-`);

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Navegación principal">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`bottom-nav__item ${isActive(item.id) ? 'bottom-nav__item--active' : ''}`}
          onClick={() => onSectionChange(item.id)}
        >
          <span className="bottom-nav__icon">{getIcon(item.icon, { width: 22, height: 22 })}</span>
          <span className="bottom-nav__label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
