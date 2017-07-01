const R = require('ramda')
const h = require('karet-hyperscript')
const {fromKefir} = require('karet')

const state = require('../state')
const components = require('./index')

module.exports = function SubRouter () {
  return fromKefir(state.view('route')
    .map(({route, subroute, props}) => {
      if (!props || !props.pathname) return h('div')

      subroute = subroute || components.get(route).keys().next().value

      let basepath = R.head(props.pathname.split('/').filter(R.identity))
      let name = route[0].toUpperCase() + route.slice(1)
      let subcomponent = components.get(route).get(subroute)[0]
      let children = Array.from(components.get(route).keys())

      return (
        h(`#${name}`, [
          h('.tabs.is-centered', [
            h('ul', children.map(childkey =>
              h('li', {
                key: childkey,
                className: subroute === childkey ? 'is-active' : null
              }, [
                h('a', {
                  href: `/${basepath}/${childkey}`
                }, components.get(route).get(childkey)[1])
              ])
            ))
          ]),
          h(subcomponent, props)
        ])
      )
    })
  )
}
