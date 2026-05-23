import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import useBreakpoint from '../../../composables/useBreakpoint.js';
import './Tooltip.css';

const Tooltip = ({ label, children, placement = 'top', portal = false }) => {
  const { isMobile } = useBreakpoint();
  const wrapperRef = useRef(null);
  const [open, setOpen]   = useState(false);
  const [pos,  setPos]    = useState(null);

  // Calculate fixed position from wrapper rect (portal mode only)
  useLayoutEffect(() => {
    if (!portal || !open || !wrapperRef.current) return;
    const update = () => {
      const r = wrapperRef.current?.getBoundingClientRect();
      if (!r) return;
      setPos({
        left: r.left + r.width / 2,
        top:  placement === 'top' ? r.top : r.bottom,
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [portal, open, placement]);

  // Auto-close if the trigger or any ancestor loses pointer (defensive)
  useEffect(() => {
    if (!portal || !open) return;
    const onLeaveWindow = () => setOpen(false);
    window.addEventListener('blur', onLeaveWindow);
    return () => window.removeEventListener('blur', onLeaveWindow);
  }, [portal, open]);

  if (isMobile) return <>{children}</>;

  if (portal) {
    return (
      <span
        ref={wrapperRef}
        className="tooltip-wrapper"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
        {open && pos && typeof document !== 'undefined' && createPortal(
          <div
            className={`tooltip tooltip--portal tooltip--${placement}`}
            role="tooltip"
            style={{
              position: 'fixed',
              left: `${pos.left}px`,
              top:  `${pos.top}px`,
            }}
          >
            {label}
          </div>,
          document.body,
        )}
      </span>
    );
  }

  return (
    <div className="tooltip-wrapper">
      {children}
      <div className={`tooltip tooltip--${placement}`} role="tooltip">
        {label}
      </div>
    </div>
  );
};

export default Tooltip;
