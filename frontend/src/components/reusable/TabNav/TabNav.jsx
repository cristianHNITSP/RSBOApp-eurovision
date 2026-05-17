import { useRef, useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useMotionTransition from '../../../composables/useMotionTransition.js';
import { getIcon } from '../../icons/Icons.jsx';
import useBreakpoint from '../../../composables/useBreakpoint.js';
import Button from '../../ui/Button/Button.jsx';
import './TabNav.css';

const TabNavContext = createContext(null);

// ── Provider ────────────────────────────────────────────────────────────────
// Wrap TabNav + TabPanel siblings in this once. Tracks direction automatically.
export const TabNavProvider = ({ tabs, activeTab, onChange, children }) => {
  const [direction, setDirection] = useState(0);

  // Sincrónico: direction y activeTab cambian en el mismo render (React 18 batching)
  const handleChange = (newId) => {
    const prevIdx = tabs.findIndex(t => t.id === activeTab);
    const nextIdx = tabs.findIndex(t => t.id === newId);
    setDirection(nextIdx > prevIdx ? 1 : -1);
    onChange(newId);
  };

  return (
    <TabNavContext.Provider value={{ tabs, activeTab, onChange: handleChange, direction }}>
      {children}
    </TabNavContext.Provider>
  );
};

// ── TabPanels ─────────────────────────────────────────────────────────────────
// Wrap all your TabPanel components inside this to properly coordinate animations.
const panelVariants = {
  enter: (dir) => ({ x: dir * 48, opacity: 0, zIndex: 2 }),
  center: { x: 0, opacity: 1, zIndex: 2 },
  exit: (dir) => ({ x: dir * -48, opacity: 0, zIndex: 1 }),
};

/* Snappy responsive transition — fast spring, extremely responsive (~200ms) */
const PANEL_SPRING = { type: 'spring', stiffness: 380, damping: 35, mass: 0.5 };

export const TabPanels = ({ children, className = '' }) => {
  const ctx = useContext(TabNavContext);
  if (!ctx) throw new Error('<TabPanels> must be inside <TabNavProvider>');
  const { activeTab, direction } = ctx;
  const transition = useMotionTransition(PANEL_SPRING);

  const childrenArray = Array.isArray(children) ? children : [children];
  const activeChild = childrenArray.find((child) => child?.props?.tabId === activeTab);

  return (
    <div className="tab-panels-wrapper">
      <AnimatePresence mode="wait" custom={direction}>
        {activeChild && (
          <motion.div
            key={activeChild.props.tabId}
            className={['tab-panel', className].join(' ').trim()}
            custom={direction}
            variants={panelVariants}
            initial="enter"
            animate="center"
            exit="exit"
            onAnimationStart={() => document.querySelector('.app-page__content')?.classList.add('is-transitioning')}
            onAnimationComplete={() => document.querySelector('.app-page__content')?.classList.remove('is-transitioning')}
            transition={transition}
          >
            {activeChild.props.children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const TabPanel = ({ children }) => {
  return <>{children}</>;
};

// ── TabNav ────────────────────────────────────────────────────────────────────
// Works standalone (tabs/activeTab/onChange as props) or inside TabNavProvider.
/* Bouncy spring para tabs — bajo damping = snappy, responsive feel (ratio ~0.39) */
const TAB_SPRING = { type: 'spring', stiffness: 520, damping: 8, mass: 0.35 };

const TabNav = ({ tabs: tabsProp, activeTab: activeTabProp, onChange: onChangeProp }) => {
  const ctx = useContext(TabNavContext);
  const tabs = ctx?.tabs ?? tabsProp;
  const activeTab = ctx?.activeTab ?? activeTabProp;
  const onChange = ctx?.onChange ?? onChangeProp;

  const tabTransition = useMotionTransition(TAB_SPRING);
  const { isMobile } = useBreakpoint();
  const scrollRef = useRef(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const updateFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 4);
    setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  // Siempre activar scroll, actualizar fades cuando hay scroll
  useEffect(() => {
    updateFades();
    const el = scrollRef.current;
    el?.addEventListener('scroll', updateFades, { passive: true });
    return () => el?.removeEventListener('scroll', updateFades);
  }, [updateFades]);

  // Centrar tab activo cuando cambia
  useEffect(() => {
    const container = scrollRef.current;
    const activeBtn = container?.querySelector('.tab-nav__btn--active');
    if (!container || !activeBtn) return;
    const offset = activeBtn.offsetLeft - (container.offsetWidth - activeBtn.offsetWidth) / 2;
    container.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
  }, [activeTab]);

  return (
    <motion.div
      className={`tab-nav-wrapper${isMobile ? ' tab-nav-wrapper--mobile' : ''}`}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={tabTransition}
    >
      {showLeftFade && (
        <div className="tab-nav__fade tab-nav__fade--left" />
      )}

      <div ref={scrollRef} className="tab-nav">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            variant="glass"
            className={`tab-nav__btn${activeTab === tab.id ? ' tab-nav__btn--active' : ''}`}
          >
            {tab.icon && (
              <span className="tab-nav__icon">
                {typeof tab.icon === 'string' ? getIcon(tab.icon, { width: 16, height: 16 }) : tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.badge && <span className="tab-nav__badge">{tab.badge}</span>}
          </Button>
        ))}
      </div>

      {showRightFade && (
        <div className="tab-nav__fade tab-nav__fade--right" />
      )}
    </motion.div>
  );
};

export default TabNav;
