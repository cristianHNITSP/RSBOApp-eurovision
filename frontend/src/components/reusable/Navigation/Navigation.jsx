import { useEffect, useRef, useCallback, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useMotionTransition from '../../../composables/useMotionTransition.js';
import Tooltip from '../../ui/Tooltip/Tooltip.jsx';
import IconButton from '../../ui/IconButton/IconButton.jsx';
import { getIcon } from '../../icons/Icons.jsx';
import './Navigation.css';

const DEFAULT_TRANSITION = { duration: 0.22, ease: [0.22, 1, 0.36, 1] };

const Navigation = ({
  ariaLabel = 'Acciones',
  modeKey = 'default',
  leadingSlot,
  trailingSlot,
  groups = [],
  transition = DEFAULT_TRANSITION,
  className = '',
}) => {
  const swapTransition = useMotionTransition(transition);
  const rootRef = useRef(null);
  const groupsRef = useRef(null);

  const getActionButtons = useCallback(
    () => Array.from(groupsRef.current?.querySelectorAll('button[data-nav-action]') ?? []),
    [],
  );

  // Roving tabindex + Left/Right arrow navigation (WAI-ARIA toolbar pattern)
  const handleKeyDown = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    const buttons = getActionButtons().filter((b) => !b.disabled);
    if (!buttons.length) return;
    const idx = buttons.indexOf(document.activeElement);
    let next = idx;
    if (e.key === 'ArrowLeft')  next = idx <= 0 ? buttons.length - 1 : idx - 1;
    if (e.key === 'ArrowRight') next = idx === buttons.length - 1 ? 0 : idx + 1;
    if (e.key === 'Home')       next = 0;
    if (e.key === 'End')        next = buttons.length - 1;
    if (next !== idx) {
      e.preventDefault();
      buttons[next]?.focus();
    }
  };

  // Tras un swap de modo, devolver el foco al primer botón del nuevo set
  // solo si el foco estaba dentro del toolbar (no robar foco al usuario).
  // Esperamos a que AnimatePresence mode="wait" complete exit + enter.
  useEffect(() => {
    if (!rootRef.current?.contains(document.activeElement)) return;
    const t = setTimeout(() => {
      const first = getActionButtons().find((b) => !b.disabled);
      first?.focus();
    }, 260);
    return () => clearTimeout(t);
  }, [modeKey, getActionButtons]);

  return (
    <div
      ref={rootRef}
      role="toolbar"
      aria-label={ariaLabel}
      className={['nav', className].filter(Boolean).join(' ')}
      onKeyDown={handleKeyDown}
    >
      {leadingSlot != null && (
        <div className="nav__leading">{leadingSlot}</div>
      )}

      <div className="nav__scroll" aria-hidden={false}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={modeKey}
            ref={groupsRef}
            className="nav__groups"
            initial={{ opacity: 0, y: 4, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{    opacity: 0, y: -4, filter: 'blur(4px)' }}
            transition={swapTransition}
          >
            {groups.map((group, gi) => (
              <Fragment key={group.id}>
                {gi > 0 && <span className="nav__divider" aria-hidden="true" />}
                <div
                  className="nav__group"
                  role="group"
                  aria-label={group.label || group.id}
                >
                  {group.actions.map((action) => (
                    <Tooltip
                      key={action.id}
                      label={action.tooltip || action.label}
                      placement="top"
                      portal
                    >
                      <IconButton
                        size="small"
                        variant={action.variant || 'ghost'}
                        disabled={action.disabled}
                        onClick={action.onClick}
                        ariaLabel={action.label}
                        title={action.tooltip || action.label}
                        className="nav__btn"
                        data-nav-action
                        icon={getIcon(action.icon, { width: 16, height: 16 })}
                      />
                    </Tooltip>
                  ))}
                </div>
              </Fragment>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {trailingSlot != null && (
        <div className="nav__trailing">{trailingSlot}</div>
      )}
    </div>
  );
};

export default Navigation;
