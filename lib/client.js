'use strict';

var socket_io     = require('socket.io-client')
  , EventEmitter  = require('events')
  ;

class Client extends EventEmitter {
  constructor(tailf) {
    super();

    let url     = new URL(tailf)
      , room    = url.pathname.substring(1)
      , host    = url.origin
      ;

    this.room = room;
    this.socket = socket_io(host);

    this.socket.on('chunk', this.on_chunk.bind(this));
    this.socket.on('end', this.on_end.bind(this));

    this.socket.on('connect', () => {
      let uri = this.socket.io.uri + '/' + this.socket.id;

      this.emit('connect', { uri });
    });
  }

  on_chunk(payload) {
    let { text, type }  = payload
      // , text            = undefined
      ;

    switch(type) {
      case 'stdout':
        // console.log(text);
        // text = text;
      break;
      case 'stderr':
        // console.error(text);
        text = '\x1b[31m' + text + '\x1b[m';
      break;
    }

    if (text) {
      // let text = text.replace(/\r?\n/g, '\r\n');
      this.emit('data', { text, type })
    }
  }

  on_end(payload) {
    let { type } = payload;

    this.emit('end', { type })
  }
}

module.exports = Client;
