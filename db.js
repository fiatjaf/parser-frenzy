const PouchDB = window.PouchDB

const log = require('./log')
const {parseRule} = require('./helpers/parser-parser')
const {makeLineParser} = require('./helpers/parser')
const process = require('./process')

const emitter = new Emitter()

var cancel = {cancel: () => {}}

module.exports.loadDatabase = loadDatabase
function loadDatabase (selectedSettings) {
  cancel.cancel()

  state.settings = selectedSettings
  state.db = new PouchDB(state.settings.id)

  document.title = state.settings.name
  localStorage.setItem('using', state.settings.id)
  emitter.emit('db!')

  grabCheckpoints()
    .then(grabRules)
    .then(grabFacts)
    .then(() => {
      processAll()
      emitter.emit('checkpoint!')
      emitter.emit('rules!')
      emitter.emit('facts!')
      emitter.emit('modules!')
      emitter.emit('store!')
    })
    .catch(log.error)
    .then(() => {
      cancel = state.db.changes({live: true, include_docs: true, since: 'now'})
        .on('change', change => {
          if (change.id.slice(0, 2) === 'f:') {
            if (change.doc._rev.split('-')[0] === '1') {
              // a new fact, just process it
              state.facts.unshift(change.doc)
              process(change.doc, state)
              emitter.emit('facts!')
              emitter.emit('store!')
            } else {
              // fact changed or deleted, need to start over
              grabFacts()
                .then(processAll)
                .then(() => {
                  emitter.emit('rules!')
                  emitter.emit('facts!')
                  emitter.emit('modules!')
                  emitter.emit('store!')
                })
            }
          } else if (change.id.slice(0, 5) === 'rule:' || change.id.slice(0, 4) === 'mod:') {
            // rules have changed, need to start over
            grabRules()
              .then(processAll)
              .then(() => {
                emitter.emit('rules!')
                emitter.emit('modules!')
                emitter.emit('store!')
              })
          } else if (change.id.slice(0, 4) === 'chk:') {
            // checkpoints changed, start over
            grabCheckpoints()
              .then(processAll)
              .then(() => {
                emitter.emit('checkpoint!')
                emitter.emit('store!')
              })
          }
        })
        .on('error', log.error)
    })
}



// ---- ---- ----
// init
var state = {
  settings: null,
  db: null,
  store: {},
  modules: [],
  rules: [],
  facts: [],
  checkpoint: null
}

var databases = listDatabases()
var using = localStorage.getItem('using')

function init () {
  try {
    if (Object.keys(databases).length === 0) {
      let dbase = createDatabase()
      loadDatabase(dbase)
    } else if (!using) {
      let dbase = findDatabase(Object.keys(databases)[0])
      loadDatabase(dbase)
    } else {
      loadDatabase(findDatabase(using))
    }
  } catch (e) {
    using = null
    init()
  }
}

init()
