const moment = require('moment-timezone');

exports.dateString = (date, timezone = 'Australia/Melbourne') => moment.tz(date, timezone).format('DD MMM YYYY');
exports.dateTimeString = (date, timezone = 'Australia/Melbourne') => moment.tz(date, timezone).format('DD MMM YYYY (ddd) HH:mm');
