import { useRef, useState, useEffect } from 'react';
import useBreakpoint from '../../../../composables/useBreakpoint.js';
import QuickActionCard from '../../../../components/reusable/QuickActionCard/QuickActionCard.jsx';
import { getIcon } from '../../../../components/icons/Icons.jsx';

import { basesMicasColumnDefs, basesMicasRowData, editorialGlassTheme, defaultColDef } from '../../../../data/basesMicasGrid.js';

import {
  AllCommunityModule,
  ModuleRegistry,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';

import './BasesMicasSection.css';
import './BasesMicasGrid.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const ROW_SELECTION = { mode: 'multiRow', checkboxes: true, headerCheckbox: true };

const STATUS_BAR = {
  statusPanels: [
    { statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left' },
    { statusPanel: 'agSelectedRowCountComponent', align: 'right' },
  ],
};

const SIDE_BAR = { toolPanels: ['columns'] };
const PAGINATION_SIZE_SELECTOR = [10, 20, 50];

const BasesMicasSection = () => {
  const gridRef = useRef(null);
  const [quickFilter, setQuickFilter] = useState('');
  const [rowData, setRowData] = useState(null);

  const { isTablet, isDesktop, isMobileLandscape } = useBreakpoint();
  const gridHeight = isDesktop
    ? 470
    : isTablet
      ? 370
      : isMobileLandscape
        ? 250
        : 310;

  useEffect(() => {
    const t = setTimeout(() => setRowData(basesMicasRowData), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="inv-bases-section">
      <div className="inv-bases-content">
        <div className="inv-bases-content__eyebrow">
          {getIcon('shield', { width: 16, height: 16 })} INVENTARIO
        </div>
        <h2 className="inv-bases-content__title">Bases y Micas</h2>
        <p className="inv-bases-content__desc">
          Administra el stock de bases oftálmicas y micas para lentes graduados.
        </p>

        <div className="inv-bases-cards">
          <QuickActionCard icon="box" title="Catálogo" description="Referencias de bases y micas" />
          <QuickActionCard icon="refresh" title="Movimientos" description="Entradas, salidas y ajustes" />
          <QuickActionCard icon="users" title="Proveedores" description="Gestión de proveedores" />
        </div>

        <div className="inv-bases-demo-wrapper">

          <div className="inv-bases-toolbar">
            {/* El filtro rápido de AG Grid no tiene un componente de búsqueda integrado, así que creamos uno personalizado 
                        <div className="inv-bases-toolbar__filter">
              {getIcon('search', { width: 15, height: 15 })}
              <input
                type="text"
                placeholder="Filtrar filas..."
                className="inv-bases-toolbar__input"
                value={quickFilter}
                onChange={e => setQuickFilter(e.target.value)}
              />
              {quickFilter && (
                <button
                  className="inv-bases-toolbar__clear"
                  onClick={() => setQuickFilter('')}
                  aria-label="Limpiar filtro"
                >
                  {getIcon('close', { width: 13, height: 13 })}
                </button>
              )}
            </div>

            <button
              className="inv-bases-toolbar__btn"
              onClick={() => gridRef.current?.api.exportDataAsCsv({ fileName: 'bases-micas.csv' })}
            >
              {getIcon('arrowDown', { width: 15, height: 15 })}
              Exportar CSV
            </button>
            */}

          </div>

          <div className="inv-bases-demo">
            <div className="inv-bases-demo__grid" style={{ height: gridHeight }}>
              <AgGridReact
                ref={gridRef}
                theme={editorialGlassTheme}
                rowData={rowData}
                columnDefs={basesMicasColumnDefs}
                defaultColDef={defaultColDef}
                columnHoverHighlight={true}
                rowHeight={42}
                headerHeight={42}
                animateRows
                rowSelection={ROW_SELECTION}
                statusBar={STATUS_BAR}
                sideBar={SIDE_BAR}
                quickFilterText={quickFilter}
                pagination={true}
                paginationPageSize={10}
                paginationPageSizeSelector={PAGINATION_SIZE_SELECTOR}
                tooltipShowDelay={300}
                tooltipHideDelay={2000}
              />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default BasesMicasSection;
