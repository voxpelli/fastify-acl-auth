'use strict'

const fp = require('fastify-plugin')
const debug = require('debug')('fastify-acl-auth:plugin')
const urlPattern = require('url-pattern')

const auth = require('./lib/auth')
const util = require('./lib/util')

const defaults = {
  actualRoles: function (request) {
    let _return
    try {
      _return = request.session.credentials.roles
    } catch (err) {
      _return = []
    }
    return _return
  },
  any: true,
  all: false
}

const hookFactory = function (fastify, options) {

  const urlPatterns = options.pathExempt.map(function (pathPattern) {
    return new urlPattern(pathPattern)
  })

  function pathExempt(_path) {
    for (let i = 0; i < urlPatterns.length; i++) {
      if (urlPatterns[i].match(_path)) {
        return true
      }
    }
    return false
  }

  return async function (request, reply) {
    debug(`hook called for ${request.raw.originalUrl}`)
    try {
      const _actual = await util.getRoles(options.actualRoles, request)
      const _allowed = await util.getRoles(options.allowedRoles, request)
      let isAuthorized = await auth.isAuthorized(_actual, _allowed, options)
      if (options.pathExempt) {
        debug(`options.pathExempt is set`)
        if (pathExempt(request.raw.originalUrl)) {
          debug(`options.pathExempt does match URL, overriding isAuthorized (setting to true)`)
          isAuthorized = true
        }
      }
      debug('_actual: %j', _actual)
      debug('_allowed: %j', _allowed)
      debug('isAuthorized: %j', isAuthorized)
      if (!isAuthorized) {
        return reply.code(403).send()
      }
    } catch (err) {
      debug('ERROR: in hook: %s', err.message)
      return err
    }
  }
}

const pluginFactory = function (options) {
  debug('pluginFactory() called')
  const instanceOptions = Object.assign({}, defaults, options)
  debug('instanceOptions: %j', instanceOptions)
  return fp(
    async function (fastify, options) {
      debug('plugin() called')
      fastify.register(require('fastify-url-data'))
      const pluginOptions = Object.assign({}, instanceOptions, options)
      debug('pluginOptions: %j', pluginOptions)
      const hook = hookFactory(fastify, pluginOptions)
      fastify.addHook('preHandler', hook)
    },
    {
      fastify: '>=1.0.0'
    }
  )
}

module.exports = pluginFactory
