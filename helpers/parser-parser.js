const {createToken, Lexer, Parser} = window.chevrotain

const unicodeLetter = require('./unicode-letter')

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
const COLON = createToken({name: 'COLON', pattern: /:/, label: ':'})
const DIRECTIVE = createToken({
  name: 'DIRECTIVE',
  pattern: /words|word|money|date/,
  label: 'directive'
})
const VERTICALBAR = createToken({name: 'VERTICALBAR', pattern: /|/, label: '|'})

let tokens = [
  WHITESPACE, LT, GT, VERTICALBAR, LSQUARE, RSQUARE, LBRACKET, RBRACKET,
  COLON, DIRECTIVE, NUMBER, WORD, ANYTHING
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
    $.OPTION(() => {
      name = $.SUBRULE($.anything)
      $.CONSUME(COLON)
    })
    let type = $.CONSUME2(DIRECTIVE).image
    $.CONSUME(GT)

    if (!name) name = type

    return {kind: 'parameter', name, type}
  })

  $.RULE('alternatives', () => {
    var alternatives = []
    $.CONSUME(LBRACKET)
    $.AT_LEAST_ONE_SEP({
      SEP: VERTICALBAR,
      DEF: () => {
        var alt = ''
        $.AT_LEAST_ONE(() => {
          alt += $.OR([
            {ALT: () => $.SUBRULE($.anything) },
            {ALT: () => $.CONSUME(WHITESPACE).image }
          ])
        })
        alternatives.push(alt)
      }
    })
    $.CONSUME(RBRACKET)
    return {kind: 'alternatives', alternatives}
  })

  $.RULE('optional', () => {
    var alternatives = []
    $.CONSUME(LSQUARE)
    $.AT_LEAST_ONE_SEP({
      SEP: VERTICALBAR,
      DEF: () => {
        var alt = ''
        $.AT_LEAST_ONE(() => {
          alt += $.OR([
            {ALT: () => $.SUBRULE($.anything) },
            {ALT: () => $.CONSUME(WHITESPACE).image }
          ])
        })
        alternatives.push(alt)
      }
    })
    $.CONSUME(RSQUARE)
    return {kind: 'optional', alternatives}
  })

  $.RULE('literal', () => {
    let string = $.SUBRULE($.anything)
    return {kind: 'literal', string}
  })

  $.RULE('anything', () => {
    var string = ''
    $.AT_LEAST_ONE(() => {
      string += $.OR([
        {ALT: () => $.CONSUME(LT).image },
        {ALT: () => $.CONSUME(GT).image },
        {ALT: () => $.CONSUME(COLON).image },
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
  let lexResult = lexer.tokenize(text)
  ruleParser.input = lexResult.tokens
  let value = ruleParser.main()

  return {
    value,
    lexErrors: lexResult.errors,
    parseErrors: ruleParser.errors
  }
}

function makeLineParser (directives) {
  var regex = ''
  var parameters = ['_'] /* the first element is the full match */

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
        regex += `(?:${directive.alternatives.join('|')})`
        break
      case 'optional':
        regex += `(?:${directive.alternatives.join('|')})?`
        break
      case 'parameter':
        parameters.push(directive.name)
        regex += '('
        switch (directive.type) {
          case 'word':
            regex += `${unicodeLetter}+`
            break
          case 'words':
            regex += `(?: |${unicodeLetter})+`
            break
          case 'money':
            regex += '\\d+(?:[,.]\\d\\d)'
            break
          case 'date':
            regex += '\\d\\d\/\\d\\d\/\\d\\d\\d\\d'
            break
        }
        regex += ')'
        break
    }
  }

  var re = new RegExp(regex)

  return function parseLine (text) {
    let match = re.exec(text)
    if (match) {
      var res = {}
      for (let i = 1; i < parameters.length; i++) {
        let paramName = parameters[i]
        res[paramName] = match[i]
      }
      return res
    }
  }
}

module.exports.parseRule = parseRule
module.exports.makeLineParser = makeLineParser
