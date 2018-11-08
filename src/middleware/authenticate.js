const jwt = require('jsonwebtoken');
const httpStatus = require('http-status');

// middleware that validate JWT token in request headers "Authorization"
exports.validJWT = (req, res, next) => {
  const { authorization } = req.headers;

  const bearer = authorization && authorization.split(' ')[0];
  const token = authorization && authorization.split(' ')[1];

  if (bearer !== 'Bearer' || !token) {
    res.status(httpStatus.UNAUTHORIZED).send();
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // https://github.com/auth0/node-jsonwebtoken#tokenexpirederror
      if (err instanceof jwt.TokenExpiredError) {
        // TODO: implement refresh token
        res.status(httpStatus.UNAUTHORIZED).send();
        return;
      }

      res.status(httpStatus.UNAUTHORIZED).send();
      return;
    }

    const { _id } = decoded;

    if (!_id) {
      res.status(httpStatus.UNAUTHORIZED).send();
      return;
    }

    req.userId = _id;
    next();
  });
};

exports.minimumPermissionLevel = requiredPermissionLevel => (req, res, next) => {
  const { user } = req;

  if (userPermissionLevel & requiredPermissionLevel) {
    return next();
  }

  return res.status(httpStatus.FORBIDDEN).send();
};
