const glua = require('glua')

const log = require('./log')
const {merge_at, set_at, push_to, remove_from, sum_at} = require('./modifiers')

module.exports = process

function process (fact, store, rules) {
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
