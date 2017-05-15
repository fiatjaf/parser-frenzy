const createClass = require('create-react-class')
const h = require('react-hyperscript')
const CodeMirror = require('react-codemirror')
const jq = require('jq-web')
const debounce = require('debounce')

const {onStateChange} = require('./db')
const makeSubRouter = require('./helpers/sub-router')

function filterStore (store, path) {
  var cur = store

  for (let i = 0; i < path.length; i++) {
    cur[path[i]] = cur[path[i]] || {}
    cur = cur[path[i]]
  }

  let rootName = path.length ? path.join('.') : ':root'
  return {current: cur, rootName}
}

const Raw = createClass({
  displayName: 'Raw',
  getInitialState () {
    return {
      store: {}
    }
  },

  componentDidMount () {
    this.cancel = onStateChange(({store}) => this.setState({store}))
  },

  componentWillUnmount () {
    this.cancel()
  },

  render () {
    let {current} = filterStore(this.state.store, this.props.path)

    return (
      h('#Raw', [
        h('pre', [ h('code', JSON.stringify(current, null, 2)) ])
      ])
    )
  }
})

const JQ = createClass({
  displayName: 'JQ',
  getInitialState () {
    return {
      current: {},

      jqfilter: '.',
      output: ''
    }
  },

  componentDidMount () {
    this.cancel = onStateChange(({store}) => {
      let {current} = filterStore(store, this.props.path)
      this.setState({current})
    })

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

const SQL = createClass({
  displayName: 'SQL',
  getInitialState () {
    return {
      jqfilter: '.',
      tables: '',
      query: 'SELECT * FROM ',
      output: ''
    }
  },

  render () {
    return (
      h('#SQL')
    )
  }
})

module.exports = makeSubRouter('Facts', [
  [Raw, 'Raw'],
  [JQ, 'jq', 'Explore your data with jq'],
  [SQL, 'SQL', 'Run SQL queries on your data']
])

module.exports.defaultProps = {
  path: []
}
