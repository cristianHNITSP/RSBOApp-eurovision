import './SectionBanner.css';

const SectionBanner = ({ tags = [], subtitle, badge, actions, avatar }) => {
  return (
    <div className="section-banner">
      <div className="section-banner__overlay" />
      <div className="section-banner__content">
        <div className="section-banner__main-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            {avatar && <div className="section-banner__avatar">{avatar}</div>}
            <div>
              <div className="section-banner__tags">
                {tags.map((tag, i) => (
                  <span 
                    key={i} 
                    className={['section-banner__tag', tag.size === 'sm' ? 'section-banner__tag--sm' : ''].join(' ').trim()}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
              {subtitle && <div className="section-banner__subtitle">{subtitle}</div>}
            </div>
          </div>
          {badge && <div>{badge}</div>}
        </div>
        {actions && (
          <div className="section-banner__actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default SectionBanner;
