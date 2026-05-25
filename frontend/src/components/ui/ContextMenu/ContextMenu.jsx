import { createPortal } from 'react-dom';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useMotionTransition from '../../../composables/useMotionTransition.js';
import useBreakpoint from '../../../composables/useBreakpoint.js';
import { getIcon, IconClose } from '../../icons/Icons.jsx';
import './ContextMenu.css';

const ContextMenu = ({
  trigger,
  isOpen,
  onToggle,
  placement = 'bottom-left',
  title,
  tabs,
  defaultTab,
  data = {},
  renderItem,
  getItemSearchText,
  searchable = true,
  searchPlaceholder = 'Buscar...',
  width = 380,
  maxHeight = 200,
  initialSize = 5,
  pageSize = 4,
}) => {
  const containerRef = useRef(null);
  const menuRef      = useRef(null);
  const groupRef     = useRef(null);
  const debounceRef  = useRef(null);

  const springTransition = useMotionTransition({ type: 'spring', stiffness: 520, damping: 18, mass: 0.4 });

  const [activeTab,     setActiveTab]     = useState(defaultTab ?? tabs?.[0]?.key);
  const [search,        setSearch]        = useState('');
  const [visibleCount,  setVisibleCount]  = useState(initialSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [direction,     setDirection]     = useState(0);
  const [isMounting,    setIsMounting]    = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});

  const breakpoints = useBreakpoint();
  const { isMobile, isTablet, isDesktop, isMobileLandscape, isLandscape, isTouchDevice } = breakpoints;

  const resolvedMaxHeight = typeof maxHeight === 'function'
    ? maxHeight({ isMobile, isTablet, isDesktop, isMobileLandscape, isLandscape, isTouchDevice })
    : maxHeight;

  /* ── Position tracking — portal con fixed para desktop ─────── */
  const updateDropdownPos = useCallback(() => {
    if (!containerRef.current) return;
    const rect  = containerRef.current.getBoundingClientRect();
    const vw    = window.innerWidth;
    const vh    = window.innerHeight;
    const menuW = Number(width) || 380;
    const mxH   = Number(resolvedMaxHeight) || 200;
    const isTop   = placement.includes('top');
    const isRight = placement.includes('right');

    let top, bottom, left, right;

    if (isTop) {
      bottom = vh - rect.top + 8;
      top    = 'auto';
    } else {
      top    = rect.bottom + 8;
      bottom = 'auto';
    }

    if (isRight) {
      right = vw - rect.right;
      left  = 'auto';
    } else {
      left  = rect.left;
      right = 'auto';
    }

    // Colisión con bordes del viewport
    if (typeof left   === 'number' && left   + menuW > vw - 16) left   = Math.max(8, vw - menuW - 16);
    if (typeof right  === 'number' && right  + menuW > vw - 16) right  = Math.max(8, vw - menuW - 16);
    if (typeof top    === 'number' && top    + mxH   > vh - 16) { top    = 'auto'; bottom = vh - rect.top + 8; }
    if (typeof bottom === 'number' && bottom + mxH   > vh - 16) { bottom = 'auto'; top    = rect.bottom + 8; }

    setDropdownStyle({
      position: 'fixed',
      zIndex:   200,
      top, bottom, left, right,
      width:    menuW,
      maxWidth: 'calc(100vw - 24px)',
    });
  }, [placement, width, resolvedMaxHeight]);

  useLayoutEffect(() => {
    if (!isOpen || isMobile) return;
    updateDropdownPos();
    window.addEventListener('scroll', updateDropdownPos, true);
    window.addEventListener('resize', updateDropdownPos);
    return () => {
      window.removeEventListener('scroll', updateDropdownPos, true);
      window.removeEventListener('resize', updateDropdownPos);
    };
  }, [isOpen, isMobile, updateDropdownPos]);

  /* ── Initial mount spinner ──────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) { setIsMounting(false); return; }
    setIsMounting(true);
    const t = setTimeout(() => setIsMounting(false), 540);
    return () => clearTimeout(t);
  }, [isOpen]);

  /* ── Outside-click + ESC (desktop/tablet, no sheet) ─────────── */
  useEffect(() => {
    if (!isOpen || isMobile) return;
    const handleOutside = (e) => {
      const inTrigger = containerRef.current?.contains(e.target);
      const inMenu    = menuRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) onToggle?.(false);
    };
    const handleKey = (e) => { if (e.key === 'Escape') onToggle?.(false); };
    document.addEventListener('mousedown',  handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    document.addEventListener('keydown',    handleKey);
    return () => {
      document.removeEventListener('mousedown',  handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown',    handleKey);
    };
  }, [isOpen, isMobile, onToggle]);

  /* ── ESC en móvil ───────────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen || !isMobile) return;
    const handleKey = (e) => { if (e.key === 'Escape') onToggle?.(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, isMobile, onToggle]);

  /* ── Datos filtrados / paginados ────────────────────────────── */
  const items    = !tabs?.length && Array.isArray(data) ? data : (data[activeTab] ?? []);
  const filtered = search.trim() && getItemSearchText
    ? items.filter(item => getItemSearchText(item).toLowerCase().includes(search.toLowerCase()))
    : items;
  const visible  = filtered.slice(0, visibleCount);
  const hasMore  = visibleCount < filtered.length;

  useEffect(() => {
    setVisibleCount(initialSize);
    setIsLoadingMore(false);
    if (groupRef.current) groupRef.current.scrollTop = 0;
  }, [activeTab, search, initialSize]);

  /* ── Infinite scroll ────────────────────────────────────────── */
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => prev + pageSize);
      setIsLoadingMore(false);
    }, 700);
  }, [isLoadingMore, hasMore, pageSize]);

  const handleScroll = useCallback(() => {
    if (!groupRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = groupRef.current;
    if (scrollHeight <= clientHeight + 4) return;
    if (scrollHeight - scrollTop - clientHeight < 60) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(loadMore, 300);
    }
  }, [loadMore]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const close = useCallback(() => onToggle?.(false), [onToggle]);

  const handleTabChange = (key) => {
    const currentIndex = tabs?.findIndex(tab => tab.key === activeTab) ?? 0;
    const nextIndex    = tabs?.findIndex(tab => tab.key === key) ?? 0;
    setDirection(nextIndex >= currentIndex ? 1 : -1);
    setActiveTab(key);
    setSearch('');
  };

  /* ── Contenido compartido entre móvil y desktop ─────────────── */
  const headerEl = (title || tabs?.length > 0 || searchable) ? (
    <div className="ctx-menu__header">
      {title && <h3 className="ctx-menu__title">{title}</h3>}

      {tabs?.length > 0 && (
        <nav className="ctx-menu__nav" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={['ctx-menu__tab', activeTab === tab.key ? 'ctx-menu__tab--active' : ''].join(' ').trim()}
              onClick={() => handleTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}

      {searchable && (
        <div className="ctx-menu__search">
          {getIcon('search', { width: 14, height: 14 })}
          <input
            type="text"
            className="ctx-menu__search-input"
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}
    </div>
  ) : null;

  const groupEl = (
    <div
      className="ctx-menu__group"
      role="tabpanel"
      ref={groupRef}
      onScroll={handleScroll}
      style={isMobile ? undefined : {
        minHeight: isMounting ? (Number(resolvedMaxHeight) || resolvedMaxHeight) : undefined,
        maxHeight: Number(resolvedMaxHeight) || resolvedMaxHeight,
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isMounting ? (
          <motion.div
            key="__spinner__"
            className="ctx-menu__spinner-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="ctx-menu__spinner" />
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{
              opacity: 0,
              scaleY: 0.88,
              filter: 'blur(20px) saturate(0.25) brightness(1.45)',
              y: direction >= 0 ? 16 : -16,
            }}
            animate={{
              opacity: 1,
              scaleY: 1,
              filter: 'blur(0px) saturate(1) brightness(1)',
              y: 0,
            }}
            exit={{
              opacity: 0,
              scaleY: 1.07,
              filter: 'blur(20px) saturate(0.25) brightness(1.45)',
              y: direction >= 0 ? -16 : 16,
            }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.28, 1] }}
            style={{ display: 'flex', flexDirection: 'column', minHeight: 0, transformOrigin: 'top center' }}
          >
            {visible.length === 0 && !isLoadingMore && (
              <p className="ctx-menu__empty">Sin resultados</p>
            )}

            {visible.map(item => renderItem?.(item, { close }))}

            {isLoadingMore && (
              <div className="ctx-menu__loading">
                <span className="ctx-menu__loading-dot" />
                <span className="ctx-menu__loading-dot" />
                <span className="ctx-menu__loading-dot" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  /* ── Móvil: sheet deslizante desde abajo (portal) ──────────── */
  if (isMobile) {
    const sheetTransition = { type: 'spring', stiffness: 340, damping: 30, mass: 0.85 };

    return (
      <>
        <div onClick={() => onToggle?.(!isOpen)}>{trigger}</div>

        {createPortal(
          <AnimatePresence>
            {isOpen && (
              <div className="ctx-menu-sheet__overlay">
                <motion.div
                  className="ctx-menu-sheet__backdrop"
                  onClick={() => onToggle?.(false)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                />
                <motion.div
                  className="ctx-menu-sheet"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={sheetTransition}
                >
                  <div className="ctx-menu-sheet__handle" />

                  <div className="ctx-menu-sheet__titlebar">
                    {title && <h3 className="ctx-menu-sheet__title">{title}</h3>}
                    <button
                      className="ctx-menu-sheet__close"
                      onClick={() => onToggle?.(false)}
                      aria-label="Cerrar"
                    >
                      <IconClose width={16} height={16} />
                    </button>
                  </div>

                  {headerEl}
                  {groupEl}
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
      </>
    );
  }

  /* ── Desktop/Tablet: dropdown portaled con position: fixed ──── */
  return (
    <div className="ctx-menu-root" ref={containerRef}>
      <div onClick={() => onToggle?.(!isOpen)}>{trigger}</div>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="ctx-menu"
              ref={menuRef}
              style={dropdownStyle}
              initial={{ opacity: 0, scale: 0.82, y: placement.includes('top') ? 16 : -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.82, y: placement.includes('top') ? 16 : -16 }}
              transition={springTransition}
            >
              {headerEl}
              {groupEl}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default ContextMenu;
