const PouchDB = require('pouchdb')
const page = require('page')
const qs = require('qs')
const U = require('karet.util')
const L = require('partial.lenses')
const R = require('ramda')

const log = require('./log')
const databases = require('./databases')
const {parseRule} = require('./helpers/parser-parser')
const {makeLineParser} = require('./helpers/parser')
const process = require('./process')

const initial = {
  chosen: null,
  db: null,
  route: {
    route: 'facts',
    subroute: 'input',
    props: null
  },
  facts: {
    editing: null,
    opened: null,
    list: [],
    tempValues: {}
  },
  rules: {
    list: []
  },
  checkpoints: {
    typed: '',
    parsed: null,
    opened: null,
    list: []
  },
  modules: {
    list: []
  },
  views: {
    list: []
  }
}
let chosen = databases.current()

const state = U.atom({...initial, chosen, db: new PouchDB(chosen.id)})
state.log('state')
module.exports = state
window.state = state

state.view('chosen').onValue(chosen =>
  state.set({...initial, chosen, db: new PouchDB(chosen.id)})
)

/* routes */
page('*', (ctx, next) => {
  ctx.query = qs.parse(ctx.querystring)
  next()
})
page('/', '/facts/input')
page('/:route/', ctx => {
  state.modify(L.set('route', {
    route: ctx.params.route,
    subroute: ctx.params.subroute,
    props: ctx
  }))
})
page('/:route/:subroute', ctx =>
  state.modify(L.set('route', {
    route: ctx.params.route,
    subroute: ctx.params.subroute,
    props: ctx
  }))
)
page({hashbang: true})
/**********/

/* changes */
state.view('db').onValue(db => {
  db.changes({include_docs: true, live: true})
    .on('change', change => {
      var doc = change.doc
      if (change.doc._deleted) doc = undefined
      var prop

      if (change.doc._id.slice(0, 2) === 'f:') {
        prop = 'facts'
      } else if (change.doc._id.slice(0, 5) === 'rule:') {
        prop = 'rules'
      } else if (change.doc._id.slice(0, 4) === 'chk:') {
        prop = 'checkpoints'
      } else if (change.doc._id.slice(0, 2) === 'v:') {
        prop = 'views'
      } else if (change.doc._id.slice(0, 4) === 'mod:') {
        prop = 'modules'
      } else {
        console.log(change)
        return
      }

      var lens = [
        prop,
        'list',
        L.defaults([]),
        L.normalize(R.compose(R.reverse, R.sortBy(R.prop('_id')))),
        L.find(R.whereEq({_id: change.doc._id}))
      ]

      // append, update or remove the doc from the correct place in the tree
      state.modify(L.set(lens, doc))
    })
})
/***********/

//    grabRules: () => {
//      return Promise.all([
//        this.db.allDocs({startkey: 'rule:', endkey: 'rule:~', include_docs: true})
//        .then(res => {
//          var rules = []
//          for (let i = 0; i < res.rows.length; i++) {
//            let {_id, _rev, pattern, code} = res.rows[i].doc
//            let {value: directives, parseErrors} = parseRule(pattern)
//            if (!parseErrors.length) {
//              let lineParser = makeLineParser(directives)
//              rules.unshift({_id, _rev, pattern, code, lineParser})
//            } else {
//              rules.unshift({_id, _rev, pattern, code, parseErrors})
//            }
//          }
//          return rules
//        }),
//        this.db.allDocs({startkey: 'mod:', endkey: 'mod:~', include_docs: true})
//        .then(res => {
//          var modules = []
//          for (let i = 0; i < res.rows.length; i++) {
//            let {_id, _rev, code} = res.rows[i].doc
//            modules.push({_id, _rev, code})
//          }
//          return modules
//        })
//      ])
//      .then(action('grab-rules', (rules, modules) => {
//        this.rules = rules
//        this.modules = modules
//      }))
//    },
//
//    grabCheckpoints: () => {
//      this.db.allDocs({startkey: 'chk:', endkey: 'chk:~', include_docs: true})
//      .then(action('grab-checkpoints', res => {
//        this.checkpoints = res.rows.map(r => r.doc).reverse()
//      }))
//    },
//
//    grabFacts: () => {
//      let since = this.lastCheckpoint ? this.lastCheckpoint._id.split(':')[1] : ''
//
//      this.db.allDocs({startkey: `f:${since}`, endkey: 'f:~', include_docs: true})
//      .then(action('grab-facts', res => {
//        this.facts = []
//        for (let i = 0; i < res.rows.length; i++) {
//          this.facts.unshift(res.rows[i].doc)
//        }
//      }))
//    },
//
//    processAll: action('process-all', () => {
//      this.store = {}
//
//      // init the store with the last checkpoint
//      if (this.lastCheckpoint) {
//        this.store = {...this.lastCheckpoint.checkpoint}
//      }
//
//      // cleanup errors and lines affected from rules
//      for (let i = 0; i < this.rules.length; i++) {
//        this.rules[i].errors = []
//        this.rules[i].facts = []
//      }
//
//      for (let i = 0; i < this.facts.length; i++) {
//        process(this.facts[i], this)
//      }
//    })
//  })
//}
