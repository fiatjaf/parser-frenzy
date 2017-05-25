const P = require('parsimmon')
const xtend = require('xtend')

const unicodeLetter = require('./unicode-letter')

module.exports.makeLineParser = makeLineParser

function makeLineParser (directives) {
  return P.seq.apply(P, directives.map(directive => {
    switch (directive.kind) {
      case 'whitespace':
        return P.optWhitespace
      case 'literal':
        return P.string(directive.string)
      case 'alternatives':
        return P.alt.apply(P, directive.alternatives.map(makeLineParser))
      case 'optional':
        return P.alt.apply(P, directive.alternatives.map(makeLineParser))
          .or(P.optWhitespace)
      case 'parameter':
        let typeParser = types[directive.type]
        if (directive.multiple) {
          typeParser = P.sepBy1(
            typeParser,
            P.seq(
              P.optWhitespace,
              P.string(directive.separator || ','),
              P.optWhitespace
            )
          )
        }
        return typeParser
          .map(v => ({[directive.name]: v}))
    }
  }))
  .map(args => args
    .filter(x => typeof x === 'object' && !Array.isArray(x))
    .reduce((acc, elem) => xtend(acc, elem), {})
  )
}

const types = {
  word: P.regexp(new RegExp(`${unicodeLetter}+`))
    .desc('_a word_'),
  words: P.regexp(new RegExp(`(?: |${unicodeLetter})+`))
    .desc('_words and spaces_')
    .map(x => x.trim()),
  money: P.regexp(/\d+(?:[,.]\d{2})?/)
    .desc('_money_')
    .map(x => parseFloat(x.replace(',', '.'))),
  date: P.regexp(/\d{2}\/\d{2}\/\d{4}/)
    .desc('_date_')
    .map(x => x.split('/').reverse().join('-'))
}
