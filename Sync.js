const createClass = require('create-react-class')
const h = require('react-hyperscript')
const cuid = require('cuid')
const RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection
const RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate
const RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription
const PouchDB = require('pouchdb-browser')
const PouchReplicator = require('pouch-replicate-webrtc')

const {onStateChange} = require('./db')

module.exports = createClass({
  displayName: 'Sync',
  getInitialState () {
    return {
      settings: {},

      selected: CouchDB
    }
  },

  componentDidMount () {
    this.cancel = onStateChange(({settings}) => this.setState({settings}))
  },

  componentWillUnmount () {
    this.cancel()
  },

  render () {
    return (
      h('#Sync', [
        h('.tabs.is-centered', [
          h('ul', [
            h('li', {className: this.state.selected === CouchDB ? 'is-active' : null}, [
              h('a', {onClick: e => this.select(CouchDB, e) }, 'CouchDB Sync')
            ]),
            h('li', {className: this.state.selected === WebRTC ? 'is-active' : null}, [
              h('a', {onClick: e => this.select(WebRTC, e) }, 'Direct Browser Replication')
            ])
          ])
        ]),
        h(this.state.selected, {...this.props, ...this.state})
      ])
    )
  },

  select (tab, e) {
    e.preventDefault()
    this.setState({selected: tab})
  }
})

const WebRTC = createClass({
  displayName: 'WebRTC',
  getInitialState () {
    return {
      log: [],
      peers: {},
      localData: ''
    }
  },

  db: null,

  componentDidMount () {
    this.cancel = onStateChange(({db}) => {
      if (db === this.db) return

      // gather current active peers
      var activePeers = []
      if (this.replicator) {
        for (let i = 0; i < this.replicator.peers.length; i++) {
          let id = this.replicator.peers[i]
          let channel = this.state.peers[id].channel
          activePeers.push({id, channel})
        }
      }
      let n = activePeers.length

      // create a new replicator
      this.replicator = new PouchReplicator('replicator', PouchDB, db, {batch_size: 50})
      this.replicator.on('endpeerreplicate', () =>
        this.log('~', 'received replication data.')
      )

      // add them to this new replicator
      for (let i = 0; i < n; i++) {
        let {id, channel} = activePeers[i]
        this.replicator.addPeer(id, channel)
      }

      if (n) {
        this.log('~', `reusing ${n} existing connection${n === 1 ? '' : 's'}.`)
      }
    })
  },

  componentWillUnmount () {
    this.cancel()
  },

  render () {
    return (
      h('#WebRTC', [
        h('.columns', [
          h('.column.is-half', [
            h('.control', [
              h('textarea', {
                onChange: this.gotRemoteData
              })
            ]),
            h('pre', [
              h('code', this.state.localData)
            ])
          ]),
          h('.column.is-half', [
            h('.control', [
              h('button.button', {onClick: this.start}, 'start a new peer connection')
            ]),
            h('table.table', [
              h('tbody', this.state.log.map(([id, msg], i) =>
                h('tr', [
                  h('td', i),
                  h('td', id),
                  h('td', msg)
                ])
              ).reverse())
            ])
          ])
        ])
      ])
    )
  },

  log () {
    console.log.apply(console, arguments)
    this.setState(st => {
      st.log.push([arguments[0], arguments[1]])
      return st
    })
  },

  gotRemoteData (e) {
    e.preventDefault()

    var data
    try {
      data = JSON.parse(unescape(e.target.value.split('^@^')[1]))
    } catch (e) {
      this.log('~', 'failed to parse pasted remote data.', e)
      return
    }

    let id = data.id
    var peer
    if (data.type === 'offer') {
      this.log(id, 'got a remote offer.', data)
      peer = new RTCPeerConnection({iceServers: [
        {urls: ['stun:stun.l.google.com:19305']},
        {urls: ['stun:stun1.l.google.com:19305']}
      ]})
      peer.ondatachannel = e => this.handleDataChannel(id, e.channel)
    } else if (data.type === 'answer') {
      this.log(id, 'got a remote answer.', data)
      peer = this.state.peers[id].peer
    }

    peer.setRemoteDescription(new RTCSessionDescription(data.desc))
    .then(() =>
      Promise.all(data.candidates.map(candidate => {
        return peer.addIceCandidate(new RTCIceCandidate(candidate))
          .then(() => this.log(id, 'added remote ice candidate.'))
          .catch(e => this.log(id, 'add ice error.', e))
      }))
    )
    .then(() => {
      if (data.type === 'offer') {
        this.setState(st => {
          st.peers[id] = {
            data: {candidates: [], desc: null},
            channel: null,
            peer
          }
          return st
        }, () => {
          peer.onicecandidate = e => this.handleLocalIceCandidate(id, 'answer', e)

          peer.createAnswer()
          .then(sdp => {
            this.log(id, 'got local description (answer).', sdp)
            peer.setLocalDescription(sdp)
            this.setState(st => {
              st.peers[id].data.desc = sdp
              return st
            }, () => this.showLocalData(id, 'answer'))
          })
          .catch(e => this.log(id, 'error creating local description.', e))
        })
      }
    })
  },

  start (e) {
    e.preventDefault()

    let id = cuid.slug()
    let peer = new RTCPeerConnection({iceServers: [
      {urls: ['stun:stun.l.google.com:19305']},
      {urls: ['stun:stun1.l.google.com:19305']}
    ]})
    this.log(id, 'waiting for local description and ice candidates.')

    this.setState(st => {
      st.peers[id] = {
        data: {candidates: [], desc: null},
        channel: null,
        peer
      }
      return st
    }, () => {
      let channel = peer.createDataChannel(id)
      this.handleDataChannel(id, channel)

      peer.onicecandidate = e => this.handleLocalIceCandidate(id, 'offer', e)

      peer.createOffer()
      .then(sdp => {
        this.log(id, 'got local description (offer).', sdp)
        peer.setLocalDescription(sdp)
        this.setState(st => {
          st.peers[id].data.desc = sdp
          return st
        }, () => this.showLocalData(id, 'offer'))
      })
      .catch(e => this.log(id, 'error creating local description.', e))
    })
  },

  handleLocalIceCandidate (id, type, e) {
    if (!e.candidate) return
    this.log(id, 'got local ice candidate.')
    this.setState(st => {
      st.peers[id].data.candidates.push(e.candidate)
      return st
    }, () => this.showLocalData(id, type))
  },

  handleDataChannel (id, channel) {
    this.setState(st => {
      st.peers[id].channel = channel
      return st
    })

    channel.onopen = e => {
      this.log(id, 'channel opened, sending replication data.')
      this.replicator.addPeer(id, channel)
      this.replicator.replicate()
        .then(() => this.log(id, 'sent replication data.'))
        .catch(e => this.log(id, 'failed to send replication data.', e))
    }
    channel.onclose = e => {
      this.log(id, 'channel closed.', e)
      this.replicator.removePeer(id, channel)
      this.setState(st => {
        delete st.peers[id]
        return st
      })
    }
  },

  showLocalData (id, type) {
    let data = this.state.peers[id].data
    if (data.candidates.length > 0 && data.desc) {
      this.setState({
        localData: '^@^' + escape(JSON.stringify({...data, type, id})) + '^@^'
      })
    }
  }
})

const CouchDB = createClass({
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
