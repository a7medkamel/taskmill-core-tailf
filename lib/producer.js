'use strict';

var Promise       = require('bluebird')
  , winston       = require('winston')
  , _             = require('lodash')
  , { URL }       = require('universal-url')
  , EventEmitter  = require('events')
  , through2      = require('through2')
  , urljoin       = require('url-join')
  , rp            = require('request-promise')
  , socket_io     = require('socket.io-client')
  ;

class Producer extends EventEmitter {
  constructor(tailf = 'https://tailf.io') {
    super();

    let url     = new URL(tailf)
      , host    = url.origin
      ;

    let uri     = url.toString()
      , method  = 'GET'
      , id      = url.pathname? url.pathname.substring(1) : undefined
      ;

    if (!id) {
      // let id = url.pathname.substring(1);
      uri = urljoin(uri, 'log');
      method = 'PUT';
    }

    let opt = { uri, method, json : true };

    let socket = rp(opt)
                .promise()
                .then((result = {}) => {
                  let { token } = result;

                  let socket = socket_io(host)
                                .on('connect', () => {
                                  socket.emit('authenticate', { token });
                                })
                                // .on('disconnect', () =>{
                                //   winston.info('disconnected');
                                // })
                                // .on('authenticated', () => {
                                //   winston.log(`authenticated`);
                                // })
                                .on('unauthorized', (msg) => {
                                  winston.error(`unauthorized`, msg);
                                });

                  socket.tailf = result;

                  return socket;
                });

    this.socket = () => socket;
  }

  uri() {
    return this
            .socket()
            .then((socket) => {
              let { id } = socket.tailf;

              return (new URL(`log/${id}`, socket.io.uri)).toString();
            });
  }

  stream(options = {}) {
    let { socket }  = this;

    let transform = (obj, enc, cb) => {
      this
        .socket()
        .then((socket) => {
          let time    = new Date().getTime()
            , msg     = { time, type : 'stdout' }
            ;

          if (_.isObject(obj)) {
            let { type, chunk } = obj;

            _.extend(msg, { type, chunk });
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
        .socket()
        .then((socket) => {
          let time    = new Date().getTime()
            , msg     = { time }
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
