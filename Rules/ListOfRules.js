const createClass = require('create-react-class')
const h = require('react-hyperscript')
const CodeMirror = require('react-codemirror')
const cuid = require('cuid')

require('codemirror/mode/lua/lua')

const {onStateChange} = require('../db')
const log = require('../log')

module.exports = createClass({
  displayName: 'ListOfRules',
  getInitialState () {
    return {
      db: null,

      rules: [],
      tempValues: {},

      newpattern: '',
      newcode: this.defaultCode,

      opened: null,
      editing: null
    }
  },

  defaultCode: `-- lua processing script here.

`,

  componentDidMount () {
    this.cancel = onStateChange(({rules, db}) => this.setState({rules, db}))
  },

  componentWillUnmount () {
    this.cancel()
  },

  render () {
    var rules = this.state.rules

    if (this.props.query.rule) {
      rules = rules.filter(({_id}) => _id === this.props.query.rule)
    }

    let createRule = h('.create.card', [
      h('.card-header', [
        h('span.card-header-title', 'Create new rule')
      ]),
      h('.card-content', [
        h('form', {
          onSubmit: this.create
        }, [
          h('p.control', [
            h('input.input', {
              value: this.state.newpattern,
              onChange: e => this.setState({newpattern: e.target.value}),
              'data-balloon': 'a valid Javascript regex pattern',
              placeholder: '<someone:word> [has] paid <value:money> on <date>'
            })
          ]),
          h('div.control', [
            h(CodeMirror, {
              value: this.state.newcode,
              onChange: newcode => this.setState({newcode}),
              options: {
                viewportMargin: Infinity,
                mode: 'lua'
              }
            })
          ]),
          h('div.control', [
            h('button.button', 'Create')
          ])
        ])
      ])
    ])

    let renderRule = ({_id, _rev, pattern, code, parseErrors, facts, errors}, temp, opened, editing) =>
      h(`.card.rule.${opened ? 'open' : 'closed'}.${editing ? 'editing' : 'not-editing'}`, {key: _id}, [
        h('.card-header', [
          h('span.card-header-title', [
            `rule ${_id.split(':')[1]} `,
            !opened &&
              parseErrors &&
                h('a.tag.is-warning', {
                  'data-balloon': "couldn't parse this rule.",
                  onClick: e => this.toggleOpen(_id, e)
                }, 'invalid') || null,
            !opened &&
              facts.length > 0 &&
                h('a.tag.is-info', {
                  'data-balloon': `${facts.length} facts matched.`,
                  onClick: e => this.toggleOpen(_id, e)
                }, facts.length) || null,
            !opened &&
              errors.length > 0 &&
                h('a.tag.is-danger', {
                  'data-balloon': `${errors.length} errored.`,
                  onClick: e => this.toggleOpen(_id, e)
                }, errors.length) || null
          ]),
          h('a.card-header-icon', { onClick: e => this.toggleOpen(_id, e) }, [
            h('span.icon', [ h(`i.fa.fa-angle-${opened ? 'down' : 'up'}`) ])
          ])
        ]),
        h('.card-content', [
          h('p.control', [
            h('input.input', {
              value: editing ? temp.pattern : pattern,
              onChange: e => this.changed('pattern', _id, e.target.value),
              disabled: !editing
            })
          ]),
          h('div.control', [
            h(CodeMirror, {
              value: editing ? temp.code : code,
              onChange: val => this.changed('code', _id, val),
              options: {
                viewportMargin: editing ? Infinity : 7,
                mode: 'lua',
                readOnly: editing ? false : 'nocursor'
              }
            })
          ]),
          opened && parseErrors && h('.invalid', parseErrors.map(({message}) =>
            h('p', [
              h('span.tag.is-warning', 'pattern invalid'), ' ',
              h('code', message)
            ])
          )) || null,
          opened && h('.facts', facts.map(fact =>
            h('p', [
              h('span.tag.is-info', 'matched'), ' ',
              h('code', fact.line), ' yielding ',
              h('span.tag.is-light', Object.keys(fact.data).map(k => `${k}:${fact.data[k]}`).join(' '))
            ])
          )) || null,
          opened && h('.errors', errors.map(({error, fact}) =>
            h('p', [
              h('span.tag.is-danger', 'error'), ' ',
              h('code', error.message), ' at ', h('code', fact.line)
            ])
          )) || null
        ]),
        opened && h('.card-footer', [
          h('.card-footer-item', [
            h('a', { onClick: e => this.remove(_id, _rev, e) }, 'Delete')
          ]),
          h('.card-footer-item', [
            editing
            ? h('a', { onClick: e => this.saveEdits(_id, _rev, e) }, 'Save')
            : h('a', { onClick: e => this.startEditing(_id, code, pattern, e) }, 'Edit')
          ])
        ]) || null
      ])

    return (
      h('#ListOfRules', [
        !this.props.query.rule ? createRule : null,
        h('div', rules.map(rule =>
          renderRule(
            rule,
            this.state.tempValues[rule._id],
            this.state.opened === rule._id,
            this.state.editing === rule._id
          )
        ))
      ])
    )
  },

  create (e) {
    e.preventDefault()
    let cid = cuid.slug()
    this.state.db.put({
      _id: `rule:${cid}`,
      pattern: this.state.newpattern,
      code: this.state.newcode
    })
    .then(() => {
      this.setState({
        newpattern: '',
        newcode: this.defaultCode
      })
      log.info(`rule ${cid} created.`)
    })
    .then(() => this.forceUpdate())
    .catch(log.error)
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
      pattern: temp.pattern,
      code: temp.code
    })
    .then(() => {
      log.info(`rule ${_id.split(':')[1]} updated.`)
      this.setState(st => {
        delete st.tempValues[_id]
        st.editing = null
        return st
      })
    })
    .catch(log.error)
  },

  remove (_id, _rev, e) {
    e.preventDefault()
    this.state.db.remove(_id, _rev)
    .then(() => log.info(`removed rule ${_id.split(':')[1]}.`))
    .then(() => this.forceUpdate())
    .catch(log.error)
  },

  toggleOpen (_id, e) {
    e.preventDefault()
    if (this.state.opened === _id) {
      this.setState({editing: null, opened: null})
    } else {
      this.setState({editing: null, opened: _id})
    }
  },

  startEditing (_id, code, pattern, e) {
    e.preventDefault()
    this.setState(st => {
      st.opened = _id
      st.editing = _id
      st.tempValues[_id] = st.tempValues[_id] || {code, pattern}
      return st
    })
  }
})

