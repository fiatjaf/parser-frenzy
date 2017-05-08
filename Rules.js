const createClass = require('create-react-class')
const h = require('react-hyperscript')
const CodeMirror = require('react-codemirror')
const cuid = require('cuid')
const glua = require('glua')

require('codemirror/mode/lua/lua')

const {onStateChange} = require('./db')
const log = require('./log')

const defaultluacode = `-- lua script here.

`

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
            h('li', {className: this.state.selected === Imports ? 'is-active' : null}, [
              h('a', {onClick: e => this.select(Imports, e) }, 'Lua Libraries')
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
      code: `-- just a place to test lua code
print('something')
      `,
      output: ''
    }
  },

  componentDidMount () {
    this.run()
  },

  render () {
    return (
      h('div', [
        h('form', {onSubmit: this.run}, [
          h('div.control', [
            h(CodeMirror, {
              value: this.state.code,
              onChange: code => { this.setState({code}) },
              options: {
                mode: 'lua'
              }
            })
          ]),
          h('button.button.is-primary', {onClick: this.run}, 'Run')
        ]),
        h('pre', [
          h('code', this.state.output)
        ])
      ])
    )
  },

  run (e) {
    if (e) e.preventDefault()

    try {
      var output = []
      glua.runWithGlobals({
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

const Imports = createClass({
  displayName: 'Imports',
  getInitialState () {
    return {
      db: null,
      imports: [],

      newlibrary: '',

      opened: null
    }
  },

  componentDidMount () {
    this.cancel = onStateChange(({imports, db}) => this.setState({imports, db}))
  },

  componentWillUnmount () {
    this.cancel()
  },

  render () {
    return (
      h('div')
    )
  }
})

const ListOfRules = createClass({
  displayName: 'ListOfRules',
  getInitialState () {
    return {
      db: null,

      rules: [],

      newpattern: '',
      newcode: defaultluacode,

      opened: null
    }
  },

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
          h('button.button', 'Create')
        ])
      ])
    ])

    let renderRule = ({_id, _rev, pattern, code, facts, errors}, opened) =>
      h('.card.rule', {key: _id}, [
        h('.card-header', [
          h('span.card-header-title', `rule ${_id.split(':')[1]}`),
          h('a.card-header-icon', { onClick: e => this.toggle(_id, e) }, [
            h('span.icon', [ h(`i.fa.fa-angle-${opened ? 'up' : 'down'}`) ])
          ])
        ]),
        h('.card-content', [
          h('p.control', [
            h('input.input', {
              defaultValue: pattern
            })
          ]),
          h('div.control', [
            h(CodeMirror, {
              value: code,
              ref: cmp => {
                if (!cmp) return
                let cm = cmp.getCodeMirror()
                cm.on('changes', () => { cm.save() })
              },
              options: {
                viewportMargin: Infinity,
                mode: 'lua',
                readOnly: !opened
              }
            })
          ]),
          opened && h('ul.facts', facts.map(fact =>
            h('li', [ 'matched ', h('code', fact.line) ])
          )) || null,
          opened && h('ul.errors', errors.map(({error, fact}) =>
            h('li', [
              'error ', h('code', error.message),
              ' on fact ', h('code', fact.line)
            ])
          )) || null
        ]),
        opened && h('.card-footer', [
          h('.card-footer-item', [
            h('a', { onClick: e => this.remove(_id, _rev, e) }, 'Delete')
          ]),
          h('.card-footer-item', [
            h('a', { onClick: e => this.update(_id, _rev, e) }, 'Save')
          ])
        ]) || null
      ])

    return (
      h('div', [
        !this.props.rule ? createRule : null,
        h('div', rules.map(rule => renderRule(rule, this.state.opened === rule._id)))
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
        newcode: defaultluacode
      })
      log.info(`rule ${cid} created.`)
    })
    .then(() => this.forceUpdate())
    .catch(log.error)
  },

  update (_id, _rev, e) {
    e.preventDefault()
    let thisruleelem = e.target.parentNode.parentNode.parentNode
    this.state.db.put({
      _id,
      _rev,
      pattern: thisruleelem.querySelector('input').value,
      code: thisruleelem.querySelector('textarea').value
    })
    .then(() => log.info(`rule ${_id.split(':')[1]} updated.`))
    .then(() => this.forceUpdate())
    .catch(log.error)
  },

  remove (_id, _rev, e) {
    e.preventDefault()
    this.state.db.remove(_id, _rev)
    .then(() => log.info(`removed ${_id.split(':')[1]}.`))
    .then(() => this.forceUpdate())
    .catch(log.error)
  },

  toggle (_id, e) {
    e.preventDefault()
    this.setState({opened: this.state.opened === _id ? null : _id})
  }
})
