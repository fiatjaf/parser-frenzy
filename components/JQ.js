const createClass = require('create-react-class')
const h = require('react-hyperscript')
const CodeMirror = require('react-codemirror')
const jq = window.jq
const debounce = require('debounce')

const {onStateChange} = require('../db')

module.exports = createClass({
  displayName: 'JQ',
  getInitialState () {
    return {
      current: {},

      jqfilter: '.',
      output: ''
    }
  },

  componentDidMount () {
    this.cancel = onStateChange(({store}) => this.setState({store}), ['store'])

    this.dcalc = debounce(this.calc, 700)
    this.calc()
  },

  componentWillUnmount () {
    this.cancel()
  },

  render () {
    return (
      h('#JQ', [
        h('.columns', [
          h('.column.is-half', [
            h('.control', [
              h(CodeMirror, {
                value: this.state.jqfilter,
                onChange: jqfilter => this.setState({jqfilter}, this.dcalc),
                options: {
                  viewportMargin: Infinity,
                  mode: 'jq'
                }
              })
            ])
          ]),
          h('.column.is-half', [
            h('pre', [
              h('code', this.state.output)
            ])
          ])
        ])
      ])
    )
  },

  calc () {
    var output
    try {
      output = jq.raw(JSON.stringify(this.state.current), this.state.jqfilter)
    } catch (e) {
      output = e.message
    }

    this.setState({output})
  }
})
