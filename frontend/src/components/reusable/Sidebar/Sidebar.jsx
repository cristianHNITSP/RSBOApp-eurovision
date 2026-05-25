import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../../ui/Avatar/Avatar.jsx';
import { getIcon, IconChevronDown, IconChevronRight, IconChevronLeft } from '../../icons/Icons.jsx';
import { menuSections } from '../../../data/menuItems.js';
import useBreakpoint from '../../../composables/useBreakpoint.js';
import SubmenuStrip from '../SubmenuStrip/SubmenuStrip.jsx';
import SidebarSkeleton from './SidebarSkeleton.jsx';
import './Sidebar.css';

/* ── Typewriter component for real-time 60fps typing effect ── */
const TypewriterText = ({ text, speed = 20 }) => {
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    let index = 0;
    setCharCount(0);
    const interval = setInterval(() => {
      index++;
      setCharCount(index);
      if (index >= text.length) {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  const visible = text.substring(0, charCount);
  const hidden = text.substring(charCount);

  return (
    <>
      {visible}
      {hidden && (
        <span style={{ visibility: 'hidden' }} aria-hidden="true">
          {hidden}
        </span>
      )}
    </>
  );
};


const labelVariants = {
  hidden: { opacity: 0, x: -8, width: 0 },
  visible: {
    opacity: 1,
    x: 0,
    width: 'auto',
    transition: { type: 'spring', stiffness: 380, damping: 28, delay: 0.05 },
  },
  exit: {
    opacity: 0,
    x: -6,
    width: 0,
    transition: { duration: 0.15 },
  },
};

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const sectionItemVariant = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } },
};

/* ── Tooltip for collapsed icons ────────────────────────────── */
const CollapsedTooltip = ({ label }) => (
  <motion.span
    className="sidebar__tooltip"
    initial={{ opacity: 0, x: -6, scale: 0.92 }}
    animate={{ opacity: 1, x: 0, scale: 1 }}
    exit={{ opacity: 0, x: -4, scale: 0.94 }}
    transition={{ duration: 0.15 }}
    style={{
      position: 'fixed',
      left: 88,
      pointerEvents: 'none',
      background: 'linear-gradient(135deg, rgba(109,40,217,0.95), rgba(139,92,246,0.9))',
      color: '#fff',
      fontSize: 12,
      fontWeight: 600,
      padding: '5px 10px',
      borderRadius: 8,
      whiteSpace: 'nowrap',
      boxShadow: '0 4px 16px rgba(109,40,217,0.35), 0 1px 4px rgba(0,0,0,0.2)',
      border: '1px solid rgba(255,255,255,0.15)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
    }}
  >
    {label}
  </motion.span>
);

