import { getIcon } from '../../../../../components/icons/Icons.jsx';
import ConfirmDropdown from '../../../../../components/ui/ConfirmDropdown/ConfirmDropdown.jsx';
import { basesMicasColumnDefs } from '../config/basesMicasGrid.js';

// Schema plano de fields
export const COLUMN_FIELD_KEYS = basesMicasColumnDefs
  .flatMap((c) => c.children || [c])
  .map((c) => c.field)
  .filter(Boolean);

export const buildEmptyRow = () =>
  COLUMN_FIELD_KEYS.reduce((o, k) => ({ ...o, [k]: '' }), {});

export const parseClipboardTsv = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cells = line.split('\t');
      return COLUMN_FIELD_KEYS.reduce(
        (o, k, i) => ({ ...o, [k]: cells[i] ?? '' }),
        {},
      );
    });

const TemplateItemBody = ({ item }) => (
  <div className="bm-tmpl-item__body">
    <p className="bm-tmpl-item__title">{item.title}</p>
    <div className="bm-tmpl-item__meta">
      <span className="bm-tmpl-item__sku">{item.sku}</span>
      <span className="bm-tmpl-item__date">{item.date}</span>
    </div>
  </div>
);

export const renderActiveTemplateItem = (item, { close, onSendToTrash }) => (
  <div key={item.id} className="bm-tmpl-item">
    <button
      type="button"
      className="bm-tmpl-item__open"
      onClick={() => { item.onClick?.(); close?.(); }}
    >
      <TemplateItemBody item={item} />
      {getIcon('chevronRight', { width: 14, height: 14 })}
    </button>

    <div className="bm-tmpl-item__actions" onClick={(e) => e.stopPropagation()}>
      <ConfirmDropdown
        message="¿Mover esta plantilla a la papelera?"
        onConfirm={() => onSendToTrash?.(item.id)}
        placement="bottom"
      >
        <button
          type="button"
          className="bm-tmpl-item__action bm-tmpl-item__action--danger"
          aria-label="Mover a papelera"
        >
          {getIcon('trash', { width: 14, height: 14 })}
        </button>
      </ConfirmDropdown>
    </div>
  </div>
);

export const renderDeletedTemplateItem = (item, { onRestore, onDeleteForever }) => (
  <div key={item.id} className="bm-tmpl-item bm-tmpl-item--deleted">
    <TemplateItemBody item={item} />

    <div className="bm-tmpl-item__actions" onClick={(e) => e.stopPropagation()}>
      <ConfirmDropdown
        message="¿Restaurar esta plantilla?"
        onConfirm={() => onRestore?.(item.id)}
        placement="bottom"
      >
        <button
          type="button"
          className="bm-tmpl-item__action"
          aria-label="Restaurar plantilla"
        >
          {getIcon('refresh', { width: 14, height: 14 })}
        </button>
      </ConfirmDropdown>

      <ConfirmDropdown
        message="¿Eliminar permanentemente? Esta acción no se puede deshacer."
        onConfirm={() => onDeleteForever?.(item.id)}
        placement="bottom"
      >
        <button
          type="button"
          className="bm-tmpl-item__action bm-tmpl-item__action--danger"
          aria-label="Eliminar permanentemente"
        >
          {getIcon('trash', { width: 14, height: 14 })}
        </button>
      </ConfirmDropdown>
    </div>
  </div>
);

export const getTemplateSearchText = (item) => `${item.title} ${item.sku}`;

export const templateMenuHeight = ({ isDesktop, isTablet, isMobileLandscape }) =>
  isDesktop ? 280 : isTablet ? 220 : isMobileLandscape ? 160 : 200;
