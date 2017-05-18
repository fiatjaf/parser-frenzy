const makeSubRouter = require('../helpers/sub-router')

const Select = require('./Select')
const WebRTC = require('./WebRTC')
const CouchDB = require('./CouchDB')

module.exports = makeSubRouter('Preferences', [
  ['select', Select, 'Select database', 'Choose a local database to use now.'],
  ['webrtc', WebRTC, 'Direct browser replication', 'Migrate your databases to other browsers using WebRTC.'],
  ['couchdb', CouchDB, 'CouchDB sync', 'Sync your database to a remote CouchDB']
])
