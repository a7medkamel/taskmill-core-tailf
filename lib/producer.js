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


    this.host = host;
    this.socket = socket_io(host);

    if (url.pathname) {
      let id = url.pathname.substring(1);
      if (id) {
        this.keyAsync = Promise.resolve();
      }
    }

    if (!this.keyAsync) {
      this.keyAsync = Promise
                        .fromCallback((cb) => {
                          this.socket.on('connect', () => {
                            let { id } = this.socket;

                            cb(undefined, id);
                            this.emit('connect');
                          });
                        });

    }
  }

  key() {
    return this.keyAsync;
  }

  uri() {
    return this
            .key()
            .then((key) => {
              return (new URL(`log/${key}`, this.socket.io.uri)).toString();
            });
  }

  stream(options = {}) {
    let { socket }  = this;

    let transform = (chunk, enc, cb) => {
      this
        .key()
        .then((key) => {
          let time  = new Date().getTime()
            , msg   = { time, type : 'stdout', room : key, meta : options.meta, spec : options.spec }
            ;

          if (_.isObject(chunk)) {
            let { type, meta, spec, chunk : chunky, token } = chunk;

            msg = _.defaultsDeep({ type, meta, spec, token, chunk : chunky }, msg);
          }

          // io.on(room, { time, meta, chunk });
          // io.emit('chunk', { time, meta, chunk });
          if (msg.chunk) {
            socket.emit('chunk', msg);
          } else {
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
      this
        .key()
        .then((key) => {
          let time  = new Date().getTime()
            , msg   = { time, room : key, meta : options.meta, spec : options.spec }
            ;

            // io.emit('end', { time, meta }, () => {
            // io.on(room, { time, meta }, () => {
            socket.emit('end', msg, () => {
              socket.close();
              cb();
            });
        });
    };

    return through2.obj(transform, flush);
  }
}

module.exports = Producer;
