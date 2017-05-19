const createClass = require('create-react-class')
const h = require('react-hyperscript')
const BlockPicker = require('react-color/lib/components/block/Block').default

const {listDatabases, findDatabase, createDatabase, updateDatabase,
       loadDatabase, deleteDatabase} = require('../db')
const log = require('../log')

module.exports = createClass({
  displayName: 'Select',
  getInitialState () {
    return {
      tempValues: {},

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
            h('p.card-header-title', `${dbase.name} (${dbase.id})`)
          ]),
          h('.card-content', [
            h('form', {onSubmit: e => this.save(dbase.id, e)}, [
              h('label.field', [
                'name: ',
                h('input.input', {
                  name: 'name',
                  value: editing ? this.state.tempValues[dbase.id].name : dbase.name,
                  onChange: e => {
                    let val = e.target.value
                    this.setState(st => {
                      st.tempValues[dbase.id]['name'] = val
                      return st
                    })
                  },
                  disabled: !editing
                })
              ]),
              editing && h('label.field', [
                'background color: ',
                h(BlockPicker, {
                  colors: [
                    '#baedfc', '#90edeb', '#6382d8', '#9bf7ce', '#f495b3',
                    '#8ea5f9', '#f2c393', '#cfc6ff', '#b5ffaf', '#ffbfeb'
                  ],
                  color: editing
                    ? this.state.tempValues[dbase.id].bgcolor
                    : dbase.bgcolor,
                  onChangeComplete: color => this.setState(st => {
                    st.tempValues[dbase.id]['bgcolor'] = color.hex
                    return st
                  }),
                  triangle: 'hide'
                })
              ]) || null
            ])
          ]),
          h('.card-footer', editing
            ? [
              h('a.card-footer-item', {onClick: e => this.destroyDatabase(dbase.id, e) }, 'Destroy'),
              h('a.card-footer-item', {onClick: e => this.save(dbase.id, e)}, 'Save')
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
    this.setState(st => {
      st.editing = id
      st.tempValues = listDatabases()
      return st
    })
  },

  save (id, e) {
    e.preventDefault()
    updateDatabase(id, this.state.tempValues[id])
    this.setState({editing: null})
  },

  useDatabase (id, e) {
    e.preventDefault()
    loadDatabase(findDatabase(id))
    if (this.state.editing === id) this.save(id, e)
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
