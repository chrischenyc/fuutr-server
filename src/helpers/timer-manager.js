const uuid = require('uuid');

/**
 * global hash to hold {key, timer} pairs
 */
const timers = {};

exports.addTimer = (timer) => {
  let duplicateKey = true;
  let key;

  while (duplicateKey) {
    key = uuid.v4();
    duplicateKey = Object.keys(timers).includes(key);
  }

  timers[key] = timer;

  return key;
};

exports.clearTimer = (key) => {
  const timer = timers[key];

  if (timer) {
    clearTimeout(timer);
  }
};
