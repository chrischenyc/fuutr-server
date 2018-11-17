module.exports = (date1, date2) => {
  const dif = date1.getTime() - date2.getTime();
  const seconds = dif / 1000;

  return Math.abs(seconds);
};
