import { IconStar, IconClose, IconUser, IconClock, IconChevronDown } from '../../icons/Icons.jsx';
import './NotificationItem.css';

const NotificationItem = ({ type = 'info', title, description, action, time, onClose }) => (
  <div className={`notif-item notif-item--${type}`}>
    <div className="notif-item__row">
      <div className="notif-item__indicator">
        <IconClose width={12} height={12} />
      </div>
      <div className="notif-item__body">
        <div className="notif-item__title-row">
          <span className="notif-item__title">{title}</span>
          <div className="notif-item__actions">
            <button className="notif-item__action-btn" title="Destacar">
              <IconStar width={14} height={14} />
            </button>
            <button className="notif-item__action-btn" onClick={onClose} title="Cerrar">
              <IconClose width={14} height={14} />
            </button>
          </div>
        </div>

        <div className="notif-item__description">{description}</div>

        {action && (
          <button className="notif-item__link">
            {action} <IconChevronDown width={12} height={12} />
          </button>
        )}

        <div className="notif-item__meta">
          <span className="notif-item__meta-item">
            <IconUser width={12} height={12} /> Sistema
          </span>
          <span className="notif-item__meta-item">
            <IconClock width={12} height={12} /> {time}
          </span>
        </div>
      </div>
    </div>
  </div>
);

export default NotificationItem;
