import { useRef, useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useBreakpoint from '../../../../composables/useBreakpoint.js';
import QuickActionCard from '../../../../components/reusable/QuickActionCard/QuickActionCard.jsx';
import FormSection from '../../../../components/reusable/Form/FormSection.jsx';
import Navigation from '../../../../components/reusable/Navigation/Navigation.jsx';
import { getIcon } from '../../../../components/icons/Icons.jsx';
import Tooltip from '../../../../components/ui/Tooltip/Tooltip.jsx';

import TabNav, { TabNavProvider, TabPanels, TabPanel } from '../../../../components/reusable/TabNav/TabNav.jsx';

import ContextMenu from '../../../../components/ui/ContextMenu/ContextMenu.jsx';
import {
  TEMPLATE_DATA,
  TEMPLATE_TABS,
  DELETED_TEMPLATE_DATA,
  TEMPLATE_FORM_SECTIONS,
  ROW_SELECTION,
  PAGINATION_SIZE_SELECTOR,
  PANEL_TRANSITION,
} from './data.js';

import { getToolbarGroups, basesMicasColumnDefs, basesMicasRowData, editorialGlassTheme, defaultColDef } from './basesMicasGrid.js';
import { renderTemplateItem, getTemplateSearchText, templateMenuHeight } from './basesMicasUtils.jsx';
import { useBasesMicas } from './useBasesMicas.js';

import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';

import './BasesMicasSection.css';
import './BasesMicasGrid.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const BasesMicasSection = () => {
  const gridRef = useRef(null);

  const { state, actions } = useBasesMicas();
  const {
    rowData, isTemplateMenuOpen, isDeletedMenuOpen, isCreating,
    templateValues, gridApi, selectionCount
  } = state;
  const {
    setIsTemplateMenuOpen, setIsDeletedMenuOpen,
    handleToggleCreate, handleFormChange, handleGridReady, handleSelectionChanged
  } = actions;

  const { isTablet, isDesktop, isMobileLandscape } = useBreakpoint();
  const gridHeight = isDesktop ? 470 : isTablet ? 370 : isMobileLandscape ? 250 : 310;

  const toolbarGroups = useMemo(() => getToolbarGroups({
    isCreating,
    gridApi,
    selectionCount,
    actions
  }), [isCreating, gridApi, selectionCount, actions]);

  const navLeading = isCreating
    ? <span className="nav__count nav__count--muted">Nueva plantilla</span>
    : (selectionCount > 0
        ? <span className="nav__count">{selectionCount} {selectionCount === 1 ? 'seleccionada' : 'seleccionadas'}</span>
        : <span className="nav__count nav__count--muted">Sin selección</span>);

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
          <QuickActionCard icon="box"     title="Catálogo"     description="Referencias de bases y micas" />
          <QuickActionCard icon="refresh" title="Movimientos"  description="Entradas, salidas y ajustes" />
          <QuickActionCard icon="users"   title="Proveedores"  description="Gestión de proveedores" />
        </div>

        <div className="inv-bases-demo-wrapper">

          <div className="inv-bases-tabs">
            <Tooltip label={isCreating ? 'Cancelar creación' : 'Crear plantilla'} portal>
              <button
                className={['inv-bases-tab', isCreating ? 'inv-bases-tab--active' : ''].join(' ').trim()}
                aria-label={isCreating ? 'Cancelar creación' : 'Crear plantilla'}
                onClick={handleToggleCreate}
              >
                {isCreating
                  ? getIcon('close', { width: 15, height: 15 })
                  : getIcon('plus',  { width: 15, height: 15 })
                }
                {isCreating ? 'Cancelar' : 'Crear plantilla'}
              </button>
            </Tooltip>

            <ContextMenu
              trigger={
                <Tooltip label="Abrir plantilla" portal>
                  <button className="inv-bases-tab" aria-label="Abrir plantilla">
                    {getIcon('clipboard', { width: 15, height: 15 })}
                    Abrir plantilla
                  </button>
                </Tooltip>
              }
              isOpen={isTemplateMenuOpen}
              onToggle={setIsTemplateMenuOpen}
              placement="bottom-right"
              title="Catálogo de Plantillas"
              tabs={TEMPLATE_TABS}
              data={TEMPLATE_DATA}
              renderItem={renderTemplateItem}
              getItemSearchText={getTemplateSearchText}
              width="300"
              maxHeight={templateMenuHeight}
              initialSize={6}
              pageSize={4}
              searchPlaceholder="Buscar por nombre o SKU..."
            />

            <ContextMenu
              trigger={
                <Tooltip label="Plantillas eliminadas" portal>
                  <button className="inv-bases-tab" aria-label="Plantillas eliminadas">
                    {getIcon('trash', { width: 15, height: 15 })}
                    Plantillas eliminadas
                  </button>
                </Tooltip>
              }
              isOpen={isDeletedMenuOpen}
              onToggle={setIsDeletedMenuOpen}
              placement="bottom-right"
              title="Plantillas Eliminadas"
              data={DELETED_TEMPLATE_DATA}
              renderItem={renderTemplateItem}
              getItemSearchText={getTemplateSearchText}
              width="300"
              maxHeight={templateMenuHeight}
              initialSize={6}
              pageSize={4}
              searchPlaceholder="Buscar por nombre o SKU..."
            />
          </div>

          <Navigation
            ariaLabel="Acciones de la rejilla de bases y micas"
            modeKey={isCreating ? 'form' : 'grid'}
            leadingSlot={navLeading}
            groups={toolbarGroups}
          />

          <div className="inv-bases-demo">
            <div
              className="inv-bases-demo__grid"
              style={isCreating ? undefined : { height: gridHeight }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isCreating ? (
                  <motion.div
                    key="form"
                    className="inv-bases-demo__form-wrap"
                    initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0,  filter: 'blur(0px)' }}
                    exit={{    opacity: 0, y: -8,  filter: 'blur(6px)' }}
                    transition={PANEL_TRANSITION}
                  >
                    <FormSection
                      sections={TEMPLATE_FORM_SECTIONS}
                      values={templateValues}
                      onChange={handleFormChange}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="grid"
                    style={{ height: gridHeight }}
                    initial={{ opacity: 0, y: -8,  filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0,   filter: 'blur(0px)' }}
                    exit={{    opacity: 0, y: 14,   filter: 'blur(6px)' }}
                    transition={PANEL_TRANSITION}
                  >
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
                      multiSortKey="ctrl"
                      suppressMovableColumns={false}
                      suppressDragLeaveHidesColumns={true}
                      pagination={true}
                      paginationPageSize={10}
                      paginationPageSizeSelector={PAGINATION_SIZE_SELECTOR}
                      tooltipShowDelay={0}
                      tooltipHideDelay={2000}
                      onGridReady={handleGridReady}
                      onSelectionChanged={handleSelectionChanged}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default BasesMicasSection;
