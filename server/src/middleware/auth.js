const { verifyToken } = require('../utils/jwt');
const userModel = require('../models/userModel');

// Every protected route expects: Authorization: Bearer <token>
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      error: 'Authentication required',
      details: 'Provide a valid Bearer access token.',
    });
  }

  try {
    const payload = verifyToken(token);
    const user = userModel.findById(payload.id);

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        details: 'Account no longer exists.',
      });
    }

    req.user = user; // raw DB row, available to every downstream controller
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Authentication required',
      details: 'Token is invalid or expired.',
    });
  }
}

// Place AFTER authenticate on any route reserved for lab technicians/admins.
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      details: 'Only administrators may manage laboratories or change report status.',
    });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
