/**
 * Controller para endpoints cross-catálogo de back orders.
 * Une las 3 colecciones (basesmicas, lentes, óptica) y aplica filtros de
 * forma uniforme tras la unión. Usa $facet para paginación con total.
 */

const BackOrderBasesMicas = require("../models/BackOrderBasesMicas");
const BackOrderLentes = require("../models/BackOrderLentes");
const BackOrderOptica = require("../models/BackOrderOptica");

function buildMatch({ status, category }) {
  const m = {};
  if (status)   m.status = status;
  if (category) m.category = category;
  return m;
}

/**
 * GET /api/backorders
 * Lista cross-catálogo. Filtros: status, category, search (texto), sortBy.
 * Paginación: page, limit (default 50, max 200).
 */
async function listAll(req, res, next) {
  try {
    const { status, category, search, sortBy = "-createdAt" } = req.query;
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const page  = Math.max(1, Number(req.query.page) || 1);
    const skip  = (page - 1) * limit;

    const sortField = String(sortBy).replace(/^-/, "");
    const sortDir   = String(sortBy).startsWith("-") ? -1 : 1;

    // Fase 1: filtros previos por colección — aprovecha índices propios
    // (el $text requiere un text-index por colección, definido en cada modelo)
    const preMatch = {};
    if (status) preMatch.status = status;
    if (search) preMatch.$text = { $search: search };

    const innerPipeline = Object.keys(preMatch).length ? [{ $match: preMatch }] : [];

    const pipeline = [
      ...innerPipeline,
      { $unionWith: { coll: "backorder_lentes",  pipeline: innerPipeline } },
      { $unionWith: { coll: "backorder_optica",  pipeline: innerPipeline } },
    ];

    // Filtro post-unión por categoría (si se pidió uno solo)
    if (category) pipeline.push({ $match: buildMatch({ category }) });

    pipeline.push({
      $facet: {
        docs: [
          { $sort: { [sortField]: sortDir } },
          { $skip: skip },
          { $limit: limit },
        ],
        total: [{ $count: "n" }],
      },
    });

    const [agg] = await BackOrderBasesMicas.collection.aggregate(pipeline).toArray();
    const docs  = agg?.docs || [];
    const total = agg?.total?.[0]?.n || 0;

    res.json({
      docs,
      meta: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/backorders/stats
 * KPIs por categoría: conteos por estado y total cobrado/pendiente.
 */
async function getStats(req, res, next) {
  try {
    const sumPipeline = [
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalPagado: { $sum: { $ifNull: ["$totalPagado", 0] } },
          saldoPendiente: { $sum: { $ifNull: ["$saldoPendiente", 0] } },
        },
      },
    ];

    const [bm, lc, op] = await Promise.all([
      BackOrderBasesMicas.aggregate(sumPipeline),
      BackOrderLentes.aggregate(sumPipeline),
      BackOrderOptica.aggregate(sumPipeline),
    ]);

    const totalsByCat = (rows) => rows.reduce(
      (acc, r) => {
        acc.count          += r.count;
        acc.totalPagado    += r.totalPagado || 0;
        acc.saldoPendiente += r.saldoPendiente || 0;
        return acc;
      },
      { count: 0, totalPagado: 0, saldoPendiente: 0 }
    );

    const data = {
      basesMicas: { byStatus: bm, totals: totalsByCat(bm) },
      lentes:     { byStatus: lc, totals: totalsByCat(lc) },
      optica:     { byStatus: op, totals: totalsByCat(op) },
    };

    data.global = {
      count:          data.basesMicas.totals.count + data.lentes.totals.count + data.optica.totals.count,
      totalPagado:    data.basesMicas.totals.totalPagado + data.lentes.totals.totalPagado + data.optica.totals.totalPagado,
      saldoPendiente: data.basesMicas.totals.saldoPendiente + data.lentes.totals.saldoPendiente + data.optica.totals.saldoPendiente,
    };

    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { listAll, getStats };
