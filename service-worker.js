/* global caches, self, fetch */

var always = [
  'https://maxcdn.bootstrapcdn.com/font-awesome/4.6.3/css/font-awesome.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/bulma/0.4.1/css/bulma.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/notie/4.3.1/notie.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.25.2/codemirror.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/notie/4.3.0/notie.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xregexp/3.2.0/xregexp-all.min.js',
  'https://cdn.rawgit.com/fiatjaf/glua/dd440803/dist/glua.min.js',
  'https://cdn.rawgit.com/fiatjaf/jq-web/51049256/jq.min.js'
]

this.addEventListener('install', event => {
  event.waitUntil(
    caches.open('v1').then(cache => {
      return cache.addAll(always)
    })
  )
})

self.addEventListener('fetch', event => {
  if (always.indexOf(event.request.url) !== -1) {
    // for the predefined urls we'll always serve them from the cache
    event.respondWith(
      caches.match(event.request).catch(() => fetch(event.request))
    )
    return
  }

  // try to fetch from the network
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // save a clone of our response in the cache
        let cacheCopy = response.clone()
        caches.open('v1').then(cache => cache.put(event.request, cacheCopy))
        return response
      })
      // if it fails we'll serve from the cache
      .catch(caches.match(event.request))
  )
})
