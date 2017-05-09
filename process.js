const glua = require('glua')
const XRegExp = window.XRegExp

const log = require('./log')
const {merge_at, set_at, push_to, remove_from, sum_at} = require('./modifiers')

module.exports = process

function process (fact, store, rules, modules) {
  // cleanup affected paths and errors
  fact.affected = []
  fact.errors = []

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

          // functions that modify the underlying store
          set_at: set_at.bind({affected: fact.affected, kind: 'set'}, store),
          merge_at: merge_at.bind({affected: fact.affected, kind: 'merge'}, store),
          sum_at: sum_at.bind({affected: fact.affected, kind: 'sum'}, store),
          push_to: push_to.bind({affected: fact.affected, kind: 'push'}, store),
          remove_from: remove_from.bind({affected: fact.affected, kind: 'remove'}, store)
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
