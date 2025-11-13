// Convierte items planos <-> rowData y metadatos de columnas para cada tipo

export function uniqSorted(nums) {
  return [...new Set(nums)].sort((a, b) => a - b);
}
export const norm = (n) => n.toString().replace('.', '_');

export function frange(min, max, step) {
  const out = [];
  for (let v = min; v <= max + 1e-6; v += step) out.push(Number(v.toFixed(2)));
  return out;
}

/* ---------- PIVOTS ---------- */

// SPH_CYL → filas por sph, columnas cyl_*
export function pivotSphCyl(items, cylValues) {
  const bySph = new Map();
  for (const it of items) {
    const sph = Number(Number(it.sph).toFixed(2));
    const cyl = Number(Number(it.cyl).toFixed(2));
    const ex  = Number(it.existencias ?? 0);
    if (!bySph.has(sph)) bySph.set(sph, {});
    bySph.get(sph)[`cyl_${norm(cyl)}`] = ex;
  }
  const rows = Array.from(bySph.keys()).sort((a,b)=>a-b).map(sph => {
    const row = { sph };
    cylValues.forEach(c => { row[`cyl_${norm(c)}`] = 0; });
    Object.assign(row, bySph.get(sph));
    return row;
  });
  return rows;
}

// BASE → filas por base
export function pivotBase(items) {
  return items
    .map(it => ({ base: Number(Number(it.base).toFixed(2)), existencias: Number(it.existencias ?? 0) }))
    .sort((a,b)=>a.base-b.base);
}

// SPH_ADD (bifocal) → filas por sph (con base_izq/der), columnas add_*_OD/OI
export function pivotBifocal(items, addValues) {
  const bySph = new Map();
  // Tomamos base_izq/base_der de la primera coincidencia por sph
  const basePorSph = new Map();
  for (const it of items) {
    const sph = Number(Number(it.sph).toFixed(2));
    const add = Number(Number(it.add).toFixed(2));
    const eye = (it.eye || 'OD').toUpperCase();
    const ex  = Number(it.existencias ?? 0);
    if (!bySph.has(sph)) bySph.set(sph, {});
    bySph.get(sph)[`add_${norm(add)}_${eye}`] = ex;

    if (!basePorSph.has(sph)) {
      basePorSph.set(sph, {
        base_izq: Number(Number(it.base_izq ?? 0).toFixed(2)),
        base_der: Number(Number(it.base_der ?? 0).toFixed(2)),
      });
    }
  }
  const rows = Array.from(bySph.keys()).sort((a,b)=>a-b).map(sph => {
    const row = { sph, ...basePorSph.get(sph) };
    addValues.forEach(a => {
      row[`add_${norm(a)}_OD`] = 0;
      row[`add_${norm(a)}_OI`] = 0;
    });
    Object.assign(row, bySph.get(sph));
    return row;
  });
  return rows;
}

// BASE_ADD (progresivo) → filas por (base_izq, base_der), columnas add_*_OD/OI
export function pivotProgresivo(items, addValues) {
  const key = (bi, bd) => `${bi}|${bd}`;
  const byBase = new Map();
  for (const it of items) {
    const bi  = Number(Number(it.base_izq ?? 0).toFixed(2));
    const bd  = Number(Number(it.base_der ?? 0).toFixed(2));
    const k   = key(bi, bd);
    const add = Number(Number(it.add).toFixed(2));
    const eye = (it.eye || 'OD').toUpperCase();
    const ex  = Number(it.existencias ?? 0);
    if (!byBase.has(k)) byBase.set(k, { base_izq: bi, base_der: bd });
    byBase.get(k)[`add_${norm(add)}_${eye}`] = ex;
  }
  const rows = Array.from(byBase.values()).sort((a,b)=> (a.base_izq===b.base_izq ? a.base_der-b.base_der : a.base_izq-b.base_izq))
    .map(row => {
      addValues.forEach(a => {
        row[`add_${norm(a)}_OD`] = row[`add_${norm(a)}_OD`] ?? 0;
        row[`add_${norm(a)}_OI`] = row[`add_${norm(a)}_OI`] ?? 0;
      });
      return row;
    });
  return rows;
}

/* ---------- FLATTEN (para guardar con /chunk) ---------- */

export function flattenBaseRows(rows) {
  return rows.map(r => ({ base: Number(r.base), existencias: Number(r.existencias ?? 0) }));
}

export function flattenSphCylRows(rows, cylValues) {
  const out = [];
  for (const r of rows) {
    const sph = Number(r.sph);
    for (const c of cylValues) {
      const f = `cyl_${norm(c)}`;
      if (f in r) out.push({ sph, cyl: Number(c), existencias: Number(r[f] ?? 0) });
    }
  }
  return out;
}

// Bifocal: incluye bases si están presentes en la fila
export function flattenBifocalRows(rows, addValues) {
  const out = [];
  for (const r of rows) {
    const sph = Number(r.sph);
    const base_izq = Number(r.base_izq ?? 0);
    const base_der = Number(r.base_der ?? 0);
    for (const a of addValues) {
      out.push({ sph, add: Number(a), eye: 'OD', base_izq, base_der, existencias: Number(r[`add_${norm(a)}_OD`] ?? 0) });
      out.push({ sph, add: Number(a), eye: 'OI', base_izq, base_der, existencias: Number(r[`add_${norm(a)}_OI`] ?? 0) });
    }
  }
  return out;
}

// Progresivo: filas por base_izq/base_der
export function flattenProgresivoRows(rows, addValues) {
  const out = [];
  for (const r of rows) {
    const base_izq = Number(r.base_izq ?? 0);
    const base_der = Number(r.base_der ?? 0);
    for (const a of addValues) {
      out.push({ add: Number(a), eye: 'OD', base_izq, base_der, existencias: Number(r[`add_${norm(a)}_OD`] ?? 0) });
      out.push({ add: Number(a), eye: 'OI', base_izq, base_der, existencias: Number(r[`add_${norm(a)}_OI`] ?? 0) });
    }
  }
  return out;
}
