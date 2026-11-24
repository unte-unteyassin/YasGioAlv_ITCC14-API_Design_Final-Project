const userModel = require('../models/userModel');

function getMe(req, res) {
  res.status(200).json(userModel.toPublic(req.user));
}

module.exports = { getMe };
