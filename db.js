const PouchDB = require('pouchdb-browser')
const Emitter = require('tiny-emitter')
const cuid = require('cuid')
const XRegExp = window.XRegExp
const debounce = require('debounce')

const log = require('./log')
const process = require('./process')

const emitter = new Emitter()

var cancel = {cancel: () => {}}

module.exports.newStore = newStore
function newStore () {
  let id = cuid.slug()
  return {
    name: id,
    id: id
  }
}

module.exports.loadStore = loadStore
function loadStore (selectedStoreSettings) {
  cancel.cancel()

  state.settings = selectedStoreSettings
  state.db = new PouchDB(state.settings.id)
  emitter.emit('db!')

  grabRules()
    .then(grabFacts)
    .then(() => {
      processAll()
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
              // process a new fact
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
        let regex = XRegExp(pattern)
        state.rules.unshift({_id, _rev, pattern, code, regex})
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

function grabFacts () {
  state.facts = []

  return state.db.allDocs({startkey: 'f:', endkey: 'f:~', include_docs: true})
    .then(res => {
      for (let i = 0; i < res.rows.length; i++) {
        state.facts.unshift(res.rows[i].doc)
      }
    })
}

function processAll () {
  state.store = {}

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
  'rules'
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
      emitter.off(what + '!', dispatch)
    }
    emitter.off('!', dispatch)
  }
}

module.exports.deleteStore = function (id) {
  let tmpdb = new PouchDB(id)
  tmpdb.destroy()
    .then(() => log.info(`destroyed PouchDB ${id}.`))
    .catch(log.error)

  using = localStorage.getItem('using')
  stores = JSON.parse(localStorage.getItem('stores') || '[]')

  for (let i = 0; i < stores.length; i++) {
    if (stores[i].id === id) {
      stores.splice(i, 1)
      break
    }
  }

  if (using === id) {
    using = stores[0].id
    loadStore(stores[0])
  }

  localStorage.setItem('stores', JSON.stringify(stores))
  localStorage.setItem('using', using)
}

function findStore (id) {
  for (let i = 0; i < stores.length; i++) {
    if (stores[i].id === id) return stores[i]
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
  facts: []
}

var stores = JSON.parse(localStorage.getItem('stores') || '[]')
var using = localStorage.getItem('using')

if (stores.length === 0) {
  let store = newStore()
  stores.push(store)
  using = store.id
  localStorage.setItem('stores', JSON.stringify(stores))
  localStorage.setItem('using', using)
} else if (!using) {
  using = stores[0].id
  localStorage.setItem('using', using)
}

loadStore(findStore(using))
