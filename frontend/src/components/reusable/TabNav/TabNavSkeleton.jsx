import Skeleton from '../../ui/Skeleton/Skeleton.jsx';
import './TabNav.css';

const TabNavSkeleton = ({ count = 4 }) => {
  return (
    <div className="tab-nav" aria-busy="true" style={{ display: 'flex', gap: 8, padding: '4px 0' }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          variant="rect"
          width={i === 0 ? 120 : 92 + (i % 3) * 16}
          height={36}
          radius={10}
        />
      ))}
    </div>
  );
};

export default TabNavSkeleton;
