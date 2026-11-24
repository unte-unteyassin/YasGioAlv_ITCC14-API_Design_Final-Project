const db = require('../config/db');

function create({ laboratoryCode, name, building, floor = null }) {
  db.prepare(`INSERT INTO laboratories (laboratory_code, name, building, floor) VALUES (?, ?, ?, ?)`)
    .run(laboratoryCode, name, building, floor);
  return findByCode(laboratoryCode);
}

function findByCode(laboratoryCode) {
  return db.prepare(`SELECT * FROM laboratories WHERE laboratory_code = ?`).get(laboratoryCode);
}

function list({ building } = {}) {
  if (building) {
    return db
      .prepare(`SELECT * FROM laboratories WHERE building = ? ORDER BY laboratory_code`)
      .all(building);
  }
  return db.prepare(`SELECT * FROM laboratories ORDER BY laboratory_code`).all();
}

function update(laboratoryCode, { name, building, floor = null }) {
  db.prepare(`UPDATE laboratories SET name = ?, building = ?, floor = ? WHERE laboratory_code = ?`)
    .run(name, building, floor, laboratoryCode);
  return findByCode(laboratoryCode);
}

// Throws SQLITE_CONSTRAINT if a report still references this laboratory_code -
// the controller turns that into a 409 Conflict.
function remove(laboratoryCode) {
  db.prepare(`DELETE FROM laboratories WHERE laboratory_code = ?`).run(laboratoryCode);
}

function toPublic(lab) {
  if (!lab) return null;
  return {
    laboratoryCode: lab.laboratory_code,
    name: lab.name,
    building: lab.building,
    floor: lab.floor,
  };
}

module.exports = { create, findByCode, list, update, remove, toPublic };
