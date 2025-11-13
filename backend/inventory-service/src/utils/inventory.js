const to2 = (n) => Number(parseFloat(n).toFixed(2));

const normNum = (v) =>
  v === null || v === undefined
    ? 'x'
    : (Number(v) < 0
        ? `m${String(Math.abs(Number(v)).toFixed(2)).replace('.', 'd')}`
        : String(Number(v).toFixed(2)).replace('.', 'd'));

const denormNum = (s) => {
  if (s === 'x') return null;
  if (s.startsWith('m')) return -Number(s.slice(1).replace('d', '.'));
  return Number(s.replace('d', '.'));
};

// Keys
const keyBase     = (base)                => `${normNum(base)}`;
const keySphCyl   = (sph, cyl)            => `${normNum(sph)}|${normNum(cyl)}`;
const keyBifocal  = (sph, add, bi, bd)    => `${normNum(sph)}|${normNum(add)}|${normNum(bi)}|${normNum(bd)}`;
const keyProg     = (bi, bd, add)         => `${normNum(bi)}|${normNum(bd)}|${normNum(add)}`;

const parseKey = (key) => key.split('|').map(denormNum);
