import { IconUser } from '../../icons/Icons.jsx';
import './Avatar.css';

const SIZES = { small: 'sm', medium: 'md', large: 'lg', xlarge: 'xl', xxlarge: '2xl' };

const Avatar = ({ src, alt = 'Avatar', size = 'medium', status, className = '' }) => {
  const sizeKey = SIZES[size] || size;
  const isObjectAvatar = src && typeof src === 'object' && src.color;

  return (
    <div className={['avatar', `avatar--${sizeKey}`, className].join(' ')}>
      <div 
        className="avatar__inner"
        style={isObjectAvatar ? { background: `linear-gradient(135deg, ${src.color}, ${src.color}dd)`, color: '#fff' } : {}}
      >
        {isObjectAvatar ? (
          <span className="avatar__icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
            <IconUser width="45%" height="45%" />
          </span>
        ) : src ? (
          <img src={src} alt={alt} className="avatar__img" />
        ) : (
          <span className="avatar__icon">
            <IconUser width="55%" height="55%" />
          </span>
        )}
      </div>
      {status && (
        <div className={['avatar__status', `avatar__status--${status}`].join(' ')} />
      )}
    </div>
  );
};

export default Avatar;
