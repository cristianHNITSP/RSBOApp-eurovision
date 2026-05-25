import { createPortal } from 'react-dom';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useMotionTransition from '../../../composables/useMotionTransition.js';
import useBreakpoint from '../../../composables/useBreakpoint.js';
import Button from '../Button/Button.jsx';
import './ConfirmDropdown.css';

const POPOVER_W_FALLBACK = 240;
const POPOVER_H_FALLBACK = 120;
const GAP = 8;
const VIEWPORT_PAD = 16;

const ConfirmDropdown = ({
  children,
  onConfirm,
  message = '¿Estás seguro de hacer esta acción?',
  placement = 'top',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const springTransition = useMotionTransition({ type: 'spring', stiffness: 520, damping: 18, mass: 0.4 });
  const sheetTransition  = useMotionTransition({ type: 'spring', stiffness: 340, damping: 30, mass: 0.85 });
  const { isMobile } = useBreakpoint();

  const wantsTop   = placement.includes('top');
  const wantsRight = placement.includes('right');

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw   = window.innerWidth;
    const vh   = window.innerHeight;
    const popW = popoverRef.current?.offsetWidth  || POPOVER_W_FALLBACK;
    const popH = popoverRef.current?.offsetHeight || POPOVER_H_FALLBACK;

    /* ── Vertical: usa placement deseado, voltea si no hay espacio ── */
    let top, bottom;
    const upSpace   = rect.top;
    const downSpace = vh - rect.bottom;
    const useTop = wantsTop
      ? upSpace   >= popH + GAP || upSpace >= downSpace
      : downSpace <  popH + GAP && upSpace >  downSpace;

    if (useTop) {
      bottom = vh - rect.top + GAP;
      top    = 'auto';
    } else {
      top    = rect.bottom + GAP;
      bottom = 'auto';
    }

    /* ── Horizontal: usa placement deseado, voltea si overflow ───── */
    let left, right;
    const fitsLeftAnchor  = rect.left  + popW <= vw - VIEWPORT_PAD;
    const fitsRightAnchor = rect.right - popW >= VIEWPORT_PAD;
    const useRight = wantsRight ? fitsRightAnchor || !fitsLeftAnchor : !fitsLeftAnchor && fitsRightAnchor;

    if (useRight) {
      right = Math.max(VIEWPORT_PAD, vw - rect.right);
      left  = 'auto';
    } else {
      left  = Math.max(VIEWPORT_PAD, Math.min(rect.left, vw - popW - VIEWPORT_PAD));
      right = 'auto';
    }

    setCoords({ top, bottom, left, right });
  }, [wantsTop, wantsRight]);

  useLayoutEffect(() => {
    if (!isOpen || isMobile) return;
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, isMobile, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e) => {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inPopover = popoverRef.current?.contains(e.target);
      if (!inTrigger && !inPopover) setIsOpen(false);
    };
    const handleKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  /* Bloquea propagación nativa para que menús ancestros (ContextMenu,
     Modal con backdrop) no detecten clicks dentro del popover portaleado
     como "outside-click". */
  useEffect(() => {
    if (!isOpen) return;
    const el = popoverRef.current;
    if (!el) return;
    const stop = (e) => e.stopPropagation();
    el.addEventListener('mousedown',  stop);
    el.addEventListener('touchstart', stop, { passive: true });
    return () => {
      el.removeEventListener('mousedown',  stop);
      el.removeEventListener('touchstart', stop);
    };
  }, [isOpen]);

  const handleConfirm = () => {
    setIsOpen(false);
    onConfirm?.();
  };

  const popoverBody = (
    <div className="confirm-dropdown__content">
      <p className="confirm-dropdown__message">{message}</p>
      <div className="confirm-dropdown__actions">
        <Button variant="ghost"   size="small" onClick={() => setIsOpen(false)}>No</Button>
        <Button variant="primary" size="small" onClick={handleConfirm}>Sí</Button>
      </div>
    </div>
  );

  return (
    <div className="confirm-dropdown" ref={triggerRef}>
      <div onClick={() => setIsOpen((v) => !v)}>{children}</div>

      {createPortal(
        <AnimatePresence>
          {isOpen && isMobile && (
            <motion.div
              key="cd-backdrop"
              className="confirm-dropdown__backdrop"
              onClick={() => setIsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{    opacity: 0 }}
              transition={{ duration: 0.18 }}
            />
          )}

          {isOpen && isMobile && (
            <motion.div
              key="cd-popover-mobile"
              ref={popoverRef}
              className="confirm-dropdown__popover confirm-dropdown__popover--mobile"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{    y: '100%' }}
              transition={sheetTransition}
            >
              {popoverBody}
            </motion.div>
          )}

          {isOpen && !isMobile && coords && (
            <motion.div
              key="cd-popover-desktop"
              ref={popoverRef}
              className="confirm-dropdown__popover"
              style={{
                position: 'fixed',
                zIndex:   300,
                top:      coords.top    ?? 'auto',
                bottom:   coords.bottom ?? 'auto',
                left:     coords.left   ?? 'auto',
                right:    coords.right  ?? 'auto',
              }}
              initial={{ opacity: 0, scale: 0.82, y: wantsTop ? 16 : -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{    opacity: 0, scale: 0.82, y: wantsTop ? 16 : -16 }}
              transition={springTransition}
            >
              {popoverBody}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
};

export default ConfirmDropdown;
