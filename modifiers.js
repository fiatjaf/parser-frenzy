const deepmerge = require('deepmerge')

module.exports = {
  set_at,
  push_to,
  sum_at,
  merge_at,
  remove_from
}

function update_at (store, path, fn) {
  var arraypath = []

  var cur = store
  var prev
  var i = 1
  var key
  while (true) {
    if (path[i]) {
      key = path[i]
      arraypath.push(key)
      prev = cur
      cur[key] = cur[key] || {}
      cur = cur[key]
      i++
      continue
    }
    break
  }
  let val = fn(cur)
  prev[key] = val

  // save affected paths
  this.affected.push({kind: this.kind, at: arraypath, val: this.val || val})
}
function sum_at (store, path, val) {
  this.val = val
  update_at.call(this, path, cur => (typeof cur === 'number' ? cur : 0) + val)
}
function set_at (store, path, val) { update_at.call(this, path, () => val) }
function merge_at (store, path, val) {
  update_at.call(this, path, cur =>
    deepmerge(cur, val, {arrayMerge: (d, s) => s.concat(d)})
  )
}
function push_to (store, path, elem) {
  this.val = elem
  update_at.call(this, path, cur => {
    if (!Array.isArray(cur)) {
      cur = []
    }
    cur.push(elem)
    return cur
  })
}
function remove_from (store, path, elem) {
  this.val = elem
  update_at.call(this, path, cur => {
    if (!Array.isArray(cur)) {
      return []
    }

    while (cur.indexOf(elem) !== -1) {
      let index = cur.indexOf(elem)
      cur.splice(index, 1)
    }

    return cur
  })
}
