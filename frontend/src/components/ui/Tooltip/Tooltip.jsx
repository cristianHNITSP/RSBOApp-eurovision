import useBreakpoint from '../../../composables/useBreakpoint.js';
import './Tooltip.css';

const Tooltip = ({ label, children, placement = 'top' }) => {
  const { isMobile } = useBreakpoint();

  if (isMobile) return <>{children}</>;

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
