// const ref = require('./modifiers')
const L = require('partial.lenses')
const R = require('ramda')

module.exports = process

function process (fact, rules, parsers, data) {
  // cleanup affected paths and errors
  // fact.rules = []

  let {_id, line} = fact
  var updateddata = data
  for (let p = 0; p < rules.length; p++) {
    let rule = rules[p]
    let parser = parsers[p]

    try {
      let match = parser.tryParse(line)

      // keep track of which lines have matched
      // rule.facts.push({line: fact.line, data: match})

      // let affected = []
      // fact.rules.push({
      //   ruleId: rule._id, pattern: rule.pattern,
      //   data: match, affected, error: null
      // })

      try {
        updateddata = evalCode(rule.code, {
          timestamp: parseInt(_id.split(':')[1]),
          line,
          match,
          data: updateddata,
          L,
          R
        })(updateddata)
      } catch (error) {
        // keep track of where errors are happenning
        // fact.error = {error: error.message, ruleId: rule._id, pattern: rule.pattern}
        // rule.errors.push({error: error.message, line: fact.line})

        console.error('evalCode error', error)
      }
    } catch (e) {
      console.error('failed to parse', line, 'with', rule.pattern, ':', e)
    }
  }

  return updateddata
}

function evalCode (code, params) {
  let keys = R.keys(params)
  let program = (
    `(function (${keys.join(', ')}) {
       ${code}
    })`
  )
  return eval(program).apply(null, keys.map(k => params[k]))
}
