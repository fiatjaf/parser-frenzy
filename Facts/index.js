const makeSubRouter = require('../helpers/sub-router')

const Input = require('./Input')
const Preload = require('./Preload')
const Checkpoints = require('./Checkpoints')

module.exports = makeSubRouter('Facts', [
  ['input', Input, 'Input'],
  ['preload', Preload, 'Preload data', 'Prefill the store with this JSON data.'],
  ['checkpoints', Checkpoints, 'Checkpoints']
])
