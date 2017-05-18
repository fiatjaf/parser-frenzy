const createClass = require('create-react-class')
const h = require('react-hyperscript')

const {onStateChange} = require('../db')
const log = require('../log')
const dateFormat = require('../helpers/date').asLongAsNeeded

module.exports = createClass({
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
              h('a', {href: `/browse/raw?at=${at.join('.')}`}, at.join('.')),
              ' with value ', h('code', JSON.stringify(val)), '.'
            ])
          )) || null,
          opened && h('ul.errors', errors.map(({error, rule}) =>
            h('li', [
              'error ', h('code', error.message), ' on rule ',
              h('a', {href: `/rules/rules?rule=${rule._id}`}, rule.pattern), '.'
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
