import Avatar from '../../ui/Avatar/Avatar.jsx';
import Badge from '../../ui/Badge/Badge.jsx';
import { IconClock, IconAt, IconStar } from '../../icons/Icons.jsx';
import './UserProfileCard.css';

const UserProfileCard = ({ name, role, username, lastAccess, status, avatar, stats, onAdminProfile }) => (
  <div className="user-profile-card">
    <div className="user-profile-card__header">
      <div className="user-profile-card__header-left">
        <Avatar src={avatar} size="xxlarge" status={status} />
        <div className="user-profile-card__info">
          <div className="user-profile-card__greeting-badge">
            <Badge variant="primary" size="small">
              <IconStar width={10} height={10} /> ENCARGADO {role?.toUpperCase()}
            </Badge>
          </div>
          <div className="user-profile-card__system-text">
            Bienvenido a <span>Eurovisión</span>
          </div>
          <h2 className="user-profile-card__name">
            Buenos días, {name?.split(' ')[0]}
          </h2>
          <div className="user-profile-card__role">Usuario del sistema {role}.</div>
        </div>
      </div>

      <div className="user-profile-card__end">
        {stats && (
          <div className="user-profile-card__stats">
            {[['hojas', 'Hojas'], ['pendientes', 'Pendientes'], ['devoluciones', 'Devoluc.']].map(([key, label]) => (
              <div key={key} className="user-profile-card__stat">
                <div className="user-profile-card__stat-value">{stats[key]}</div>
                <div className="user-profile-card__stat-label">{label}</div>
              </div>
            ))}
          </div>
        )}

        {onAdminProfile && (
          <button className="user-profile-card__admin-btn-inner" onClick={onAdminProfile}>
            <Avatar size="small" />
            <span>{name?.split(' ')[0]}</span>
            <span>Administrar perfil →</span>
          </button>
        )}
      </div>
    </div>

    <div className="user-profile-card__footer">
      <div className="user-profile-card__meta">
        <div className="user-profile-card__meta-item">
          <span className="user-profile-card__meta-icon"><IconClock width={14} height={14} /></span>
          <span>Último acceso: {lastAccess}</span>
        </div>
        <div className="user-profile-card__meta-item">
          <span className="user-profile-card__meta-icon"><IconAt width={14} height={14} /></span>
          <span>{username}</span>
        </div>
      </div>
    </div>
  </div>
);

export default UserProfileCard;
