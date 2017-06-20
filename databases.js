const PouchDB = window.PouchDB
const cuid = require('cuid')

const log = require('./log')

// -- database management
module.exports.list = list
function list () {
  return JSON.parse(localStorage.getItem('databases') || '{}')
}

module.exports.create = create
function create (id, name) {
  id = id || cuid.slug()
  name = name || id

  let databases = list()
  databases[id] = {name, id}
  localStorage.setItem('databases', JSON.stringify(databases))

  return {name, id}
}

module.exports.update = update
function update (id, update) {
  let databases = list()
  databases[id] = {...databases[id], ...update}
  // if (state.settings.id === id) state.settings = databases[id]
  localStorage.setItem('databases', JSON.stringify(databases))
}

module.exports.remove = remove
function remove (id) {
  let tmpdb = new PouchDB(id)
  tmpdb.destroy()
    .then(() => log.info(`destroyed PouchDB ${id}.`))
    .catch(log.error)

  let using = localStorage.getItem('using')
  let databases = list()

  delete databases[id]

  // if (using === id) {
  //   let dbase = databases[Object.keys(databases)[0]]
  //   using = dbase.id
  //   loadDatabase(dbase)
  // }

  localStorage.setItem('databases', JSON.stringify(databases))
  localStorage.setItem('using', using)
}

module.exports.current = current
function current () {
  let databases = list()
  let using = localStorage.getItem('using')

  try {
    if (Object.keys(databases).length === 0) {
      return create()
    } else if (!using) {
      return databases(Object.keys(databases)[0])
    } else {
      return databases[using]
    }
  } catch (e) {
    using = null
    return current()
  }
}
