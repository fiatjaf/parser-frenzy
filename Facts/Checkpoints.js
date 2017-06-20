const h = require('react-hyperscript')

const log = require('../log')
const dateFormat = require('../helpers/date').asLongAsNeeded
const download = require('../helpers/download')
const state = require('../state')

let local = {
  opened: null,
  remove:('remove checkpoint', (checkpoint) => {
    let actuallyRemove = () => {
      state.db.remove(checkpoint)
      .then(() => {
        log.info('Deleted the checkpoint successfully.')
        local.opened = null
      })
      .catch(log.error)
    }

    log.confirm(`Are you sure you want to delete the checkpoint from ${dateFormat(checkpoint._id)}?`, () => {
      if (state.checkpoints.length === 1) {
        log.confirm("That's your only checkpoint, do you want to download a backup before deleting it?", () => {
          local.download()
          actuallyRemove()
        }, () => {
          log.confirm("Ok, so we'll proceed and delete it now? Is that right?", actuallyRemove)
        })
      }
    })
  }),
  download: ({checkpoint: data, _id}) => {
    download(
      JSON.stringify(data, null, 2),
      `${state.settings.name} checkpoint ${dateFormat(_id)}`
    )
  }
}

module.exports = function Checkpoints () {
  return (
    h('#Checkpoints', this.state.checkpoints.map(chk =>
      h(Checkpoint, {key: chk._id, checkpoint: chk})
    ))
  )
}

const Checkpoint = function Checkpoint ({checkpoint}) {
  let {_id, _rev, checkpoint: data} = checkpoint
  let opened = local.opened === _id

  return (
    h('.card.fact', {key: _id}, [
      h('.card-header', [
        h('.card-header-title', dateFormat(_id)),
        h('.card-header-icon', [
          h('a.icon', { onClick: e => local.opened = _id }, [
            h(`i.fa.fa-angle${opened ? 'down' : 'up'}`)
          ])
        ])
      ]),
      opened && h('.card-content', [
        h('pre', [ h('code', JSON.stringify(data, null, 2)) ])
      ]) || null,
      opened && h('.card-footer', [
        h('.card-footer-item', [
          h('a', {onClick: e => local.remove(checkpoint)}, 'Delete')
        ]),
        h('.card-footer-item', [
          h('a', {onClick: e => download(checkpoint)}, 'Download')
        ])
      ]) || null
    ])
  )
}
