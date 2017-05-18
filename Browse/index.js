const makeSubRouter = require('../helpers/sub-router')

const Raw = require('./Raw')
const JQ = require('./JQ')
const SQL = require('./SQL')

module.exports = makeSubRouter('Facts', [
  ['raw', Raw, 'Raw'],
  ['jq', JQ, 'jq', 'Explore your data with jq'],
  ['sql', SQL, 'SQL', 'Run SQL queries on your data']
])
