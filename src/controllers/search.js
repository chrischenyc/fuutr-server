const httpStatus = require('http-status');

const Vehicle = require('../models/vehicle');
const User = require('../models/user');
const Zone = require('../models/zone');
const Ride = require('../models/ride');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

const normalizeVehicle = require('../helpers/normalize-vehicle');
const normalizeZone = require('../helpers/normalize-zone');

exports.search = async (req, res, next) => {
  const { latitude, longitude, radius } = req.query;
  const { userId } = req;

  try {
    // ---------- search vehicles ----------

    const user = await User.findOne({ _id: userId }).exec();

    // TODO: move returning reserved vehicle to vehicle reserve API response
    // if a vehicle is being reserved by current user, return just that one
    let vehicles = await Vehicle.find({
      reserved: true,
      reservedBy: userId,
    });

    // TODO: move returning vehicle in a paused ride to ride pause API response
    // TODO: if the vehicle is in a ride by current user and is paused, return just that one
    if (vehicles.length === 0) {
      const ride = await Ride.findOne({ user: userId, paused: true, completed: false }).exec();
      if (ride) {
        vehicles = await Vehicle.find({ _id: ride.vehicle });
      }
    }

    // otherwise, return all nearby vehicles
    if (vehicles.length === 0) {
      vehicles = await Vehicle.find({
        online: true,
        locked: true,
        inRide: false,
        charging: false,
        reserved: false,
        location: {
          $nearSphere: {
            $geometry: { type: 'Point', coordinates: [longitude, latitude] },
            $maxDistance: radius,
          },
        },
      });
    }

    vehicles = vehicles.map(vehicle => normalizeVehicle(vehicle, user));

    // ---------- search zones ----------
    // find nearby active zones
    let zones = await Zone.find({
      active: true,
      polygon: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: radius,
        },
      },
    });

    zones = zones.map(zone => normalizeZone(zone));

    res.json({ vehicles, zones });
  } catch (error) {
    logger.error(error.message);
    next(new APIError('something went wrong', httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
