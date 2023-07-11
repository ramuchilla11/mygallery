const process = require('process')
const fs = require('fs/promises')
const path = require('path')

const log = require('@home-gallery/logger')('cli.run')

const { initConfig, defaultConfigFile, load } = require('./config')
const { startServer, watchSources } = require('./tasks')

const galleryDir = path.dirname(process.argv[1])

const createConfig = async argv => {
  const sourceConfigFile = path.join(galleryDir, 'gallery.config-example.yml')
  let { config: configFile, source, force } = argv

  configFile = configFile || defaultConfigFile

  const exists = await fs.access(configFile).then(() => true).catch(() => false)
  if (exists && !force) {
    log.warn(`Configuration file ${configFile} already exists. Use --force to overwrite`)
    return
  }

  return initConfig(configFile, sourceConfigFile, source)
}

const runServer = options => {
  log.info(`Starting server`)
  return startServer(options)
}

const runImport = (config, options) => {
  const onlineSources = config.sources.filter(source => !source.offline)
  const sourceDirs = onlineSources.map(source => source.dir)

  log.info(`Import online sources: ${sourceDirs.join(', ')}`)
  return watchSources(config, onlineSources, options)
}

const command = {
  command: 'run',
  describe: 'Run common tasks',
  builder: (yargs) => {
    return yargs.option({
      config: {
        alias: 'c',
        describe: 'Configuration file'
      },
    })
    .command(
      'init',
      'Initialize the gallery configuration',
      (yargs) => yargs
        .option({
          source: {
            alias: 's',
            array: true,
            required: true,
            description: 'Initial source directory or directories'
          },
          force: {
            alias: 'f',
            boolean: true,
            description: 'Force, overwrite existing configuration'
          }
        }),
      (argv) => createConfig(argv)
          .catch(err => log.error(err, `Error: ${err}`))
      )
    .command(
      'server',
      'Start the webserver',
      (yargs) => yargs,
      (argv) => load(argv.config, true)
          .then(runServer)
          .then(() => log.info(`Have a good day...`))
          .catch(err => log.error(err, `Error: ${err}`))
      )
    .command(
      'import',
      'Import and update new files from sources',
      (yargs) => yargs.option({
        initial: {
          alias: 'i',
          boolean: true,
          describe: 'Run initial incremental import'
        },
        update: {
          alias: 'u',
          boolean: true,
          describe: 'Check and import new files'
        },
        'small-files': {
          alias: 's',
          boolean: true,
          describe: 'Import only small files up to 20MB to exclude big files such as videos to speed up the initial import'
        },
        'watch': {
          alias: 'w',
          boolean: true,
          describe: 'Watch files for changes and run import on changes'
        },
        'watch-delay': {
          number: true,
          default: 10,
          describe: 'Delay import after file change detection in seconds. A new file change refreshes the previous delay'
        },
        'watch-max-delay': {
          number: true,
          default: 10 * 60,
          describe: 'Maximum delay after file change detection in seconds. Set it to 0 for immediate import on file change'
        },
        'watch-poll-interval': {
          number: true,
          default: 0,
          describe: 'Use poll interval in seconds. If set 0 watch mode uses fs events if available.'
        },
        'import-on-start': {
          boolean: true,
          default: true,
          describe: 'Run import on watch start'
        },
      }),
      (argv) => load(argv.config, true)
          .then(({config}) => {
            const options = {
              initialImport: argv.initial,
              incrementalUpdate: argv.update,
              smallFiles: argv.smallFiles,
              watch: argv.watch,
              watchDelay: Math.max(0, Math.min(argv.watchDelay, argv.watchMaxDelay) * 1000),
              watchMaxDelay: Math.max(0, argv.watchMaxDelay * 1000),
              watchPollInterval: argv.watchPollInterval,
              importOnWatchStart: argv.importOnStart
            }
            return runImport(config, options)
          })
          .then(() => log.info(`Import command completed`))
          .catch(err => log.error(err, `Error: ${err}`))
      )
    .demandCommand()
  },
  handler: () => false
}

module.exports = command
