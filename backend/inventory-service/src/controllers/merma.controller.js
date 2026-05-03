"use strict";

const mermaService = require("../services/merma.service");

function actorFrom(req) {
  const u = req.user || {};
  return {
    userId: u.id || u._id || u.userId || u.sub || null,
    name:   u.name || u.fullName || u.email || null,
  };
}

function handle(err, res) {
  const status = err?.status || (err?.name === "MermaError" ? 400 : 500);
  console.error("[merma.controller]", err?.message || err);
  return res.status(status).json({ ok: false, code: err?.code || "ERROR", error: err?.message || "Internal error" });
}

exports.create = async (req, res) => {
  try {
    const merma = await mermaService.registerMerma({
      ...req.body,
      actor: actorFrom(req),
    });
    return res.status(201).json({ ok: true, data: merma });
  } catch (err) { return handle(err, res); }
};

exports.list = async (req, res) => {
  try {
    const { origin, sheet, dateFrom, dateTo, page, limit, search } = req.query;
    const out = await mermaService.listMermas({ origin, sheet, dateFrom, dateTo, page, limit, search });
    return res.json({ ok: true, ...out });
  } catch (err) { return handle(err, res); }
};

exports.detail = async (req, res) => {
  try {
    const merma = await mermaService.getMerma(req.params.id);
    return res.json({ ok: true, data: merma });
  } catch (err) { return handle(err, res); }
};

exports.stats = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const stats = await mermaService.getStats({ dateFrom, dateTo });
    return res.json({ ok: true, data: stats });
  } catch (err) { return handle(err, res); }
};
