const { build: buildInventorySheet }     = require("./inventorySheet.resource");
const { build: buildContactLensesSheet } = require("./contactLensesSheet.resource");
const { build: buildCatalogBase }        = require("./catalogBase.resource");
const { build: buildCatalogTreatment }   = require("./catalogTreatment.resource");
const { build: buildCashClosure }        = require("./cashClosure.resource");
const { build: buildDevolution }         = require("./devolution.resource");
const { build: buildInventoryChangeLog } = require("./inventoryChangeLog.resource");
const { build: buildMermaLog }           = require("./mermaLog.resource");
const { build: buildSequence }           = require("./sequence.resource");
const { build: buildLaboratoryOrder }    = require("./laboratoryOrder.resource");
const { build: buildLaboratoryEvent }    = require("./laboratoryEvent.resource");
const { buildMatrixResource }            = require("./_buildMatrixResource");
const { NAV, navOf }                     = require("../../navigation");

const buildInventoryResources = (models) => {
  if (!models) return [];
  return [
    buildInventorySheet(models.InventorySheet),
    buildContactLensesSheet(models.ContactLensesSheet),
    buildCatalogBase(models.CatalogBase),
    buildCatalogTreatment(models.CatalogTreatment),
    buildCashClosure(models.CashClosure),
    buildDevolution(models.Devolution),
    buildLaboratoryOrder(models.LaboratoryOrder),
    buildLaboratoryEvent(models.LaboratoryEvent),
    buildMatrixResource(models.MatrixBase,       navOf(NAV.MATRIX)),
    buildMatrixResource(models.MatrixSphCyl,     navOf(NAV.MATRIX)),
    buildMatrixResource(models.MatrixBifocal,    navOf(NAV.MATRIX)),
    buildMatrixResource(models.MatrixProgresivo, navOf(NAV.MATRIX)),
    buildMatrixResource(models.CLMatrixEsferico,   navOf(NAV.CL_MATRIX)),
    buildMatrixResource(models.CLMatrixTorico,     navOf(NAV.CL_MATRIX)),
    buildMatrixResource(models.CLMatrixMultifocal, navOf(NAV.CL_MATRIX)),
    buildMatrixResource(models.CLMatrixColorido,   navOf(NAV.CL_MATRIX)),
    buildInventoryChangeLog(models.InventoryChangeLog),
    buildMermaLog(models.MermaLog),
    buildSequence(models.Sequence),
  ];
};

module.exports = { buildInventoryResources };
