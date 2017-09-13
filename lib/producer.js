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
      , room    = url.searchParams.get('room')
      , host    = url.origin
      ;

    this.room = room;
    this.host = host;
    this.socket = socket_io(host);

    this.socket.on('connect', () => {
      this.emit('connect');
    });
  }

  uri() {
    return (new URL(`log/${this.socket.id}`, this.socket.io.uri)).toString();
  }

  stream(options = {}) {
    let { socket, room } = this;

    function transform (chunk, enc, cb) {
      Promise
        .try(() => {
          let time  = new Date().getTime()
            , msg   = { time, type : 'stdout', room, meta : options.meta, spec : options.spec }
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
            winston.info(`end ${room} - null chunk`);
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

    function flush (cb) {
      let time  = new Date().getTime()
        , msg   = { time, room, meta : options.meta, spec : options.spec }
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
