const h = require('react-hyperscript')

const state = require('../state')
const components = require('./index')
const SubRouter = require('./SubRouter')

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
        h('.nav-center', Array.from(components.keys())
          .map(route => h('a.nav-item', {href: `/${route}/`}, route))
        )
      ]),
      h('main.columns', [
        h('.column.is-10.is-offset-1', [
          h(SubRouter)
        ])
      ])
    ])
  )
}
