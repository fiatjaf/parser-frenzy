const createClass = require('create-react-class')
const h = require('react-hyperscript')

module.exports = (name, children) =>
  createClass({
    displayName: name,
    getInitialState () {
      return {
        selected: children[0][1]
      }
    },

    componentWillMount () {
      let sub = this.props.pathname.split('/')[2]
      if (sub) {
        this.select(sub)
      }
    },

    componentWillReceiveProps (nextProps) {
      let sub = nextProps.pathname.split('/')[2]
      if (sub) {
        this.select(sub)
      }
    },

    select (sub) {
      for (let i = 0; i < children.length; i++) {
        let [subpath, component] = children[i]
        if (subpath === sub) {
          this.setState({selected: component})
          return
        }
      }
    },

    render () {
      let basepath = this.props.pathname.split('/')[1]

      return (
        h('#' + name, [
          h('.tabs.is-centered', [
            h('ul', children.map(([subpath, component, tabTitle, hint]) =>
              h('li', {className: this.state.selected === component ? 'is-active' : null}, [
                h('a', {
                  'data-balloon': hint,
                  'data-balloon-pos': 'left',
                  'data-balloon-length': 'large',
                  href: `/${basepath}/${subpath}`
                }, tabTitle)
              ])
            ))
          ]),
          h(this.state.selected, this.props)
        ])
      )
    }
  })
