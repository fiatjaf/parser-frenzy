const createClass = require('create-react-class')
const h = require('react-hyperscript')
const CodeMirror = require('react-codemirror')
const glua = window.glua

require('codemirror/mode/lua/lua')

const {onStateChange} = require('../db')

module.exports = createClass({
  displayName: 'REPL',
  getInitialState () {
    return {
      modules: [],

      code: `-- test some lua code
print('something')
      `,
      output: ''
    }
  },

  componentDidMount () {
    this.cancel = onStateChange(({modules}) =>
      this.setState({modules}, this.run)
    )
  },

  componentWillUnmount () {
    this.cancel()
  },

  render () {
    return (
      h('#REPL', [
        h('.columns', [
          h('.column.is-half', [
            h('form', {onSubmit: this.run}, [
              h('.control', [
                h(CodeMirror, {
                  value: this.state.code,
                  onChange: code => this.setState({code}),
                  options: {
                    viewportMargin: Infinity,
                    mode: 'lua'
                  }
                })
              ]),
              h('.control', [
                h('button.button.is-info', {onClick: this.run}, 'Run')
              ])
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

  run (e) {
    if (e) e.preventDefault()

    var moduleMap = {}
    for (let i = 0; i < this.state.modules.length; i++) {
      let mod = this.state.modules[i]
      moduleMap[mod._id.split(':')[1]] = mod.code
    }

    try {
      var output = []
      glua.runWithModules(moduleMap, {
        print: function () {
          let o = [].join.call(arguments, '\t')
          output.push(o)
        }
      }, this.state.code)
      this.setState({output: output.join('\n')})
    } catch (e) {
      this.setState({output: e.message})
    }
  }
})
