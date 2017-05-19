const createClass = require('create-react-class')
const h = require('react-hyperscript')
const PouchDB = window.PouchDB

const {onStateChange, updateDatabase} = require('../db')
const log = require('../log')

module.exports = createClass({
  displayName: 'CouchDB',
  getInitialState () {
    return {
      db: null,
      settings: {},

      editingCouch: '',

      syncing: false
    }
  },

  componentDidMount () {
    this.cancel = onStateChange(({db, settings}) => {
      if (settings.couch && settings.couch !== this.state.settings.couch) {
        if (!this.state.settings.couch) this.setState({editingCouch: settings.couch})
        else log.info(`CouchDB URL updated to "${settings.couch}".`)
      }
      this.setState({db, settings})
    }, ['db', 'settings'])
  },

  componentWillUnmount () {
    this.cancel()
  },

  render () {
    return (
      h('#CouchDB', [
        h('.field', [
          h('input.input', {
            value: this.state.editingCouch,
            onChange: e => this.setState({editingCouch: e.target.value}),
            onBlur: e =>
              updateDatabase(this.state.settings.id, {couch: e.target.value.trim()})
          })
        ]),
        h('button.button.is-large.is-fullwidth.is-primary', {
          disabled: this.state.syncing,
          onClick: this.sync
        }, this.state.syncing
          ? 'Syncing...'
          : 'Sync!'
        )
      ])
    )
  },

  sync (e) {
    e.preventDefault()
    this.setState({syncing: true})
    log.info('Starting replication...')
    PouchDB.sync(this.state.db, this.state.settings.couch)
      .on('complete', info => {
        console.log('replication complete.', info)
        log.success('Replication complete!')
        this.setState({syncing: false})
      })
      .on('error', e => {
        log.debug(e)
        this.setState({syncing: false})
      })
  }
})
