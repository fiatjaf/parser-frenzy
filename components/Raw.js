const createClass = require('create-react-class')
const h = require('react-hyperscript')

const {onStateChange} = require('../db')

module.exports = createClass({
  displayName: 'Raw',
  getInitialState () {
    return {
      store: {}
    }
  },

  componentDidMount () {
    this.cancel = onStateChange(({store}) => this.setState({store}), ['store'])
  },

  componentWillUnmount () {
    this.cancel()
  },

  render () {
    let at = this.props.query && this.props.query.at && this.props.query.at.split('.') || []

    var cur = this.state.store
    for (let i = 0; i < at.length; i++) {
      cur[at[i]] = cur[at[i]] || {}
      cur = cur[at[i]]
    }

    return (
      h('#Raw', [
        h('pre', [ h('code', JSON.stringify(cur, null, 2)) ])
      ])
    )
  }
})
