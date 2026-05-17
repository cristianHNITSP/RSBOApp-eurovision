import { useState } from 'react';
import Dropdown from '../Dropdown/Dropdown.jsx';
import Button from '../Button/Button.jsx';
import './ConfirmDropdown.css';

const ConfirmDropdown = ({ children, onConfirm, message = '¿Estás seguro de hacer esta acción?', placement = 'top' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = () => {
    setIsOpen(false);
    onConfirm?.();
  };

  return (
    <Dropdown
      isOpen={isOpen}
      onToggle={setIsOpen}
      trigger={children}
      placement={placement}
      className="confirm-dropdown"
    >
      <div className="confirm-dropdown__content">
        <p className="confirm-dropdown__message">{message}</p>
        <div className="confirm-dropdown__actions">
          <Button variant="ghost" size="small" onClick={() => setIsOpen(false)}>No</Button>
          <Button variant="primary" size="small" onClick={handleConfirm}>Sí</Button>
        </div>
      </div>
    </Dropdown>
  );
};

export default ConfirmDropdown;
