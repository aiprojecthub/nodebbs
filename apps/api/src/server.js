'use strict'

import path from 'node:path'
import AutoLoad from '@fastify/autoload'
import { dirname } from './utils/index.js'

const __dirname = dirname(import.meta.url)

// Pass --options via CLI arguments in command to enable these options.
const options = {}

export default async function (fastify, opts) {
  // Place here your custom code!

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: Object.assign({}, opts),
    maxDepth: 1,
  })

  // This loads all plugins defined in routes
  // define your routes in one of these
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: {
      prefix: '/api',
      // encapsulate: false,
    }
  })
}

export { options }
