const fs = require('fs/promises')
const { createWriteStream } = require('fs')
const path = require('path')
const { pipeline } = require('stream')
const fetch = require('node-fetch')
const https = require('https');

const { isDatabaseTypeCompatible, HeaderType: DatabaseHeaderType } = require('@home-gallery/database')

const { isEventTypeCompatible, HeaderType: EventHeaderType } = require('@home-gallery/events/dist/node')

const log = require('@home-gallery/logger')('fetch.api')

const insecureAgent = new https.Agent({
  rejectUnauthorized: false,
});

const options = (url, insecure) => {
  if (url.startsWith('https') && insecure) {
    return {
      agent: insecureAgent
    }
  }
  return {}
}

const createIncompatibleError = (data, expectedType) => {
  const err = new Error(`Incompabtible data type ${data && data.type}. Expect ${expectedType}`)
  err.code = 'EINCOMP'
  err.type = database && database.type
  err.expectedType = expectedType
  return err
}

const fetchDatabase = async (serverUrl, {query, insecure} = {}) => {
  log.debug(`Fetching database ${query ? `with query '${query}' ` : ''}from remote ${serverUrl}...`)
  const t0 = Date.now()
  return fetch(`${serverUrl}/api/database.json${query ? `?q=${query}` : ''}`, options(serverUrl, insecure))
    .then(res => {
      if (res.status == 404) {
        log.debug(t0, `Remote ${serverUrl} has no database. Continue with empty database`)
        return { type: EventHeaderType, data: [] }
      } else if (!res.ok) {
        throw new Error(`Unexpected response status ${res.status}`)
      }
      return res.json()
    })
    .then(database => {
      if (!isDatabaseTypeCompatible(database && database.type)) {
        throw createIncompatibleError(data, DatabaseHeaderType)
      }
      log.info(t0, `Fetched database with ${database.data.length} entries from remote ${serverUrl}`)
      return database
    })
}

const fetchEvents = async (serverUrl, { insecure } = {}) => {
  log.debug(`Fetching events from remote ${serverUrl}...`)
  const t0 = Date.now()
  return fetch(`${serverUrl}/api/events.json`, options(serverUrl, insecure))
    .then(res => {
      if (res.status == 404) {
        log.debug(t0, `Remote has no events. Continue with empty events`)
        return { type: EventHeaderType, data: [] }
      } else if (!res.ok) {
        throw new Error(`Unexpected response status ${res.status}`)
      }
      return res.json()
    }).then(events => {
      if (!isEventTypeCompatible(events && events.type)) {
        throw createIncompatibleError(data, EventHeaderType)
      }
      log.info(t0, `Fetched events with ${events.data.length} entries from remote ${serverUrl}`)
      return events
    })
}

const fetchFile = async (serverUrl, file, storageDir, { insecure } = {}) => {
  log.trace(`Fetching ${file} from remote ${serverUrl}...`)
  const targetFilename = path.join(storageDir, file)
  const dir = path.dirname(targetFilename)
  await fs.access(dir).then(() => true).catch(() => fs.mkdir(dir, {recursive: true}))

  const url = `${serverUrl}/files/${file}`
  const t0 = Date.now()
  return fetch(url, options(url, insecure))
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP status code is ${res.status}`)
      }
      return res
    })
    .then(res => {
      return new Promise((resolve, reject) => {
        pipeline(
          res.body,
          createWriteStream(targetFilename),
          err => err ? reject(err) : resolve()
        )
      })
    })
    .then(() => log.debug(t0, `Fetched file ${file} from remote ${serverUrl}`))
    .catch(err => log.warn(err, `Failed to fetch ${file} from remote ${url}: ${err}. Continue`))
}

module.exports = {
  fetchDatabase,
  fetchEvents,
  fetchFile
}