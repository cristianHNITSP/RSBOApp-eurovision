import { useRef, useState } from 'react';
import { getIcon } from '../../icons/Icons.jsx';
import { menuSections } from '../../../data/menuItems.js';
import SubmenuStrip from '../SubmenuStrip/SubmenuStrip.jsx';
import './BottomNav.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Inicio', icon: 'dashboard' },
  { id: 'usuarios', label: 'Usuarios', icon: 'users' },
  { id: 'inventario', label: 'Inventario', icon: 'box' },
  { id: 'ventas', label: 'Ventas', icon: 'cart' },
  { id: 'ajustes', label: 'Ajustes', icon: 'settings' },
];

// Merge submenu data from menuSections into local NAV_ITEMS
const allMenuItems = menuSections.flatMap((s) => s.items);
const ITEMS_WITH_SUBMENU = NAV_ITEMS.map((item) => {
  const source = allMenuItems.find((mi) => mi.id === item.id);
  if (source?.hasSubmenu) {
    return { ...item, hasSubmenu: true, submenu: source.submenu };
  }
  return item;
});

const BottomNav = ({ activeSection, onSectionChange }) => {
  const [openSubmenuId, setOpenSubmenuId] = useState(null);
  const itemRefs = useRef({});

  const isActive = (id) =>
    activeSection === id
    || activeSection.startsWith(`${id}-`)
    || activeSection.startsWith(`${id}/`);

  const handleItemClick = (item) => {
    if (item.hasSubmenu) {
      const isSameOpen = openSubmenuId === item.id;
      setOpenSubmenuId(isSameOpen ? null : item.id);
      const alreadyInChild = activeSection?.startsWith(`${item.id}/`);
      const firstChild = item.submenu?.[0];
      if (!isSameOpen && !alreadyInChild && firstChild) {
        onSectionChange(`${item.id}/${firstChild.id}`);
      }
      return;
    }
    setOpenSubmenuId(null);
    onSectionChange(item.id);
  };

  const handleSubmenuSelect = (fullId) => {
    onSectionChange(fullId);
    setOpenSubmenuId(null);
  };

  const openParent = openSubmenuId
    ? ITEMS_WITH_SUBMENU.find((i) => i.id === openSubmenuId)
    : null;
  const anchorEl = openSubmenuId ? itemRefs.current[openSubmenuId] : null;
  const anchorRect = anchorEl ? anchorEl.getBoundingClientRect() : null;

  return (
    <>
      <nav className="bottom-nav" role="navigation" aria-label="Navegación principal">
        {ITEMS_WITH_SUBMENU.map((item) => (
          <button
            key={item.id}
            ref={(el) => { if (el) itemRefs.current[item.id] = el; }}
            type="button"
            className={`bottom-nav__item ${isActive(item.id) ? 'bottom-nav__item--active' : ''}`}
            onClick={() => handleItemClick(item)}
          >
            <span className="bottom-nav__icon">{getIcon(item.icon, { width: 22, height: 22 })}</span>
            <span className="bottom-nav__label">{item.label}</span>
          </button>
        ))}
      </nav>

      <SubmenuStrip
        isOpen={!!openSubmenuId}
        onClose={() => setOpenSubmenuId(null)}
        onSelect={handleSubmenuSelect}
        parentId={openSubmenuId}
        items={openParent?.submenu || []}
        anchorRect={anchorRect}
        orientation="vertical"
        variant="bottom-nav"
      />
    </>
  );
};

export default BottomNav;
