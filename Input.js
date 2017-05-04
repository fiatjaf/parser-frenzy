const createClass = require('create-react-class')
const h = require('react-hyperscript')

const {db, onStateChange} = require('./db')
const log = require('./log')
const dateFormat = require('./helpers/date').asLongAsNeeded

module.exports = createClass({
  displayName: 'Input',
  getInitialState () {
    return {
      facts: [],

      input: '',
      preview: null
    }
  },

  componentDidMount () {
    this.cancel = onStateChange(({facts}) => this.setState({facts}))
  },

  componentWillUnmount () {
    this.cancel()
  },

  render () {
    return (
      h('div#Input', [
        h('form', {onSubmit: this.save}, [
          h('div', this.state.preview),
          h('input.input', {
            onChange: e => { this.setState({input: e.target.value}) },
            value: this.state.input
          }),
          h('button.button', {type: 'submit'}, 'Save')
        ]),
        h('div', this.state.facts.map(({line, _id, _rev, affected}) =>
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
                    ' with value ', h('code', val), '.'
                  ])
                ) || [ h('center', "~ this line hasn't affected the store ~") ]
              )
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
    db.put({
      _id: `f:${(new Date).getTime()}`,
      line: this.state.input
    })
    .then(() => {
      log.info('added.')
      this.setState({input: '', preview: null})
    })
    .then(() => this.forceUpdate())
    .catch(log.error)
  },

  remove (_id, _rev, e) {
    e.preventDefault()
    db.remove(_id, _rev)
    .then(() => log.info(`removed ${_id}.`))
    .then(() => this.forceUpdate())
    .catch(log.error)
  }
})
