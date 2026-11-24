function notFound(req, res) {
  res.status(404).json({
    error: 'Resource not found',
    details: 'No matching route for this request.',
  });
}

// Any error thrown (or passed to next()) in a route/controller ends up here,
// so every unexpected failure still comes back as the same JSON error shape.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(err.status || 500).json({
    error: err.publicMessage || 'Internal server error',
    details: err.details || 'An unexpected error occurred.',
  });
}

module.exports = { notFound, errorHandler };