/* ── Component ──────────────────────────────────────────────── */
const Sidebar = ({ collapsed, onToggle, activeSection, onSectionChange, userInfo, loading = false }) => {
  const [openSubmenuId, setOpenSubmenuId] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const itemRefs = useRef({});
  const { isTablet } = useBreakpoint();

  const effectiveCollapsed = isTablet ? true : collapsed;

  if (loading) return <SidebarSkeleton collapsed={effectiveCollapsed} />;

  const handleItemClick = (item) => {
    if (item.hasSubmenu) {
      const isSameOpen = openSubmenuId === item.id;
      setOpenSubmenuId(isSameOpen ? null : item.id);
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
    ? menuSections.flatMap((s) => s.items).find((i) => i.id === openSubmenuId)
    : null;
  const anchorEl = openSubmenuId ? itemRefs.current[openSubmenuId] : null;
  const anchorRect = anchorEl ? anchorEl.getBoundingClientRect() : null;

  return (
    <aside
      className={`sidebar ${effectiveCollapsed ? 'sidebar--collapsed' : 'sidebar--expanded'}`}
    >
      {/* Liquid glass background */}
      <div className="sidebar__bg" />
      <div className="sidebar__orb-2" />

      <div className="sidebar__inner">

        {/* ── Brand header ── */}
        <div className="sidebar__header">
          <div className="sidebar__header-row">
            <div className={`sidebar__brand ${effectiveCollapsed ? 'sidebar__brand--hidden' : ''}`}>
              <div className="sidebar__brand-main">
                {!effectiveCollapsed && (
                  <div className="sidebar__brand-logo">
                    <img src="/favicon.svg" alt="Logo empresarial" />
                  </div>
                )}
                <div className="sidebar__brand-text">
                  <div className="sidebar__brand-name">
                    {!effectiveCollapsed ? <TypewriterText text="RSBO" speed={45} /> : ''}
                  </div>
                  <div className="sidebar__brand-sub">
                    {!effectiveCollapsed ? <TypewriterText text="Laboratorio Eurovisión" speed={20} /> : ''}
                  </div>
                </div>
              </div>
            </div>

            {effectiveCollapsed && isTablet && (
              <div className="sidebar__logo-placeholder">
                <img src="/favicon.svg" alt="Logo empresarial" />
              </div>
            )}

            {!isTablet && (
              <button
                className="sidebar__toggle"
                onClick={onToggle}
                title={effectiveCollapsed ? 'Expandir' : 'Colapsar'}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={effectiveCollapsed ? 'right' : 'left'}
                    initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 30, scale: 0.7 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex' }}
                  >
                    {effectiveCollapsed
                      ? <IconChevronRight width={18} height={18} />
                      : <IconChevronLeft width={18} height={18} />
                    }
                  </motion.span>
                </AnimatePresence>
              </button>
            )}
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="sidebar__nav">
          {menuSections.map((section, si) => (
            <motion.div
              key={section.id}
              className="sidebar__section"
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              custom={si}
            >
              {effectiveCollapsed
                ? <div className="sidebar__section-divider" title={section.label} />
                : (
                  <motion.div
                    className="sidebar__section-label"
                    variants={sectionItemVariant}
                  >
                    {section.label}
                  </motion.div>
                )
              }

              {section.items.map((item) => {
                const isActive = activeSection === item.id
                  || (item.hasSubmenu && activeSection.startsWith(`${item.id}/`));
                const isOpen = openSubmenuId === item.id;
                const showTooltip = effectiveCollapsed && hoveredItem === item.id && !isOpen;

                return (
                  <motion.div
                    key={item.id}
                    variants={sectionItemVariant}
                    style={{ position: 'relative' }}
                    onHoverStart={() => setHoveredItem(item.id)}
                    onHoverEnd={() => setHoveredItem(null)}
                  >
                    <motion.button
                      ref={(el) => { if (el) itemRefs.current[item.id] = el; }}
                      onClick={() => handleItemClick(item)}
                      className={`sidebar__item${isActive ? ' sidebar__item--active' : ''}`}
                    >
                      {/* Left */}
                      <div className="sidebar__item-left">
                        <span className="sidebar__item-icon">
                          {getIcon(item.icon, { width: 20, height: 20 })}
                        </span>
                        <span className={`sidebar__item-label ${effectiveCollapsed ? 'sidebar__item-label--hidden' : ''}`}>
                          {!effectiveCollapsed ? <TypewriterText text={item.label} speed={20} /> : ''}
                        </span>
                      </div>

                      {/* Right — badge + chevron */}
                      <div className={`sidebar__item-right ${effectiveCollapsed ? 'sidebar__item-right--hidden' : ''}`}>
                        {item.badge && (
                          <span className={`sidebar__item-badge sidebar__item-badge--${item.badgeColor || 'orange'}`}>
                            {item.badge}
                          </span>
                        )}
                        {item.hasSubmenu && (
                          <span className={`sidebar__item-chevron ${isOpen ? 'sidebar__item-chevron--open' : ''}`}>
                            <IconChevronRight width={12} height={12} />
                          </span>
                        )}
                      </div>
                    </motion.button>

                    {/* Tooltip in collapsed mode */}
                    <AnimatePresence>
                      {showTooltip && <CollapsedTooltip label={item.label} />}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          ))}
        </nav>

        {/* ── User footer ── */}
        <div className="sidebar__footer">
          <div className="sidebar__user">
            <Avatar src={userInfo?.avatar} size="large" status="online" />
            <div className={`sidebar__user-info ${effectiveCollapsed ? 'sidebar__user-info--hidden' : ''}`}>
              <div className="sidebar__user-name">
                {!effectiveCollapsed ? <TypewriterText text={userInfo?.name || 'Luis Angel Chable'} speed={20} /> : ''}
              </div>
              <div className="sidebar__user-username">
                {!effectiveCollapsed ? <TypewriterText text={`@${userInfo?.username || 'eurovision'}`} speed={25} /> : ''}
              </div>
            </div>
          </div>
        </div>

      </div>

      <SubmenuStrip
        isOpen={!!openSubmenuId}
        onClose={() => setOpenSubmenuId(null)}
        onSelect={handleSubmenuSelect}
        parentId={openSubmenuId}
        items={openParent?.submenu || []}
        anchorRect={anchorRect}
        orientation="horizontal"
        variant="sidebar"
        activeSection={activeSection}
      />
    </aside>
  );
};

export default Sidebar;
