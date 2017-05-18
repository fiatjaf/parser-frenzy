const createClass = require('create-react-class')
const h = require('react-hyperscript')

module.exports = createClass({
  displayName: 'CouchDB',
  getInitialState () {
    return {}
  },

  render () {
    return (
      h('#CouchDB', [
        h('.columns')
      ])
    )
  }
})
