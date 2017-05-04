const PouchDB = require('pouchdb-browser')
const Emitter = require('tiny-emitter')
const glua = require('glua')

const log = require('./log')

const db = new PouchDB('main')
module.exports.db = db

var store = {}
var rules = []
var facts = []

grabRules()
  .then(grabFacts)
  .then(() => {
    processAll()
    emitter.emit('!')
  })
  .catch(log.error)

function grabRules () {
  rules = []

  return db.allDocs({startkey: 'rule:', endkey: 'rule:~', include_docs: true})
    .then(res => {
      for (let i = 0; i < res.rows.length; i++) {
        let {_id, _rev, pattern, code} = res.rows[i].doc
        rules.unshift({_id, _rev, pattern, code})
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

  for (let i = 0; i < facts.length; i++) {
    process(facts[i])
  }
}

db.changes({live: true, include_docs: true, since: 'now'})
  .on('change', change => {
    if (change.id.slice(0, 2) === 'f:') {
      if (change.doc._rev.split('-')[0] === '1') {
        // process a new fact
        facts.unshift(change.doc)
        process(change.doc)
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

function process (doc) {
  let {_id, line} = doc
  let timestamp = _id.split(':')[1]
  for (let p = 0; p < rules.length; p++) {
    let {pattern, code} = rules[p]
    let match = (new RegExp(pattern)).exec(line)
    if (match) {
      try {
        glua.runWithGlobals({
          timestamp,
          line,
          match,
          set_at,
          inc_at,
          push_to,
          update_at
        }, code)
      } catch (e) {
        log.debug(e)
      }
    }
  }
}

function update_at (path, fn) {
  var cur = store
  var prev
  var i = 1
  var key
  while (true) {
    if (path[i]) {
      key = path[i]
      prev = cur
      cur[key] = cur[key] || {}
      cur = cur[key]
      i++
      continue
    }
    break
  }
  prev[key] = fn(cur)
}

function inc_at (path) { update_at(path, cur => cur + 1) }
function set_at (path, elem) { update_at(path, () => elem) }
function push_to (path, elem) {
  update_at(path, cur => {
    if (!Array.isArray(cur)) {
      cur = []
    }
    cur.push(elem)
    return cur
  })
}

var emitter = new Emitter()

module.exports.onStateChange = function (cb) {
  cb({store, facts, rules}) // initial call.

  // listen:
  let fn = () => cb({store, facts, rules})
  emitter.on('!', fn)

  // return a 'cancel' function
  return () => emitter.off('!', fn)
}
