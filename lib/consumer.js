'use strict';

var Promise       = require('bluebird')
  , EventEmitter  = require('events')
  , winston       = require('winston')
  , _             = require('lodash')
  , socket_io     = require('socket.io')
  ;

class Consumer extends EventEmitter {
  // constructor() {
  // }

  listen(options = {}) {
    return Promise
            .try(() => {
              let { server, port } = options;

              if (server) {
                return server;
              }

              let ret = require('http').createServer();

              return Promise
                      .fromCallback((cb) => {
                        ret.listen(port, cb);
                      })
                      .then(() => ret);
            })
            .tap(() => {
              let io = socket_io(server);

              io.on('connection', (socket) => {
                // let nsp = io.of(`/${socket.id}`);
                // nsp.on('connection', function(socket){
                //   console.log('someone connected');
                // });
                this.emit('connection', socket);

                socket.on('disconnect', () => this.emit('disconnect', socket));
                /*{
                time  : unix tyime stamp,
                meta  : {
                  type : 'stdout' | 'stderr'
                }
                chunk : buffer
                }*/
                socket.on('chunk', (payload) => this.emit('chunk', payload));
                socket.on('end', (payload, fn) => {
                  this.emit('end', payload);
                  fn(); //ack
                });
              });

              this.io = io;
              this.server = server;
            })
            .then(() => this);
  }

  connected() {
    if (this.io) {
      return io.sockets.connected;
    }

    return {};
  }

  port() {
    if (this.server) {
      return this.server.address().port;
    }
  }

  // static make_server(options = {}) {
  //   return Promise
  //           .try(() => {
  //             let server = require('http').createServer(() => {});
  //
  //             return Promise
  //                     .fromCallback((cb) => {
  //                       let { port } = options;
  //                       server.listen(port, (err) => cb(err, server));
  //                     });
  //           });
  // }
}

module.exports = Consumer;
