const createClass = require('create-react-class')
const h = require('react-hyperscript')
const CodeMirror = require('react-codemirror')

require('codemirror/mode/lua/lua')

const {onStateChange} = require('../db')
const log = require('../log')

module.exports = createClass({
  displayName: 'Modules',
  getInitialState () {
    return {
      db: null,

      modules: [],
      tempValues: {},

      newname: '',
      newcode: this.defaultCode,

      editing: null
    }
  },

  defaultCode: `-- lua module code here.

`,

  componentDidMount () {
    this.cancel = onStateChange(({modules, db}) => this.setState({modules, db}))
  },

  componentWillUnmount () {
    this.cancel()
  },

  render () {
    let createModule = h('.create.card', [
      h('.card-header', [
        h('span.card-header-title', 'Create a new module')
      ]),
      h('.card-content', [
        h('form', {
          onSubmit: this.create
        }, [
          h('p.control', [
            h('input.input', {
              value: this.state.newname,
              onChange: e => this.setState({newname: e.target.value}),
              placeholder: 'a name for this module'
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

    let renderModule = ({_id, _rev, code}, editing) =>
      h(`.card.rule.${editing ? 'editing' : 'not-editing'}`, {key: _id}, [
        h('.card-header', [
          h('span.card-header-title', `module "${_id.split(':')[1]}"`)
        ]),
        h('.card-content', [
          h('div.control', [
            h(CodeMirror, {
              value: editing ? this.state.tempValues[_id].code : code,
              onChange: val => this.changed('code', _id, val),
              options: {
                viewportMargin: Infinity,
                mode: 'lua',
                readOnly: editing ? false : 'nocursor'
              }
            })
          ])
        ]),
        h('.card-footer', [
          h('.card-footer-item', [
            h('a', { onClick: e => this.remove(_id, _rev, e) }, 'Delete')
          ]),
          h('.card-footer-item', [
            editing
            ? h('a', { onClick: e => this.saveEdits(_id, _rev, e) }, 'Save')
            : h('a', { onClick: e => this.startEditing(_id, code, e) }, 'Edit')
          ])
        ]) || null
      ])

    return (
      h('#Modules', [
        !this.props.rule ? createModule : null,
        h('div', this.state.modules.map(module =>
          renderModule(
            module,
            this.state.editing === module._id
          )
        ))
      ])
    )
  },

  create (e) {
    e.preventDefault()
    this.state.db.put({
      _id: `mod:${this.state.newname}`,
      code: this.state.newcode
    })
    .then(() => {
      log.info(`module "${this.state.newname}" created.`)
      this.setState({
        newcode: this.defaultCode
      })
    })
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
      code: temp.code
    })
    .then(() => {
      log.info(`module ${_id.split(':')[1]} updated.`)
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
    .then(() => log.info(`removed module ${_id.split(':')[1]}.`))
    .then(() => this.forceUpdate())
    .catch(log.error)
  },

  toggleOpen (_id, e) {
    e.preventDefault()
    if (this.state.opened === _id) {
      this.setState({editing: null})
    } else {
      this.setState({editing: null})
    }
  },

  startEditing (_id, code, e) {
    e.preventDefault()
    this.setState(st => {
      st.editing = _id
      st.tempValues[_id] = st.tempValues[_id] || {code}
      return st
    })
  }
})

