import { useRef, useState, useEffect } from 'react';
import useBreakpoint from '../../../../composables/useBreakpoint.js';
import QuickActionCard from '../../../../components/reusable/QuickActionCard/QuickActionCard.jsx';
import { getIcon } from '../../../../components/icons/Icons.jsx';
import Tooltip from '../../../../components/ui/Tooltip/Tooltip.jsx';
import Dropdown, { DropdownItem } from '../../../../components/ui/Dropdown/Dropdown.jsx';

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
  const [rowData, setRowData] = useState(null);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);

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

          <div className="inv-bases-tabs">
            <Tooltip label="Crear plantilla">
              <button className="inv-bases-tab inv-bases-tab--active" aria-label="Crear plantilla">
                {getIcon('plus', { width: 15, height: 15 })}
                Crear plantilla
              </button>
            </Tooltip>

            <Dropdown
              trigger={
                <Tooltip label="Abrir plantilla">
                  <button className="inv-bases-tab" aria-label="Abrir plantilla">
                    {getIcon('clipboard', { width: 15, height: 15 })}
                    Abrir plantilla
                  </button>
                </Tooltip>
              }
              isOpen={isTemplateMenuOpen}
              onToggle={setIsTemplateMenuOpen}
              placement="bottom-left"
              className="template-dropdown"
            >
              <div className="template-menu-header">
                <h3>Catálogo de Plantillas</h3>
                <div className="template-search">
                  {getIcon('search', { width: 16, height: 16 })}
                  <input type="text" placeholder="Buscar por nombre o SKU..." />
                </div>
              </div>
              
              <div className="template-menu-group">
                <span className="template-group-title">RECIENTES</span>
                <DropdownItem onClick={() => setIsTemplateMenuOpen(false)} className="template-item">
                  <div className="template-item-content">
                    <p className="template-item-title">Progresivo (Base + ADD) | 1.74 | A...</p>
                    <div className="template-item-meta">
                      <span className="template-sku">00-00-BA-17-PRO-ALA-C499</span>
                      <span className="template-date">27/4/2026 07:02 p.m.</span>
                    </div>
                  </div>
                  {getIcon('chevron-right', { width: 16, height: 16 })}
                </DropdownItem>
                
                <DropdownItem onClick={() => setIsTemplateMenuOpen(false)} className="template-item">
                  <div className="template-item-content">
                    <p className="template-item-title">Monofocal (Base) | Policarbonato |...</p>
                    <div className="template-item-meta">
                      <span className="template-sku">EUR-ZEI-BAS-POL-MON-FCA-CACB</span>
                      <span className="template-date">27/4/2026 07:01 p.m.</span>
                    </div>
                  </div>
                  {getIcon('chevron-right', { width: 16, height: 16 })}
                </DropdownItem>
              </div>
            </Dropdown>
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
