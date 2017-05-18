const createClass = require('create-react-class')
const h = require('react-hyperscript')

const {listDatabases, findDatabase, createDatabase, updateDatabase,
       loadDatabase, deleteDatabase} = require('../db')
const log = require('../log')

module.exports = createClass({
  displayName: 'Select',
  getInitialState () {
    return {
      editing: null
    }
  },

  render () {
    let databases = listDatabases()
    let using = localStorage.getItem('using')

    let renderDatabase = (dbase, using, editing) =>
      h('.column.is-4', [
        h('.card.dbase', {className: using ? 'using' : '', id: dbase.id}, [
          h('.card-header', [
            h('p.card-header-title', dbase.name)
          ]),
          h('.card-content', [
            h('form', {onSubmit: e => this.updateDatabase(dbase.id, e)}, [
              h('label.control', [
                'name: ',
                h('input.input', {
                  name: 'name',
                  defaultValue: dbase.name,
                  disabled: !editing
                })
              ])
            ])
          ]),
          h('.card-footer', editing
            ? [
              h('a.card-footer-item', {onClick: e => this.destroyDatabase(dbase.id, e) }, 'Destroy'),
              h('a.card-footer-item', {onClick: e => this.updateDatabase(dbase.id, e)}, 'Save')
            ]
            : [
              using
              ? h('span.card-footer-item', 'Using')
              : h('a.card-footer-item', {onClick: e => this.useDatabase(dbase.id, e)}, 'Use'),
              h('a.card-footer-item', {onClick: e => this.startEditing(dbase.id, e)}, 'Edit')
            ]
          )
        ])
      ])

    return (
      h('#Select', [
        h('.columns.is-multiline', Object.keys(databases).map(id =>
          renderDatabase(databases[id], using === id, this.state.editing === id)
        ).concat(
          h('.column.is-4', [
            h('.card.new-database', [
              h('.card-image', [
                h('a', {onClick: this.createDatabase}, [ h('i.fa.fa-plus') ])
              ])
            ])
          ])
        ))
      ])
    )
  },

  startEditing (id, e) {
    e.preventDefault()
    this.setState({editing: id})
  },

  updateDatabase (id, e) {
    e.preventDefault()
    let thisformelem = e.target.parentNode.parentNode
    updateDatabase(id, {name: thisformelem.querySelector('[name="name"]').value})
    this.setState({editing: null})
  },

  useDatabase (id, e) {
    e.preventDefault()
    if (this.state.editing === id) this.updateDatabase(id, e)
    loadDatabase(findDatabase(id))
    this.forceUpdate()
  },

  createDatabase (e) {
    e.preventDefault()
    let dbase = createDatabase()
    loadDatabase(dbase)
    this.forceUpdate()
  },

  destroyDatabase (id, e) {
    e.preventDefault()
    let dbase = findDatabase(id)
    log.confirm(
      `Are you sure you want to destroy the database "${dbase.name}"
       (id: "${dbase.id}") forever?`
    , () => {
      deleteDatabase(dbase.id)
      this.componentDidMount()
      this.forceUpdate()
    })
  }
})
