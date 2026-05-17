import { useState } from 'react';
import { motion } from 'framer-motion';
import Avatar from '../../ui/Avatar/Avatar.jsx';
import { getIcon, IconChevronDown, IconChevronRight, IconChevronLeft } from '../../icons/Icons.jsx';
import { menuSections } from '../../../data/menuItems.js';
import useBreakpoint from '../../../composables/useBreakpoint.js';
import './Sidebar.css';

const Sidebar = ({ collapsed, onToggle, activeSection, onSectionChange, userInfo }) => {
  const [expandedMenus, setExpandedMenus] = useState({});
  const { isTablet } = useBreakpoint();

  const effectiveCollapsed = isTablet ? true : collapsed;

  const toggleSubmenu = (id) => setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <aside className={`sidebar ${effectiveCollapsed ? 'sidebar--collapsed' : 'sidebar--expanded'}`}>
      <div className="sidebar__bg" />
      <div className="sidebar__inner">

        {/* Brand header */}
        <div className="sidebar__header">
          <div className="sidebar__header-row">
            <div className={`sidebar__brand ${effectiveCollapsed ? 'sidebar__brand--hidden' : ''}`}>
              <div className="sidebar__brand-name">RSBO</div>
              <div className="sidebar__brand-sub">Laboratorio Eurovisión</div>
            </div>
            {!isTablet && (
              <button
                className="sidebar__toggle"
                onClick={onToggle}
                title={effectiveCollapsed ? 'Expandir' : 'Colapsar'}
              >
                {effectiveCollapsed ? <IconChevronRight width={18} height={18} /> : <IconChevronLeft width={18} height={18} />}
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          {menuSections.map((section) => (
            <div key={section.id} className="sidebar__section">
              {effectiveCollapsed ? (
                <div className="sidebar__section-divider" title={section.label} />
              ) : (
                <div className="sidebar__section-label">{section.label}</div>
              )}
              {section.items.map((item) => (
                <motion.button
                  key={item.id}
                  onClick={() => { onSectionChange(item.id); if (item.hasSubmenu) toggleSubmenu(item.id); }}
                  className={`sidebar__item ${activeSection === item.id ? 'sidebar__item--active' : ''}`}
                >
                  <div className="sidebar__item-left">
                    <span className="sidebar__item-icon sidebar__item-icon--lg">
                      {getIcon(item.icon, { width: 20, height: 20 })}
                    </span>
                    {!effectiveCollapsed && <span className="sidebar__item-label">{item.label}</span>}
                  </div>
                  {!effectiveCollapsed && (
                    <div className="sidebar__item-right">
                      {item.badge && (
                        <span className={`sidebar__item-badge sidebar__item-badge--${item.badgeColor || 'orange'}`}>
                          {item.badge}
                        </span>
                      )}
                      {item.hasSubmenu && (
                        <span className={`sidebar__item-chevron ${expandedMenus[item.id] ? 'sidebar__item-chevron--open' : ''}`}>
                          <IconChevronDown width={12} height={12} />
                        </span>
                      )}
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="sidebar__footer">
          <div className="sidebar__user">
            <Avatar src={userInfo?.avatar} size="large" status="online" />
            <div className={`sidebar__user-info ${effectiveCollapsed ? 'sidebar__user-info--hidden' : ''}`}>
              <div className="sidebar__user-name">{userInfo?.name || 'Luis Angel Chable'}</div>
              <div className="sidebar__user-username">{userInfo?.username || 'eurovision'}</div>
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
};

export default Sidebar;
