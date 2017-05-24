global.window = {}
window.chevrotain = require('chevrotain')

const {parseRule, makeLineParser} = require('./parser-parser')
const tape = require('tape')

tape('parsing user-defined rule definitions', t => {
  var rule = ' <word> banana[^@boat] (de|a)'
  t.deepEqual(parseRule(rule), {
    value: [
      {kind: 'parameter', name: 'word', type: 'word', multiple: false},
      {kind: 'whitespace'},
      {kind: 'literal', string: 'banana'},
      {kind: 'optional', alternatives: [
        [{kind: 'literal', string: '^@boat'}]
      ]},
      {kind: 'whitespace'},
      {kind: 'alternatives', alternatives: [
        [{kind: 'literal', string: 'de'}],
        [{kind: 'literal', string: 'a'}]
      ]}
    ],
    lexErrors: [],
    parseErrors: []
  }, rule)

  rule = 'pagamentos: <pagamentos:money...> [em <date>]'
  t.deepEqual(parseRule(rule), {
    value: [
      {kind: 'literal', string: 'pagamentos:'},
      {kind: 'whitespace'},
      {kind: 'parameter', name: 'pagamentos', type: 'money', multiple: true},
      {kind: 'whitespace'},
      {kind: 'optional', alternatives: [
        [
          {kind: 'literal', string: 'em'},
          {kind: 'whitespace'},
          {kind: 'parameter', name: 'date', type: 'date', multiple: false}
        ]
      ]}
    ],
    lexErrors: [],
    parseErrors: []
  }, rule)

  t.end()
})

tape('parsing a line', t => {
  var parseLine = makeLineParser([
    {kind: 'parameter', name: 'xu', type: 'word'},
    {kind: 'whitespace'},
    {kind: 'literal', string: 'banana'},
    {kind: 'optional', alternatives: [
      [{kind: 'literal', string: '-boat'}]
    ]}
  ])

  var line = 'açaí banana-boat'
  t.deepEqual(parseLine(line), {xu: 'açaí'}, line)
  line = ' açaí   banana   '
  t.deepEqual(parseLine(line), {xu: 'açaí'}, line)
  line = 'morangos com açúcar'
  t.notOk(parseLine(line), line)

  parseLine = makeLineParser([
    {kind: 'literal', string: 'pag'},
    {kind: 'optional', alternatives: [
      [{kind: 'literal', string: 'agamento'}],
      [{kind: 'literal', string: 'o'}],
      [{kind: 'literal', string: 'ou'}]
    ]},
    {kind: 'whitespace'},
    {kind: 'parameter', name: 'habitante', type: 'words'},
    {kind: 'whitespace'},
    {kind: 'parameter', name: 'valor', type: 'money'},
    {kind: 'whitespace'},
    {kind: 'literal', string: 'em'},
    {kind: 'whitespace'},
    {kind: 'parameter', type: 'date', name: 'date'}
  ])

  line = 'pag maria euzébia 525,30 em 13/12/2018'
  t.deepEqual(parseLine(line), {habitante: 'maria euzébia', valor: 525.30, date: '2018-12-13'}, line)
  line = 'pagou joana francisca 725,30 em 18/01/2019'
  t.deepEqual(parseLine(line), {habitante: 'joana francisca', valor: 725.30, date: '2019-01-18'}, line)

  parseLine = makeLineParser([
    {kind: 'alternatives', alternatives: [
      [
        {kind: 'literal', string: 'débito:'},
        {kind: 'whitespace'},
        {kind: 'parameter', name: 'débito', type: 'money', multiple: true}
      ],
      [
        {kind: 'literal', string: 'crédito:'},
        {kind: 'whitespace'},
        {kind: 'parameter', name: 'crédito', type: 'money', multiple: true}
      ]
    ]}
  ])

  line = 'débito: 18, 25,40'
  t.deepEqual(parseLine(line), {'débito': [18, 25.40]}, line)

  t.end()
})

tape('both things', t => {
  t.deepEqual(
    makeLineParser(
      parseRule(
        'pac[iente] <pac:words>, dr[a|.|a.] <dent:words>, pag[ou|ou:|.|.:|:] <money> [dia <date>]'
      ).value
    )('paciente beltrano josé, dra. mariana gastón, pagou: 600 dia 18/12/2001'), {
      dent: 'mariana gastón',
      pac: 'beltrano josé',
      money: 600,
      date: '2001-12-18'
    }
  )

  t.end()
})
