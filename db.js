const PouchDB = require('pouchdb-browser')
const Emitter = require('tiny-emitter')
const glua = require('glua')
const deepmerge = require('deepmerge')

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

  // cleanup errors and lines affected from rules
  for (let i = 0; i < rules.length; i++) {
    rules[i].errors = []
    rules[i].facts = []
  }

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

function process (fact) {
  // cleanup affected paths and errors
  fact.affected = []
  fact.errors = []

  let {_id, line} = fact
  let timestamp = _id.split(':')[1]
  for (let p = 0; p < rules.length; p++) {
    let rule = rules[p]
    let match = (new RegExp(rule.pattern)).exec(line)
    if (match) {
      // keep track of which lines have matched
      rule.facts.push(fact)

      try {
        glua.runWithGlobals({
          timestamp,
          line,
          match,

          // functions that modify the underlying store
          set_at: set_at.bind({affected: fact.affected, kind: 'set'}),
          merge_at: merge_at.bind({affected: fact.affected, kind: 'merge'}),
          sum_at: sum_at.bind({affected: fact.affected, kind: 'sum'}),
          push_to: push_to.bind({affected: fact.affected, kind: 'push'}),
          remove_from: remove_from.bind({affected: fact.affected, kind: 'remove'}),
          update_at: update_at.bind({affected: fact.affected, kind: 'update'})
          // the binding is necessary to keep track of `affected`.

        }, rule.code)
      } catch (error) {
        // keep track of where errors are happenning
        fact.errors.push({error, rule})
        rule.errors.push({error, fact})

        log.debug(error)
      }
    }
  }
}

function update_at (path, fn) {
  var arraypath = []

  var cur = store
  var prev
  var i = 1
  var key
  while (true) {
    if (path[i]) {
      key = path[i]
      arraypath.push(key)
      prev = cur
      cur[key] = cur[key] || {}
      cur = cur[key]
      i++
      continue
    }
    break
  }
  let val = fn(cur)
  prev[key] = val

  // save affected paths
  this.affected.push({kind: this.kind, at: arraypath, val: this.val || val})
}
function sum_at (path, val) {
  this.val = val
  update_at.call(this, path, cur => (typeof cur === 'number' ? cur : 0) + val)
}
function set_at (path, val) { update_at.call(this, path, () => val) }
function merge_at (path, val) {
  update_at.call(this, path, cur =>
    deepmerge(cur, val, {arrayMerge: (d, s) => s.concat(d)})
  )
}
function push_to (path, elem) {
  this.val = elem
  update_at.call(this, path, cur => {
    if (!Array.isArray(cur)) {
      cur = []
    }
    cur.push(elem)
    return cur
  })
}
function remove_from (path, elem) {
  this.val = elem
  update_at.call(this, path, cur => {
    if (!Array.isArray(cur)) {
      return []
    }

    while (cur.indexOf(elem) !== -1) {
      let index = cur.indexOf(elem)
      cur.splice(index, 1)
    }

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
