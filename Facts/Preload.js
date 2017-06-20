const h = require('react-hyperscript')
const debounce = require('debounce')
const {action, computed, observable} = require('mobx')
const {observer} = require('mobx-react')

const log = require('../log')
const dateFormat = require('../helpers/date').asLongAsNeeded
const state = require('../state')

let local = observable({
  typed: '',
  parsed: null,

  any: computed(() => this.parsed || state.checkpoint),

  parseTyped: action('parse-typed', () => {
    try {
      this.parsed = JSON.parse(this.state.typed)
    } catch (e) {}
  }),

  handleFile: (e) => {
    let f = e.target.files[0]
    if (!f) return

    let reader = new window.FileReader()

    let loadinfo = debounce(msg => {
      log.info(msg)
    }, 2000)

    reader.onprogress = e => {
      loadinfo(`Reading file: ${parseInt(e.loaded * 100 / e.total)}%`)
    }
    reader.onload = action('loaded-file', e => {
      loadinfo('Read file successfully.')
      var data
      try {
        data = JSON.parse(e.target.result)
      } catch (e) {
        log.error("Couldn't parse file as JSON.")
      }
      loadinfo('Parsed JSON file.')

      this.parsed = data
    })

    reader.readAsText(f)
  },

  save: () => {
    state.db.put({
      _id: 'chk:0',
      checkpoint: state.parsed
    })
    .then(() => log.info('saved.'))
    .catch(log.error)
  }
})

module.exports = observer(function Preload () {
  return (
    h('#Preload', [
      !state.checkpoint && h('form', [
        h('.control', [
          h('textarea.textarea', {
            value: local.state.typed,
            onChange: e => {
              local.typed = e.target.value
              local.handleTyped()
            }
          })
        ]),
        !local.typed && h('.control', [
          h('input.input', {
            type: 'file',
            onChange: this.handleFile
          })
        ]) || null
      ]) || null,
      local.any && h('div', [
        h('p', state.checkpoint
          ? `You have a checkpoint from ${dateFormat(this.state.checkpoint._id)},
             so there's no way to preload data.`
          : 'File contents:'),
        h('pre', [
          h('code', JSON.stringify(local.any, null, 2))
        ]),
        !state.checkpoint && h('button.button.is-primary', {
          onClick: this.save
        }, 'Save this as initial data') || null
      ]) || null
    ])
  )
})
