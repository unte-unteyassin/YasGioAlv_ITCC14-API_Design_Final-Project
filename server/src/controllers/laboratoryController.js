const laboratoryModel = require('../models/laboratoryModel');
const { isNonEmptyString, isValidLaboratoryCode } = require('../utils/validators');

function list(req, res) {
  const { building } = req.query;
  const labs = laboratoryModel.list({ building });
  res.status(200).json(labs.map(laboratoryModel.toPublic));
}

function getOne(req, res) {
  const lab = laboratoryModel.findByCode(req.params.laboratoryCode);
  if (!lab) {
    return res.status(404).json({ error: 'Resource not found', details: 'No laboratory matches the supplied code.' });
  }
  res.status(200).json(laboratoryModel.toPublic(lab));
}

function create(req, res) {
  const { laboratoryCode, name, building, floor } = req.body || {};

  if (
    !isValidLaboratoryCode(laboratoryCode) ||
    !isNonEmptyString(name, { min: 2, max: 100 }) ||
    !isNonEmptyString(building, { min: 2, max: 100 })
  ) {
    return res.status(400).json({
      error: 'Validation failed',
      details: 'laboratoryCode, name, and building are required and must be valid.',
    });
  }

  if (laboratoryModel.findByCode(laboratoryCode)) {
    return res.status(409).json({ error: 'Conflict', details: 'A laboratory with this code already exists.' });
  }

  const lab = laboratoryModel.create({ laboratoryCode, name, building, floor: floor ?? null });
  res.status(201).json(laboratoryModel.toPublic(lab));
}

function update(req, res) {
  const { laboratoryCode } = req.params;
  const existing = laboratoryModel.findByCode(laboratoryCode);
  if (!existing) {
    return res.status(404).json({ error: 'Resource not found', details: 'No laboratory matches the supplied code.' });
  }

  const { name, building, floor } = req.body || {};
  if (!isNonEmptyString(name, { min: 2, max: 100 }) || !isNonEmptyString(building, { min: 2, max: 100 })) {
    return res.status(400).json({ error: 'Validation failed', details: 'name and building are required.' });
  }

  const lab = laboratoryModel.update(laboratoryCode, { name, building, floor: floor ?? null });
  res.status(200).json(laboratoryModel.toPublic(lab));
}

function remove(req, res) {
  const { laboratoryCode } = req.params;
  const existing = laboratoryModel.findByCode(laboratoryCode);
  if (!existing) {
    return res.status(404).json({ error: 'Resource not found', details: 'No laboratory matches the supplied code.' });
  }

  try {
    laboratoryModel.remove(laboratoryCode);
    res.status(204).send();
  } catch (err) {
    // Foreign-key constraint trips when reports still reference this laboratory.
    if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) {
      return res.status(409).json({
        error: 'Conflict',
        details: 'This laboratory still has reports referencing it and cannot be deleted.',
      });
    }
    throw err;
  }
}

module.exports = { list, getOne, create, update, remove };
