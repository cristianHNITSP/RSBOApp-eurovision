const { build: buildArmazon }    = require("./armazon.resource");
const { build: buildAccesorio }  = require("./accesorio.resource");
const { build: buildLente }      = require("./lenteContacto.resource");
const { build: buildEstuche }    = require("./estuche.resource");
const { build: buildEquipo }     = require("./equipo.resource");
const { build: buildSolucion }   = require("./solucion.resource");
const { build: buildSale }       = require("./sale.resource");
const { build: buildChangeLog }  = require("./opticaChangeLog.resource");

const buildOpticaResources = (models) => {
  if (!models) return [];
  return [
    buildArmazon(models.Armazon),
    buildAccesorio(models.Accesorio),
    buildLente(models.LenteContacto),
    buildEstuche(models.Estuche),
    buildEquipo(models.Equipo),
    buildSolucion(models.Solucion),
    buildSale(models.Sale),
    buildChangeLog(models.OpticaChangeLog),
  ];
};

module.exports = { buildOpticaResources };
