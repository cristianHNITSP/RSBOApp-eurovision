import { motion } from 'framer-motion';
import useMotionTransition from '../../../composables/useMotionTransition.js';
import { getIcon } from '../../icons/Icons.jsx';
import './StatCard.css';

const VARIANTS = ['default', 'purple', 'blue', 'green', 'orange', 'cyan', 'red'];
const ICON_SPRING = { type: 'spring', stiffness: 350, damping: 15 };

const StatCard = ({ icon, value, label, description, badge, variant = 'default' }) => {
  const v = VARIANTS.includes(variant) ? variant : 'default';
  const transition = useMotionTransition(ICON_SPRING);

  return (
    <div className={`stat-card stat-card--${v}`}>
      <div className="stat-card__overlay" />
      <div className="stat-card__content">
        <div className="stat-card__header">
          <motion.div
            className="stat-card__icon"
            whileHover={{ scale: 1.15, rotate: 8 }}
            transition={transition}
          >
            {typeof icon === 'string' ? getIcon(icon, { width: '60%', height: '60%' }) : icon}
          </motion.div>
          {badge && <span className="stat-card__badge" />}
        </div>
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__label">{label}</div>
        {description && <div className="stat-card__description">{description}</div>}
      </div>
    </div>
  );
};

export default StatCard;
