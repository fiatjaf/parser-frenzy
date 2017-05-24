const {createToken, Lexer, Parser} = window.chevrotain

const unicodeLetter = require('./unicode-letter')

module.exports.parseRule = parseRule
module.exports.makeLineParser = makeLineParser

const WORD = createToken({
  name: 'WORD',
  label: 'word',
  pattern: new RegExp(unicodeLetter + '+')
})
const NUMBER = createToken({name: 'NUMBER', pattern: /\d+/, label: 'number'})
const WHITESPACE = createToken({name: 'WHITESPACE', pattern: /\s+/})
const ANYTHING = createToken({name: 'ANYTHING', pattern: /[^\s\[\]\(\):><\d\w]+/, label: 'anything'})
const LT = createToken({name: 'LT', pattern: /</, label: '<'})
const GT = createToken({name: 'GT', pattern: />/, label: '>'})
const LSQUARE = createToken({name: 'LSQUARE', pattern: /\[/, label: '['})
const RSQUARE = createToken({name: 'RSQUARE', pattern: /]/, label: ']'})
const LBRACKET = createToken({name: 'LBRACKET', pattern: /\(/, label: '('})
const RBRACKET = createToken({name: 'RBRACKET', pattern: /\)/, label: ')'})
const ELLIPSIS = createToken({name: 'ELLIPSIS', pattern: /…|\.\.\./, label: '…'})
const COLON = createToken({name: 'COLON', pattern: /:/, label: ':'})
const DIRECTIVE = createToken({
  name: 'DIRECTIVE',
  pattern: /words|word|money|date/,
  label: 'directive'
})
const VERTICALBAR = createToken({name: 'VERTICALBAR', pattern: /|/, label: '|'})

let tokens = [
  WHITESPACE, LT, GT, VERTICALBAR, LSQUARE, RSQUARE, LBRACKET, RBRACKET,
  ELLIPSIS, COLON, DIRECTIVE, NUMBER, WORD, ANYTHING
]
let lexer = new Lexer(tokens)

function RuleParser (input) {
  Parser.call(this, input, tokens, {recoveryEnabled: true})
  var $ = this

  $.RULE('main', () => {
    return $.AT_LEAST_ONE(() =>
      $.OR([
        {ALT: () => $.CONSUME(WHITESPACE) && {kind: 'whitespace'} },
        {ALT: () => $.SUBRULE($.parameter) },
        {ALT: () => $.SUBRULE($.optional) },
        {ALT: () => $.SUBRULE($.alternatives) },
        {ALT: () => $.SUBRULE($.literal) }
      ])
    )
  })

  $.RULE('parameter', () => {
    var name
    $.CONSUME(LT)
    $.OPTION1(() => {
      name = $.CONSUME(WORD).image
      $.CONSUME(COLON)
    })
    let type = $.CONSUME2(DIRECTIVE).image
    var multiple = false
    $.OPTION2(() => {
      if ($.CONSUME(ELLIPSIS)) {
        multiple = true
      }
    })
    $.CONSUME(GT)

    if (!name) name = type

    return {kind: 'parameter', name, type, multiple}
  })

  $.RULE('alternatives', () => {
    $.CONSUME(LBRACKET)
    let alternatives = $.SUBRULE($.or)
    $.CONSUME(RBRACKET)
    return {kind: 'alternatives', alternatives}
  })

  $.RULE('optional', () => {
    $.CONSUME(LSQUARE)
    let alternatives = $.SUBRULE($.or)
    $.CONSUME(RSQUARE)
    return {kind: 'optional', alternatives}
  })

  $.RULE('literal', () => {
    let string = $.SUBRULE($.anything)
    return {kind: 'literal', string}
  })

  $.RULE('or', () => {
    var alternatives = []
    $.AT_LEAST_ONE_SEP({
      SEP: VERTICALBAR,
      DEF: () => {
        let alt = $.SUBRULE($.main)
        alternatives.push(alt)
      }
    })
    return alternatives
  })

  $.RULE('anything', () => {
    var string = ''
    $.AT_LEAST_ONE(() => {
      string += $.OR([
        {ALT: () => $.CONSUME(LT).image },
        {ALT: () => $.CONSUME(GT).image },
        {ALT: () => $.CONSUME(COLON).image },
        {ALT: () => $.CONSUME(ELLIPSIS).image },
        {ALT: () => $.CONSUME(WORD).image },
        {ALT: () => $.CONSUME(NUMBER).image },
        {ALT: () => $.CONSUME(ANYTHING).image }
      ])
    })
    return string
  })

  Parser.performSelfAnalysis(this)
}

RuleParser.prototype = Object.create(Parser.prototype)
RuleParser.prototype.constructor = RuleParser

let ruleParser = new RuleParser([])

function parseRule (text) {
  let lexResult = lexer.tokenize(text.trim())
  ruleParser.input = lexResult.tokens
  let value = ruleParser.main()

  return {
    value,
    lexErrors: lexResult.errors,
    parseErrors: ruleParser.errors
  }
}

function makeLineParser (directives) {
  let {regex, parameters} = buildRegex(directives)
  var re = new RegExp(regex)

  return function parseLine (text) {
    let match = re.exec(text.trim())
    if (match) {
      var res = {}
      for (let i = 0; i < parameters.length; i++) {
        let {name: paramName, process} = parameters[i]
        let matched = match[i + 1 /* because 0 in regex matches is the whole thing */]
        if (matched) {
          res[paramName] = process(matched)
        }
      }
      return res
    }
  }
}

function buildRegex (directives) {
  var regex = ''
  var parameters = []

  for (let i = 0; i < directives.length; i++) {
    let directive = directives[i]
    switch (directive.kind) {
      case 'whitespace':
        regex += '\\s+'
        break
      case 'literal':
        regex += directive.string
        break
      case 'alternatives':
      case 'optional':
        var subregexes = []
        for (let s = 0; s < directive.alternatives.length; s++) {
          let {regex: subregex, parameters: subparameters} = buildRegex(directive.alternatives[s])
          subregexes.push(subregex)
          parameters = parameters.concat(subparameters)
        }
        regex += `(?:${subregexes.join('|')})`
        if (directive.kind === 'optional') {
          regex += '?'
        }
        break
      case 'parameter':
        var paramDef = {name: directive.name}
        var subregex = types[directive.type].regex
        if (directive.multiple) {
          subregex += `(?:${directive.separator || ','} *${subregex})*`
          paramDef.process = processMultiple.bind(null, directive.type)
        } else {
          paramDef.process = types[directive.type].process
        }
        regex += '(' + subregex + ')'
        parameters.push(paramDef)
        break
    }
  }

  return {regex, parameters}
}

const types = {
  word: {
    regex: `${unicodeLetter}+`,
    process: x => x
  },
  words: {
    regex: `(?: |${unicodeLetter})+`,
    process: x => x
  },
  money: {
    regex: '\\d+(?:[,.]\\d{2})?',
    process: x => parseFloat(x.replace(',', '.'))
  },
  date: {
    regex: '\\d{2}\\/\\d{2}\\/\\d{4}',
    process: x => x.split('/').reverse().join('-')
  }
}

const processMultiple = (type, matched) => {
  var res = []
  matched.replace(new RegExp(types[type].regex, 'g'), x => {
    res.push(types[type].process(x))
  })
  return res
}
