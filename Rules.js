const createClass = require('create-react-class')
const h = require('react-hyperscript')
const CodeMirror = require('react-codemirror')
const cuid = require('cuid')
const glua = require('glua')

require('codemirror/mode/lua/lua')

const {onStateChange} = require('./db')
const log = require('./log')

module.exports = createClass({
  displayName: 'Rules',
  getInitialState () {
    return {
      selected: ListOfRules
    }
  },

  render () {
    return (
      h('#Rules', [
        h('.tabs.is-centered', [
          h('ul', [
            h('li', {className: this.state.selected === ListOfRules ? 'is-active' : null}, [
              h('a', {onClick: e => this.select(ListOfRules, e) }, 'Your Rules')
            ]),
            h('li', {className: this.state.selected === Modules ? 'is-active' : null}, [
              h('a', {onClick: e => this.select(Modules, e) }, 'Lua Modules')
            ]),
            h('li', {className: this.state.selected === REPL ? 'is-active' : null}, [
              h('a', {onClick: e => this.select(REPL, e) }, 'Lua Playground')
            ])
          ])
        ]),
        h(this.state.selected, this.props)
      ])
    )
  },

  select (tab, e) {
    e.preventDefault()
    this.setState({selected: tab})
  }
})

const REPL = createClass({
  displayName: 'REPL',
  getInitialState () {
    return {
      modules: [],

      code: `-- test some lua code
print('something')
      `,
      output: ''
    }
  },

  componentDidMount () {
    this.cancel = onStateChange(({modules}) =>
      this.setState({modules}, this.run)
    )
  },

  componentWillUnmount () {
    this.cancel()
  },

  render () {
    return (
      h('#REPL', [
        h('.columns', [
          h('.column.is-half', [
            h('form', {onSubmit: this.run}, [
              h('div.control', [
                h(CodeMirror, {
                  value: this.state.code,
                  onChange: code => { this.setState({code}) },
                  options: {
                    viewportMargin: Infinity,
                    mode: 'lua'
                  }
                })
              ]),
              h('.control', [
                h('button.button.is-info', {onClick: this.run}, 'Run')
              ])
            ])
          ]),
          h('.column.is-half', [
            h('pre', [
              h('code', this.state.output)
            ])
          ])
        ])
      ])
    )
  },

  run (e) {
    if (e) e.preventDefault()

    var moduleMap = {}
    for (let i = 0; i < this.state.modules.length; i++) {
      let mod = this.state.modules[i]
      moduleMap[mod._id.split(':')[1]] = mod.code
    }

    try {
      var output = []
      glua.runWithModules(moduleMap, {
        print: function () {
          let o = [].join.call(arguments, '\t')
          output.push(o)
        }
      }, this.state.code)
      this.setState({output: output.join('\n')})
    } catch (e) {
      this.setState({output: e.message})
    }
  }
})

const Modules = createClass({
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
              onChange: e => { this.setState({newname: e.target.value}) },
              title: 'a name for this module'
            })
          ]),
          h('div.control', [
            h(CodeMirror, {
              value: this.state.newcode,
              onChange: newcode => { this.setState({newcode}) },
              title: 'code for the lua module that you\'ll be able to require from rules',
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

    let renderModule = ({_id, _rev, code}, temp, editing) =>
      h(`.card.rule.${editing ? 'editing' : 'not-editing'}`, {key: _id}, [
        h('.card-header', [
          h('span.card-header-title', `module "${_id.split(':')[1]}"`)
        ]),
        h('.card-content', [
          h('div.control', [
            h(CodeMirror, {
              value: editing ? temp.code : code,
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
            this.state.tempValues[module._id],
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

const ListOfRules = createClass({
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

    if (this.props.rule) {
      rules = rules.filter(({_id}) => _id === this.props.rule)
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
              onChange: e => { this.setState({newpattern: e.target.value}) },
              title: 'a valid Javascript regex pattern',
              placeholder: `\\w{2,5}: +\\d\\d(,\\d\\d)?`
            })
          ]),
          h('div.control', [
            h(CodeMirror, {
              value: this.state.newcode,
              onChange: newcode => { this.setState({newcode}) },
              title: 'lua code that will change the store in response to a line that matches',
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

    let renderRule = ({_id, _rev, pattern, code, facts, errors}, temp, opened, editing) =>
      h(`.card.rule.${opened ? 'open' : 'closed'}.${editing ? 'editing' : 'not-editing'}`, {key: _id}, [
        h('.card-header', [
          h('span.card-header-title', [
            `rule ${_id.split(':')[1]} `,
            !opened &&
              facts.length > 0 &&
                h('span.tag.is-success', {title: `${facts.length} matched.`}, facts.length) || null,
            !opened &&
              errors.length > 0 &&
                h('span.tag.is-danger', {title: `${errors.length} errored.`}, errors.length) || null
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
          opened && h('.facts', facts.map(fact =>
            h('p', [
              h('span.tag.is-success', 'matched'),
              ' ',
              h('code', fact.line)
            ])
          )) || null,
          opened && h('.errors', errors.map(({error, fact}) =>
            h('p', [
              h('span.tag.is-danger', 'error'),
              ' ',
              h('code', error.message),
              ' at ',
              h('code', fact.line)
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
        !this.props.rule ? createRule : null,
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
