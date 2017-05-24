global.window = {}
window.chevrotain = require('chevrotain')

const {parseRule, makeLineParser} = require('./parser-parser')
const tape = require('tape')

tape('parsing user-defined rule definitions', t => {
  t.plan(1)
  t.deepEqual(parseRule(' <word> banana[^@boat] (de|a)'), {
    value: [
      {kind: 'whitespace'},
      {kind: 'parameter', name: 'word', type: 'word'},
      {kind: 'whitespace'},
      {kind: 'literal', string: 'banana'},
      {kind: 'optional', alternatives: ['^@boat']},
      {kind: 'whitespace'},
      {kind: 'alternatives', alternatives: ['de', 'a']}
    ],
    lexErrors: [],
    parseErrors: []
  })
})

tape('parsing a line', t => {
  t.plan(4)

  var parseLine = makeLineParser([
    {kind: 'parameter', name: 'xu', type: 'word'},
    {kind: 'whitespace'},
    {kind: 'literal', string: 'banana'},
    {kind: 'optional', alternatives: ['-boat']}
  ])

  t.deepEqual(parseLine('açaí banana-boat'), {xu: 'açaí'})
  t.deepEqual(parseLine('açaí   banana'), {xu: 'açaí'})
  t.notOk(parseLine('morangos com açúcar'))

  parseLine = makeLineParser([
    {kind: 'literal', string: 'pag'},
    {kind: 'optional', alternatives: ['agamento', 'o', 'ou']},
    {kind: 'whitespace'},
    {kind: 'parameter', name: 'habitante', type: 'words'},
    {kind: 'whitespace'},
    {kind: 'parameter', name: 'valor', type: 'money'},
    {kind: 'whitespace'},
    {kind: 'literal', string: 'em'},
    {kind: 'whitespace'},
    {kind: 'parameter', type: 'date', name: 'date'}
  ])

  t.deepEqual(parseLine('pag maria euzébia 525,30 em 13/12/2018'), {habitante: 'maria euzébia', valor: '525,30', date: '13/12/2018'})
})
