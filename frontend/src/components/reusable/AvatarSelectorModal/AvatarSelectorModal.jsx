import { useState } from 'react';
import Modal from '../Modal/Modal.jsx';
import Button from '../../ui/Button/Button.jsx';
import TabNav, { TabNavProvider, TabPanels, TabPanel } from '../TabNav/TabNav.jsx';
import { IconUser } from '../../icons/Icons.jsx';
import { avatarCategories } from '../../../data/users.js';
import './AvatarSelectorModal.css';

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

const buildAvatars = () =>
  Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    category: avatarCategories[Math.floor((i / 12) * avatarCategories.length)],
    color: COLORS[i % COLORS.length],
  }));

const CATEGORY_TABS = avatarCategories.map((cat) => ({ id: cat, label: cat }));

const AvatarSelectorModal = ({ isOpen, onClose, onSelect }) => {
  const [selectedCategory, setSelectedCategory] = useState(avatarCategories[0]);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const avatars = buildAvatars();

  const handleSelect = () => { if (selectedAvatar) { onSelect?.(selectedAvatar); onClose(); } };

  const handleMouseEnter = (e) => {
    const el = e.currentTarget;
    const container = el.closest('.avatar-modal__grid');
    if (!container) return;

    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const hoverScale = 1.06;
    const spaceNeeded = elRect.width * ((hoverScale - 1) / 2) + 2;
    let originX = 'center';
    let originY = 'center';

    if (elRect.left - containerRect.left < spaceNeeded) originX = 'left';
    else if (containerRect.right - elRect.right < spaceNeeded) originX = 'right';

    if (elRect.top - containerRect.top < spaceNeeded) originY = 'top';
    else if (containerRect.bottom - elRect.bottom < spaceNeeded) originY = 'bottom';

    el.style.transformOrigin = `${originX} ${originY}`;
  };

  const renderGrid = () => (
    <div className="avatar-modal__grid">
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
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Selecciona un avatar" size="large">
      <p className="avatar-modal__desc">Elige uno y presiona "Seleccionar".</p>

      <TabNavProvider tabs={CATEGORY_TABS} activeTab={selectedCategory} onChange={setSelectedCategory}>
        <TabNav />
        <TabPanels>
          {avatarCategories.map((cat) => (
            <TabPanel key={cat} tabId={cat}>
              {renderGrid()}
            </TabPanel>
          ))}
        </TabPanels>
      </TabNavProvider>

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
