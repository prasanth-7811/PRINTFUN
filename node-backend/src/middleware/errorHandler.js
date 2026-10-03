const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500
  let message = err.message || 'Internal server error'

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    status = 400
    const errors = {}
    Object.keys(err.errors).forEach(k => { errors[k] = err.errors[k].message })
    return res.status(400).json({ message: 'Validation failed.', errors })
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    status = 400
    const field = Object.keys(err.keyValue)[0]
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    status = 404
    message = 'Resource not found.'
  }

  res.status(status).json({ message })
}

module.exports = errorHandler
