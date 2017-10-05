'use strict';

var Promise       = require('bluebird')
  , winston       = require('winston')
  , _             = require('lodash')
  , { URL }       = require('universal-url')
  , EventEmitter  = require('events')
  , through2      = require('through2')
  , sink          = require('through2-sink')
  , urljoin       = require('url-join')
  , fetch         = require('isomorphic-fetch')
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

    let socket = Promise
                  .resolve(fetch(uri, { method }))
                  .then((response) => {
                		if (response.status >= 400) {
                      // todo [akamel] better error message
                			throw new Error('Bad response from server');
                		}

                		return response.json();
                  })
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

  stream() {
    let transform = (obj = {}, enc, cb) => {
      this
        .socket()
        .then((socket) => {
          let time                        = new Date().getTime()
            , { chunk, type = 'stdout' }  = obj
            ;

          return Promise
                  .fromCallback((cb) => {
                    if (chunk) {
                      socket.emit('chunk', { time, type, chunk }, () => { cb(null, obj); });
                    } else {
                      socket.emit('end', { time, type }, () => {
                        socket.close();
                        cb(null, obj);
                      });
                    }
                  });
        })
        .catch((err) => {
          winston.error(err);
          throw err;
        })
        // .tap(() => {
        //   console.log('tapping')
        // })
        .asCallback(cb);
    };

    let flush = (cb) => {
      this
        .socket()
        .then((socket) => {
          let time = new Date().getTime();

          return Promise
                  .fromCallback((cb) => {
                    // todo [akamel] this misses the type which isn't send on a flush
                    socket.emit('end', { time }, () => {
                      socket.close();
                      cb();
                    });
                  });
        })
        .catch((err) => {
          winston.error(err);
          throw err;
        })
        .asCallback(cb);
    };

    let ret = through2.obj(transform, flush);

    ret.pipe(sink.obj(() => {}));

    return ret;
  }
}

module.exports = Producer;
