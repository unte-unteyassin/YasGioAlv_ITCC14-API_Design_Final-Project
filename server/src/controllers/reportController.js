const reportModel = require('../models/reportModel');
const statusUpdateModel = require('../models/statusUpdateModel');
const laboratoryModel = require('../models/laboratoryModel');
const { isNonEmptyString, isValidLaboratoryCode, WASTE_TYPES } = require('../utils/validators');

// Only these two transitions are ever allowed, in this order.
const ALLOWED_TRANSITIONS = { pending: 'verified', verified: 'resolved' };

function validateReportInput(body) {
  const { laboratoryCode, wasteType, description, photoUrl } = body || {};
  if (!isValidLaboratoryCode(laboratoryCode)) return 'laboratoryCode is required and must be valid.';
  if (!WASTE_TYPES.includes(wasteType)) return `wasteType must be one of: ${WASTE_TYPES.join(', ')}.`;
  if (!isNonEmptyString(description, { min: 5, max: 500 })) return 'description must be between 5 and 500 characters.';
  if (photoUrl !== undefined && photoUrl !== null && typeof photoUrl !== 'string') {
    return 'photoUrl must be a string URL or null.';
  }
  return null;
}

function list(req, res) {
  const { status, wasteType, laboratoryCode, mine, page, limit } = req.query;
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const { data, total } = reportModel.list({
    status,
    wasteType,
    laboratoryCode,
    userId: mine === 'true' ? req.user.id : undefined,
    page: pageNum,
    limit: limitNum,
  });

  res.status(200).json({
    data: data.map(reportModel.toPublic),
    page: pageNum,
    limit: limitNum,
    total,
  });
}

// photoUrl, if present, is already a Cloudinary URL - the browser uploaded the
// image directly to Cloudinary before calling this endpoint. This API never
// talks to Cloudinary itself, it only stores the string it's given.
function create(req, res) {
  const error = validateReportInput(req.body);
  if (error) return res.status(400).json({ error: 'Validation failed', details: error });

  const { laboratoryCode, wasteType, description, photoUrl } = req.body;

  if (!laboratoryModel.findByCode(laboratoryCode)) {
    return res.status(404).json({ error: 'Resource not found', details: 'laboratoryCode does not match an existing laboratory.' });
  }

  const report = reportModel.create({
    userId: req.user.id,
    laboratoryCode,
    wasteType,
    description,
    photoUrl: photoUrl ?? null,
  });

  res.status(201).json(reportModel.toPublic(report));
}

function getOne(req, res) {
  const report = reportModel.findById(req.params.reportId);
  if (!report) return res.status(404).json({ error: 'Resource not found', details: 'No report matches the supplied ID.' });
  res.status(200).json(reportModel.toPublic(report));
}

function update(req, res) {
  const report = reportModel.findById(req.params.reportId);
  if (!report) return res.status(404).json({ error: 'Resource not found', details: 'No report matches the supplied ID.' });

  if (req.user.role !== 'admin' && report.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden', details: 'You may only edit your own reports.' });
  }
  if (report.status !== 'pending') {
    return res.status(409).json({ error: 'Conflict', details: 'Only pending reports may be edited.' });
  }

  const error = validateReportInput(req.body);
  if (error) return res.status(400).json({ error: 'Validation failed', details: error });

  const { laboratoryCode, wasteType, description, photoUrl } = req.body;
  if (!laboratoryModel.findByCode(laboratoryCode)) {
    return res.status(404).json({ error: 'Resource not found', details: 'laboratoryCode does not match an existing laboratory.' });
  }

  const updated = reportModel.replace(report.id, { laboratoryCode, wasteType, description, photoUrl: photoUrl ?? null });
  res.status(200).json(reportModel.toPublic(updated));
}

function remove(req, res) {
  const report = reportModel.findById(req.params.reportId);
  if (!report) return res.status(404).json({ error: 'Resource not found', details: 'No report matches the supplied ID.' });

  const isOwner = report.user_id === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isAdmin && !(isOwner && report.status === 'pending')) {
    return res.status(403).json({ error: 'Forbidden', details: 'You may only delete your own pending reports.' });
  }

  reportModel.remove(report.id); // cascades status_updates via DB foreign key
  res.status(204).send();
}

// Admin-only (enforced by requireAdmin in the route). Every successful call
// appends one immutable status_updates row; failed/invalid transitions do not.
function updateStatus(req, res) {
  const report = reportModel.findById(req.params.reportId);
  if (!report) return res.status(404).json({ error: 'Resource not found', details: 'No report matches the supplied ID.' });

  const { status, note } = req.body || {};
  if (!isNonEmptyString(note)) {
    return res.status(400).json({ error: 'Validation failed', details: 'A non-empty note is required.' });
  }

  const allowedNext = ALLOWED_TRANSITIONS[report.status];
  if (!allowedNext || status !== allowedNext) {
    return res.status(409).json({ error: 'Conflict', details: `Cannot transition from ${report.status} to ${status}.` });
  }

  const updated = reportModel.updateStatus(report.id, status);
  statusUpdateModel.create({
    reportId: report.id,
    adminId: req.user.id,
    oldStatus: report.status,
    newStatus: status,
    note,
  });

  res.status(200).json(reportModel.toPublic(updated));
}

function listStatusUpdates(req, res) {
  const report = reportModel.findById(req.params.reportId);
  if (!report) return res.status(404).json({ error: 'Resource not found', details: 'No report matches the supplied ID.' });

  const updates = statusUpdateModel.listByReport(report.id);
  res.status(200).json(updates.map(statusUpdateModel.toPublic));
}

module.exports = { list, create, getOne, update, remove, updateStatus, listStatusUpdates };
