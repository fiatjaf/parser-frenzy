/* global caches, self, fetch, Request */

const always = [
  'https://maxcdn.bootstrapcdn.com/font-awesome/4.6.3/css/font-awesome.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/bulma/0.4.1/css/bulma.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/notie/4.3.1/notie.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.25.2/codemirror.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/balloon-css/0.4.0/balloon.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/notie/4.3.0/notie.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pouchdb/6.2.0/pouchdb.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xregexp/3.2.0/xregexp-all.min.js',
  'https://cdn.rawgit.com/fiatjaf/glua/dd440803/dist/glua.min.js',
  'https://cdn.rawgit.com/fiatjaf/jq-web/10f96a5/jq.min.js',
  'https://cdn.rawgit.com/fiatjaf/jq-web/10f96a5/jq.wasm.min.js',
  'https://cdn.rawgit.com/fiatjaf/jq-web/10f96a5/jq.wasm.wasm'
]

const currentCache = 'v3'

this.addEventListener('install', event => {
  event.waitUntil(
    caches.open(currentCache).then(cache => {
      return cache.addAll(always)
    })
  )
})

this.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList =>
      Promise.all(keyList.map(key => {
        if (key !== currentCache) {
          return caches.delete(key)
        }
      }))
    )
  )
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return

  // for the predefined urls we'll always serve them from the cache
  if (always.indexOf(event.request.url) !== -1) {
    // jq, wasm version
    if (event.request.url.match(/jq.min.js/) && 'WebAssembly' in self) {
      let req = new Request(event.request.url.replace('jq.min', 'jq.wasm.min'), {mode: 'no-cors'})
      event.respondWith(caches.match(req))
      return
    }

    // all other precached urls
    event.respondWith(caches.match(event.request))
    return
  }

  // naked wasm binary file
  if (event.request.url.match(/jq.wasm.wasm/)) {
    let req = new Request('https://cdn.rawgit.com/fiatjaf/jq-web/10f96a5/jq.wasm.wasm', {mode: 'no-cors'})
    event.respondWith(caches.match(req))
    return
  }

  // try to fetch from the network
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // save a clone of our response in the cache
        let cacheCopy = response.clone()
        caches.open(currentCache).then(cache => cache.put(event.request, cacheCopy))
        return response
      })
      // if it fails we'll serve from the cache
      .catch(caches.match(event.request))
  )
})
