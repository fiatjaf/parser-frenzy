const fs = require('fs')
const base = fs.readFileSync(__dirname + '/base.pegjs')

module.exports = makeParser

// example:
// pag[amento]: <nome:words> <valor:money> [[em|no dia|dia] <dia:date>]
// <> marks a rule, strings without <> are literals
// [] equals ()?
// spaces translate to ' '+
function makeParser (def) {
  
}
