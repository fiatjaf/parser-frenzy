const makeSubRouter = require('../helpers/sub-router')

const REPL = require('./REPL')
const Modules = require('./Modules')
const ListOfRules = require('./ListOfRules')

module.exports = makeSubRouter('Rules', [
  ['rules', ListOfRules, 'Your Rules'],
  ['modules', Modules, 'Lua Modules'],
  ['repl', REPL, 'Lua Playground']
])
