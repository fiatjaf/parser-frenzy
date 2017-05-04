const createClass = require('create-react-class')
const h = require('react-hyperscript')
const page = require('page')

const Input = require('./Input')
const Rules = require('./Rules')
const Browse = require('./Browse')

module.exports = createClass({
  displayName: 'Main',
  getInitialState () {
    return {
      route: {
        component: () => h('div'),
        props: {}
      }
    }
  },

  componentDidMount () {
    page('/', '/input/')
    page('/input/', ctx =>
      this.setState({route: {component: Input, props: ctx.params}})
    )
    page('/rules/', ctx =>
      this.setState({route: {component: Rules, props: ctx.params}})
    )
    page('/browse/', ctx =>
      this.setState({route: {component: Browse, props: ctx.params}})
    )

    page({hashbang: true})
  },

  render () {
    return (
      h('div', [
        h('nav.nav', [
          h('.nav-left', [
            h('a.nav-item', 'parser-frenzy')
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
