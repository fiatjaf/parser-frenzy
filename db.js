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
  .then(grabFacts())
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
        rules.push({_id, _rev, pattern, code})
      }
    })
}

function grabFacts () {
  facts = []

  return db.allDocs({startkey: 'f:', endkey: 'f:~', include_docs: true})
    .then(res => {
      for (let i = 0; i < res.rows.length; i++) {
        facts.push(res.rows[i].doc)
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
    if (change.id.slice(0, 2) === 'f:' && !change.deleted) {
      // process a new fact
      facts.push(change.doc)
      process(change.doc)
      log.info('store updated.')
      emitter.emit('!')
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
    let m = (new RegExp(pattern)).exec(line)
    if (m) {
      let match = {}
      m.forEach((v, i) => { match[i] = v })

      try {
        glua.runWithGlobals({
          timestamp,
          line,
          match,
          push_to: function (path, elem) {
            var cur = store
            var prev
            var i = 1
            var key
            while (true) {
              prev = cur
              key = path[i]
              if (key) {
                cur[key] = cur[key] || {}
                cur = cur[key]
                i++
                continue
              }
              break
            }
            if (!Array.isArray(cur)) {
              cur = []
            }
            cur.push(elem)
            prev[key] = cur
          }
        }, code)
      } catch (e) {
        log.debug(e)
      }
    }
  }
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
