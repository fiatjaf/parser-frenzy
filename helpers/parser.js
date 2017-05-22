const {createToken, Lexer, Parser} = require('chevrotain')

const WORD = createToken({name: 'WORD', pattern: /\w+/})
const NUMBER = createToken({name: 'NUMBER', pattern: /\d+/})
const WHITESPACE = createToken({name: 'WHITESPACE', pattern: /\s+/})
const COMMA = createToken({name: 'COMMA', pattern: /,/, label: ','})

let tokens = [WHITESPACE, NUMBER, WORD, COMMA]
let lexer = new Lexer(tokens)

function RuleParser (input) {
  Parser.call(this, input, tokens, {recoveryEnabled: true})
  var $ = this

  $.RULE('main', function () {
    return $.OR([
      {ALT: () => $.SUBRULE($.money) },
      {ALT: () => $.SUBRULE($.name) }
    ])
  })

  $.RULE('name', () => {
    var words = []

    $.MANY_SEP({
      SEP: WHITESPACE, DEF: () => {
        words.push($.CONSUME(WORD).image)
      }
    })

    return words.join(' ')
  })

  $.RULE('money', () => {
    var money = parseInt($.CONSUME(NUMBER).image)
    $.OPTION(() => {
      $.CONSUME(COMMA)
      money += parseInt($.CONSUME2(NUMBER).image) / 10
    })
    return money
  })

  Parser.performSelfAnalysis(this)
}

RuleParser.prototype = Object.create(Parser.prototype)
RuleParser.prototype.constructor = RuleParser

let parser = new RuleParser([])

module.exports = function (text) {
  let lexResult = lexer.tokenize(text)
  parser.input = lexResult.tokens
  let value = parser.main()

  return {
    value,
    lexErrors: lexResult.errors,
    parseErrors: parser.errors
  }
}
