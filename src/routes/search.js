const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();

const { requireJWT } = require('../middleware/authenticate');
const SearchController = require('../controllers/search');

/**
 * GET /search?latitude=&longitude=&radius=
 * search vehicles and zones nearby
 */
router.get(
  '/',
  requireJWT,
  validate({
    query: {
      latitude: Joi.number()
        .min(-90)
        .max(90)
        .required(),
      longitude: Joi.number()
        .min(-180)
        .max(180)
        .required(),
      radius: Joi.number()
        .min(0)
        .required(),
    },
  }),
  SearchController.search
);

module.exports = router;
