const deepmerge = require('deepmerge')
const fuzzyset = require('fuzzyset')

module.exports = ref

// <root> is the tree root (the store and its children)
// <path> is to where we're going from the root
// <affected> is the array we push to to track how a fact affected the store
// <position> is the absolute path from the root of the store
function ref (root, path, affected, position) {
  var parent = get_at(root, path.slice(0, -1))
  var key = path.slice(-1)[0]
  var val = get_or_create(parent, key)

  var self = {
    path (p) {
      return ref(val, array_from_lua(p), affected, position.concat(p))
    },

    child (k) {
      return ref(val, [k], affected, position.concat(k))
    },

    get () {
      return val
    },

    get_at (p) {
      return get_at(val, array_from_lua(p))
    },

    search (q, pathindexer) {
      pathindexer = array_from_lua(pathindexer)
      var wordmap = {}
      if (typeof val === 'object') {
        for (let i = 0; i < val.length; i++) {
          let word = get_at(val[i], pathindexer)
          if (typeof word !== 'string') continue
          let ref = self.child(i)
          wordmap[word] = ref
        }
      } else return []

      return fuzzyset(Object.keys(wordmap))
        .get(q)
        .map(([score, word]) => ({score, word, ref: wordmap[word]}))
    },

    replace (v) {
      parent[key] = v
      affected.push({kind: 'replace', at: position, val: v})
    },

    merge (v) {
      parent[key] = deepmerge(val, v)
      affected.push({kind: 'merge', at: position, val: v})
    },

    set_at (p, v) {
      let arraypath = array_from_lua(p)
      update_at(val, arraypath, () => v)
      affected.push({kind: 'set', at: position.concat(arraypath), val: v})
    },

    delete_at (p, v) {
      let arraypath = array_from_lua(p)
      update_at(val, arraypath, () => null)
      affected.push({kind: 'delete', at: position.concat(arraypath), val: v})
    },

    append_to (p, v) {
      let arraypath = array_from_lua(p)
      update_at(val, arraypath, arr => {
        if (!Array.isArray(arr)) {
          arr = []
        }
        arr.push(v)
        return arr
      })
      affected.push({kind: 'append', at: position.concat(arraypath), val: v})
    },

    prepend_to (p, v) {
      let arraypath = array_from_lua(p)
      update_at(val, arraypath, arr => {
        if (!Array.isArray(arr)) {
          arr = []
        }
        arr.unshift(v)
        return arr
      })
      affected.push({kind: 'prepend', at: position.concat(arraypath), val: v})
    },

    remove_from (p, v) {
      let arraypath = array_from_lua(p)
      update_at(val, arraypath, arr => {
        if (!Array.isArray(arr)) {
          return []
        }

        while (arr.indexOf(v) !== -1) {
          let index = arr.indexOf(v)
          arr.splice(index, 1)
        }
      })
      affected.push({kind: 'remove', at: position.concat(arraypath), val: v})
    }
  }

  return self
}

function get_at (root, path) {
  var cur = root
  var key
  for (let i = 0; i < path.length; i++) {
    key = path[i]
    cur = get_or_create(cur, key)
  }
  return cur
}

function update_at (root, path, fn) {
  var cur = root
  var prev
  var key
  for (let i = 0; i < path.length; i++) {
    key = path[i]
    prev = cur
    cur = get_or_create(cur, key)
  }
  let val = fn(cur)
  prev[key] = val
}

// will replace <src' scalars with objects.
function get_or_create (src, key) {
  try {
    src[key] = src[key] || {}
    return src[key]
  } catch (e) {
    return {}
  }
}

function array_from_lua (table) {
  return Object.keys(table).sort().map(i => table[i])
}
