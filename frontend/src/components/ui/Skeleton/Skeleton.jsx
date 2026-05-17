import './Skeleton.css';

const Skeleton = ({
  variant = 'text',
  width,
  height,
  radius,
  className = '',
  style = {},
  count = 1,
  gap = 8,
}) => {
  const baseClass = `skeleton skeleton--${variant} ${className}`.trim();
  const sizeStyle = {
    width: width ?? (variant === 'circle' ? height : undefined),
    height: height ?? (variant === 'text' ? '14px' : variant === 'badge' ? '20px' : undefined),
    borderRadius: radius,
    ...style,
  };

  if (count === 1) {
    return <span className={baseClass} style={sizeStyle} aria-hidden="true" />;
  }

  return (
    <span className="skeleton-stack" style={{ gap }} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={baseClass}
          style={{
            ...sizeStyle,
            width: typeof width === 'function' ? width(i) : width,
          }}
        />
      ))}
    </span>
  );
};

export default Skeleton;
