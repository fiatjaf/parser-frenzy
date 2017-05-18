const createClass = require('create-react-class')
const h = require('react-hyperscript')

const {onStateChange} = require('../db')
const log = require('../log')
const dateFormat = require('../helpers/date').asLongAsNeeded
const download = require('../helpers/download')

module.exports = createClass({
  displayName: 'Checkpoints',
  getInitialState () {
    return {
      db: null,
      checkpoint: null,
      checkpoints: [],

      opened: null
    }
  },

  componentDidMount () {
    this.cancel = onStateChange(({checkpoint, db, settings}) => {
      var change = {checkpoint, db, settings}
      if (checkpoint && checkpoint !== this.state.checkpoint && !this.state.opened) {
        change.opened = checkpoint._id
      }
      this.setState(change)

      if (db) {
        db.allDocs({startkey: 'chk:~', endkey: 'chk:', include_docs: true, descending: true})
        .then(res => this.setState({checkpoints: res.rows.map(row => row.doc)}))
        .catch(log.error)
      }
    }, ['checkpoint', 'db', 'settings'])
  },

  componentWillUnmount () {
    this.cancel()
  },

  render () {
    let renderCheckpoint = ({checkpoint, _id, _rev}, opened) =>
      h('.card.fact', {key: _id}, [
        h('.card-header', [
          h('.card-header-title', dateFormat(_id)),
          h('.card-header-icon', [
            h('a.icon', { onClick: e => this.toggleOpen(_id, e) }, [
              h(`i.fa.fa-angle${opened ? 'down' : 'up'}`)
            ])
          ])
        ]),
        opened && h('.card-content', [
          h('pre', [ h('code', JSON.stringify(checkpoint, null, 2)) ])
        ]) || null,
        opened && h('.card-footer', [
          h('.card-footer-item', [
            h('a', {onClick: e => this.remove(_id, _rev, checkpoint, e)}, 'Delete')
          ]),
          h('.card-footer-item', [
            h('a', {onClick: e => this.download(_id, checkpoint, e)}, 'Download')
          ])
        ]) || null
      ])

    return (
      h('#Checkpoints', this.state.checkpoints.map(chk =>
        renderCheckpoint(chk, this.state.opened === chk._id)
      ))
    )
  },

  toggleOpen (_id, e) {
    e.preventDefault()
    this.setState({opened: this.state.opened === _id ? null : _id})
  },

  download (_id, checkpoint, e) {
    e.preventDefault()
    download(
      JSON.stringify(checkpoint, null, 2),
      `${this.state.settings.name} checkpoint ${dateFormat(_id)}`
    )
  },

  remove (_id, _rev, checkpoint, e) {
    e.preventDefault()

    let actuallyRemove = () => {
      this.state.db.remove(_id, _rev)
      .then(() => log.info('Deleted the checkpoint successfully.'))
      .then(() => this.setState({opened: null}))
      .catch(log.error)
    }

    log.confirm(`Are you sure you want to delete the checkpoint from ${dateFormat(_id)}?`, () => {
      if (this.state.checkpoints.length === 1) {
        log.confirm("That's your only checkpoint, do you want to download a backup before deleting it?", () => {
          this.download(_id, checkpoint, e)
          actuallyRemove()
        }, () => {
          log.confirm("Ok, so we'll proceed and delete it now? Is that right?", actuallyRemove)
        })
      }
    })
  }
})
