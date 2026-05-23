import { getIcon } from '../../../../components/icons/Icons.jsx';
import { basesMicasColumnDefs } from './basesMicasGrid.js';

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

export const renderTemplateItem = (item, { close }) => (
  <button
    key={item.id}
    className="bm-tmpl-item"
    onClick={() => { item.onClick?.(); close(); }}
  >
    <div className="bm-tmpl-item__body">
      <p className="bm-tmpl-item__title">{item.title}</p>
      <div className="bm-tmpl-item__meta">
        <span className="bm-tmpl-item__sku">{item.sku}</span>
        <span className="bm-tmpl-item__date">{item.date}</span>
      </div>
    </div>
    {getIcon('chevronRight', { width: 14, height: 14 })}
  </button>
);

export const getTemplateSearchText = (item) => `${item.title} ${item.sku}`;

export const templateMenuHeight = ({ isDesktop, isTablet, isMobileLandscape }) =>
  isDesktop ? 280 : isTablet ? 220 : isMobileLandscape ? 160 : 200;
