// src/inventory/services/chunkValidate.service.js
const PHYSICAL_LIMITS = require("../constants/physicalLimits");
const { to2, isDef, isMultipleOfStep } = require("../utils/numbers");
const { normalizeCylConvention } = require("../utils/keys");

const validateChunkRows = (tipo, rows, ranges = {}) => {
  const errors = [];

  rows.forEach((row, index) => {
    const path = `rows[${index}]`;

    const ex = row.existencias;
    if (ex !== undefined && ex !== null) {
      const exNum = Number(ex);
      if (!Number.isFinite(exNum) || exNum < 0) {
        errors.push({ path: `${path}.existencias`, msg: "existencias debe ser numérico >= 0" });
      }
    }

    if (tipo === "BASE") {
      const baseVal = to2(row.base);
      if (!isDef(row.base) || !Number.isFinite(Number(row.base))) {
        errors.push({ path: `${path}.base`, msg: "base numérica requerida" });
      } else if (baseVal < PHYSICAL_LIMITS.BASE.min || baseVal > PHYSICAL_LIMITS.BASE.max) {
        errors.push({ path: `${path}.base`, msg: `base fuera de límites (${PHYSICAL_LIMITS.BASE.min}..${PHYSICAL_LIMITS.BASE.max})` });
      } else if (!isMultipleOfStep(baseVal, 0.25)) {
        // Paso mínimo 0.25 D: acepta 0.25, 0.50, 8.50, 10, 12, 14…
        // Rechaza valores sin sentido óptico como 0.51 o 0.26
        errors.push({ path: `${path}.base`, msg: "base debe ser múltiplo de 0.25 D" });
      }
    }

    if (tipo === "SPH_CYL") {
      const sphVal = to2(row.sph);
      if (!isDef(row.sph) || !Number.isFinite(Number(row.sph))) {
        errors.push({ path: `${path}.sph`, msg: "sph numérico requerido" });
      } else if (sphVal < PHYSICAL_LIMITS.SPH.min || sphVal > PHYSICAL_LIMITS.SPH.max) {
        errors.push({ path: `${path}.sph`, msg: `sph fuera de límites (${PHYSICAL_LIMITS.SPH.min}..${PHYSICAL_LIMITS.SPH.max})` });
      } else if (!isMultipleOfStep(sphVal, 0.25)) {
        errors.push({ path: `${path}.sph`, msg: "sph debe ir en pasos de 0.25 D" });
      }

      if (!isDef(row.cyl) || !Number.isFinite(Number(row.cyl))) {
        errors.push({ path: `${path}.cyl`, msg: "cyl numérico requerido" });
      } else {
        const cylVal = normalizeCylConvention(row.cyl);
        if (cylVal < PHYSICAL_LIMITS.CYL.min || cylVal > PHYSICAL_LIMITS.CYL.max) {
          errors.push({ path: `${path}.cyl`, msg: `cyl fuera de límites (${PHYSICAL_LIMITS.CYL.min}..${PHYSICAL_LIMITS.CYL.max})` });
        }
        const isZero = Math.abs(cylVal) < 1e-6;
        if (!isZero && !isMultipleOfStep(cylVal, 0.25)) {
          errors.push({ path: `${path}.cyl`, msg: "cyl debe ir en pasos de 0.25 D" });
        }
      }
    }

    if (tipo === "SPH_ADD") {
      const sphVal = to2(row.sph);
      const addVal = to2(row.add);

      if (!isDef(row.sph) || !Number.isFinite(Number(row.sph))) {
        errors.push({ path: `${path}.sph`, msg: "sph numérico requerido" });
      } else if (sphVal < PHYSICAL_LIMITS.SPH.min || sphVal > PHYSICAL_LIMITS.SPH.max) {
        errors.push({ path: `${path}.sph`, msg: `sph fuera de límites (${PHYSICAL_LIMITS.SPH.min}..${PHYSICAL_LIMITS.SPH.max})` });
      } else if (!isMultipleOfStep(sphVal, 0.25)) {
        errors.push({ path: `${path}.sph`, msg: "sph debe ir en pasos de 0.25 D" });
      }

      if (!isDef(row.add) || !Number.isFinite(Number(row.add))) {
        errors.push({ path: `${path}.add`, msg: "add numérico requerido" });
      } else if (addVal < PHYSICAL_LIMITS.ADD.min || addVal > PHYSICAL_LIMITS.ADD.max) {
        errors.push({ path: `${path}.add`, msg: `add fuera de límites (${PHYSICAL_LIMITS.ADD.min}..${PHYSICAL_LIMITS.ADD.max})` });
      } else if (!isMultipleOfStep(addVal, 0.25)) {
        errors.push({ path: `${path}.add`, msg: "add debe ir en pasos de 0.25 D" });
      }

      const eye = String(row.eye || "").toUpperCase();
      if (!["OD", "OI"].includes(eye))
        errors.push({ path: `${path}.eye`, msg: "eye debe ser OD u OI" });

      ["base_izq", "base_der"].forEach((field) => {
        if (!isDef(row[field])) return;
        const num = Number(row[field]);
        if (!Number.isFinite(num)) {
          errors.push({ path: `${path}.${field}`, msg: `${field} numérico inválido` });
        } else if (num < PHYSICAL_LIMITS.BASE.min || num > PHYSICAL_LIMITS.BASE.max) {
          errors.push({ path: `${path}.${field}`, msg: `${field} fuera de límites (${PHYSICAL_LIMITS.BASE.min}..${PHYSICAL_LIMITS.BASE.max})` });
        } else if (!isMultipleOfStep(to2(num), 0.25)) {
          errors.push({ path: `${path}.${field}`, msg: `${field} debe ir en pasos de 0.25 D` });
        }
      });
    }

    if (tipo === "SPH_CYL_AXIS") {
      const sphVal = to2(row.sph);
      if (!isDef(row.sph) || !Number.isFinite(Number(row.sph))) {
        errors.push({ path: `${path}.sph`, msg: "sph numérico requerido" });
      } else if (sphVal < PHYSICAL_LIMITS.SPH.min || sphVal > PHYSICAL_LIMITS.SPH.max) {
        errors.push({ path: `${path}.sph`, msg: `sph fuera de límites (${PHYSICAL_LIMITS.SPH.min}..${PHYSICAL_LIMITS.SPH.max})` });
      } else if (!isMultipleOfStep(sphVal, 0.25)) {
        errors.push({ path: `${path}.sph`, msg: "sph debe ir en pasos de 0.25 D" });
      }

      if (!isDef(row.cyl) || !Number.isFinite(Number(row.cyl))) {
        errors.push({ path: `${path}.cyl`, msg: "cyl numérico requerido" });
      } else {
        const cylVal = normalizeCylConvention(row.cyl);
        if (cylVal < PHYSICAL_LIMITS.CYL.min || cylVal > PHYSICAL_LIMITS.CYL.max) {
          errors.push({ path: `${path}.cyl`, msg: `cyl fuera de límites (${PHYSICAL_LIMITS.CYL.min}..${PHYSICAL_LIMITS.CYL.max})` });
        }
      }

      const axisVal = Number(row.axis);
      if (!isDef(row.axis) || !Number.isFinite(axisVal)) {
        errors.push({ path: `${path}.axis`, msg: "axis numérico requerido" });
      } else if (axisVal < PHYSICAL_LIMITS.AXIS.min || axisVal > PHYSICAL_LIMITS.AXIS.max) {
        errors.push({ path: `${path}.axis`, msg: `axis fuera de límites (${PHYSICAL_LIMITS.AXIS.min}..${PHYSICAL_LIMITS.AXIS.max})` });
      } else if (axisVal % 10 !== 0) {
        errors.push({ path: `${path}.axis`, msg: "axis debe ir en pasos de 10" });
      }
    }

    if (tipo === "BASE_ADD") {
      const addVal = to2(row.add);

      if (!isDef(row.add) || !Number.isFinite(Number(row.add))) {
        errors.push({ path: `${path}.add`, msg: "add numérico requerido" });
      } else if (addVal < PHYSICAL_LIMITS.ADD.min || addVal > PHYSICAL_LIMITS.ADD.max) {
        errors.push({ path: `${path}.add`, msg: `add fuera de límites (${PHYSICAL_LIMITS.ADD.min}..${PHYSICAL_LIMITS.ADD.max})` });
      } else if (!isMultipleOfStep(addVal, 0.25)) {
        errors.push({ path: `${path}.add`, msg: "add debe ir en pasos de 0.25 D" });
      }

      const eye = String(row.eye || "").toUpperCase();
      if (!["OD", "OI"].includes(eye))
        errors.push({ path: `${path}.eye`, msg: "eye debe ser OD u OI" });

      ["base", "base_izq", "base_der"].forEach((field) => {
        if (!isDef(row[field])) return;
        const num = Number(row[field]);
        if (!Number.isFinite(num)) {
          errors.push({ path: `${path}.${field}`, msg: `${field} numérico inválido` });
        } else if (num < PHYSICAL_LIMITS.BASE.min || num > PHYSICAL_LIMITS.BASE.max) {
          errors.push({ path: `${path}.${field}`, msg: `${field} fuera de límites (${PHYSICAL_LIMITS.BASE.min}..${PHYSICAL_LIMITS.BASE.max})` });
        } else if (!isMultipleOfStep(to2(num), 0.25)) {
          errors.push({ path: `${path}.${field}`, msg: `${field} debe ir en pasos de 0.25 D` });
        }
      });
    }
  });

  return errors;
};

module.exports = { validateChunkRows };
