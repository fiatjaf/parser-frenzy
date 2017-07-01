module.exports = new Map([
  ['facts', new Map([
    ['input', [require('./Input'), 'Input']],
    ['preload', [require('./Preload'), 'Preload data', 'Prefill the store with this JSON data.']],
    ['checkpoints', [require('./Checkpoints'), 'Checkpoints']]
  ])],
  ['rules', new Map([
    ['rules', [require('./ListOfRules'), 'Your Rules']]
  //   ['modules', [require('./Modules'), 'Lua Modules']],
  //   ['repl', [require('./REPL'), 'Lua Playground']]
  ])],
  ['browse', new Map([
    ['raw', [require('./Raw'), 'Raw']]
  //   ['jq', [require('./JQ'), 'jq', 'Explore your data with jq']],
  //   ['sql', [require('./SQL'), 'SQL', 'Run SQL queries on your data']]
  ])]
])
