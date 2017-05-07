const createClass = require('create-react-class')
const h = require('react-hyperscript')
const page = require('page')

const Input = require('./Input')
const Rules = require('./Rules')
const Browse = require('./Browse')
const Preferences = require('./Preferences')

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
    this.cancel = onStateChange(({settings}) => this.setState({settings}))

    page('/', '/input')
    page('/input', () => this.setState({route: {component: Input}}))
    page('/rules', () => this.setState({route: {component: Rules}}))
    page('/rules/:ruleId', ctx =>
      this.setState({
        route: {
          component: Rules,
          props: {
            rule: ctx.params.ruleId
          }
        }
      })
    )
    page('/browse', () => this.setState({route: {component: Browse}}))
    page('/browse/*', ctx =>
      this.setState({
        route: {
          component: Browse,
          props: {
            path: ctx.params[0].split('/').filter(x => x)
          }
        }
      })
    )
    page('/preferences', () => this.setState({route: {component: Preferences}}))
    page({hashbang: true})
  },

  componentWillUnmount () {
    this.cancel()
  },

  render () {
    return (
      h('div', [
        h('nav.nav', [
          h('.nav-left', [
            h('a.nav-item', {href: '/preferences/'}, h('span.icon', [ h('i.fa.fa-bars') ])),
            h('a.nav-item', this.state.settings ? this.state.settings.name : 'parser-frenzy')
          ]),
          h('.nav-center', [
            h('a.nav-item', {href: '/input/'}, 'input'),
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
