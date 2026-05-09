const jwt = require("jsonwebtoken");
const {UnauthorizedError} = require('../lib/errors');
const SECRET = process.env.JWT_SECRET;

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("No token provided");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
      req.log.warn({}, "Error authenticating");
      throw new UnauthorizedError( "Invalid or expired token");
  }
}

module.exports = authenticate;