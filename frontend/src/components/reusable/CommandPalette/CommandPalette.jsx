import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useMotionTransition from '../../../composables/useMotionTransition.js';
import useBreakpoint from '../../../composables/useBreakpoint.js';
import { filterRegistry, findEntryById, searchRegistry } from '../../../composables/useSearchRegistry.js';
import { useRecentSearches, pushRecent } from '../../../composables/useRecentSearches.js';
import {
  IconSearch,
  IconClose,
  IconCommand,
  IconCornerDownLeft,
  IconArrowUp,
  IconArrowDown,
  IconClock,
  IconStar,
} from '../../icons/Icons.jsx';
import CommandItem from './CommandItem.jsx';
import './CommandPalette.css';

const SPRING_DESKTOP = { type: 'spring', stiffness: 520, damping: 18, mass: 0.4 };
const SPRING_MOBILE = { type: 'spring', stiffness: 320, damping: 28, mass: 0.8 };

const PALETTE_WIDTH = 520;
const VIEWPORT_MARGIN = 16;
const MAX_RECENT = 4;
const MAX_RECOMMENDED = 4;

const isMacPlatform = () => {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || '');
};

const CommandPalette = ({ isOpen, onClose, onNavigate, anchorSelector = '.command-palette-anchor' }) => {
  const { isMobile } = useBreakpoint();
  const transition = useMotionTransition(isMobile ? SPRING_MOBILE : SPRING_DESKTOP);
  const recents = useRecentSearches();

  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [anchorRect, setAnchorRect] = useState(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const isMac = useMemo(() => isMacPlatform(), []);

  const results = useMemo(() => filterRegistry(query), [query]);

  const recentEntries = useMemo(() => {
    if (query.trim()) return [];
    return recents
      .map((r) => findEntryById(r.id))
      .filter(Boolean)
      .slice(0, MAX_RECENT);
  }, [recents, query]);

  const recommendedEntries = useMemo(() => {
    if (query.trim()) return [];
    const recentIds = new Set(recentEntries.map((e) => e.id));
    return searchRegistry
      .filter((entry) => !recentIds.has(entry.id))
      .slice(0, MAX_RECOMMENDED);
  }, [recentEntries, query]);

  const flatList = useMemo(() => {
    if (query.trim()) {
      return results.map((entry) => ({ entry, recent: false }));
    }
    const list = [];
    recentEntries.forEach((e) => list.push({ entry: e, recent: true }));
    recommendedEntries.forEach((e) => list.push({ entry: e, recent: false }));
    return list;
  }, [recentEntries, recommendedEntries, results, query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setHighlightedIndex(0);
      return;
    }
    if (typeof document !== 'undefined' && !isMobile) {
      const anchor = document.querySelector(anchorSelector);
      if (anchor) setAnchorRect(anchor.getBoundingClientRect());
    }
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 30);
    return () => clearTimeout(t);
  }, [isOpen, isMobile, anchorSelector]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || isMobile) return;
    const onResize = () => {
      const anchor = document.querySelector(anchorSelector);
      if (anchor) setAnchorRect(anchor.getBoundingClientRect());
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isOpen, isMobile, anchorSelector]);

  const handleSelect = (entry) => {
    if (!entry) return;
    pushRecent(entry.id);
    onNavigate?.(entry.id);
    onClose?.();
  };

  const onInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, flatList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = flatList[highlightedIndex];
      if (target) handleSelect(target.entry);
    }
  };

  const positionStyle = useMemo(() => {
    if (isMobile || !anchorRect) return undefined;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const width = Math.min(PALETTE_WIDTH, vw - VIEWPORT_MARGIN * 2);
    const anchorCenter = anchorRect.left + anchorRect.width / 2;
    let left = anchorCenter - width / 2;
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;
    if (left + width > vw - VIEWPORT_MARGIN) left = vw - VIEWPORT_MARGIN - width;
    const top = anchorRect.bottom + 8;
    return { top: `${top}px`, left: `${left}px`, width: `${width}px` };
  }, [anchorRect, isMobile]);

  const initial = isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.96, y: -6 };
  const animate = isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 };
  const exitProps = isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 };

  const body = (
    <>
      <div className="cmd-palette__header">
        <span className="cmd-palette__search-icon" aria-hidden="true">
          <IconSearch width={18} height={18} />
        </span>
        <input
          ref={inputRef}
          type="text"
          className="cmd-palette__input"
          placeholder="Buscar secciones, configuraciones, atajos…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKeyDown}
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="button"
          className="cmd-palette__close"
          onClick={onClose}
          aria-label="Cerrar buscador"
        >
          <IconClose width={14} height={14} />
        </button>
      </div>

      <div className="cmd-palette__body" role="listbox">
        {flatList.length === 0 && (
          <div className="cmd-palette__empty">
            <span className="cmd-palette__empty-icon"><IconSearch width={28} height={28} /></span>
            <div className="cmd-palette__empty-title">Sin resultados</div>
            <div className="cmd-palette__empty-desc">
              No encontramos nada para "{query}". Probá con otra palabra.
            </div>
          </div>
        )}

        {!query.trim() && recentEntries.length > 0 && (
          <div className="cmd-palette__group">
            <div className="cmd-palette__group-label">
              <IconClock width={12} height={12} />
              <span>Recientes</span>
            </div>
            {recentEntries.map((entry, idx) => (
              <CommandItem
                key={`r-${entry.id}`}
                entry={entry}
                highlighted={idx === highlightedIndex}
                onSelect={handleSelect}
                onHover={() => setHighlightedIndex(idx)}
                recent
              />
            ))}
          </div>
        )}

        {!query.trim() && recommendedEntries.length > 0 && (
          <div className="cmd-palette__group">
            <div className="cmd-palette__group-label">
              <IconStar width={12} height={12} />
              <span>Recomendaciones</span>
            </div>
            {recommendedEntries.map((entry, idx) => {
              const flatIdx = recentEntries.length + idx;
              return (
                <CommandItem
                  key={`rec-${entry.id}`}
                  entry={entry}
                  highlighted={flatIdx === highlightedIndex}
                  onSelect={handleSelect}
                  onHover={() => setHighlightedIndex(flatIdx)}
                />
              );
            })}
          </div>
        )}

        {query.trim() && results.length > 0 && (
          <div className="cmd-palette__group">
            {results.map((entry, idx) => (
              <CommandItem
                key={`q-${entry.id}`}
                entry={entry}
                highlighted={idx === highlightedIndex}
                onSelect={handleSelect}
                onHover={() => setHighlightedIndex(idx)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="cmd-palette__footer">
        <div className="cmd-palette__hints">
          <span className="cmd-palette__hint">
            <kbd className="cmd-palette__kbd"><IconArrowUp width={10} height={10} /></kbd>
            <kbd className="cmd-palette__kbd"><IconArrowDown width={10} height={10} /></kbd>
            navegar
          </span>
          <span className="cmd-palette__hint">
            <kbd className="cmd-palette__kbd"><IconCornerDownLeft width={10} height={10} /></kbd>
            abrir
          </span>
          <span className="cmd-palette__hint">
            <kbd className="cmd-palette__kbd">esc</kbd>
            cerrar
          </span>
        </div>
        <span className="cmd-palette__brand">
          {isMac ? <IconCommand width={11} height={11} /> : <span className="cmd-palette__kbd-text">Ctrl</span>}
          <span className="cmd-palette__kbd-text">+ K</span>
        </span>
      </div>
    </>
  );

  const jsx = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="cmd-backdrop"
            className={`cmd-palette__backdrop ${isMobile ? 'cmd-palette__backdrop--mobile' : ''}`}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
          />
          <motion.div
            key="cmd-panel"
            ref={panelRef}
            className={`cmd-palette ${isMobile ? 'cmd-palette--mobile' : ''}`}
            style={positionStyle}
            initial={initial}
            animate={animate}
            exit={exitProps}
            transition={transition}
            role="dialog"
            aria-modal="true"
            aria-label="Buscador de secciones"
          >
            {body}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(jsx, document.body) : jsx;
};

export default CommandPalette;
