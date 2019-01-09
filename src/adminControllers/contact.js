const httpStatus = require('http-status');

const Contact = require('../models/contact');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

exports.addContact = async (req, res, next) => {
  const {
    name, phone, email, message,
  } = req.body;

  try {
    const contact = new Contact({
      name,
      phone,
      email,
      message,
    });

    await contact.save();

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
