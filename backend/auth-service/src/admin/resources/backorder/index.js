const { build: buildOptica }     = require("./backOrderOptica.resource");
const { build: buildLentes }     = require("./backOrderLentes.resource");
const { build: buildBasesMicas } = require("./backOrderBasesMicas.resource");
const { build: buildSequence }   = require("./sequence.resource");

const buildBackorderResources = (models) => {
  if (!models) return [];
  return [
    buildOptica(models.BackOrderOptica),
    buildLentes(models.BackOrderLentes),
    buildBasesMicas(models.BackOrderBasesMicas),
    buildSequence(models.BackorderSequence),
  ];
};

module.exports = { buildBackorderResources };
