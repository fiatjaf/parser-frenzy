const blobUtil = require('blob-util')

module.exports = function forceDownload (text, filename) {
  let blob = blobUtil.createBlob([text], {type: 'text/plain'})
  let url = blobUtil.createObjectURL(blob)

  let p = document.createElement('a')
  p.setAttribute('href', url)
  p.setAttribute('download', filename)
  p.style.display = 'none'
  document.body.appendChild(p)
  p.click()
  document.body.removeChild(p)
}
