const ref = require('./modifiers')

module.exports = process

function process (fact, state) {
  // cleanup affected paths and errors
  fact.rules = []

  let {rules, modules} = state

  var moduleMap = {}
  for (let i = 0; i < modules.length; i++) {
    let mod = modules[i]
    moduleMap[mod._id.split(':')[1]] = mod.code
  }

  let {_id, line} = fact
  for (let p = 0; p < rules.length; p++) {
    let rule = rules[p]

    try {
      let match = rule.lineParser.tryParse(line)

      // keep track of which lines have matched
      rule.facts.push({line: fact.line, data: match})

      let affected = []
      fact.rules.push({
        ruleId: rule._id, pattern: rule.pattern,
        data: match, affected, error: null
      })

      try {
        glua.runWithModules(moduleMap, {
          timestamp: parseInt(_id.split(':')[1]),
          line,
          match,
          data: ref(state, ['store'], affected, [])
        }, rule.code)
      } catch (error) {
        // keep track of where errors are happenning
        fact.error = {error: error.message, ruleId: rule._id, pattern: rule.pattern}
        rule.errors.push({error: error.message, line: fact.line})

        console.error(error)
      }
    } catch (e) {}
  }
}
