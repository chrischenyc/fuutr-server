const fs = require('fs');
const path = require('path');

const getPrivateFile = filePath => fs.readFileSync(path.join('./', filePath), 'utf8');

module.exports = getPrivateFile;
