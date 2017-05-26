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
      log: [],
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
        ),
        h('table.table', [
          h('tbody', this.state.log.map((msg, i) =>
            h('tr', [
              h('td', i),
              h('td', msg)
            ])
          ).reverse())
        ])
      ])
    )
  },

  sync (e) {
    e.preventDefault()
    this.setState({syncing: true})
    log.info('Starting replication...')
    PouchDB.sync(this.state.db, this.state.settings.couch)
      .on('paused', e => this.log('replication was paused.', e))
      .on('active', () => this.log('replication started.'))
      .on('denied', e => this.log('replication denied due to insufficient permissions', e))
      .on('change', info => this.log('got a change.', info))
      .on('complete', info => {
        this.log(
          `replication completed.
          sent ${info.push.docs_written} docs, got ${info.pull.docs_written}.`,
        info)
        log.success('Replication complete!')
        this.setState({syncing: false})
      })
      .on('error', e => {
        this.log('replication error.', e)
        log.error(e)
        this.setState({syncing: false})
      })
  },

  log () {
    console.log.apply(console, arguments)
    this.setState(st => {
      st.log.push(arguments[0])
      return st
    })
  }
})
