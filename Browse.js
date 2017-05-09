const createClass = require('create-react-class')
const h = require('react-hyperscript')
const CodeMirror = require('react-codemirror')
const jq = require('jq-web')
const debounce = require('debounce')

const {onStateChange} = require('./db')

module.exports = createClass({
  displayName: 'Browse',
  getInitialState () {
    return {
      store: null,

      selected: Raw
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
        h('.tabs.is-centered', [
          h('ul', [
            h('li', {className: this.state.selected === Raw ? 'is-active' : null}, [
              h('a', {onClick: e => this.select(Raw, e) }, 'Raw')
            ]),
            h('li', {className: this.state.selected === JQ ? 'is-active' : null}, [
              h('a', {onClick: e => this.select(JQ, e) }, 'jq')
            ]),
            h('li', {className: this.state.selected === SQL ? 'is-active' : null}, [
              h('a', {onClick: e => this.select(SQL, e) }, 'SQL')
            ])
          ])
        ]),
        h('p', [
          'data at ',
          h('code', {title: 'change this position at the URL path -- or just click at "Browse"'}, rootName),
          ':'
        ]),
        h(this.state.selected, {...this.props, store: cur})
      ])
    )
  },

  select (tab, e) {
    e.preventDefault()
    this.setState({selected: tab})
  }
})

module.exports.defaultProps = {
  path: []
}

const Raw = createClass({
  displayName: 'Raw',

  render () {
    return (
      h('#Raw', [
        h('pre', [ h('code', JSON.stringify(this.props.store, null, 2)) ])
      ])
    )
  }
})

const JQ = createClass({
  displayName: 'JQ',
  getInitialState () {
    return {
      jqfilter: '.',
      output: ''
    }
  },

  componentDidMount () {
    this.dcalc = debounce(this.calc, 700)

    this.calc()
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
      output = jq.raw(JSON.stringify(this.props.store), this.state.jqfilter)
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
