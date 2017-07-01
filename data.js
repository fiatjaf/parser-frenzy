const Kefir = require('kefir')
const R = require('ramda')
const L = require('partial.lenses')

const process = require('./process')
const {parseRule} = require('./helpers/parser-parser')
const {makeLineParser} = require('./helpers/parser')

const state = require('./state')

let facts$ = state.view(['facts', 'list'])
let rules$ = state.view(['rules', 'list'])
let lastCheckpoint$ = state.view(['checkpoints', 'list', 0, 'value', L.defaults({})])
let parsers$ = rules$
  .map(rules =>
    rules.map(R.compose(makeLineParser, R.prop('value'), parseRule, R.prop('pattern')))
  )

module.exports = Kefir.combine([lastCheckpoint$, facts$, rules$, parsers$])
  .debounce(400)
  .map(([chk, lfacts, lrules, lparsers]) => {
    var data = chk
    for (let f = 0; f < lfacts.length; f++) {
      let fact = lfacts[f]
      data = process(fact, lrules, lparsers, data)
    }
    return data
  })
