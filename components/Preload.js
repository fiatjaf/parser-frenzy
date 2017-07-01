const h = require('karet-hyperscript')
const debounce = require('debounce')
const R = require('ramda')
const Kefir = require('kefir')

const log = require('../log')
const dateFormat = require('../helpers/date').asLongAsNeeded
const state = require('../state')

const checkpoints = state.view('checkpoints')

checkpoints.view('typed')
  .filter(R.identity)
  .debounce(500)
  .onValue(v => {
    try {
      checkpoints.view('parsed').set(JSON.parse(v))
    } catch (e) {}
  })

module.exports = function Preload () {
  const save = () => {
    let db = state.view('db').get()
    let value = checkpoints.view('parsed').get()
    db.put({
      _id: 'chk:0',
      value
    })
      .then(R.call(log.success, 'Added value as a checkpoint from time 0.'))
      .catch(log.error)
  }

  const handleFile = (e) => {
    let f = e.target.files[0]
    if (!f) return

    let reader = new window.FileReader()

    let loadinfo = debounce(msg => log.info(msg), 1500)

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

      checkpoints.view('parsed').set(data)
    }

    reader.readAsText(f)
  }

  return (
    h('#Preload', [
      checkpoints.view('list').map(chks => chks.length
        ? h('p', `You have a valid checkpoint from ${dateFormat(chks[0]._id)} that's being used, so you cannot preload data as it would be ignored.`)
        : h('div', [
          h('form', [
            h('.control', [
              h('textarea.textarea', {
                value: checkpoints.view('typed'),
                onChange: e => checkpoints.view('typed').set(e.target.value)
              })
            ]),
            checkpoints.view('typed').map(typed => typed
              ? h('.control', [
                h('input.input', {
                  type: 'file',
                  onChange: handleFile
                })
              ])
              : null
            )
          ])
        ])
      ),
      Kefir.combine([
        checkpoints.view('parsed'),
        checkpoints.view('list').map(R.head)
      ])
        .map(([parsed, last]) => (parsed || last)
          ? h('div', [
            'Content: ',
            h('pre', [
              h('code', JSON.stringify((last && last.value) || parsed, null, 2))
            ]),
            parsed && !last
              ? h('button.button.is-primary', {
                onClick: save
              }, 'Save this as initial data')
              : null
          ])
          : null
        )
    ])
  )
}
