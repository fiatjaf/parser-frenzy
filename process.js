const glua = window.glua
const XRegExp = window.XRegExp

const ref = require('./modifiers')

module.exports = process

function process (fact, state) {
  // cleanup affected paths and errors
  fact.affected = []
  fact.errors = []

  let {rules, modules} = state

  var moduleMap = {}
  for (let i = 0; i < modules.length; i++) {
    let mod = modules[i]
    moduleMap[mod._id.split(':')[1]] = mod.code
  }

  let {_id, line} = fact
  for (let p = 0; p < rules.length; p++) {
    let rule = rules[p]
    let match = XRegExp.exec(line, rule.regex)
    if (match) {
      // keep track of which lines have matched
      rule.facts.push(fact)

      try {
        glua.runWithModules(moduleMap, {
          timestamp: parseInt(_id.split(':')[1]),
          line,
          match,
          data: ref(state, ['store'], fact.affected, [])
        }, rule.code)
      } catch (error) {
        // keep track of where errors are happenning
        fact.errors.push({error, rule})
        rule.errors.push({error, fact})

        console.error(error)
      }
    }
  }
}
