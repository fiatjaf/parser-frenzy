const createClass = require('create-react-class')
const h = require('react-hyperscript')
const cuid = require('cuid')
const RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection
const RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate
const RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription
const PouchDB = require('pouchdb-browser')
const PouchReplicator = require('pouch-replicate-webrtc')

const {createDatabase} = require('../db')
const {onStateChange} = require('../db')

module.exports = createClass({
  displayName: 'WebRTC',
  getInitialState () {
    return {
      settings: {},
      db: null,

      log: [],
      peers: {},
      localData: ''
    }
  },

  componentDidMount () {
    this.cancel = onStateChange(({settings, db}) => this.setState({settings, db}),
      ['settings', 'db'])
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
                onChange: this.gotRemoteData,
                title: 'Paste data received from the remote browser here.'
              })
            ]),
            h('pre', {title: 'Copy this data and send it to the remote browser.'}, [
              h('code', this.state.localData)
            ])
          ]),
          h('.column.is-half', [
            h('.control', [
              h('button.button', {
                onClick: this.start
              }, `Start a connection to replicate "${this.state.settings.name}" to/from elsewhere.`)
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
        initiator: true,
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

    if (this.state.peers[id].initiator) {
      // wait for the remote peer to send an 'alive' event
      channel.onmessage = e => {
        if (e.data === 'ALIVE') {
          this.log(id, 'remote channel has opened and is alive.')
          this.log(id, `sending current database id: '${this.state.settings.id}'.`)
          channel.send('ID ' + this.state.settings.id + ' ' + this.state.settings.name)

          // get ready to replicate
          let db = new PouchDB(this.state.settings.id)
          let replicator = new PouchReplicator(this.state.settings.id, PouchDB,
                                               db, {batch_size: 50})
          replicator.addPeer(id, channel)
          replicator.replicate()
            .then(() => this.log(id, 'sent replication data.'))
            .catch(e => this.log(id, 'failed to send replication data.', e))
        }
      }
    } else {
      channel.onopen = e => {
        // send an alive event
        this.log(id, 'channel open, sending ALIVE event.')
        channel.send('ALIVE')
      }

      // wait for the id of the remote database (we'll replicate to a database of the same id)
      channel.onmessage = e => {
        // react to ID messages only
        if (!e.data.split || e.data.split(' ')[0] !== 'ID') return

        var [rdbid, rdbname] = e.data.split(' ').slice(1)
        rdbid = rdbid.trim()
        this.log(id, `got database "${rdbname}" (id: "${rdbid}").`)
        createDatabase(rdbid, rdbname)
        let db = new PouchDB(rdbid)
        let replicator = new PouchReplicator(rdbid, PouchDB,
                                             db, {batch_size: 50})
        replicator.addPeer(id, channel)
        replicator.replicate()
          .then(() => this.log(id, 'sent replication data.'))
          .catch(e => this.log(id, 'failed to send replication data.', e))
      }
    }

    channel.onclose = e => {
      this.log(id, 'channel closed.', e)
      this.setState(st => {
        delete st.peers[id]
        return st
      })
    }
  },

  showLocalData (id, type) {
    let data = this.state.peers[id].data
    if (data.candidates.length > 0 && data.desc) {
      this.setState({localData: '^@^' + escape(JSON.stringify({...data, type, id})) + '^@^'})
      this.log(id, 'pass this huge text that appeared to the remote browser.')
    }
  }
})
