const R = require('ramda')
const h = require('react-hyperscript')

const state = require('../state')
const subroute = state.view(['route', 'subroute'])

module.exports = (name, children) =>
  function SubRouter (props) {
    let basepath = props.pathname.split('/').slice(0, -1).join('/')
    let cmp = children[0][1]
    subroute
      .filter(s => s)
      .onValue(s => {
        cmp = R.find(c => c[0] === s, children)[1]
      })

    return (
      h('#' + name, [
        h('.tabs.is-centered', [
          h('ul', children.map(([subpath, component, tabTitle, hint]) =>
            h('li', {
              className: subroute.map(s => s === subpath ? 'is-active' : null)
            }, [
              h('a', {
                'data-balloon': hint,
                'data-balloon-pos': 'left',
                'data-balloon-length': 'large',
                href: `/${basepath}/${subpath}`
              }, tabTitle)
            ])
          ))
        ]),
        h(cmp)
      ])
    )
  }
