const h = require('karet-hyperscript')
const L = require('partial.lenses')

const data = require('../data')

module.exports = function Raw (props) {
  let at = props.query && props.query.at && props.query.at.split('.') || []

  return (
    h('#Raw', [
      h('pre', [
        h('code', data
          .map(d => L.get(at, d))
          .map(d => JSON.stringify(d, null, 2))
        )
      ])
    ])
  )
}
