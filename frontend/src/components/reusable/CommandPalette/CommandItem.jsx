import { getIcon } from '../../icons/Icons.jsx';
import { IconChevronRight } from '../../icons/Icons.jsx';

const CommandItem = ({ entry, highlighted, onSelect, onHover, recent = false }) => {
  const handleClick = (e) => {
    e.preventDefault();
    onSelect?.(entry);
  };

  const iconNode = getIcon(entry.icon || 'search', { width: 18, height: 18 });

  return (
    <button
      type="button"
      className={`cmd-item ${highlighted ? 'cmd-item--highlighted' : ''}`}
      onMouseEnter={onHover}
      onMouseDown={handleClick}
      data-highlighted={highlighted || undefined}
    >
      <span className="cmd-item__icon" aria-hidden="true">
        {iconNode}
      </span>
      <span className="cmd-item__body">
        <span className="cmd-item__title">{entry.title}</span>
        {entry.description && (
          <span className="cmd-item__desc">{entry.description}</span>
        )}
      </span>
      {recent && <span className="cmd-item__badge">Reciente</span>}
      <span className="cmd-item__chevron" aria-hidden="true">
        <IconChevronRight width={14} height={14} />
      </span>
    </button>
  );
};

export default CommandItem;
