const PouchDB = window.PouchDB
const Emitter = require('tiny-emitter')
const cuid = require('cuid')
const debounce = require('debounce')

const log = require('./log')
const {parseRule} = require('./helpers/parser-parser')
const {makeLineParser} = require('./helpers/parser')
const process = require('./process')

const emitter = new Emitter()

var cancel = {cancel: () => {}}

// -- database management

module.exports.listDatabases = listDatabases
function listDatabases () {
  return JSON.parse(localStorage.getItem('databases') || '{}')
}

module.exports.createDatabase = createDatabase
function createDatabase (id, name) {
  id = id || cuid.slug()
  name = name || id

  let databases = listDatabases()
  databases[id] = {name, id}
  localStorage.setItem('databases', JSON.stringify(databases))

  return {name, id}
}

module.exports.updateDatabase = updateDatabase
function updateDatabase (id, update) {
  databases[id] = {...databases[id], ...update}
  if (state.settings.id === id) state.settings = databases[id]
  localStorage.setItem('databases', JSON.stringify(databases))
  emitter.emit('settings!')
}

module.exports.deleteDatabase = deleteDatabase
function deleteDatabase (id) {
  let tmpdb = new PouchDB(id)
  tmpdb.destroy()
    .then(() => log.info(`destroyed PouchDB ${id}.`))
    .catch(log.error)

  using = localStorage.getItem('using')
  databases = listDatabases()

  delete databases[id]

  if (using === id) {
    let dbase = databases[Object.keys(databases)[0]]
    using = dbase.id
    loadDatabase(dbase)
    emitter.emit('settings!')
  }

  localStorage.setItem('databases', JSON.stringify(databases))
  localStorage.setItem('using', using)
}

module.exports.findDatabase = findDatabase
function findDatabase (id) {
  return databases[id]
}


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

function grabRules () {
  state.modules = []
  state.rules = []

  return Promise.all([
    state.db.allDocs({startkey: 'rule:', endkey: 'rule:~', include_docs: true})
    .then(res => {
      for (let i = 0; i < res.rows.length; i++) {
        let {_id, _rev, pattern, code} = res.rows[i].doc
        let {value: directives, parseErrors} = parseRule(pattern)
        if (!parseErrors.length) {
          let lineParser = makeLineParser(directives)
          state.rules.unshift({_id, _rev, pattern, code, lineParser})
        } else {
          state.rules.unshift({_id, _rev, pattern, code, parseErrors})
        }
      }
    }),
    state.db.allDocs({startkey: 'mod:', endkey: 'mod:~', include_docs: true})
    .then(res => {
      for (let i = 0; i < res.rows.length; i++) {
        let {_id, _rev, code} = res.rows[i].doc
        state.modules.push({_id, _rev, code})
      }
    })
  ])
}

function grabCheckpoints () {
  state.checkpoint = null

  return state.db.allDocs({startkey: 'chk:', endkey: 'chk:~', include_docs: true})
    .then(res => {
      for (let i = 0; i < res.rows.length; i++) {
        state.checkpoint = res.rows[i].doc
      }
    })
}

function grabFacts () {
  state.facts = []

  let since = state.checkpoint ? state.checkpoint._id.split(':')[1] : ''

  return state.db.allDocs({startkey: `f:${since}`, endkey: 'f:~', include_docs: true})
    .then(res => {
      for (let i = 0; i < res.rows.length; i++) {
        state.facts.unshift(res.rows[i].doc)
      }
    })
}

function processAll () {
  state.store = {}

  // init the store with the last checkpoint
  if (state.checkpoint) {
    state.store = {...state.checkpoint.checkpoint}
  }

  // cleanup errors and lines affected from rules
  for (let i = 0; i < state.rules.length; i++) {
    state.rules[i].errors = []
    state.rules[i].facts = []
  }

  for (let i = 0; i < state.facts.length; i++) {
    process(state.facts[i], state)
  }
}

module.exports.onStateChange = function (cb, selected = [
  'db',
  'settings',
  'store',
  'modules',
  'facts',
  'rules',
  'checkpoint'
]) {
  let dispatch = () => cb(state)
  let ddispatch = debounce(dispatch, 1) // on sequential emits, group them

  for (let i = 0; i < selected.length; i++) {
    let what = selected[i]
    emitter.on(what + '!', ddispatch)
  }
  emitter.on('!', dispatch)

  dispatch() // initial call.

  // return a 'cancel' function
  return () => {
    for (let i = 0; i < selected.length; i++) {
      let what = selected[i]
      emitter.off(what + '!', ddispatch)
    }
    emitter.off('!', dispatch)
  }
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
