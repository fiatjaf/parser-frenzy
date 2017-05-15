const createClass = require('create-react-class')
const h = require('react-hyperscript')

module.exports = (name, children) =>
  createClass({
    displayName: name,
    getInitialState () {
      return {
        selected: children[0][0]
      }
    },

    render () {
      return (
        h('#' + name, [
          h('.tabs.is-centered', [
            h('ul', children.map(([component, tabName, hint]) =>
              h('li', {className: this.state.selected === component ? 'is-active' : null}, [
                h('a', {title: hint, onClick: e => this.select(component, e) }, tabName)
              ])
            ))
          ]),
          h(this.state.selected, this.props)
        ])
      )
    },

    select (tab, e) {
      e.preventDefault()
      this.setState({selected: tab})
    }
  })
