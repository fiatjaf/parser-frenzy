const createClass = require('create-react-class')
const h = require('react-hyperscript')

const {newStore, loadStore, deleteStore} = require('./db')

module.exports = createClass({
  displayName: 'Preferences',
  getInitialState () {
    return {
      stores: [],
      using: null,
      editing: null
    }
  },

  componentDidMount () {
    this.setState({
      stores: JSON.parse(localStorage.getItem('stores') || '[]'),
      using: localStorage.getItem('using')
    })
  },

  render () {
    let renderStore = (store, using, editing) =>
      h('.column.is-4', [
        h('.card.store', {className: using ? 'using' : '', id: store.id}, [
          h('.card-header', [
            h('p.card-header-title', store.name)
          ]),
          h('.card-content', [
            h('form', {onSubmit: e => this.updateStore(store.id, e)}, [
              h('label.control', [
                'name: ',
                h('input.input', {
                  name: 'name',
                  defaultValue: store.name,
                  disabled: !editing
                })
              ])
            ])
          ]),
          h('.card-footer', editing
            ? [
              h('a.card-footer-item', {onClick: e => this.destroyStore(store.id, e) }, 'Destroy'),
              h('a.card-footer-item', {onClick: e => this.updateStore(store.id, e)}, 'Save')
            ]
            : [
              using
              ? h('span.card-footer-item', 'Using')
              : h('a.card-footer-item', {onClick: e => this.useStore(store.id, e)}, 'Use'),
              h('a.card-footer-item', {onClick: e => this.startEditing(store.id, e)}, 'Edit')
            ]
          )
        ])
      ])

    return (
      h('#Preferences', [
        h('.columns.is-multiline', this.state.stores.map(store =>
          renderStore(store, this.state.using === store.id, this.state.editing === store.id)
        ).concat(
          h('.column.is-4', [
            h('.card.new-store', [
              h('.card-image', [
                h('a', {onClick: this.createStore}, [ h('i.fa.fa-plus') ])
              ])
            ])
          ])
        ))
      ])
    )
  },

  findStore (id) {
    for (let i = 0; i < this.state.stores.length; i++) {
      if (this.state.stores[i].id === id) return this.state.stores[i]
    }
  },

  startEditing (id, e) {
    e.preventDefault()
    this.setState({editing: id})
  },

  updateStore (id, e) {
    e.preventDefault()
    let thisformelem = e.target.parentNode.parentNode
    let store = this.findStore(id)
    store.name = thisformelem.querySelector('[name="name"]').value
    localStorage.setItem('stores', JSON.stringify(this.state.stores))
    this.setState({
      stores: this.state.stores,
      editing: null
    })
  },

  useStore (id, e) {
    e.preventDefault()
    localStorage.setItem('using', id)
    this.setState({using: id})
    if (this.state.editing === id) this.updateStore(id, e)
    loadStore(this.findStore(id))
  },

  createStore (e) {
    e.preventDefault()
    let store = newStore()
    this.state.stores.push(store)
    localStorage.setItem('stores', JSON.stringify(this.state.stores))
    this.setState({stores: this.state.stores})
    this.useStore(store.id, e)
  },

  destroyStore (id, e) {
    e.preventDefault()
    let store = this.findStore(id)
    let confirmed = window.confirm(
      `Are you sure you want to destroy the store "${store.name}" (id: "${store.id}") forever?`
    )
    if (confirmed) {
      deleteStore(store.id)
      this.componentDidMount()
    }
  }
})
