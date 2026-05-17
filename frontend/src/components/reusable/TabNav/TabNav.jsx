import { useRef, useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useMotionTransition from '../../../composables/useMotionTransition.js';
import { getIcon } from '../../icons/Icons.jsx';
import useBreakpoint from '../../../composables/useBreakpoint.js';
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

// ── TabPanel ─────────────────────────────────────────────────────────────────
// Drop content inside this — animation direction is resolved from context.
const panelVariants = {
  enter: (dir) => ({ x: dir * 56, opacity: 0, scale: 0.97 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit:  (dir) => ({ x: dir * -56, opacity: 0, scale: 0.97 }),
};

const PANEL_SPRING = { type: 'spring', stiffness: 400, damping: 30, mass: 0.5 };

export const TabPanel = ({ tabId, children, className = '' }) => {
  const ctx = useContext(TabNavContext);
  if (!ctx) throw new Error('<TabPanel> must be inside <TabNavProvider>');
  const { activeTab, direction } = ctx;
  const transition = useMotionTransition(PANEL_SPRING);

  return (
    <AnimatePresence mode="wait" custom={direction}>
      {activeTab === tabId && (
        <motion.div
          key={tabId}
          className={['tab-panel', className].join(' ').trim()}
          custom={direction}
          variants={panelVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ── TabNav ────────────────────────────────────────────────────────────────────
// Works standalone (tabs/activeTab/onChange as props) or inside TabNavProvider.
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

  useEffect(() => {
    if (!isMobile) return;
    updateFades();
    const el = scrollRef.current;
    el?.addEventListener('scroll', updateFades, { passive: true });
    return () => el?.removeEventListener('scroll', updateFades);
  }, [isMobile, updateFades]);

  useEffect(() => {
    if (!isMobile) return;
    const container = scrollRef.current;
    const activeBtn = container?.querySelector('.tab-nav__btn--active');
    if (!container || !activeBtn) return;
    const offset = activeBtn.offsetLeft - (container.offsetWidth - activeBtn.offsetWidth) / 2;
    container.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
  }, [activeTab, isMobile]);

  return (
    <motion.div
      className={`tab-nav-wrapper${isMobile ? ' tab-nav-wrapper--mobile' : ''}`}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={tabTransition}
    >
      {isMobile && showLeftFade && (
        <div className="tab-nav__fade tab-nav__fade--left" />
      )}

      <div ref={scrollRef} className="tab-nav">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`tab-nav__btn${activeTab === tab.id ? ' tab-nav__btn--active' : ''}`}
            whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(139,92,246,0.18)' }}
            whileTap={{ scale: 0.86, y: 3 }}
            transition={tabTransition}
          >
            {tab.icon && (
              <span className="tab-nav__icon">
                {typeof tab.icon === 'string' ? getIcon(tab.icon, { width: 16, height: 16 }) : tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.badge && <span className="tab-nav__badge">{tab.badge}</span>}
          </motion.button>
        ))}
      </div>

      {isMobile && showRightFade && (
        <div className="tab-nav__fade tab-nav__fade--right" />
      )}
    </motion.div>
  );
};

export default TabNav;
