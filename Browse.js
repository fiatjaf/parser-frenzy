const createClass = require('create-react-class')
const h = require('react-hyperscript')

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
    return (
      h('pre', [
        h('code', JSON.stringify(this.state.store, null, 2))
      ])
    )
  }
})
