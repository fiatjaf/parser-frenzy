const createClass = require('create-react-class')
const h = require('react-hyperscript')
const CodeMirror = require('react-codemirror')
const cuid = require('cuid')

require('codemirror/mode/lua/lua')

const {db, onStateChange} = require('./db')
const log = require('./log')

module.exports = createClass({
  displayName: 'Rules',
  getInitialState () {
    return {
      rules: [],

      newpattern: '',
      newcode: `local x = 23
print(store, timestamp, line, match)`
    }
  },

  componentDidMount () {
    this.cancel = onStateChange(({rules}) => this.setState({rules}))
  },

  componentWillUnmount () {
    this.cancel()
  },

  render () {
    return (
      h('div', [
        h('.card', [
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
        ]),
        h('div', this.state.rules.map(({_id, _rev, pattern, code}) =>
          h('.card', [
            h('.card-header', [
              h('span.card-header-title', `rule ${_id.split(':')[1]}`),
              h('a.card-header-icon', { onClick: e => this.remove(_id, _rev, e) }, [
                h('span.icon', [ h('i.fa.fa-trash') ])
              ])
            ]),
            h('.card-content', [
              h('form', {
                onSubmit: e => this.update(_id, _rev, e)
              }, [
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
                      mode: 'lua'
                    }
                  })
                ]),
                h('button.button', {type: 'submit'}, 'Update')
              ])
            ])
          ])
        ))
      ])
    )
  },

  create (e) {
    e.preventDefault()
    let cid = cuid.slug()
    db.put({
      _id: `rule:${cid}`,
      pattern: this.state.newpattern,
      code: this.state.newcode
    })
    .then(() => log.info(`rule ${cid} created.`))
    .then(() => this.forceUpdate())
    .catch(log.error)
  },

  update (_id, _rev, e) {
    e.preventDefault()
    db.put({
      _id,
      _rev,
      pattern: e.target.querySelector('input').value,
      code: e.target.querySelector('textarea').value
    })
    .then(() => log.info(`rule ${_id.split(':')[1]} updated.`))
    .then(() => this.forceUpdate())
    .catch(log.error)
  },

  remove (_id, _rev, e) {
    e.preventDefault()
    db.remove(_id, _rev)
    .then(() => log.info(`removed ${_id.split(':')[1]}.`))
    .then(() => this.forceUpdate())
    .catch(log.error)
  }
})
