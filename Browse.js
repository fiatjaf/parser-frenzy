const createClass = require('create-react-class')
const h = require('react-hyperscript')
const JSONView = require('react-json-view').default

const {onStateChange} = require('./db')

module.exports = createClass({
  displayName: 'Browse',
  getInitialState () {
    return {
      store: null
    }
  },

  componentDidMount () {
    this.cancel = onStateChange(({store}) => this.setState({store}))
  },

  componentWillUnmount () {
    this.cancel()
  },

  render () {
    if (!this.state.store) return h('div')

    var cur = this.state.store

    for (let i = 0; i < this.props.path.length; i++) {
      cur[this.props.path[i]] = cur[this.props.path[i]] || {}
      cur = cur[this.props.path[i]]
    }

    let rootName = this.props.path.length ? this.props.path.join('.') : ':root'

    return (
      h('#Browse', [
        h('p', [
          'data at ',
          h('code', rootName),
          ':'
        ]),
        typeof cur === 'object'
        ? h(JSONView, {
          src: cur,
          name: rootName,
          indentWidth: 2,
          displayDataTypes: false,
          theme: 'eighties'
        })
        : h('pre', [ h('code', JSON.stringify(cur, null, 2)) ])
      ])
    )
  }
})

module.exports.defaultProps = {
  path: []
}
