# @voxpelli/fastify-acl-auth

**Temporary(?) fork of [*fastify-acl-auth*](https://github.com/charlesread/fastify-acl-auth)**

ACL-like authorization for [*fastify*](https://fastify.io) apps.

With *fastify-acl-auth* you can secure routes with roles, like **admin**, **superuser**, or **user:write**.  Then you just tell the plugin how to determine which roles a user has, and you're set.  You can also:

* Specify any/all functionality (allow if user has any of these roles, allow if users has all of these roles, for example)
* Specify a hierarchy of roles ("admins" are clearly "users" too, so let them through without explicitly letting "admins" through, for example)
* Easily use *fastify-acl-auth* as an authentication strategy with [*fastify-auth*](https://www.npmjs.com/package/fastify-auth), or anything else really

<!-- toc -->

- [Usage](#usage)
  * [Simple Example](#simple-example)
  * [Using a Hierarchy](#using-a-hierarchy)
- [API](#api)
  * [`options`](#options)
  * [`aclFactory([options])`](#aclfactoryoptions)
- [Use with _fastify-auth_](#use-with-_fastify-auth_)

<!-- tocstop -->

## Usage

**NOTE:** If you're not familiar with [scoping in *fastify*](https://www.fastify.io/docs/master/Plugins/) this plugin isn't going to make much sense to you.  I'd highly recommend making sure that you're solid with this concept before proceeding.

**ANOTHER NOTE:**  _fastify-acl-auth_ needs to have a way to know what roles a user has, right?  By default it assumes that you have a session provider available at `request.session` (and that roles are available at `request.session.credentials.roles`, which you can easily change).  In many examples I simulate this with a request decorator (`fastify.decorateRequest('session', { ... })`), I recommend [*fastify-server-session*](https://www.npmjs.com/package/fastify-server-session) in practice.

You can use *fastify-acl-auth* in a few ways, ways that depend on how you want to structure your application and leverage *fastify*'s scoping.

### Simple Example

```js
'use strict'

const fastify = require('fastify')()

const aclFactory = require('@voxpelli/fastify-acl-auth')

const credentials = {
  id: 'bc965eb1-a8a4-4320-9172-726e9a7e83c9',
  username: 'cread',
  roles: 'vendor'
}

fastify.decorateRequest('session', {credentials})

fastify.register(function (fastifyScope, opts, next) {
  fastifyScope.register(
    aclFactory(
      {
        allowedRoles: ['customer']
      }
    )
  )
  // 403
  fastifyScope.get('/customers', function (request, reply) {
    return reply.send('/customers')
  })
  next()
})

fastify.register(function (fastifyScope, opts, next) {
  fastifyScope.register(
    aclFactory(
      {
        allowedRoles: ['vendor']
      }
    )
  )
  // 200
  fastifyScope.get('/vendors', function (request, reply) {
    return reply.send('/vendors')
  })
  next()
})

fastify.listen(8080, function (err) {
  if (err) throw err
  console.log('listening on %s', fastify.server.address().port)
})

```

### Using a Hierarchy

```js
'use strict'

const fastify = require('fastify')()

const aclFactory = require('@voxpelli/fastify-acl-auth')

const hierarchyAcl = aclFactory({hierarchy: ['user', 'admin', 'superuser']})

const credentials = {
  id: 'bc965eb1-a8a4-4320-9172-726e9a7e83c9',
  username: 'cread',
  roles: 'admin'
}

fastify.decorateRequest('session', {credentials})

fastify.register(function (fastifyScope, opts, next) {
  fastifyScope.register(
    hierarchyAcl,
    {
      allowedRoles: ['user']
    }
  )
  // 200, because 'admin' > 'user' in hierarchy
  fastifyScope.get('/user', function (request, reply) {
    return reply.send('/user')
  })
  next()
})

fastify.register(function (fastifyScope, opts, next) {
  fastifyScope.register(
    hierarchyAcl,
    {
      allowedRoles: ['admin']
    }
  )
  // 200
  fastifyScope.get('/admin', function (request, reply) {
    return reply.send('/admin')
  })
  next()
})

fastify.register(function (fastifyScope, opts, next) {
  fastifyScope.register(
    hierarchyAcl,
    {
      allowedRoles: ['superuser']
    }
  )
  // 403
  fastifyScope.get('/superuser', function (request, reply) {
    return reply.send('/superuser')
  })
  next()
})

fastify.listen(8080, function (err) {
  if (err) throw err
  console.log('listening on %s', fastify.server.address().port)
})

```

## API

_fastify-acl-auth_ exports a factory function; a function that _makes_ the plugin that you'll use.
```js
const aclFactory = require('@voxpelli/fastify-acl-auth')
```
### `options`

`options` is a simple object with the following properties:

| Property | Default | Type | Notes |
| --- | --- | --- | --- |
| `actualRoles` | `request.session.credentials.roles` |  `Array`, `string`, `[async] function` | Since `fastify-acl-auth` is all about comparing what roles a user _actually_ has to what a route _allows_ then this property is pretty important.  This property can be an `Array` of roles (`string`s), a role itself (`string`), or an `[async] function` that returns an `Array` of roles (`string`s). |
| `allowedRoles` | `[]` | `Array`, `string`, `[async] function`  | ^ that whole thing.  Except this property tells `fastify-acl-auth` which roles are _allowed_ for a route or routes. ([scoping!!!](https://www.fastify.io/docs/latest/Plugins/)) |
| `any` | `true` | `boolean` | If `true` a `200` will be returned if `actualRoles` contains _any_ of the roles in `allowedRoles`, `403` otherwise. |
| `all` | `false` | `boolean` | If `true` a `200` will be returned [iff](https://en.wikipedia.org/wiki/If_and_only_if) `actualRoles` contains _ALL_ of the roles in `allowedRoles`, `403` otherwise. |
| `hierarchy` | `undefined` | `Array` | An `Array` that specifies the privilege hierarchy of roles in order of ascending privilege. For instance, suppose we have `hierarchy: ['user', 'admin', 'superuser]`, `allowedRoles : ['admin']`, and `actualRoles: ['superuser]` configured for a route.  A user with the `superuser` role will be able to access that route because the `superuser` role is of higher privilege than the `user` and `admin` roles, as specified in the hierarchy. |
| `pathExempt` | `undefined` | `Array` | An `Array` that specifies the path patterns that should be exempt from enforcement; `['/login', '/callback**']` for example.  Uses the NPM module `url-pattern` internally for URL pattern matching. |

### `aclFactory([options])`
This will create an instance of `fastify-acl-auth`.  It can be used with `fastify.register()` just like any other plugin.

```js
fastify.register(aclFactory([options]), [options])
```

Nope, that's not a typo, `options` is there twice;  `aclFactory([options])` is setting the options of your _plugin instance_, whereas passing `options` during _registration_ is setting, or overriding, the _plugin instance_ options for _that registration_ of the plugin instance.  So you can create an instance of `fastify-acl-auth` and "carry it around with you" for later use.  Passing `options` _when you register_ the plugin will _override_ the `options` set when creating the plugin instance with the factory function.

Lots of words, right?  This architecture really comes from the architecture (really talking about scoping here) of `fastify` itself, and should make sense with a [basic knowledge of scoping](https://www.fastify.io/docs/latest/Plugins/).  It's actually very logical when it sinks in.
