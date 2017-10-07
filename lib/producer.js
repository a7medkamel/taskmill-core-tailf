'use strict';

var Promise       = require('bluebird')
  , winston       = require('winston')
  , _             = require('lodash')
  , { URL }       = require('universal-url')
  , EventEmitter  = require('events')
  , through2      = require('through2')
  , sink          = require('through2-sink')
  , urljoin       = require('url-join')
  , timeout       = require('callback-timeout')
  , fetch         = require('isomorphic-fetch')
  , socket_io     = require('socket.io-client')
  ;

const TIMEOUT_MS = 500;

class Producer extends EventEmitter {
  constructor(tailf = 'https://tailf.io', options = {}) {
    super();

    let url     = new URL(tailf)
      , host    = url.origin
      ;

    let uri                     = url.toString()
      , id                      = url.pathname? url.pathname.substring(1) : undefined
      , method                  = 'GET'
      , headers                 = {}
      , { rows, columns, meta } = options
      , body                    = { rows, columns, meta }
      ;

    if (!id) {
      // let id = url.pathname.substring(1);
      uri = urljoin(uri, 'log');
      method = 'PUT';
      headers = {
        'Content-Type': 'application/json'
      };
      body = JSON.stringify(body);
    }

    let socket = Promise
                  .resolve(fetch(uri, { method, headers, body }))
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
                      socket.emit('chunk', { time, type, chunk }, timeout((err) => { cb(null, obj); }, TIMEOUT_MS));
                    } else {
                      socket.emit('end', { time, type }, timeout((err) => {
                        socket.close();
                        cb(null, obj);
                      }, TIMEOUT_MS));
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
