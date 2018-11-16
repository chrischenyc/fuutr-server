const mongoose = require('mongoose');

// https://docs.mongodb.com/manual/reference/geojson/
// http://geojson.org/

module.exports = new mongoose.Schema({
  // type: Point, LineString, Polygon, MultiPoint, MultiLineString, and MultiPolygon
  type: { type: String, required: true, default: 'Point' },
  coordinates: { type: [Number], index: '2dsphere' },
});
