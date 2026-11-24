const db = require('../config/db');

function create({ userId, laboratoryCode, wasteType, description, photoUrl = null }) {
  const info = db
    .prepare(`
      INSERT INTO reports (user_id, laboratory_code, waste_type, description, photo_url)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(userId, laboratoryCode, wasteType, description, photoUrl);
  return findById(info.lastInsertRowid);
}

function findById(id) {
  return db.prepare(`SELECT * FROM reports WHERE id = ?`).get(id);
}

function list({ status, wasteType, laboratoryCode, userId, page = 1, limit = 20 }) {
  const clauses = [];
  const params = [];

  if (status) { clauses.push('status = ?'); params.push(status); }
  if (wasteType) { clauses.push('waste_type = ?'); params.push(wasteType); }
  if (laboratoryCode) { clauses.push('laboratory_code = ?'); params.push(laboratoryCode); }
  if (userId) { clauses.push('user_id = ?'); params.push(userId); }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const total = db.prepare(`SELECT COUNT(*) AS count FROM reports ${where}`).get(...params).count;
  const data = db
    .prepare(`SELECT * FROM reports ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  return { data, total };
}

function replace(id, { laboratoryCode, wasteType, description, photoUrl = null }) {
  db.prepare(`
    UPDATE reports
    SET laboratory_code = ?, waste_type = ?, description = ?, photo_url = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ?
  `).run(laboratoryCode, wasteType, description, photoUrl, id);
  return findById(id);
}

function updateStatus(id, newStatus) {
  db.prepare(`
    UPDATE reports
    SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ?
  `).run(newStatus, id);
  return findById(id);
}

// DB cascade (see config/db.js) takes care of deleting status_updates too.
function remove(id) {
  db.prepare(`DELETE FROM reports WHERE id = ?`).run(id);
}

function toPublic(report) {
  if (!report) return null;
  return {
    id: report.id,
    userId: report.user_id,
    laboratoryCode: report.laboratory_code,
    wasteType: report.waste_type,
    description: report.description,
    photoUrl: report.photo_url,
    status: report.status,
    createdAt: report.created_at,
    updatedAt: report.updated_at,
  };
}

module.exports = { create, findById, list, replace, updateStatus, remove, toPublic };
