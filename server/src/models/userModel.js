const db = require('../config/db');

function create({ name, email, passwordHash, role = 'user' }) {
  const info = db
    .prepare(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`)
    .run(name, email, passwordHash, role);
  return findById(info.lastInsertRowid);
}

function findByEmail(email) {
  return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
}

function findById(id) {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
}

// Strips the password hash before anything is sent back to the client.
function toPublic(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
  };
}

module.exports = { create, findByEmail, findById, toPublic };
