import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../Modal/Modal.jsx';
import Button from '../../ui/Button/Button.jsx';
import useMotionTransition from '../../../composables/useMotionTransition.js';
import { IconUser } from '../../icons/Icons.jsx';
import { avatarCategories } from '../../../data/users.js';
import './AvatarSelectorModal.css';

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
const PANEL_SPRING = { type: 'spring', stiffness: 400, damping: 30, mass: 0.5 };

const buildAvatars = () =>
  Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    category: avatarCategories[Math.floor((i / 12) * avatarCategories.length)],
    color: COLORS[i % COLORS.length],
  }));

const panelVariants = {
  enter: (dir) => ({ x: dir * 56, opacity: 0, scale: 0.97 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir) => ({ x: dir * -56, opacity: 0, scale: 0.97 }),
};

const AvatarSelectorModal = ({ isOpen, onClose, onSelect }) => {
  const [selectedCategory, setSelectedCategory] = useState(avatarCategories[0]);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [direction, setDirection] = useState(0);
  const avatars = buildAvatars();
  const panelTransition = useMotionTransition(PANEL_SPRING);

  const handleCategoryChange = (newCat) => {
    if (newCat === selectedCategory) return;
    const prevIdx = avatarCategories.indexOf(selectedCategory);
    const nextIdx = avatarCategories.indexOf(newCat);
    setDirection(nextIdx > prevIdx ? 1 : -1);
    setSelectedCategory(newCat);
  };

  const handleSelect = () => { if (selectedAvatar) { onSelect?.(selectedAvatar); onClose(); } };

  const handleMouseEnter = (e) => {
    const el = e.currentTarget;
    const container = el.closest('.avatar-modal__grid');
    if (!container) return;

    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const hoverScale = 1.06; // Ajusta esto si cambias el scale en CSS
    const spaceNeeded = elRect.width * ((hoverScale - 1) / 2) + 2;
    let originX = 'center';
    let originY = 'center';

    if (elRect.left - containerRect.left < spaceNeeded) originX = 'left';
    else if (containerRect.right - elRect.right < spaceNeeded) originX = 'right';

    if (elRect.top - containerRect.top < spaceNeeded) originY = 'top';
    else if (containerRect.bottom - elRect.bottom < spaceNeeded) originY = 'bottom';

    el.style.transformOrigin = `${originX} ${originY}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Selecciona un avatar" size="large">
      <p className="avatar-modal__desc">Elige uno y presiona "Seleccionar".</p>

      <div className="avatar-modal__categories">
        {avatarCategories.map((cat) => (
          <button
            key={cat}
            className={['avatar-modal__cat-btn', selectedCategory === cat ? 'avatar-modal__cat-btn--active' : ''].join(' ')}
            onClick={() => handleCategoryChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{ overflow: 'hidden', padding: 'var(--space-2) 0' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={selectedCategory}
            className="avatar-modal__grid"
            custom={direction}
            variants={panelVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={panelTransition}
          >
            {avatars.map((av) => (
              <div
                key={av.id}
                className={['avatar-modal__option', selectedAvatar?.id === av.id ? 'avatar-modal__option--selected' : ''].join(' ')}
                style={{ background: `linear-gradient(135deg, ${av.color}, ${av.color}dd)` }}
                onClick={() => setSelectedAvatar(av)}
                onMouseEnter={handleMouseEnter}
              >
                <IconUser width="40%" height="40%" />
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="avatar-modal__footer">
        <div className="avatar-modal__preview">
          <div
            className="avatar-modal__preview-box"
            style={{ background: selectedAvatar ? `linear-gradient(135deg, ${selectedAvatar.color}, ${selectedAvatar.color}dd)` : 'var(--gradient-primary)' }}
          >
            <IconUser width="40%" height="40%" />
          </div>
          <span className="avatar-modal__preview-label">Vista previa</span>
        </div>
        <div className="avatar-modal__footer-btns">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSelect}>Seleccionar</Button>
        </div>
      </div>
    </Modal>
  );
};

export default AvatarSelectorModal;
