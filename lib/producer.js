'use strict';

var Promise       = require('bluebird')
  , winston       = require('winston')
  , _             = require('lodash')
  , { URL }       = require('universal-url')
  , EventEmitter  = require('events')
  , through2      = require('through2')
  , socket_io     = require('socket.io-client')
  ;

class Producer extends EventEmitter {
  constructor(tailf = 'https://tailf.io') {
    super();

    let url     = new URL(tailf)
      , host    = url.origin
      ;

    if (url.pathname) {
      this.room = url.pathname.substring(1);
    }

    this.host = host;
    this.socket = socket_io(host);

    this.socket.on('connect', () => {
      if (!this.room) {
        this.room = this.socket.id;
      }

      this.emit('connect');
    });
  }

  key() {
    let { room } = this;

    if (!room) {
      let { id } = this.socket;

      if (!id) {
        throw new Error('key not issued')
      }

      room = id;
    }

    return room;
  }

  uri() {
    let key = this.key();

    return (new URL(`log/${key}`, this.socket.io.uri)).toString();
  }

  stream(options = {}) {
    let { socket }  = this;

    let transform = (chunk, enc, cb) => {
      let key = this.key();

      Promise
        .try(() => {
          let time  = new Date().getTime()
            , msg   = { time, type : 'stdout', room : key, meta : options.meta, spec : options.spec }
            ;

          if (_.isObject(chunk)) {
            let { type, meta, spec, chunk : chunky } = chunk;

            msg = _.defaultsDeep({ type, meta, spec, chunk : chunky }, msg);
          }

          // io.on(room, { time, meta, chunk });
          // io.emit('chunk', { time, meta, chunk });
          if (msg.chunk) {
            socket.emit('chunk', msg);
          } else {
            winston.info(`end ${key} - null chunk`);
            socket.emit('end', msg, () => {
              socket.close();
            });
          }
        })
        .catch((err) => {
          winston.error(err);
          throw err;
        })
        .asCallback(cb);
    };

    let flush = (cb) => {
      let time  = new Date().getTime()
        , msg   = { time, room : key, meta : options.meta, spec : options.spec }
        ;

      // io.emit('end', { time, meta }, () => {
      // io.on(room, { time, meta }, () => {
      socket.emit('end', msg, () => {
        socket.close();
        cb();
      });
    };

    return through2.obj(transform, flush);
  }
}

module.exports = Producer;
