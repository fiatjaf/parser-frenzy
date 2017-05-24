global.window = {}
window.chevrotain = require('chevrotain')

const {parseRule, makeLineParser} = require('./parser-parser')
const tape = require('tape')

tape('parsing user-defined rule definitions', t => {
  t.plan(1)
  t.deepEqual(parseRule(' <word> banana[^@boat] (de|a)'), {
    value: [
      {
        kind: 'whitespace'
      },
      {
        kind: 'parameter',
        name: 'word',
        type: 'word'
      },
      {
        kind: 'whitespace'
      },
      {
        kind: 'literal',
        string: 'banana'
      },
      {
        kind: 'optional',
        alternatives: [
          '^@boat'
        ]
      },
      {
        kind: 'whitespace'
      },
      {
        kind: 'alternatives',
        alternatives: [
          'de',
          'a'
        ]
      }
    ],
    lexErrors: [],
    parseErrors: []
  })
})

tape('parsing a line', t => {
  t.plan(1)

  let parseLine = makeLineParser([
    {
      kind: 'parameter',
      name: 'xu',
      type: 'word'
    },
    {
      kind: 'whitespace'
    },
    {
      kind: 'literal',
      string: 'banana'
    },
    {
      kind: 'optional',
      alternatives: [
        '-boat'
      ]
    }
  ])

  t.deepEqual(parseLine('goiaba banana-boat'), {
    xu: 'goiaba'
  })
})
