/**
 * descriptors/index.js
 * Mapa tipo_matriz → factory de descriptor. Cada factory recibe `ctx`
 * (refs/estado compartido del componente) y devuelve el contrato uniforme.
 */
import { createBaseDescriptor } from "./base";
import { createMonofocalDescriptor } from "./monofocal";
import { createBifocalDescriptor } from "./bifocal";
import { createProgresivoDescriptor } from "./progresivo";
import { createToricoDescriptor } from "./torico";

export const DESCRIPTORS = {
  BASE: createBaseDescriptor,
  SPH_CYL: createMonofocalDescriptor,
  SPH_ADD: createBifocalDescriptor,
  BASE_ADD: createProgresivoDescriptor,
  SPH_CYL_AXIS: createToricoDescriptor,
};

/** Prefijo de la clave de unsaved-guard (preserva el storage de las plantillas viejas). */
export const GUARD_PREFIX = {
  BASE: "base",
  SPH_CYL: "monofocal",
  SPH_ADD: "bifocal",
  BASE_ADD: "progresivo",
  SPH_CYL_AXIS: "torico",
};

export function resolveDescriptorFactory(tipoMatriz) {
  return DESCRIPTORS[tipoMatriz] || null;
}
