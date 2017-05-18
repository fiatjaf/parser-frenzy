const createClass = require('create-react-class')
const h = require('react-hyperscript')
const debounce = require('debounce')

const {onStateChange} = require('./db')
const log = require('./log')
const dateFormat = require('./helpers/date').asLongAsNeeded
const download = require('./helpers/download')
const makeSubRouter = require('./helpers/sub-router')

const Input = createClass({
  displayName: 'Input',
  getInitialState () {
    return {
      db: null,
      facts: [],
      checkpoint: null,

      opened: null,
      editing: null,
      tempValues: {},

      input: '',
      preview: null
    }
  },

  componentDidMount () {
    this.cancel = onStateChange(
      ({facts, checkpoint, db}) => this.setState({facts, checkpoint, db}),
      ['facts', 'checkpoint', 'db']
    )
  },

  componentWillUnmount () {
    this.cancel()
  },

  render () {
    let renderFact = ({line, _id, _rev, affected, errors}, opened, editing) =>
      h('.card.fact', {key: _id}, [
        h('.card-content', [
          h('.columns.is-mobile', [
            h('.column', [
              editing
              ? h('.control', [
                h('input.input', {
                  onChange: e => this.changed('line', _id, e.target.value),
                  value: this.state.tempValues[_id].line
                })
              ])
              : line
            ]),
            !opened && affected.length > 0 &&
              h('.column.is-narrow', [
                h('a.tag.is-success', {
                  onClick: e => this.open(_id, e),
                  title: `affected ${affected.length} points.`
                }, affected.length)
              ]) || null,
            !opened && errors.length > 0 &&
              h('.column.is-narrow', [
                h('a.tag.is-success', {
                  onClick: e => this.open(_id, e),
                  title: `${errors.length} errors.`
                }, errors.length)
              ]) || null,
            h('.column.is-narrow.date', dateFormat(_id)),
            !opened && affected.length === 0 && errors.length === 0 &&
              h('.column.is-narrow', [
                h('a', {
                  onClick: e => this.open(_id, e)
                }, h('span.icon', [ h('i.fa.fa-angle-up') ]))
              ]) || null,
            opened &&
              h('.column.is-narrow', [
                h('a', {onClick: this.close}, h('span.icon', [ h('i.fa.fa-angle-down') ]))
              ]) || null
          ]),
          opened && h('ul.affected', affected.map(({kind, at, val}) =>
            h('li', [
              h('code', kind), ' at ',
              h('a', {href: '/browse/' + at.join('/')}, at.join('.')),
              ' with value ', h('code', JSON.stringify(val)), '.'
            ])
          )) || null,
          opened && h('ul.errors', errors.map(({error, rule}) =>
            h('li', [
              'error ', h('code', error.message), ' on rule ',
              h('a', {href: `/rules/${rule._id}`}, rule.pattern), '.'
            ])
          )) || null
        ]),
        opened && h('.card-footer', [
          h('.card-footer-item', [
            h('a', {onClick: e => this.remove(line, _id, _rev, e)}, 'Delete')
          ]),
          editing
          ? h('.card-footer-item', [
            h('a', {onClick: e => this.saveEdits(_id, _rev, e)}, 'Save')
          ])
          : h('.card-footer-item', [
            h('a', {onClick: e => this.startEditing(_id, line, e)}, 'Edit')
          ])
        ]) || null
      ])

    return (
      h('#Input', [
        h('.preview', this.state.preview),
        h('form.add', {onSubmit: this.save}, [
          h('.field.has-addons', [
            h('.control.is-expanded', [
              h('input.input', {
                onChange: e => { this.setState({input: e.target.value}) },
                value: this.state.input
              })
            ]),
            h('.control', [
              h('button.button.is-primary', {type: 'submit'}, 'Add')
            ])
          ])
        ]),
        h('div', this.state.facts.map(f =>
          renderFact(f, this.state.opened === f._id, this.state.editing === f._id)
        ))
      ])
    )
  },

  save (e) {
    e.preventDefault()
    this.state.db.put({
      _id: `f:${parseInt((new Date).getTime() / 1000)}`,
      line: this.state.input
    })
    .then(() => {
      log.info('added.')
      this.setState({input: '', preview: null})
    })
    .catch(log.error)
  },

  remove (line, _id, _rev, e) {
    e.preventDefault()
    log.confirm(`Are you sure you want to delete the line "${line}"?`, () =>
      this.state.db.remove(_id, _rev)
      .then(() => log.info(`removed ${_id}.`))
      .then(() => this.forceUpdate())
      .catch(log.error)
    )
  },

  open (_id, e) {
    e.preventDefault()
    this.setState({opened: _id, editing: null})
  },

  close (e) {
    e.preventDefault()
    this.setState({opened: null, editing: null})
  },

  startEditing (_id, line, e) {
    e.preventDefault()
    this.setState(st => {
      st.editing = _id
      st.tempValues[_id] = {line}
      return st
    })
  },

  changed (what, _id, val) {
    this.setState(st => {
      st.tempValues[_id][what] = val
      return st
    })
  },

  saveEdits (_id, _rev, e) {
    e.preventDefault()
    let temp = this.state.tempValues[_id]
    this.state.db.put({
      _id,
      _rev,
      line: temp.line
    })
    .then(() => {
      log.info('line updated.')
      this.setState(st => {
        delete st.tempValues[_id]
        st.editing = null
        return st
      })
    })
    .catch(log.error)
  }
})

const Preload = createClass({
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

const Checkpoints = createClass({
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

module.exports = makeSubRouter('Facts', [
  [Input, 'Input'],
  [Preload, 'Preload data', 'Prefill the store with this JSON data.'],
  [Checkpoints, 'Checkpoints']
])
