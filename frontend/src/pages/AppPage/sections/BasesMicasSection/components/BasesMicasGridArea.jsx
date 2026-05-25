import { AnimatePresence, motion } from 'framer-motion';
import { AgGridReact } from 'ag-grid-react';
import FormSection from '../../../../../components/reusable/Form/FormSection.jsx';
import Navigation from '../../../../../components/reusable/Navigation/Navigation.jsx';
import {
  TEMPLATE_FORM_SECTIONS,
  ROW_SELECTION,
  PAGINATION_SIZE_SELECTOR,
  PANEL_TRANSITION,
} from '../config/data.js';
import {
  basesMicasColumnDefs,
  editorialGlassTheme,
  defaultColDef
} from '../config/basesMicasGrid.js';

const BasesMicasGridArea = ({
  isCreating,
  gridHeight,
  gridRef,
  rowData,
  templateValues,
  handleFormChange,
  handleGridReady,
  handleSelectionChanged,
  toolbarGroups,
  navLeading
}) => {
  return (
    <>
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
    </>
  );
};

export default BasesMicasGridArea;