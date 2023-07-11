const path = require('path')

const log = require('@home-gallery/logger')('export.database.write');
const { writeDatabasePlain } = require('@home-gallery/database');

const write = (database, outputDirectory, basePath, cb) => {
  const t0 = Date.now();
  const filename = path.join(outputDirectory, basePath, 'api', 'database.json');
  writeDatabasePlain(filename, database.data, (err) => {
    if (err) {
      log.error(`Could not write database to ${filename}: ${err}`);
      return cb(err);
    }
    log.info(t0, `Wrote database with ${database.data.length} entries to ${filename}`)
    cb(null, database, outputDirectory, basePath);
  })
}

module.exports = write;
