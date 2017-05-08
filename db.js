const PouchDB = require('pouchdb-browser')
window.PouchDB = PouchDB
const Emitter = require('tiny-emitter')
const cuid = require('cuid')
const XRegExp = window.XRegExp

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

  settings = selectedStoreSettings
  db = new PouchDB(settings.id)
  emitter.emit('!')

  grabRules()
    .then(grabFacts)
    .then(() => {
      processAll()
      emitter.emit('!')
    })
    .catch(log.error)
    .then(() => {
      cancel = db.changes({live: true, include_docs: true, since: 'now'})
        .on('change', change => {
          if (change.id.slice(0, 2) === 'f:') {
            if (change.doc._rev.split('-')[0] === '1') {
              // process a new fact
              facts.unshift(change.doc)
              process(change.doc, store, rules)
              emitter.emit('!')
            } else {
              // fact changed or deleted, need to start over
              grabFacts()
                .then(processAll)
                .then(() => {
                  emitter.emit('!')
                })
            }
          } else if (change.id.slice(0, 5) === 'rule:') {
            // rules have changed, need to start over
            grabRules()
              .then(processAll)
              .then(() => {
                emitter.emit('!')
              })
          }
        })
        .on('error', log.error)
    })
}

function grabRules () {
  rules = []

  return db.allDocs({startkey: 'rule:', endkey: 'rule:~', include_docs: true})
    .then(res => {
      for (let i = 0; i < res.rows.length; i++) {
        let {_id, _rev, pattern, code} = res.rows[i].doc
        let regex = XRegExp(pattern)
        rules.unshift({_id, _rev, pattern, code, regex})
      }
    })
}

function grabFacts () {
  facts = []

  return db.allDocs({startkey: 'f:', endkey: 'f:~', include_docs: true})
    .then(res => {
      for (let i = 0; i < res.rows.length; i++) {
        facts.unshift(res.rows[i].doc)
      }
    })
}

function processAll () {
  store = {}

  // cleanup errors and lines affected from rules
  for (let i = 0; i < rules.length; i++) {
    rules[i].errors = []
    rules[i].facts = []
  }

  for (let i = 0; i < facts.length; i++) {
    process(facts[i], store, rules)
  }
}

module.exports.onStateChange = function (cb) {
  cb({db, settings, store, facts, rules}) // initial call.

  // listen:
  let fn = () =>
    cb({db, settings, store, facts, rules})
  emitter.on('!', fn)

  // return a 'cancel' function
  return () => emitter.off('!', fn)
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
var settings
var db
var store = {}
var rules = []
var facts = []

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
