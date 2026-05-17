import Button from '../../ui/Button/Button.jsx';
import ConfirmDropdown from '../../ui/ConfirmDropdown/ConfirmDropdown.jsx';
import Modal from '../Modal/Modal.jsx';
import './EditModal.css';

const EditModal = ({ isOpen, onClose, title, children, onSave, onCancel }) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {children}
      {(onSave || onCancel) && (
        <div className="edit-modal__footer">
          {onCancel && <Button variant="secondary" onClick={onCancel}>Cancelar</Button>}
          {onSave && (
            <ConfirmDropdown onConfirm={onSave} placement="top-right">
              <Button variant="primary" onClick={(e) => e.preventDefault()}>Guardar cambios</Button>
            </ConfirmDropdown>
          )}
        </div>
      )}
    </Modal>
  );
};

export default EditModal;
