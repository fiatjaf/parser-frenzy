const makeSubRouter = require('../helpers/sub-router')

const Select = require('./Select')
const WebRTC = require('./WebRTC')
const CouchDB = require('./CouchDB')

module.exports = makeSubRouter('Preferences', [
  ['select', Select, 'Select database', 'Choose a local database to use now.'],
  ['webrtc', WebRTC, 'Direct browser replication', 'Use a manually configured WebRTC connection to migrate your databases to other browsers'],
  ['couchdb', CouchDB, 'CouchDB sync', 'Sync your database to a remote CouchDB']
])
