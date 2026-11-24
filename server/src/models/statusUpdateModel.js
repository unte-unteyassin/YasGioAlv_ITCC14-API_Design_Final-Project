const db = require('../config/db');

function create({ reportId, adminId, oldStatus, newStatus, note }) {
  const info = db
    .prepare(`
      INSERT INTO status_updates (report_id, admin_id, old_status, new_status, note)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(reportId, adminId, oldStatus, newStatus, note);
  return db.prepare(`SELECT * FROM status_updates WHERE id = ?`).get(info.lastInsertRowid);
}

function listByReport(reportId) {
  return db
    .prepare(`SELECT * FROM status_updates WHERE report_id = ? ORDER BY created_at ASC, id ASC`)
    .all(reportId);
}

function toPublic(su) {
  if (!su) return null;
  return {
    id: su.id,
    reportId: su.report_id,
    adminId: su.admin_id,
    oldStatus: su.old_status,
    newStatus: su.new_status,
    note: su.note,
    createdAt: su.created_at,
  };
}

module.exports = { create, listByReport, toPublic };
