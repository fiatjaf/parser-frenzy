const createClass = require('create-react-class')
const h = require('react-hyperscript')

const {onStateChange} = require('./db')
const log = require('./log')
const dateFormat = require('./helpers/date').asLongAsNeeded

module.exports = createClass({
  displayName: 'Input',
  getInitialState () {
    return {
      db: null,

      facts: [],

      input: '',
      preview: null
    }
  },

  componentDidMount () {
    this.cancel = onStateChange(({facts, db}) => this.setState({facts, db}))
  },

  componentWillUnmount () {
    this.cancel()
  },

  render () {
    return (
      h('div#Input', [
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
              h('button.button.is-primary', {type: 'submit'}, 'Save')
            ])
          ])
        ]),
        h('div', this.state.facts.map(({line, _id, _rev, affected, errors}) =>
          h('.card.fact', {key: _id}, [
            h('.card-content', [
              h('.columns', [
                h('.column', line),
                h('.column.is-one-quarter', dateFormat(_id))
              ]),
              h('ul.affected',
                affected.length && affected.map(({kind, at, val}) =>
                  h('li', [
                    h('code', kind), ' at ',
                    h('a', {href: '/browse/' + at.join('/')}, at.join('.')),
                    ' with value ', h('code', JSON.stringify(val)), '.'
                  ])
                ) || [ h('center', "~ this line hasn't affected the store ~") ]
              ),
              h('ul.errors', errors.map(({error, rule}) =>
                h('li', [
                  'error ', h('code', error.message), ' on rule ',
                  h('a', {href: `/rules/${rule._id}`}, rule.pattern), '.'
                ])
              ))
            ]),
            h('.card-footer', [
              h('.card-footer-item', [
                h('a', {onClick: e => this.remove(_id, _rev, e)}, [
                  h('span.icon', [ h('i.fa.fa-trash') ]),
                  ' Delete'
                ])
              ])
            ])
          ])
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

  remove (_id, _rev, e) {
    e.preventDefault()
    this.state.db.remove(_id, _rev)
    .then(() => log.info(`removed ${_id}.`))
    .then(() => this.forceUpdate())
    .catch(log.error)
  }
})
