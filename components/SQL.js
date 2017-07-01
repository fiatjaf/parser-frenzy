const createClass = require('create-react-class')
const h = require('karet-hyperscript')
// const CodeMirror = require('react-codemirror')
// const jq = window.jq
// const debounce = require('debounce')

// const {onStateChange} = require('./db')

module.exports = createClass({
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
