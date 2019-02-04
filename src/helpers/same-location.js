const _ = require('lodash');

module.exports = (l, r) => {
  if (_.isNil(l) && _.isNil(r)) {
    return true;
  }

  if (_.isNil(l) || _.isNil(r)) {
    return false;
  }

  return (
    Math.abs(l.coordinates[0] - r.coordinates[0]) < 0.0001
    && Math.abs(l.coordinates[1] - r.coordinates[1]) < 0.0001
  );
};
