const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const { signToken } = require('../utils/jwt');
const { isNonEmptyString, isValidEmail } = require('../utils/validators');

// Public registration always creates role "user" - an admin can never be
// self-registered. Use `npm run seed:admin` to create the first admin account.
function register(req, res) {
  const { name, email, password } = req.body || {};

  if (
    !isNonEmptyString(name, { min: 2, max: 100 }) ||
    !isValidEmail(email) ||
    !isNonEmptyString(password, { min: 8, max: 128 })
  ) {
    return res.status(400).json({
      error: 'Validation failed',
      details: 'name, a valid email, and a password of at least 8 characters are required.',
    });
  }

  if (userModel.findByEmail(email)) {
    return res.status(409).json({
      error: 'Conflict',
      details: 'An account with this email already exists.',
    });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = userModel.create({ name, email, passwordHash, role: 'user' });

  res.status(201).json(userModel.toPublic(user));
}

function login(req, res) {
  const { email, password } = req.body || {};

  if (!isValidEmail(email) || !isNonEmptyString(password)) {
    return res.status(400).json({
      error: 'Validation failed',
      details: 'email and password are required.',
    });
  }

  const user = userModel.findByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({
      error: 'Authentication required',
      details: 'Incorrect email or password.',
    });
  }

  const token = signToken(user);
  res.status(200).json({ token, user: userModel.toPublic(user) });
}

module.exports = { register, login };
