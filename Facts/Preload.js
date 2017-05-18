const createClass = require('create-react-class')
const h = require('react-hyperscript')
const debounce = require('debounce')

const {onStateChange} = require('../db')
const log = require('../log')
const dateFormat = require('../helpers/date').asLongAsNeeded

module.exports = createClass({
  displayName: 'Preload',
  getInitialState () {
    return {
      checkpoint: null,
      db: null,

      typed: '',
      parsed: null
    }
  },

  componentDidMount () {
    this.cancel = onStateChange(({checkpoint, db}) => {
      var change = {checkpoint, db}
      if (checkpoint) {
        change.parsed = checkpoint.checkpoint
      }
      this.setState(change)
    }, ['checkpoint', 'db'])

    this.dhandleTyped = debounce(this.handleTyped, 500)
  },

  componentWillUnmount () {
    this.cancel()
  },

  render () {
    return (
      h('#Preload', [
        !this.state.checkpoint && h('form', [
          h('.control', [
            h('textarea.textarea', {
              value: this.state.typed,
              onChange: e => this.setState({typed: e.target.value}, () => this.dhandleTyped())
            })
          ]),
          !this.state.typed && h('.control', [
            h('input.input', {
              type: 'file',
              onChange: this.handleFile
            })
          ]) || null
        ]) || null,
        this.state.parsed && h('div', [
          h('p', this.state.checkpoint
            ? `You have a checkpoint from ${dateFormat(this.state.checkpoint._id)},
               so there's no way to preload data.`
            : 'File contents:'),
          h('pre', [
            h('code', JSON.stringify(this.state.parsed, null, 2))
          ]),
          !this.state.checkpoint && h('button.button.is-primary', {
            onClick: this.save
          }, 'Save this as initial data') || null
        ]) || null
      ])
    )
  },

  handleFile (e) {
    let f = e.target.files[0]
    if (!f) return

    let reader = new window.FileReader()

    let loadinfo = debounce(msg => {
      log.info(msg)
    }, 2000)

    reader.onprogress = e => {
      loadinfo(`Reading file: ${parseInt(e.loaded * 100 / e.total)}%`)
    }
    reader.onload = e => {
      loadinfo('Read file successfully.')
      var data
      try {
        data = JSON.parse(e.target.result)
      } catch (e) {
        log.error("Couldn't parse file as JSON.")
      }
      loadinfo('Parsed JSON file.')

      this.setState({parsed: data})
    }

    reader.readAsText(f)
  },

  handleTyped () {
    var data
    try {
      data = JSON.parse(this.state.typed)
    } catch (e) {}

    this.setState({parsed: data})
  },

  save (e) {
    e.preventDefault()

    this.state.db.put({
      _id: 'chk:0',
      checkpoint: this.state.parsed
    })
    .then(() => log.info('saved.'))
    .catch(log.error)
  }
})
