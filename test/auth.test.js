'use strict'

const tap = require('tap')

const auth = require('../lib/auth')

tap.test(async function (t) {
  t.plan(14)
  t.true(await auth.isAuthorized('admin', 'admin'), 'admin can access admin')
  t.false(await auth.isAuthorized('user', 'admin'), 'user can\'t access admin')
  t.true(await auth.isAuthorized(['user'], 'user'), '[user] can access user')
  t.true(await auth.isAuthorized(['user'], ['user']), '[user] can access [user]')
  t.true(await auth.isAuthorized('user', ['user']), 'user can access [user]')
  t.true(await auth.isAuthorized(function () { return ['user'] }, ['user']), 'user can access [user]')
  t.true(await auth.isAuthorized(async function () { return ['user'] }, ['user']), 'user can access [user]')
  t.true(await auth.isAuthorized(['user'], function () { return ['user'] }), '[user] can access user')
  t.true(await auth.isAuthorized(['user'], async function () { return ['user'] }), '[user] can access user')
  t.false(await auth.isAuthorized(['a'], ['a', 'b'], { all: true }), 'all should cause a false return when not all roles are present')
  t.true(await auth.isAuthorized(['b', 'a'], ['a', 'b'], { all: true }), 'all should cause a true return when all roles are present')
  t.true(await auth.isAuthorized(['ham', 'b', 'x', 'a'], ['a', 'b'], { all: true }), 'all should cause a true return when all roles are present and user has more roles than are needed')
  t.false(await auth.isAuthorized('admin', 'user'), 'admin can\'t access user')
  t.true(await auth.isAuthorized('admin', 'user', { hierarchy: ['user', 'admin'] }), 'admin can access user with appropriate hierarchy')
})
