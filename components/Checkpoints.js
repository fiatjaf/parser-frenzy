const h = require('react-hyperscript')
const R = require('ramda')
const L = require('partial.lenses')

const log = require('../log')
const dateFormat = require('../helpers/date').asLongAsNeeded
const download = require('../helpers/download')

const state = require('../state')

const checkpoints = state.view('checkpoints')

module.exports = function Checkpoints () {
  const removeCheckpoint = R.partial((checkpoint) => {
    let actuallyRemove = () => {
      let db = state.view('db').get()
      db.remove(checkpoint)
        .then(R.call(log.info, 'Deleted the checkpoint successfully.'))
        .then(R.call(checkpoints.modify, L.set('opened', null)))
        .catch(log.error)
    }

    log.confirm(`Are you sure you want to delete the checkpoint from ${dateFormat(checkpoint._id)}?`, () => {
      log.confirm('Do you want to download a backup before deleting it?', () => {
        downloadCheckpoint(checkpoint)
        actuallyRemove()
      }, () => {
        log.confirm("Ok, so we'll proceed and delete it now? Is that right?", actuallyRemove)
      })
    })
  })

  const downloadCheckpoint = R.partial((checkpoint) => {
    let dbName = state.view('chosen').name
    download(
      JSON.stringify(checkpoint.value, null, 2),
      `${dbName} checkpoint ${dateFormat(checkpoint._id)}`
    )
  })

  return (
    h('#Checkpoints', checkpoints.view('list').map(chks => chks
      .map(chk =>
        h(Checkpoint, {
          key: chk._id,
          checkpoint: chk,
          download: downloadCheckpoint([chk]),
          remove: removeCheckpoint([chk])
        })
      )
    ))
  )
}

const Checkpoint = function Checkpoint ({checkpoint, download, remove}) {
  let {_id, _rev, value} = checkpoint

  return (
    h('.card.fact', {key: _id}, [
      h('.card-header', [
        h('.card-header-title', dateFormat(_id)),
        h('.card-header-icon', [
          h('a.icon', {
            onClick () { checkpoints.modify(L.modify('opened', o => o === _id ? null : _id)) }
          }, [
            checkpoints.view('opened').map(opened => opened
              ? h('i.fa.fa-angle-down')
              : h('i.fa.fa-angle-up')
            )
          ])
        ])
      ]),
      checkpoints.view('opened').map(opened => opened
        ? h('.card-content', [ h('pre', [ h('code', JSON.stringify(value, null, 2)) ]) ])
        : null
      ),
      checkpoints.view('opened').map(opened => opened
        ? h('.card-footer', [
          h('.card-footer-item', [
            h('a', {onClick: remove}, 'Delete')
          ]),
          h('.card-footer-item', [
            h('a', {onClick: download}, 'Download')
          ])
        ])
        : null
      )
    ])
  )
}
