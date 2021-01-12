'use strict'

const fastify = require('fastify')

const tap = require('tap')

const plugin = require('../plugin')

const defaultPlugin = plugin()

const fastifyInstance = fastify()

tap.test(async t => {
  t.ok(defaultPlugin, 'plugin exists')
  fastifyInstance.decorateRequest('session', { credentials: { roles: ['user'] } })
  fastifyInstance.register(function (f, _o, n) {
    f.register(plugin({ allowedRoles: ['user'] }))
    f.get('/user', async function () {
      return '/user'
    })
    n()
  })
  fastifyInstance.register(function (f, _o, n) {
    f.register(plugin({ allowedRoles: ['admin'] }))
    f.get('/admin', async function () {
      return '/admin'
    })
    n()
  })
  fastifyInstance.register(function (f, _o, n) {
    f.register(plugin({ allowedRoles: () => Symbol('foo') }))
    f.get('/symbol', async function () {
      return '/symbol'
    })
    n()
  })
  await t.test('get /user', async t => {
    const response = await fastifyInstance.inject({
      method: 'GET',
      url: '/user',
    })
    t.is(response.body, '/user', 'body should be /user')
  })
  await t.test('get /admin', async t => {
    const response = await fastifyInstance.inject({
      method: 'GET',
      url: '/admin',
    })
    t.is(response.statusCode, 403, 'admin should return 403')
  })
})
