'use strict';

var socket_io     = require('socket.io-client')
  , Promise       = require('bluebird')
  , EventEmitter  = require('events')
  , { URL }       = require('universal-url')
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
      let uri = this.uri();

      this.emit('connect', { uri });
    });
  }

  uri() {
    return this.socket.io.uri + '/' + this.socket.id;
  }

  on_chunk(payload) {
    let { text, type }  = payload;

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
      // this is required for xterm.js, to add \r when it is missing
      // todo [akamel] why is it missing from original source?
      text = text.replace(/\r?\n/g, '\r\n');
      this.emit('data', { text, type })
    }
  }

  on_end(payload) {
    let { type } = payload;

    this.emit('end', { type })
  }

  static connect(...arg) {
    return Promise
            .fromCallback((cb) => {
              let ret = new Client(...arg);

              // todo [akamel] this might never resolve
              ret.on('connect', () => { cb(undefined, ret); });
            });
  }
}

module.exports = Client;
