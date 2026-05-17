import { getIcon } from '../../icons/Icons.jsx';
import './QuickActionCard.css';

const QuickActionCard = ({ icon, title, description, onClick }) => (
  <button className="quick-action" onClick={onClick}>
    <div className="quick-action__icon">
      {typeof icon === 'string' ? getIcon(icon, { width: '55%', height: '55%' }) : icon}
    </div>
    <div className="quick-action__text">
      <div className="quick-action__title">{title}</div>
      <div className="quick-action__desc">{description}</div>
    </div>
  </button>
);

export default QuickActionCard;
