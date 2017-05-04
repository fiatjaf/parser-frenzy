const createClass = require('create-react-class')
const h = require('react-hyperscript')

const {db, onStateChange} = require('./db')
const log = require('./log')

module.exports = createClass({
  displayName: 'Input',
  getInitialState () {
    return {
      facts: [],

      input: '',
      preview: ''
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
        h('div', this.state.facts.map(({line, _id, _rev}) =>
          h('.card', [
            h('.card-header', [
              h('span.card-header-title', _id),
              h('a.card-header-icon', { onClick: e => this.remove(_id, _rev, e) }, [
                h('span.icon', [ h('i.fa.fa-trash') ])
              ])
            ]),
            h('.card-content', [
              h('p', line)
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
    .then(() => log.info('added.'))
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
