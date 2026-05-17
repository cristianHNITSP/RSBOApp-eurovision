import './Divider.css';

const Divider = ({ className = '' }) => (
  <hr className={['divider', className].join(' ')} />
);

export default Divider;
