const createClass = require('create-react-class')
const h = require('react-hyperscript')
const page = require('page')
const qs = require('qs')

const Preferences = require('./Preferences')
const Facts = require('./Facts')
const Rules = require('./Rules')
const Browse = require('./Browse')

const {onStateChange} = require('./db')

module.exports = createClass({
  displayName: 'Main',
  getInitialState () {
    return {
      route: {
        component: () => h('div'),
        props: {}
      },
      settings: null
    }
  },

  componentDidMount () {
    this.cancel = onStateChange(({settings}) => this.setState({settings}), ['settings'])

    page('/', '/facts/input')
    page('*', (ctx, next) => {
      ctx.query = qs.parse(location.search.slice(1))
      next()
    })

    page('/preferences/*', ctx => this.setState({route: {component: Preferences, props: ctx}}))
    page('/facts/*', ctx => this.setState({route: {component: Facts, props: ctx}}))
    page('/rules/*', ctx => this.setState({route: {component: Rules, props: ctx}}))
    page('/browse/*', ctx => this.setState({route: {component: Browse, props: ctx}}))
    page({hashbang: true})
  },

  componentWillUnmount () {
    this.cancel()
  },

  componentWillUpdate () {
    let dbName = document.title.split(' :: ')[0]
    document.title = `${dbName} :: ${this.state.route.component.displayName}`
  },

  render () {
    return (
      h('div', [
        h('nav.nav', [
          h('.nav-left', [
            h('a.nav-item', {href: '/preferences/'}, h('span.icon', [ h('i.fa.fa-bars') ])),
            h('a.nav-item', {href: '/facts/'}, this.state.settings
              ? this.state.settings.name
              : 'parser-frenzy')
          ]),
          h('.nav-center', [
            h('a.nav-item', {href: '/facts/'}, 'facts'),
            h('a.nav-item', {href: '/rules/'}, 'rules'),
            h('a.nav-item', {href: '/browse/'}, 'browse')
          ])
        ]),
        h('main.columns', [
          h('.column.is-10.is-offset-1', [
            h(this.state.route.component, this.state.route.props)
          ])
        ])
      ])
    )
  }
})
