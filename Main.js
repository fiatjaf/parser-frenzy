const h = require('react-hyperscript')

const state = require('./state')

module.exports = function Main () {
  return (
    h('div', [
      h('nav.nav', [
        h('.nav-left', [
          h('a.nav-item', {href: '/preferences/'}, h('span.icon', [ h('i.fa.fa-bars') ])),
          h('a.nav-item', {href: '/facts/'}, state.view('chosen').map(ch => ch
            ? ch.name
            : 'parser-frenzy'))
        ]),
        h('.nav-center', [
          h('a.nav-item', {href: '/facts/'}, 'facts'),
          h('a.nav-item', {href: '/rules/'}, 'rules'),
          h('a.nav-item', {href: '/browse/'}, 'browse')
        ])
      ]),
      h('main.columns', [
        h('.column.is-10.is-offset-1', [
          state.view('route').map(({component, props}) =>
            h(component, props)
          )
        ])
      ])
    ])
  )
}
